import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, gte, inArray, like, lte, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { DRIZZLE } from "../database/database.constants";
import { currencies, subAccounts, transactions } from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";

const debitAccount = alias(subAccounts, "debitAccount");
const creditAccount = alias(subAccounts, "creditAccount");

@Injectable()
export class TransactionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateTransactionDto, orgId: number) {
    await this.ensureAccountsExist([input.debitId, input.creditId]);

    const [result] = await this.db.insert(transactions).values({
      organizationId: orgId,
      date: new Date(input.date),
      debitId: input.debitId,
      creditId: input.creditId,
      particulars: input.particulars,
      amount: input.amount,
      currencyId: input.currencyId ?? null,
      type: input.type ?? "transaction",
      relatedId: input.relatedId ?? "0",
      status: input.status ?? "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId), orgId);
  }

  async findAll(query: TransactionQueryDto, orgId: number) {
    if (query.query === "info") {
      const [row] = await this.db
        .select({
          totalCount: count(transactions.id),
          totalAmount: sum(transactions.amount),
        })
        .from(transactions)
        .where(and(eq(transactions.status, "true"), eq(transactions.organizationId, orgId)));

      return {
        _count: { id: Number(row.totalCount ?? 0) },
        _sum: { amount: row.totalAmount ?? null },
      };
    }

    if (query.query === "all") {
      return this.baseQuery()
        .where(and(eq(transactions.organizationId, orgId), eq(transactions.status, "true")))
        .orderBy(desc(transactions.id));
    }

    if (query.query === "search") {
      return this.search(query, orgId);
    }

    const status = query.query === "inactive" ? "false" : query.status;
    return this.paginated(query, orgId, status);
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.baseQuery()
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Transaction not found.");
    }

    return rows[0];
  }

  async update(id: number, input: UpdateTransactionDto, orgId: number) {
    await this.ensureTransactionExists(id, orgId);

    const accountIds = [input.debitId, input.creditId].filter(
      (accountId): accountId is number => typeof accountId === "number",
    );
    await this.ensureAccountsExist(accountIds);

    await this.db
      .update(transactions)
      .set({
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.debitId !== undefined ? { debitId: input.debitId } : {}),
        ...(input.creditId !== undefined ? { creditId: input.creditId } : {}),
        ...(input.particulars !== undefined ? { particulars: input.particulars } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currencyId !== undefined ? { currencyId: input.currencyId } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.relatedId !== undefined ? { relatedId: input.relatedId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async updateStatus(id: number, status: string, orgId: number) {
    await this.ensureTransactionExists(id, orgId);

    await this.db
      .update(transactions)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)));

    return { message: "Transaction deleted successfully" };
  }

  private async search(query: TransactionQueryDto, orgId: number) {
    const key = `%${query.key?.trim() || ""}%`;
    const pagination = this.pagination(query);
    const where = or(
      like(sql`cast(${transactions.id} as char)`, key),
      like(transactions.type, key),
      like(transactions.particulars, key),
      like(debitAccount.name, key),
      like(creditAccount.name, key),
    );

    const orgFilter = and(eq(transactions.organizationId, orgId), eq(transactions.status, "true"));
    const rows = await this.baseQuery()
      .where(and(orgFilter, where))
      .orderBy(desc(transactions.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(transactions.id) })
      .from(transactions)
      .leftJoin(debitAccount, eq(debitAccount.id, transactions.debitId))
      .leftJoin(creditAccount, eq(creditAccount.id, transactions.creditId))
      .where(and(orgFilter, where));

    return {
      getAllTransaction: rows,
      totalTransaction: Number(total.total ?? 0),
    };
  }

  private async paginated(query: TransactionQueryDto, orgId: number, forcedStatus?: string) {
    const pagination = this.pagination(query);
    const conditions = this.filterConditions(query, orgId, forcedStatus);
    const where = conditions.length ? and(...conditions) : undefined;

    const [aggregate] = await this.db
      .select({
        totalCount: count(transactions.id),
        totalAmount: sum(transactions.amount),
      })
      .from(transactions)
      .where(where);

    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(transactions.id))
      .limit(pagination.limit)
      .offset(pagination.skip);

    return {
      aggregations: {
        _count: { id: Number(aggregate.totalCount ?? 0) },
        _sum: { amount: aggregate.totalAmount ?? null },
      },
      getAllTransaction: rows,
      totalTransaction: Number(aggregate.totalCount ?? 0),
    };
  }

  private filterConditions(query: TransactionQueryDto, orgId: number, forcedStatus?: string) {
    const conditions = [eq(transactions.organizationId, orgId)];
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : null;

    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));

    const statuses = this.csv(forcedStatus ?? query.status);
    if (statuses.length) conditions.push(inArray(transactions.status, statuses));

    const debitIds = this.csvNumber(query.debitId);
    if (debitIds.length) conditions.push(inArray(transactions.debitId, debitIds));

    const creditIds = this.csvNumber(query.creditId);
    if (creditIds.length) conditions.push(inArray(transactions.creditId, creditIds));

    return conditions;
  }

  private baseQuery() {
    return this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        debitId: transactions.debitId,
        creditId: transactions.creditId,
        particulars: transactions.particulars,
        amount: transactions.amount,
        currencyId: transactions.currencyId,
        currencySymbol: currencies.currencySymbol,
        currencyName: currencies.currencyName,
        type: transactions.type,
        relatedId: transactions.relatedId,
        status: transactions.status,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        debit: {
          id: debitAccount.id,
          name: debitAccount.name,
        },
        credit: {
          id: creditAccount.id,
          name: creditAccount.name,
        },
      })
      .from(transactions)
      .leftJoin(debitAccount, eq(debitAccount.id, transactions.debitId))
      .leftJoin(creditAccount, eq(creditAccount.id, transactions.creditId))
      .leftJoin(currencies, eq(currencies.id, transactions.currencyId));
  }

  private async ensureTransactionExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Transaction not found.");
    }
  }

  private async ensureAccountsExist(accountIds: number[]) {
    const uniqueAccountIds = [...new Set(accountIds)];
    if (!uniqueAccountIds.length) return;

    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(inArray(subAccounts.id, uniqueAccountIds));

    if (rows.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Debit or credit account does not exist.");
    }
  }

  private pagination(query: TransactionQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return {
      limit,
      skip: (page - 1) * limit,
    };
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
}
