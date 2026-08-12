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
import { KodatillAccountingService } from "./accounting.service";

// kt_expenses.expense_date est un DATETIME (Drizzle mode "string") : la valeur
// part telle quelle vers MySQL, un ISO 8601 avec T / Z ou millisecondes serait
// rejete. Le client peut envoyer soit "YYYY-MM-DD HH:mm:ss", soit un ISO
// complet, soit une date seule (compat) : on normalise vers le format MySQL.
// Une date seule est completee a minuit, comme avant le passage en DATETIME.
function toMysqlDateTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed} 00:00:00`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ` +
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`
  );
}

// Les bornes de filtre restent des jours (YYYY-MM-DD) cote client. Contre une
// colonne DATETIME, une borne haute nue vaut minuit et exclurait toutes les
// depenses du jour : on elargit a la fin de journee.
function rangeStart(day: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(day.trim()) ? `${day.trim()} 00:00:00` : day;
}

function rangeEnd(day: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(day.trim()) ? `${day.trim()} 23:59:59` : day;
}

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly accounting: KodatillAccountingService,
  ) {}

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

    if (filter.from) conditions.push(gte(ktExpenses.expenseDate, rangeStart(filter.from)));
    if (filter.to) conditions.push(lte(ktExpenses.expenseDate, rangeEnd(filter.to)));

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

  async createExpense(input: CreateExpenseDto, orgId: number, userId?: number) {
    const [result] = await this.db.insert(ktExpenses).values({
      organizationId: orgId,
      branchId: input.branchId,
      categoryId: input.categoryId,
      label: input.label,
      amount: input.amount.toFixed(2),
      currencyCode: input.currencyCode ?? "USD",
      expenseDate: toMysqlDateTime(input.expenseDate),
      note: input.note,
      attachmentUrl: input.attachmentUrl,
    });

    const expenseId = Number(result.insertId);

    // SCRUM-307 : effet de bord comptable. kt_expenses n'a aucun workflow de
    // confirmation aujourd'hui (status = soft delete uniquement), donc la
    // comptabilisation a lieu a la creation. Ne jette jamais : la depense reste
    // enregistree si la compta echoue, et l'ecriture est rejouable (idempotence
    // par ledgerEntryId + idempotencyKey).
    await this.accounting.postExpense(expenseId, orgId, userId);

    return this.findExpense(expenseId, orgId);
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
        ...(input.expenseDate !== undefined
          ? { expenseDate: toMysqlDateTime(input.expenseDate) }
          : {}),
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
          gte(ktExpenses.expenseDate, rangeStart(from)),
          lte(ktExpenses.expenseDate, rangeEnd(to)),
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
