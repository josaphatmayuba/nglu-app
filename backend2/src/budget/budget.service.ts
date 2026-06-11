import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { budgetConsumptions, budgetLines, budgets } from "../database/schema";
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
