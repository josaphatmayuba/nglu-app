import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { budgetConsumptions, budgetLines, budgets, journalEntryLines } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class BudgetService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number) {
    return this.db
      .select()
      .from(budgets)
      .where(eq(budgets.organizationId, orgId))
      .orderBy(desc(budgets.id));
  }

  async create(
    input: { name: string; periodId?: number; projectId?: number; currencyId?: number },
    orgId: number,
  ) {
    const [row] = await this.db
      .insert(budgets)
      .values({
        organizationId: orgId,
        name: input.name,
        periodId: input.periodId,
        projectId: input.projectId,
        currencyId: input.currencyId,
        status: "open",
      })
      .$returningId();
    return { id: row.id };
  }

  async addLine(
    budgetId: number,
    input: {
      accountId: number;
      plannedAmount: number;
      label?: string;
      siteId?: number;
      departmentId?: number;
      projectId?: number;
      activityId?: number;
    },
    orgId: number,
  ) {
    await this.getBudgetOrThrow(budgetId, orgId);
    const [row] = await this.db
      .insert(budgetLines)
      .values({
        organizationId: orgId,
        budgetId,
        accountId: input.accountId,
        plannedAmount: input.plannedAmount.toFixed(2),
        label: input.label,
        siteId: input.siteId,
        departmentId: input.departmentId,
        projectId: input.projectId,
        activityId: input.activityId,
      })
      .$returningId();
    return { id: row.id };
  }

  /** Enregistre une consommation sur une ligne. Renvoie l'etat (planifie/consomme/restant) + alerte. */
  async consume(
    budgetLineId: number,
    input: { amount: number; journalEntryId?: number; note?: string },
    orgId: number,
  ) {
    const line = await this.getLineOrThrow(budgetLineId, orgId);
    if (!(input.amount > 0)) {
      throw new BadRequestException("Le montant consomme doit etre positif.");
    }
    await this.db.insert(budgetConsumptions).values({
      organizationId: orgId,
      budgetLineId,
      journalEntryId: input.journalEntryId,
      amount: input.amount.toFixed(2),
      note: input.note,
    });
    return this.lineStatus(line.id, Number(line.plannedAmount), orgId);
  }

  /** Etat consolide d'un budget : lignes + planifie/consomme/restant + alertes. */
  async status(budgetId: number, orgId: number) {
    await this.getBudgetOrThrow(budgetId, orgId);
    const lines = await this.db
      .select()
      .from(budgetLines)
      .where(
        and(eq(budgetLines.budgetId, budgetId), eq(budgetLines.organizationId, orgId)),
      );
    const result = [];
    for (const l of lines) {
      result.push(await this.lineStatus(l.id, Number(l.plannedAmount), orgId, l));
    }
    const planned = result.reduce((s, r) => s + r.planned, 0);
    const consumed = result.reduce((s, r) => s + r.consumed, 0);
    return {
      budgetId,
      planned: this.round(planned),
      consumed: this.round(consumed),
      remaining: this.round(planned - consumed),
      overBudget: consumed > planned,
      lines: result,
    };
  }

  /**
   * Etat consolide calcule LIVE depuis le grand livre : pour chaque ligne budgetaire,
   * consommation = somme nette (debit - credit) des ecritures sur le compte + dimensions.
   * Refete la realite comptable sans saisie manuelle de consommation.
   */
  async statusFromLedger(budgetId: number, orgId: number) {
    await this.getBudgetOrThrow(budgetId, orgId);
    const lines = await this.db
      .select()
      .from(budgetLines)
      .where(and(eq(budgetLines.budgetId, budgetId), eq(budgetLines.organizationId, orgId)));

    const result = [];
    for (const l of lines) {
      const conds = [
        eq(journalEntryLines.organizationId, orgId),
        eq(journalEntryLines.accountId, l.accountId),
      ];
      if (l.projectId != null) conds.push(eq(journalEntryLines.projectId, l.projectId));
      if (l.siteId != null) conds.push(eq(journalEntryLines.siteId, l.siteId));
      if (l.departmentId != null) conds.push(eq(journalEntryLines.departmentId, l.departmentId));
      if (l.activityId != null) conds.push(eq(journalEntryLines.activityId, l.activityId));

      const [row] = await this.db
        .select({
          debit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'DEBIT' then ${journalEntryLines.amount} else 0 end), 0)`,
          credit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'CREDIT' then ${journalEntryLines.amount} else 0 end), 0)`,
        })
        .from(journalEntryLines)
        .where(and(...conds));
      const consumed = this.round(Number(row?.debit ?? 0) - Number(row?.credit ?? 0));
      const planned = this.round(Number(l.plannedAmount));
      result.push({
        lineId: l.id,
        accountId: l.accountId,
        label: l.label,
        planned,
        consumed,
        remaining: this.round(planned - consumed),
        overBudget: consumed > planned,
      });
    }
    const planned = this.round(result.reduce((s, r) => s + r.planned, 0));
    const consumed = this.round(result.reduce((s, r) => s + r.consumed, 0));
    return {
      budgetId,
      source: "ledger",
      planned,
      consumed,
      remaining: this.round(planned - consumed),
      overBudget: consumed > planned,
      lines: result,
    };
  }

  private async lineStatus(lineId: number, planned: number, orgId: number, lineRow?: any) {
    const [row] = await this.db
      .select({ total: sum(budgetConsumptions.amount) })
      .from(budgetConsumptions)
      .where(
        and(
          eq(budgetConsumptions.budgetLineId, lineId),
          eq(budgetConsumptions.organizationId, orgId),
        ),
      );
    const consumed = this.round(Number(row?.total ?? 0));
    return {
      lineId,
      accountId: lineRow?.accountId,
      label: lineRow?.label,
      planned: this.round(planned),
      consumed,
      remaining: this.round(planned - consumed),
      overBudget: consumed > planned,
    };
  }

  private async getBudgetOrThrow(budgetId: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Budget #${budgetId} introuvable.`);
    return row;
  }

  private async getLineOrThrow(lineId: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(budgetLines)
      .where(and(eq(budgetLines.id, lineId), eq(budgetLines.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Ligne budgetaire #${lineId} introuvable.`);
    return row;
  }

  private round(n: number) {
    return Math.round(n * 100) / 100;
  }
}
