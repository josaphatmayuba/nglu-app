import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { DRIZZLE } from "../database/database.constants";
import { subAccounts, transactionTypes } from "../database/schema";
import type { Database } from "../database/types";
import { CreateTransactionTypeDto } from "./dto/create-transaction-type.dto";
import { UpdateTransactionTypeDto } from "./dto/update-transaction-type.dto";

const debitAccount = alias(subAccounts, "debitAccount");
const creditAccount = alias(subAccounts, "creditAccount");

@Injectable()
export class TransactionTypesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(org: number) {
    const rows = await this.baseQuery()
      .where(and(eq(transactionTypes.isActive, true), eq(transactionTypes.organizationId, org)))
      .orderBy(desc(transactionTypes.id));

    return rows.map(this.toResponse);
  }

  async findOne(id: number, org: number) {
    const rows = await this.baseQuery()
      .where(and(eq(transactionTypes.id, id), eq(transactionTypes.organizationId, org)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Transaction type not found.");
    }

    return this.toResponse(rows[0]);
  }

  async create(input: CreateTransactionTypeDto, org: number) {
    await this.ensureAccountsExist([input.debitAccountId, input.creditAccountId], org);

    const [result] = await this.db.insert(transactionTypes).values({
      organizationId: org,
      name: input.name,
      debitAccountId: input.debitAccountId,
      creditAccountId: input.creditAccountId,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId), org);
  }

  async update(id: number, input: UpdateTransactionTypeDto, org: number) {
    await this.ensureTransactionTypeExists(id, org);

    const accountIds = [input.debitAccountId, input.creditAccountId].filter(
      (accountId): accountId is number => typeof accountId === "number",
    );
    await this.ensureAccountsExist(accountIds, org);

    await this.db
      .update(transactionTypes)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.debitAccountId !== undefined ? { debitAccountId: input.debitAccountId } : {}),
        ...(input.creditAccountId !== undefined ? { creditAccountId: input.creditAccountId } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(transactionTypes.id, id), eq(transactionTypes.organizationId, org)));

    return this.findOne(id, org);
  }

  async remove(id: number, org: number) {
    await this.ensureTransactionTypeExists(id, org);

    await this.db
      .delete(transactionTypes)
      .where(and(eq(transactionTypes.id, id), eq(transactionTypes.organizationId, org)));

    return {
      message: "Transaction type deleted successfully.",
    };
  }

  private async ensureTransactionTypeExists(id: number, org: number) {
    const rows = await this.db
      .select({ id: transactionTypes.id })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.id, id), eq(transactionTypes.organizationId, org)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Transaction type not found.");
    }
  }

  private async ensureAccountsExist(accountIds: number[], org: number) {
    const uniqueAccountIds = [...new Set(accountIds)];

    if (!uniqueAccountIds.length) {
      return;
    }

    // Les sous-comptes references doivent appartenir a l org (anti-fuite : on ne
    // peut pas lier une regle de transaction au compte d une autre organisation).
    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(inArray(subAccounts.id, uniqueAccountIds), eq(subAccounts.organizationId, org)));

    if (rows.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Debit or credit account does not exist.");
    }
  }

  private baseQuery() {
    return this.db
      .select({
        id: transactionTypes.id,
        name: transactionTypes.name,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
        description: transactionTypes.description,
        isActive: transactionTypes.isActive,
        createdAt: transactionTypes.createdAt,
        updatedAt: transactionTypes.updatedAt,
        debitAccountName: debitAccount.name,
        creditAccountName: creditAccount.name,
      })
      .from(transactionTypes)
      .leftJoin(debitAccount, eq(debitAccount.id, transactionTypes.debitAccountId))
      .leftJoin(creditAccount, eq(creditAccount.id, transactionTypes.creditAccountId));
  }

  private toResponse(row: Awaited<ReturnType<ReturnType<TransactionTypesService["baseQuery"]>["execute"]>>[number]) {
    return {
      id: row.id,
      name: row.name,
      debitAccountId: row.debitAccountId,
      creditAccountId: row.creditAccountId,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      debitAccount: row.debitAccountId
        ? { id: row.debitAccountId, name: row.debitAccountName }
        : null,
      creditAccount: row.creditAccountId
        ? { id: row.creditAccountId, name: row.creditAccountName }
        : null,
    };
  }
}
