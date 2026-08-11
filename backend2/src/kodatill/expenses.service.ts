import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktExpenseCategories, ktExpenses } from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
} from "./dto/expenses.dto";

@Injectable()
export class ExpensesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ─── Categories ──────────────────────────────────────────────────────────

  async listCategories(orgId: number) {
    return this.db
      .select()
      .from(ktExpenseCategories)
      .where(and(eq(ktExpenseCategories.organizationId, orgId), eq(ktExpenseCategories.status, "true")))
      .orderBy(asc(ktExpenseCategories.sortOrder), desc(ktExpenseCategories.id));
  }

  async findCategory(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktExpenseCategories)
      .where(and(eq(ktExpenseCategories.id, id), eq(ktExpenseCategories.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Categorie de depense introuvable.");
    return rows[0];
  }

  async createCategory(input: CreateExpenseCategoryDto, orgId: number) {
    const [result] = await this.db.insert(ktExpenseCategories).values({
      organizationId: orgId,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
    });
    return this.findCategory(Number(result.insertId), orgId);
  }

  async updateCategory(id: number, input: UpdateExpenseCategoryDto, orgId: number) {
    await this.findCategory(id, orgId);

    await this.db
      .update(ktExpenseCategories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      })
      .where(and(eq(ktExpenseCategories.id, id), eq(ktExpenseCategories.organizationId, orgId)));

    return this.findCategory(id, orgId);
  }

  async removeCategory(id: number, orgId: number) {
    await this.findCategory(id, orgId);
    await this.db
      .update(ktExpenseCategories)
      .set({ status: "false" })
      .where(and(eq(ktExpenseCategories.id, id), eq(ktExpenseCategories.organizationId, orgId)));
    return { message: "Categorie de depense desactivee." };
  }

  // ─── Expenses ────────────────────────────────────────────────────────────

  async listExpenses(
    orgId: number,
    filter: { branchId?: string; categoryId?: string; from?: string; to?: string },
  ) {
    const conditions = [eq(ktExpenses.organizationId, orgId), eq(ktExpenses.status, "true")];

    if (filter.branchId) {
      const branchId = Number(filter.branchId);
      if (Number.isInteger(branchId)) conditions.push(eq(ktExpenses.branchId, branchId));
    }

    if (filter.categoryId) {
      const categoryId = Number(filter.categoryId);
      if (Number.isInteger(categoryId)) conditions.push(eq(ktExpenses.categoryId, categoryId));
    }

    if (filter.from) conditions.push(gte(ktExpenses.expenseDate, filter.from));
    if (filter.to) conditions.push(lte(ktExpenses.expenseDate, filter.to));

    return this.db
      .select()
      .from(ktExpenses)
      .where(and(...conditions))
      .orderBy(desc(ktExpenses.expenseDate), desc(ktExpenses.id));
  }

  async findExpense(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktExpenses)
      .where(and(eq(ktExpenses.id, id), eq(ktExpenses.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Depense introuvable.");
    return rows[0];
  }

  async createExpense(input: CreateExpenseDto, orgId: number) {
    const [result] = await this.db.insert(ktExpenses).values({
      organizationId: orgId,
      branchId: input.branchId,
      categoryId: input.categoryId,
      label: input.label,
      amount: input.amount.toFixed(2),
      currencyCode: input.currencyCode ?? "USD",
      expenseDate: input.expenseDate,
      note: input.note,
      attachmentUrl: input.attachmentUrl,
    });
    return this.findExpense(Number(result.insertId), orgId);
  }

  async updateExpense(id: number, input: UpdateExpenseDto, orgId: number) {
    await this.findExpense(id, orgId);

    await this.db
      .update(ktExpenses)
      .set({
        ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.amount !== undefined ? { amount: input.amount.toFixed(2) } : {}),
        ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.attachmentUrl !== undefined ? { attachmentUrl: input.attachmentUrl } : {}),
      })
      .where(and(eq(ktExpenses.id, id), eq(ktExpenses.organizationId, orgId)));

    return this.findExpense(id, orgId);
  }

  async removeExpense(id: number, orgId: number) {
    await this.findExpense(id, orgId);
    await this.db
      .update(ktExpenses)
      .set({ status: "false" })
      .where(and(eq(ktExpenses.id, id), eq(ktExpenses.organizationId, orgId)));
    return { message: "Depense desactivee." };
  }

  // ─── Summary (KPI marge) ─────────────────────────────────────────────────

  /**
   * Total des depenses par categorie sur une plage de dates, pour alimenter
   * le futur KPI marge (ventes - cout de revient - depenses) au dashboard.
   * Regroupe par devise dans chaque categorie car un montant ne doit jamais
   * etre agrege entre devises differentes.
   */
  async summary(orgId: number, from: string, to: string) {
    const rows = await this.db
      .select({
        categoryId: ktExpenses.categoryId,
        categoryName: ktExpenseCategories.name,
        currencyCode: ktExpenses.currencyCode,
        total: sql<string>`sum(${ktExpenses.amount})`,
      })
      .from(ktExpenses)
      .innerJoin(ktExpenseCategories, eq(ktExpenses.categoryId, ktExpenseCategories.id))
      .where(
        and(
          eq(ktExpenses.organizationId, orgId),
          eq(ktExpenses.status, "true"),
          gte(ktExpenses.expenseDate, from),
          lte(ktExpenses.expenseDate, to),
        ),
      )
      .groupBy(ktExpenses.categoryId, ktExpenseCategories.name, ktExpenses.currencyCode)
      .orderBy(asc(ktExpenseCategories.name));

    const categories = rows.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      currencyCode: row.currencyCode,
      total: row.total ?? "0.00",
    }));

    const totalsByCurrency = new Map<string, number>();
    for (const row of categories) {
      const current = totalsByCurrency.get(row.currencyCode) ?? 0;
      totalsByCurrency.set(row.currencyCode, current + Number(row.total));
    }

    return {
      from,
      to,
      categories,
      totals: Array.from(totalsByCurrency.entries()).map(([currencyCode, total]) => ({
        currencyCode,
        total: total.toFixed(2),
      })),
    };
  }
}
