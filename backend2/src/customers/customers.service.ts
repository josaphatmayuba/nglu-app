import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { and, count, desc, eq, inArray, like, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { DRIZZLE } from "../database/database.constants";
import { customers, returnSaleInvoices, saleInvoices, subAccounts, transactions, users } from "../database/schema";
import type { Database } from "../database/types";
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from "./dto/customer.dto";

const debitAccount = alias(subAccounts, "customerDebitAccount");
const creditAccount = alias(subAccounts, "customerCreditAccount");

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateCustomerDto, orgId: number) {
    if (input.email) {
      await this.ensureEmailAvailable(input.email);
    }

    const username = input.username || this.usernameFromEmail(input.email) || input.phone || "Customer";
    const password = await bcrypt.hash(randomBytes(12).toString("hex"), 10);
    const [result] = await this.db.insert(customers).values({
      organizationId: orgId,
      username,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      password,
      roleId: 3,
      isLogin: "false",
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId), orgId);
  }

  async findAll(query: CustomerQueryDto, orgId: number) {
    if (query.query === "all") {
      return this.customerQuery()
        .where(and(eq(customers.status, "true"), eq(customers.organizationId, orgId)))
        .orderBy(desc(customers.id));
    }

    if (query.query === "info") {
      const [row] = await this.db
        .select({ countedId: count(customers.id) })
        .from(customers)
        .where(and(eq(customers.status, "true"), eq(customers.organizationId, orgId)));

      return {
        _count: {
          id: Number(row.countedId ?? 0),
        },
      };
    }

    if (query.query === "search") {
      return this.search(query, orgId);
    }

    if (query.query === "report") {
      return this.report(orgId);
    }

    return this.paginated(query, orgId);
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.customerQuery()
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Customer not found.");
    }

    const [totals, details] = await Promise.all([
      this.customerTotals(id, orgId),
      this.customerDetails(id, orgId),
    ]);

    return {
      ...rows[0],
      ...totals,
      ...details,
    };
  }

  async update(id: number, input: UpdateCustomerDto, orgId: number) {
    await this.ensureCustomerExists(id, orgId);

    if (input.email) {
      await this.ensureEmailAvailable(input.email, id);
    }

    await this.db
      .update(customers)
      .set({
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)));

    return { message: "Customer Updated SuccessFully" };
  }

  async updateStatus(id: number, status: string, orgId: number) {
    await this.ensureCustomerExists(id, orgId);

    await this.db
      .update(customers)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)));

    return { message: "Customer Deleted SuccessFull" };
  }

  private async search(query: CustomerQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const key = `%${query.key?.trim() || ""}%`;
    const keyWhere = or(
      like(customers.username, key),
      like(customers.firstName, key),
      like(customers.lastName, key),
      like(customers.phone, key),
      like(customers.email, key),
      like(customers.address, key),
    );
    const where = and(eq(customers.organizationId, orgId), keyWhere);

    const rows = await this.customerQuery()
      .where(where)
      .orderBy(desc(customers.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(customers.id) }).from(customers).where(where);

    return {
      getAllCustomer: rows,
      totalCustomer: Number(total.total ?? 0),
    };
  }

  private async paginated(query: CustomerQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const statuses = this.csv(query.status);
    const orgFilter = eq(customers.organizationId, orgId);
    const where = statuses.length ? and(orgFilter, inArray(customers.status, statuses)) : orgFilter;
    const rows = await this.customerQuery()
      .where(where)
      .orderBy(desc(customers.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(customers.id) }).from(customers).where(where);

    return {
      getAllCustomer: rows,
      totalCustomer: Number(total.total ?? 0),
    };
  }

  private async report(orgId: number) {
    const rows = await this.customerQuery()
      .where(and(eq(customers.status, "true"), eq(customers.organizationId, orgId)))
      .orderBy(desc(customers.createdAt));
    const enriched = await Promise.all(
      rows.map(async (customer) => ({
        ...customer,
        ...(await this.customerTotals(customer.id, orgId)),
      })),
    );

    const grandData = enriched.reduce(
      (totals, customer) => ({
        grandTotalAmount: totals.grandTotalAmount + customer.totalAmount,
        grandTotalPaidAmount: totals.grandTotalPaidAmount + customer.totalPaidAmount,
        grandTotalReturnAmount: totals.grandTotalReturnAmount + customer.totalReturnAmount,
        grandInstantPaidReturnAmount: totals.grandInstantPaidReturnAmount + customer.instantPaidReturnAmount,
        grandDueAmount: totals.grandDueAmount + customer.dueAmount,
      }),
      {
        grandTotalAmount: 0,
        grandTotalPaidAmount: 0,
        grandTotalReturnAmount: 0,
        grandInstantPaidReturnAmount: 0,
        grandDueAmount: 0,
      },
    );

    return {
      grandData,
      allCustomer: enriched,
    };
  }

  private customerQuery() {
    return this.db
      .select({
        id: customers.id,
        profileImage: customers.profileImage,
        firstName: customers.firstName,
        lastName: customers.lastName,
        username: customers.username,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        roleId: customers.roleId,
        isLogin: customers.isLogin,
        status: customers.status,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      })
      .from(customers);
  }

  private async customerTotals(customerId: number, orgId: number) {
    const relatedIds = await this.saleRelatedIds(customerId, orgId);

    if (!relatedIds.length) {
      return {
        totalAmount: 0,
        totalPaidAmount: 0,
        totalReturnAmount: 0,
        instantPaidReturnAmount: 0,
        dueAmount: 0,
        totalSaleInvoice: 0,
        totalReturnSaleInvoice: 0,
      };
    }

    const [saleDebit] = await this.totalByRelated(relatedIds, "sale", "debitId", 4, orgId);
    const [saleCredit] = await this.totalByRelated(relatedIds, "sale", "creditId", 4, orgId);
    const [returnCredit] = await this.totalByRelated(relatedIds, "sale_return", "creditId", 4, orgId);
    const [returnDebit] = await this.totalByRelated(relatedIds, "sale_return", "debitId", 4, orgId);
    const [returnInvoiceCount] = await this.db
      .select({ total: count(returnSaleInvoices.id) })
      .from(returnSaleInvoices)
      .where(and(eq(returnSaleInvoices.organizationId, orgId), inArray(returnSaleInvoices.saleInvoiceId, relatedIds)));
    const totalAmount = this.round(Number(saleDebit.total ?? 0));
    const totalPaidAmount = this.round(Number(saleCredit.total ?? 0));
    const totalReturnAmount = this.round(Number(returnCredit.total ?? 0));
    const instantPaidReturnAmount = this.round(Number(returnDebit.total ?? 0));

    return {
      totalAmount,
      totalPaidAmount,
      totalReturnAmount,
      instantPaidReturnAmount,
      dueAmount: this.round(totalAmount - totalReturnAmount - totalPaidAmount + instantPaidReturnAmount),
      totalSaleInvoice: relatedIds.length,
      totalReturnSaleInvoice: Number(returnInvoiceCount.total ?? 0),
    };
  }

  private async customerDetails(customerId: number, orgId: number) {
    const saleInvoice = await this.customerSaleInvoices(customerId, orgId);
    const relatedIds = saleInvoice.map((invoice) => String(invoice.id));

    if (!relatedIds.length) {
      return {
        saleInvoice,
        returnSaleInvoice: [],
        allTransaction: [],
      };
    }

    const [returnSaleInvoice, allTransaction] = await Promise.all([
      this.customerReturnSaleInvoices(relatedIds, orgId),
      this.customerTransactions(relatedIds, orgId),
    ]);

    return {
      saleInvoice,
      returnSaleInvoice,
      allTransaction,
    };
  }

  private customerSaleInvoices(customerId: number, orgId: number) {
    return this.db
      .select({
        id: saleInvoices.id,
        date: saleInvoices.date,
        invoiceMemoNo: saleInvoices.invoiceMemoNo,
        totalAmount: saleInvoices.totalAmount,
        totalTaxAmount: saleInvoices.totalTaxAmount,
        totalDiscountAmount: saleInvoices.totalDiscountAmount,
        paidAmount: saleInvoices.paidAmount,
        dueAmount: saleInvoices.dueAmount,
        profit: saleInvoices.profit,
        customerId: saleInvoices.customerId,
        currencyId: saleInvoices.currencyId,
        userId: saleInvoices.userId,
        note: saleInvoices.note,
        dueDate: saleInvoices.dueDate,
        isHold: saleInvoices.isHold,
        orderStatus: saleInvoices.orderStatus,
        createdAt: saleInvoices.createdAt,
        updatedAt: saleInvoices.updatedAt,
        user: {
          id: users.id,
          username: users.username,
        },
      })
      .from(saleInvoices)
      .leftJoin(users, eq(users.id, saleInvoices.userId))
      .where(and(eq(saleInvoices.customerId, customerId), eq(saleInvoices.organizationId, orgId), eq(saleInvoices.status, "true")))
      .orderBy(desc(saleInvoices.createdAt));
  }

  private customerReturnSaleInvoices(relatedIds: string[], orgId: number) {
    return this.db
      .select({
        id: returnSaleInvoices.id,
        date: returnSaleInvoices.date,
        totalAmount: returnSaleInvoices.totalAmount,
        instantReturnAmount: returnSaleInvoices.instantReturnAmount,
        tax: returnSaleInvoices.tax,
        note: returnSaleInvoices.note,
        saleInvoiceId: returnSaleInvoices.saleInvoiceId,
        invoiceMemoNo: returnSaleInvoices.invoiceMemoNo,
        createdAt: returnSaleInvoices.createdAt,
        updatedAt: returnSaleInvoices.updatedAt,
      })
      .from(returnSaleInvoices)
      .where(and(eq(returnSaleInvoices.organizationId, orgId), inArray(returnSaleInvoices.saleInvoiceId, relatedIds)))
      .orderBy(desc(returnSaleInvoices.createdAt));
  }

  private customerTransactions(relatedIds: string[], orgId: number) {
    return this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        debitId: transactions.debitId,
        creditId: transactions.creditId,
        particulars: transactions.particulars,
        amount: transactions.amount,
        currencyId: transactions.currencyId,
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
      .where(
        and(
          eq(transactions.organizationId, orgId),
          eq(transactions.status, "true"),
          inArray(transactions.type, ["sale", "sale_return"]),
          inArray(transactions.relatedId, relatedIds),
        ),
      )
      .orderBy(desc(transactions.id));
  }

  private async saleRelatedIds(customerId: number, orgId: number) {
    const rows = await this.db
      .select({ id: saleInvoices.id })
      .from(saleInvoices)
      .where(and(eq(saleInvoices.customerId, customerId), eq(saleInvoices.organizationId, orgId), eq(saleInvoices.status, "true")));

    return rows.map((row) => String(row.id));
  }

  private totalByRelated(
    relatedIds: string[],
    type: string,
    side: "debitId" | "creditId",
    accountId: number,
    orgId: number,
  ) {
    return this.db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, orgId),
          eq(transactions.type, type),
          eq(transactions.status, "true"),
          inArray(transactions.relatedId, relatedIds),
          eq(side === "debitId" ? transactions.debitId : transactions.creditId, accountId),
        ),
      );
  }

  private async ensureEmailAvailable(email: string, currentId?: number) {
    const rows = await this.db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
    if (rows.length && rows[0].id !== currentId) {
      throw new BadRequestException("Customer email already exists.");
    }
  }

  private async ensureCustomerExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Customer not found.");
    }
  }

  private usernameFromEmail(email?: string | null) {
    return email ? email.split("@")[0] : null;
  }

  private pagination(query: CustomerQueryDto) {
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

  private round(value: number) {
    return Number(value.toFixed(3));
  }
}
