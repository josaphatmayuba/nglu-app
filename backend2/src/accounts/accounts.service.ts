import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { accounts, currencies, subAccounts, transactions } from "../database/schema";
import type { Database } from "../database/types";
import { AccountQueryDto, CreateSubAccountDto, UpdateSubAccountDto } from "./dto/account.dto";

type DateRange = { startDate?: string; endDate?: string };

@Injectable()
export class AccountsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createSubAccount(input: CreateSubAccountDto, org: number) {
    await this.ensureAccountExists(input.accountId, org);

    const [result] = await this.db.insert(subAccounts).values({
      organizationId: org,
      name: input.name,
      accountId: input.accountId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOneSubAccount(Number(result.insertId), org);
  }

  async findAll(query: AccountQueryDto, org: number) {
    const range = { startDate: query.startDate, endDate: query.endDate };
    if (query.query === "tb") return this.trialBalance(org, range);
    if (query.query === "bs") return this.balanceSheet(org, range);
    if (query.query === "is") return this.incomeStatement(org, range);
    if (query.query === "ma") return this.mainAccounts(org);
    if (query.type === "sa" && query.query === "all") return this.subAccountsForPicker(org);
    if (query.type === "sa" && query.query === "search") return this.searchSubAccounts(query, org);
    if (query.type === "sa") return this.paginatedSubAccounts(query, org);
    return this.accountsWithSubAccounts(org);
  }

  mainAccounts(org: number) {
    return this.db.select().from(accounts).where(eq(accounts.organizationId, org)).orderBy(desc(accounts.id));
  }

  subAccountsForPicker(org: number) {
    return this.subAccountQuery()
      .where(and(eq(subAccounts.status, "true"), eq(subAccounts.organizationId, org)))
      .orderBy(desc(subAccounts.id));
  }

  async findOneSubAccount(id: number, org: number) {
    const rows = await this.subAccountQuery()
      .where(and(eq(subAccounts.id, id), eq(subAccounts.organizationId, org)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Sub account not found.");
    }

    const balance = await this.subAccountBalance(id, org);

    return {
      ...rows[0],
      ...balance,
    };
  }

  async updateSubAccount(id: number, input: UpdateSubAccountDto, org: number) {
    if (id <= 15) {
      throw new BadRequestException("You can not update default sub account");
    }

    await this.ensureSubAccountExists(id, org);
    await this.ensureSubAccountHasNoTransactions(id);

    if (input.accountId !== undefined) {
      await this.ensureAccountExists(input.accountId, org);
    }

    await this.db
      .update(subAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(subAccounts.id, id), eq(subAccounts.organizationId, org)));

    return { message: "Update Successful" };
  }

  async updateSubAccountStatus(id: number, status: string, org: number) {
    await this.ensureSubAccountExists(id, org);

    await this.db
      .update(subAccounts)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(subAccounts.id, id), eq(subAccounts.organizationId, org)));

    return "Sub Account deleted successfully";
  }

  private async accountsWithSubAccounts(org: number) {
    const accountRows = await this.mainAccounts(org);
    const subAccountRows = await this.db
      .select()
      .from(subAccounts)
      .where(eq(subAccounts.organizationId, org))
      .orderBy(desc(subAccounts.id));

    return accountRows.map((account) => ({
      ...account,
      subAccount: subAccountRows.filter((subAccount) => subAccount.accountId === account.id),
    }));
  }

  private async trialBalance(org: number, range?: DateRange) {
    const items = await this.subAccountBalances(org, range);
    const debits = items.filter((item) => item.balance > 0);
    const credits = items.filter((item) => item.balance < 0);
    const totalDebit = this.round(debits.reduce((total, item) => total + item.balance, 0));
    const totalCredit = this.round(credits.reduce((total, item) => total + item.balance, 0));
    // Totaux par devise (jamais de melange entre devises).
    const byCurrency = this.balancesByCurrency(items);

    return {
      match: byCurrency.every((c) => c.match),
      byCurrency,
      totalDebit,
      totalCredit,
      debits,
      credits,
    };
  }

  private async balanceSheet(org: number, range?: DateRange) {
    const items = await this.subAccountBalances(org, range);
    const assets = items.filter((item) => item.accountType === "Asset" && item.balance !== 0);
    const liabilities = items
      .filter((item) => item.accountType === "Liability" && item.balance !== 0)
      .map((item) => ({ ...item, balance: -item.balance }));
    const equity = items
      .filter((item) => item.accountType === "Equity" && item.balance !== 0)
      .map((item) => ({ ...item, balance: -item.balance }));
    const totalAsset = this.round(assets.reduce((total, item) => total + item.balance, 0));
    const totalLiability = this.round(liabilities.reduce((total, item) => total + item.balance, 0));
    const totalEquity = this.round(equity.reduce((total, item) => total + item.balance, 0));

    return {
      match: -totalAsset === totalLiability + totalEquity,
      totalAsset,
      totalLiability,
      totalEquity,
      assets,
      liabilities,
      equity,
      assetsByCurrency: this.amountByCurrency(assets),
      liabilitiesByCurrency: this.amountByCurrency(liabilities),
      equityByCurrency: this.amountByCurrency(equity),
    };
  }

  private async incomeStatement(org: number, range?: DateRange) {
    const items = await this.subAccountBalances(org, range);
    const revenue = items
      .filter((item) => item.account === "Revenue" && item.balance !== 0)
      .map((item) => ({ ...item, balance: -item.balance }));
    const expense = items
      .filter((item) => item.account === "Expense" && item.balance !== 0)
      .map((item) => ({ ...item, balance: -item.balance }));
    const totalRevenue = this.round(revenue.reduce((total, item) => total + item.balance, 0));
    const totalExpense = this.round(expense.reduce((total, item) => total + item.balance, 0));

    return {
      totalRevenue,
      totalExpense,
      profit: this.round(totalRevenue + totalExpense),
      revenue,
      expense,
      revenueByCurrency: this.amountByCurrency(revenue),
      expenseByCurrency: this.amountByCurrency(expense),
    };
  }

  private async searchSubAccounts(query: AccountQueryDto, org: number) {
    const pagination = this.pagination(query);
    const key = `%${query.key?.trim() || ""}%`;
    const filter = and(like(subAccounts.name, key), eq(subAccounts.status, "true"), eq(subAccounts.organizationId, org));
    const rows = await this.subAccountQuery()
      .where(filter)
      .orderBy(desc(subAccounts.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(subAccounts.id) })
      .from(subAccounts)
      .where(filter);

    return {
      getAllSubAccount: rows,
      totalSubAccount: Number(total.total ?? 0),
    };
  }

  private async paginatedSubAccounts(query: AccountQueryDto, org: number) {
    const pagination = this.pagination(query);
    const conditions = [eq(subAccounts.organizationId, org)];
    const statuses = this.csv(query.status);
    const accountIds = this.csvNumber(query.accountId);

    if (statuses.length) conditions.push(inArray(subAccounts.status, statuses));
    if (accountIds.length) conditions.push(inArray(subAccounts.accountId, accountIds));

    const where = and(...conditions);
    const rows = await this.subAccountQuery()
      .where(where)
      .orderBy(desc(subAccounts.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(subAccounts.id) }).from(subAccounts).where(where);

    return {
      getAllSubAccount: rows,
      totalSubAccount: Number(total.total ?? 0),
    };
  }

  private subAccountQuery() {
    return this.db
      .select({
        id: subAccounts.id,
        name: subAccounts.name,
        accountId: subAccounts.accountId,
        status: subAccounts.status,
        createdAt: subAccounts.createdAt,
        updatedAt: subAccounts.updatedAt,
        account: {
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
        },
      })
      .from(subAccounts)
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId));
  }

  private async subAccountBalances(org: number, range?: DateRange) {
    // Bornes de date (incluses) appliquees a la date de l'ecriture; sans borne = tout l'historique.
    const start = range?.startDate ? new Date(range.startDate) : null;
    const end = range?.endDate ? new Date(range.endDate) : null;
    const inRange = sql`
      (${start ? sql`${transactions.date} >= ${start}` : sql`1=1`})
      and (${end ? sql`${transactions.date} <= ${end}` : sql`1=1`})`;

    // Une ligne par (sous-compte x devise) : aucune conversion, chaque devise garde son solde.
    // Isolation P2 : on ne part QUE des sous-comptes de l org ; comme les
    // transactions portent aussi organization_id, le solde d un sous-compte
    // d une autre org ne peut pas remonter ici.
    const rows = await this.db
      .select({
        id: subAccounts.id,
        account: accounts.name,
        accountType: accounts.type,
        subAccount: subAccounts.name,
        currencyId: transactions.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        totalDebit: sql<string>`coalesce(sum(case when ${transactions.status} = 'true' and ${transactions.debitId} = ${subAccounts.id} and ${inRange} then ${transactions.amount} else 0 end), 0)`,
        totalCredit: sql<string>`coalesce(sum(case when ${transactions.status} = 'true' and ${transactions.creditId} = ${subAccounts.id} and ${inRange} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(subAccounts)
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId))
      .leftJoin(
        transactions,
        sql`(${transactions.debitId} = ${subAccounts.id} or ${transactions.creditId} = ${subAccounts.id}) and ${transactions.organizationId} = ${org}`,
      )
      .leftJoin(currencies, eq(currencies.id, transactions.currencyId))
      .where(eq(subAccounts.organizationId, org))
      .groupBy(subAccounts.id, transactions.currencyId)
      .orderBy(desc(subAccounts.id));

    return rows
      // Exclut la ligne "sans devise" du leftJoin pour un sous-compte sans transaction.
      .filter((row) => !(row.currencyId == null && Number(row.totalDebit) === 0 && Number(row.totalCredit) === 0))
      .map((row) => {
        const totalDebit = this.round(Number(row.totalDebit));
        const totalCredit = this.round(Number(row.totalCredit));
        return {
          id: row.id,
          account: row.account,
          accountType: row.accountType,
          subAccount: row.subAccount,
          currencyId: row.currencyId ?? null,
          currencyCode: row.currencyCode ?? null,
          currencySymbol: row.currencySymbol ?? null,
          totalDebit,
          totalCredit,
          balance: this.round(totalDebit - totalCredit),
        };
      });
  }

  /** Somme `balance` par devise (debit/credit separes). Aucune conversion. */
  private balancesByCurrency(
    items: Array<{ currencyId: number | null; currencyCode: string | null; currencySymbol: string | null; balance: number }>,
  ) {
    const map = new Map<
      string,
      { currencyId: number | null; currencyCode: string | null; currencySymbol: string | null; totalDebit: number; totalCredit: number }
    >();
    for (const i of items) {
      const key = String(i.currencyId ?? "null");
      const acc =
        map.get(key) ??
        { currencyId: i.currencyId, currencyCode: i.currencyCode, currencySymbol: i.currencySymbol, totalDebit: 0, totalCredit: 0 };
      if (i.balance > 0) acc.totalDebit += i.balance;
      else if (i.balance < 0) acc.totalCredit += i.balance;
      map.set(key, acc);
    }
    return [...map.values()].map((c) => {
      const totalDebit = this.round(c.totalDebit);
      const totalCredit = this.round(c.totalCredit);
      return { ...c, totalDebit, totalCredit, match: -totalDebit === totalCredit };
    });
  }

  /** Somme un champ `balance` par devise pour des postes (bilan/resultat). */
  private amountByCurrency(
    items: Array<{ currencyId: number | null; currencyCode: string | null; currencySymbol: string | null; balance: number }>,
  ) {
    const map = new Map<string, { currencyId: number | null; currencyCode: string | null; currencySymbol: string | null; total: number }>();
    for (const i of items) {
      const key = String(i.currencyId ?? "null");
      const acc =
        map.get(key) ??
        { currencyId: i.currencyId, currencyCode: i.currencyCode, currencySymbol: i.currencySymbol, total: 0 };
      acc.total += i.balance;
      map.set(key, acc);
    }
    return [...map.values()].map((c) => ({ ...c, total: this.round(c.total) }));
  }

  private async subAccountBalance(id: number, org: number) {
    // Soldes du sous-compte detailles par devise (pas de melange/conversion).
    const all = await this.subAccountBalances(org);
    const lines = all.filter((row) => row.id === id);
    const totalDebit = this.round(lines.reduce((t, l) => t + l.totalDebit, 0));
    const totalCredit = this.round(lines.reduce((t, l) => t + l.totalCredit, 0));

    return {
      totalDebit,
      totalCredit,
      balance: this.round(totalDebit - totalCredit),
      byCurrency: lines.map((l) => ({
        currencyId: l.currencyId,
        currencyCode: l.currencyCode,
        currencySymbol: l.currencySymbol,
        totalDebit: l.totalDebit,
        totalCredit: l.totalCredit,
        balance: l.balance,
      })),
    };
  }

  private async ensureAccountExists(id: number, org: number) {
    const rows = await this.db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.organizationId, org)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Account not found.");
    }
  }

  private async ensureSubAccountExists(id: number, org: number) {
    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(eq(subAccounts.id, id), eq(subAccounts.organizationId, org)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Sub account not found.");
    }
  }

  private async ensureSubAccountHasNoTransactions(id: number) {
    const rows = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(sql`${transactions.debitId} = ${id} or ${transactions.creditId} = ${id}`)
      .limit(1);
    if (rows.length) {
      throw new BadRequestException("Transaction has already been made in this account");
    }
  }

  private pagination(query: AccountQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return { limit, skip: (page - 1) * limit };
  }

  private csv(value?: string) {
    return value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private csvNumber(value?: string) {
    return this.csv(value)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  private round(value: number) {
    return Number(value.toFixed(3));
  }
}
