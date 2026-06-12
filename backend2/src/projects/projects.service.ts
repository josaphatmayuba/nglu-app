import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  accounts,
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
            and p.external_ref = cast(m.id as char)
        )
    `);
    await this.db.execute(sql`
      update ${realEstateMaintenanceRequests} m
      join ${projects} p
        on p.organization_id = m.organization_id
       and p.source_system = 'maintenance'
       and p.external_ref = cast(m.id as char)
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
   * par sous-compte, filtres sur journal_entry_lines.project_id. Sert de base au rapport bailleur.
   */
  async ledgerReport(projectId: number, orgId: number) {
    const project = await this.findOne(projectId, orgId);
    const rows = await this.db
      .select({
        subAccount: subAccounts.name,
        account: accounts.name,
        accountType: accounts.type,
        totalDebit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'DEBIT' then ${journalEntryLines.amount} else 0 end), 0)`,
        totalCredit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'CREDIT' then ${journalEntryLines.amount} else 0 end), 0)`,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalEntryLines.entryId))
      .leftJoin(subAccounts, eq(subAccounts.id, journalEntryLines.accountId))
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId))
      .where(
        and(
          eq(journalEntryLines.organizationId, orgId),
          eq(journalEntryLines.projectId, projectId),
        ),
      )
      .groupBy(journalEntryLines.accountId);

    const expenses: any[] = [];
    const revenue: any[] = [];
    for (const r of rows) {
      const debit = this.round2(Number(r.totalDebit));
      const credit = this.round2(Number(r.totalCredit));
      if (r.accountType === "Expense") {
        const amount = this.round2(debit - credit);
        if (amount !== 0) expenses.push({ subAccount: r.subAccount, account: r.account, amount });
      } else if (r.accountType === "Revenue") {
        const amount = this.round2(credit - debit);
        if (amount !== 0) revenue.push({ subAccount: r.subAccount, account: r.account, amount });
      }
    }
    const totalExpenses = this.round2(expenses.reduce((t, i) => t + i.amount, 0));
    const totalRevenue = this.round2(revenue.reduce((t, i) => t + i.amount, 0));
    const budget = project.budgetAmount != null ? Number(project.budgetAmount) : null;
    const consumptionPct =
      budget && budget > 0 ? Math.round((totalExpenses / budget) * 1000) / 10 : null;
    return {
      project: { id: project.id, name: project.name, donor: project.donor, budget },
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      net: this.round2(totalRevenue - totalExpenses),
      budget,
      consumptionPct,
    };
  }
}
