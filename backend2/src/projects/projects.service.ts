import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  accounts,
  currencies,
  journalEntries,
  journalEntryLines,
  projects,
  realEstateMaintenanceCosts,
  realEstateMaintenanceRequests,
  subAccounts,
} from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Liste les projets actifs de l'organisation. */
  async list(orgId: number) {
    // Synchro auxiliaire des projets de maintenance : best-effort. Un drift de
    // schema (colonne/table manquante sur un env) ne doit pas casser la liste.
    try {
      await this.ensureMaintenanceProjects(orgId);
    } catch (err) {
      this.logger.warn(
        `ensureMaintenanceProjects ignore (org ${orgId}): ${(err as Error)?.message}`,
      );
    }
    return this.db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, orgId), eq(projects.isActive, 1)))
      .orderBy(desc(projects.id));
  }

  private async ensureMaintenanceProjects(orgId: number) {
    await this.db.execute(sql`
      insert into ${projects} (
        organization_id,
        code,
        name,
        budget_amount,
        currency_id,
        source_system,
        external_ref
      )
      select
        m.organization_id,
        concat('MNT-', m.id),
        concat('Travaux: ', m.title),
        if(coalesce(m.estimated_cost, 0) > 0, m.estimated_cost, null),
        m.currency_id,
        'maintenance',
        cast(m.id as char)
      from ${realEstateMaintenanceRequests} m
      where m.organization_id = ${orgId}
        and coalesce(m.is_active, 1) = 1
        and not exists (
          select 1
          from ${projects} p
          where p.organization_id = m.organization_id
            and p.source_system = 'maintenance'
            and p.external_ref = cast(m.id as char) collate utf8mb4_0900_ai_ci
        )
    `);
    await this.db.execute(sql`
      update ${realEstateMaintenanceRequests} m
      join ${projects} p
        on p.organization_id = m.organization_id
       and p.source_system = 'maintenance'
       and p.external_ref = cast(m.id as char) collate utf8mb4_0900_ai_ci
      set m.project_id = p.id
      where m.organization_id = ${orgId}
        and m.project_id is null
    `);
    await this.db.execute(sql`
      update ${realEstateMaintenanceCosts} c
      join ${realEstateMaintenanceRequests} m
        on m.id = c.ticket_id
       and m.organization_id = c.organization_id
      set c.project_id = m.project_id
      where c.organization_id = ${orgId}
        and c.project_id is null
        and m.project_id is not null
    `);
    await this.db.execute(sql`
      update ${journalEntryLines} l
      join ${journalEntries} e
        on e.id = l.entry_id
       and e.organization_id = l.organization_id
      join ${realEstateMaintenanceCosts} c
        on c.organization_id = l.organization_id
       and e.related_id = cast(c.id as char) collate utf8mb4_0900_ai_ci
      left join ${realEstateMaintenanceRequests} m
        on m.id = c.ticket_id
       and m.organization_id = c.organization_id
      set l.project_id = coalesce(c.project_id, m.project_id)
      where l.organization_id = ${orgId}
        and e.source_module = 'maintenance'
        and l.project_id is null
        and coalesce(c.is_active, 1) = 1
        and coalesce(c.project_id, m.project_id) is not null
    `);
  }

  /**
   * Couts de maintenance saisis mais PAS encore comptabilises, ventiles PAR DEVISE
   * (principe SIFA : jamais de somme inter-devises).
   */
  private async maintenanceCostsMissingFromLedger(projectId: number, orgId: number) {
    const rows = await this.db
      .select({
        currencyId: realEstateMaintenanceCosts.currencyId,
        currencyCode: currencies.currencyCode,
        amount: sql<string>`coalesce(sum(${realEstateMaintenanceCosts.amount}), 0)`,
        count: sql<string>`count(*)`,
      })
      .from(realEstateMaintenanceCosts)
      .leftJoin(currencies, eq(currencies.id, realEstateMaintenanceCosts.currencyId))
      .where(
        and(
          eq(realEstateMaintenanceCosts.organizationId, orgId),
          eq(realEstateMaintenanceCosts.projectId, projectId),
          eq(realEstateMaintenanceCosts.isActive, 1),
          sql`not exists (
            select 1
            from ${journalEntries} e
            where e.organization_id = ${orgId}
              and e.source_module = 'maintenance'
              and e.related_id = cast(${realEstateMaintenanceCosts.id} as char) collate utf8mb4_0900_ai_ci
              and e.status = 'posted'
          )`,
        ),
      )
      .groupBy(realEstateMaintenanceCosts.currencyId);

    return rows
      .map((r) => ({
        currencyId: r.currencyId ?? null,
        currencyCode: r.currencyCode ?? null,
        amount: this.round2(Number(r.amount ?? 0)),
        count: Number(r.count ?? 0),
      }))
      .filter((r) => r.amount !== 0);
  }

  async findOne(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Projet introuvable.");
    return row;
  }

  async create(
    input: {
      name: string;
      code?: string;
      donor?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      budgetAmount?: number;
      currencyId?: number;
      // Registre partage : renseignes par la future app de gestion de projet.
      sourceSystem?: string;
      externalRef?: string;
    },
    orgId: number,
    userId?: number,
  ) {
    // Upsert par (source_system, external_ref) : si le projet vient d'une app source
    // autoritaire et existe deja, on met a jour au lieu de creer un doublon.
    if (input.sourceSystem && input.externalRef) {
      const [existing] = await this.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, orgId),
            eq(projects.sourceSystem, input.sourceSystem),
            eq(projects.externalRef, input.externalRef),
          ),
        )
        .limit(1);
      if (existing) {
        await this.db
          .update(projects)
          .set({
            name: input.name,
            donor: input.donor,
            description: input.description,
            budgetAmount: input.budgetAmount != null ? String(input.budgetAmount) : undefined,
          })
          .where(eq(projects.id, existing.id));
        return { id: existing.id, updated: true };
      }
    }
    const [res] = await this.db
      .insert(projects)
      .values({
        organizationId: orgId,
        name: input.name,
        code: input.code,
        donor: input.donor,
        description: input.description,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        budgetAmount: input.budgetAmount != null ? String(input.budgetAmount) : undefined,
        currencyId: input.currencyId,
        sourceSystem: input.sourceSystem || "comptabilite",
        externalRef: input.externalRef,
        createdBy: userId,
      })
      .$returningId();
    return { id: res.id };
  }

  async update(id: number, input: Record<string, any>, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(projects)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.donor !== undefined ? { donor: input.donor } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
        ...(input.budgetAmount !== undefined ? { budgetAmount: String(input.budgetAmount) } : {}),
        ...(input.currencyId !== undefined ? { currencyId: input.currencyId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      })
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
    return this.findOne(id, orgId);
  }

  /** Soft delete (status=false / is_active=0). */
  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(projects)
      .set({ isActive: 0, status: "archived" })
      .where(and(eq(projects.id, id), eq(projects.organizationId, orgId)));
    return { id, archived: true };
  }

  /**
   * Rapport analytique d'un projet : produits / charges du grand livre ventiles
   * par sous-compte ET PAR DEVISE (principe SIFA : jamais de somme inter-devises),
   * filtres sur journal_entry_lines.project_id. Sert de base au rapport bailleur.
   */
  async ledgerReport(projectId: number, orgId: number) {
    try {
      await this.ensureMaintenanceProjects(orgId);
    } catch (err) {
      this.logger.warn(
        `ensureMaintenanceProjects ignore (org ${orgId}): ${(err as Error)?.message}`,
      );
    }
    const project = await this.findOne(projectId, orgId);
    // La devise est portee par l'ecriture (journal_entries.currency_id) : on groupe
    // par (compte, devise) et on join `currency` pour le code affiche.
    const rows = await this.db
      .select({
        subAccount: subAccounts.name,
        account: accounts.name,
        accountType: accounts.type,
        currencyId: journalEntries.currencyId,
        currencyCode: currencies.currencyCode,
        totalDebit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'DEBIT' then ${journalEntryLines.amount} else 0 end), 0)`,
        totalCredit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'CREDIT' then ${journalEntryLines.amount} else 0 end), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalEntryLines.entryId))
      .leftJoin(subAccounts, eq(subAccounts.id, journalEntryLines.accountId))
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId))
      .leftJoin(currencies, eq(currencies.id, journalEntries.currencyId))
      .where(
        and(
          eq(journalEntryLines.organizationId, orgId),
          eq(journalEntryLines.projectId, projectId),
        ),
      )
      .groupBy(journalEntryLines.accountId, journalEntries.currencyId);

    // Un bucket par devise : { currencyId, currencyCode, expenses[], revenue[], totals }.
    const buckets = new Map<string, any>();
    const bucketFor = (currencyId: number | null, currencyCode: string | null) => {
      const key = String(currencyId ?? "null");
      if (!buckets.has(key)) {
        buckets.set(key, {
          currencyId: currencyId ?? null,
          currencyCode: currencyCode ?? null,
          expenses: [] as any[],
          revenue: [] as any[],
          totalExpenses: 0,
          totalRevenue: 0,
        });
      }
      return buckets.get(key);
    };

    for (const r of rows) {
      const debit = this.round2(Number(r.totalDebit));
      const credit = this.round2(Number(r.totalCredit));
      const b = bucketFor(r.currencyId ?? null, r.currencyCode ?? null);
      if (r.accountType === "Expense") {
        const amount = this.round2(debit - credit);
        if (amount !== 0) b.expenses.push({ subAccount: r.subAccount, account: r.account, amount, currencyId: b.currencyId, currencyCode: b.currencyCode });
      } else if (r.accountType === "Revenue") {
        const amount = this.round2(credit - debit);
        if (amount !== 0) b.revenue.push({ subAccount: r.subAccount, account: r.account, amount, currencyId: b.currencyId, currencyCode: b.currencyCode });
      }
    }

    // Couts de maintenance saisis mais non comptabilises : ajoutes dans LEUR devise.
    const unpostedByCurrency = await this.maintenanceCostsMissingFromLedger(projectId, orgId);
    for (const m of unpostedByCurrency) {
      const b = bucketFor(m.currencyId, m.currencyCode);
      b.expenses.push({
        subAccount: "Maintenance",
        account: "Couts maintenance saisis",
        amount: m.amount,
        currencyId: m.currencyId,
        currencyCode: m.currencyCode,
        source: "maintenance_costs",
        count: m.count,
      });
    }

    // Totaux PAR DEVISE (jamais d'addition inter-devises).
    const byCurrency = Array.from(buckets.values())
      .map((b) => {
        b.totalExpenses = this.round2(b.expenses.reduce((t: number, i: any) => t + i.amount, 0));
        b.totalRevenue = this.round2(b.revenue.reduce((t: number, i: any) => t + i.amount, 0));
        b.net = this.round2(b.totalRevenue - b.totalExpenses);
        return b;
      })
      .filter((b) => b.expenses.length || b.revenue.length);

    const budget = project.budgetAmount != null ? Number(project.budgetAmount) : null;
    const budgetCurrencyId = project.currencyId ?? null;

    // Consommation budget : comparee UNIQUEMENT dans la devise du budget (SIFA).
    const budgetBucket = byCurrency.find((b) => b.currencyId === budgetCurrencyId)
      || (byCurrency.length === 1 ? byCurrency[0] : null);
    const budgetExpenses = budgetBucket ? budgetBucket.totalExpenses : 0;
    const consumptionPct =
      budget && budget > 0 ? Math.round((budgetExpenses / budget) * 1000) / 10 : null;

    // Compat ascendante : champs plats = devise du budget (ou unique devise presente).
    const flat = budgetBucket || { expenses: [], revenue: [], totalExpenses: 0, totalRevenue: 0, net: 0, currencyId: budgetCurrencyId, currencyCode: null };

    return {
      project: { id: project.id, name: project.name, donor: project.donor, budget, budgetCurrencyId },
      // SIFA : ventilation par devise (source de verite pour l'affichage).
      byCurrency,
      maintenanceUnpostedByCurrency: unpostedByCurrency,
      budget,
      budgetCurrencyId,
      consumptionPct,
      // Champs plats conserves pour compat (devise du budget / devise unique).
      revenue: flat.revenue,
      expenses: flat.expenses,
      totalRevenue: flat.totalRevenue,
      totalExpenses: flat.totalExpenses,
      net: flat.net,
      currencyCode: flat.currencyCode,
      maintenanceCosts: {
        unpostedExpense: unpostedByCurrency.reduce((t, m) => (m.currencyId === flat.currencyId ? t + m.amount : t), 0),
        unpostedCount: unpostedByCurrency.reduce((t, m) => (m.currencyId === flat.currencyId ? t + m.count : t), 0),
      },
    };
  }
}
