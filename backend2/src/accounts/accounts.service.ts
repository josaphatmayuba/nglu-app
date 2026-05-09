import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { DRIZZLE } from "../database/database.constants";
import { accounts, subAccounts, transactions } from "../database/schema";
import type { Database } from "../database/types";
import { AccountQueryDto, CreateSubAccountDto, UpdateSubAccountDto } from "./dto/account.dto";

const debitTransaction = alias(transactions, "debitTransaction");
const creditTransaction = alias(transactions, "creditTransaction");

@Injectable()
export class AccountsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createSubAccount(input: CreateSubAccountDto) {
    await this.ensureAccountExists(input.accountId);

    const [result] = await this.db.insert(subAccounts).values({
      name: input.name,
      accountId: input.accountId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOneSubAccount(Number(result.insertId));
  }

  async findAll(query: AccountQueryDto) {
    if (query.query === "tb") return this.trialBalance();
    if (query.query === "bs") return this.balanceSheet();
    if (query.query === "is") return this.incomeStatement();
    if (query.query === "ma") return this.mainAccounts();
    if (query.type === "sa" && query.query === "all") return this.subAccountsForPicker();
    if (query.type === "sa" && query.query === "search") return this.searchSubAccounts(query);
    if (query.type === "sa") return this.paginatedSubAccounts(query);
    return this.accountsWithSubAccounts();
  }

  mainAccounts() {
    return this.db.select().from(accounts).orderBy(desc(accounts.id));
  }

  subAccountsForPicker() {
    return this.subAccountQuery().where(eq(subAccounts.status, "true")).orderBy(desc(subAccounts.id));
  }

  async findOneSubAccount(id: number) {
    const rows = await this.subAccountQuery().where(eq(subAccounts.id, id)).limit(1);

    if (!rows.length) {
      throw new NotFoundException("Sub account not found.");
    }

    const balance = await this.subAccountBalance(id);

    return {
      ...rows[0],
      ...balance,
    };
  }

  async updateSubAccount(id: number, input: UpdateSubAccountDto) {
    if (id <= 15) {
      throw new BadRequestException("You can not update default sub account");
    }

    await this.ensureSubAccountExists(id);
    await this.ensureSubAccountHasNoTransactions(id);

    if (input.accountId !== undefined) {
      await this.ensureAccountExists(input.accountId);
    }

    await this.db
      .update(subAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(subAccounts.id, id));

    return { message: "Update Successful" };
  }

  async updateSubAccountStatus(id: number, status: string) {
    await this.ensureSubAccountExists(id);

    await this.db
      .update(subAccounts)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(subAccounts.id, id));

    return "Sub Account deleted successfully";
  }

  private async accountsWithSubAccounts() {
    const accountRows = await this.mainAccounts();
    const subAccountRows = await this.db.select().from(subAccounts).orderBy(desc(subAccounts.id));

    return accountRows.map((account) => ({
      ...account,
      subAccount: subAccountRows.filter((subAccount) => subAccount.accountId === account.id),
    }));
  }

  private async trialBalance() {
    const items = await this.subAccountBalances();
    const debits = items.filter((item) => item.balance > 0);
    const credits = items.filter((item) => item.balance < 0);
    const totalDebit = this.round(debits.reduce((total, item) => total + item.balance, 0));
    const totalCredit = this.round(credits.reduce((total, item) => total + item.balance, 0));

    return {
      match: -totalDebit === totalCredit,
      totalDebit,
      totalCredit,
      debits,
      credits,
    };
  }

  private async balanceSheet() {
    const items = await this.subAccountBalances();
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
    };
  }

  private async incomeStatement() {
    const items = await this.subAccountBalances();
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
    };
  }

  private async searchSubAccounts(query: AccountQueryDto) {
    const pagination = this.pagination(query);
    const key = `%${query.key?.trim() || ""}%`;
    const rows = await this.subAccountQuery()
      .where(and(like(subAccounts.name, key), eq(subAccounts.status, "true")))
      .orderBy(desc(subAccounts.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(subAccounts.id) })
      .from(subAccounts)
      .where(and(like(subAccounts.name, key), eq(subAccounts.status, "true")));

    return {
      getAllSubAccount: rows,
      totalSubAccount: Number(total.total ?? 0),
    };
  }

  private async paginatedSubAccounts(query: AccountQueryDto) {
    const pagination = this.pagination(query);
    const conditions = [];
    const statuses = this.csv(query.status);
    const accountIds = this.csvNumber(query.accountId);

    if (statuses.length) conditions.push(inArray(subAccounts.status, statuses));
    if (accountIds.length) conditions.push(inArray(subAccounts.accountId, accountIds));

    const where = conditions.length ? and(...conditions) : undefined;
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

  private async subAccountBalances() {
    const rows = await this.db
      .select({
        id: subAccounts.id,
        account: accounts.name,
        accountType: accounts.type,
        subAccount: subAccounts.name,
        totalDebit: sql<string>`coalesce(sum(case when ${transactions.status} = 'true' and ${transactions.debitId} = ${subAccounts.id} then ${transactions.amount} else 0 end), 0)`,
        totalCredit: sql<string>`coalesce(sum(case when ${transactions.status} = 'true' and ${transactions.creditId} = ${subAccounts.id} then ${transactions.amount} else 0 end), 0)`,
      })
      .from(subAccounts)
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId))
      .leftJoin(
        transactions,
        sql`${transactions.debitId} = ${subAccounts.id} or ${transactions.creditId} = ${subAccounts.id}`,
      )
      .groupBy(subAccounts.id)
      .orderBy(desc(subAccounts.id));

    return rows.map((row) => {
      const totalDebit = this.round(Number(row.totalDebit));
      const totalCredit = this.round(Number(row.totalCredit));
      return {
        id: row.id,
        account: row.account,
        accountType: row.accountType,
        subAccount: row.subAccount,
        totalDebit,
        totalCredit,
        balance: this.round(totalDebit - totalCredit),
      };
    });
  }

  private async subAccountBalance(id: number) {
    const [row] = await this.db
      .select({
        totalDebit: sum(debitTransaction.amount),
        totalCredit: sum(creditTransaction.amount),
      })
      .from(subAccounts)
      .leftJoin(debitTransaction, and(eq(debitTransaction.debitId, subAccounts.id), eq(debitTransaction.status, "true")))
      .leftJoin(creditTransaction, and(eq(creditTransaction.creditId, subAccounts.id), eq(creditTransaction.status, "true")))
      .where(eq(subAccounts.id, id))
      .groupBy(subAccounts.id);

    const totalDebit = this.round(Number(row?.totalDebit ?? 0));
    const totalCredit = this.round(Number(row?.totalCredit ?? 0));

    return {
      totalDebit,
      totalCredit,
      balance: this.round(totalDebit - totalCredit),
    };
  }

  private async ensureAccountExists(id: number) {
    const rows = await this.db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException("Account not found.");
    }
  }

  private async ensureSubAccountExists(id: number) {
    const rows = await this.db.select({ id: subAccounts.id }).from(subAccounts).where(eq(subAccounts.id, id)).limit(1);
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
