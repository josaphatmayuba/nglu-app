import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { paymentMethods, subAccounts } from "../database/schema";
import type { Database } from "../database/types";
import {
  CreatePaymentMethodDto,
  PaymentMethodQueryDto,
  UpdatePaymentMethodDto,
} from "./dto/payment-method.dto";

@Injectable()
export class PaymentMethodsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreatePaymentMethodDto, orgId: number) {
    await this.ensureSubAccountExists(input.subAccountId, orgId);

    const [result] = await this.db.insert(paymentMethods).values({
      organizationId: orgId,
      subAccountId: input.subAccountId,
      methodName: input.methodName,
      logo: input.logo ?? null,
      ownerAccount: input.ownerAccount ?? null,
      instruction: input.instruction ?? null,
      isActive: "true",
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId), orgId);
  }

  async findAll(query: PaymentMethodQueryDto, orgId: number) {
    if (query.query === "all") {
      return this.baseQuery().where(eq(paymentMethods.organizationId, orgId)).orderBy(desc(paymentMethods.id));
    }

    if (query.query === "search") {
      return this.search(query, orgId);
    }

    return this.paginated(query, orgId);
  }

  async update(id: number, input: UpdatePaymentMethodDto, orgId: number) {
    await this.ensurePaymentMethodExists(id, orgId);

    if (id === 1 && (input.methodName || input.ownerAccount || input.instruction || input.subAccountId)) {
      throw new BadRequestException("This payment method has update restrictions!");
    }

    if (input.subAccountId !== undefined) {
      await this.ensureSubAccountExists(input.subAccountId, orgId);
    }

    await this.db
      .update(paymentMethods)
      .set({
        ...(input.subAccountId !== undefined ? { subAccountId: input.subAccountId } : {}),
        ...(input.methodName !== undefined ? { methodName: input.methodName } : {}),
        ...(input.logo !== undefined ? { logo: input.logo } : {}),
        ...(input.ownerAccount !== undefined ? { ownerAccount: input.ownerAccount } : {}),
        ...(input.instruction !== undefined ? { instruction: input.instruction } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, orgId)));

    return { message: "Payment Method Update Successful!" };
  }

  async updateStatus(id: number, status: string, orgId: number) {
    await this.ensurePaymentMethodExists(id, orgId);

    if (id === 1) {
      throw new BadRequestException("This payment method has removal restrictions!");
    }

    await this.db
      .update(paymentMethods)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, orgId)));

    return { message: "Payment Method deleted successfully!" };
  }

  private async findOne(id: number, orgId: number) {
    const rows = await this.baseQuery()
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Payment method not found.");
    }
    return rows[0];
  }

  private async search(query: PaymentMethodQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const key = `%${query.key?.trim() || ""}%`;
    const where = and(
      eq(paymentMethods.organizationId, orgId),
      or(
        like(paymentMethods.methodName, key),
        like(paymentMethods.ownerAccount, key),
        like(paymentMethods.isActive, key),
        like(paymentMethods.status, key),
        like(sql`cast(${paymentMethods.subAccountId} as char)`, key),
      ),
    );

    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(paymentMethods.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(paymentMethods.id) }).from(paymentMethods).where(where);

    return {
      getAllPaymentMethod: rows,
      totalPaymentMethod: Number(total.total ?? 0),
    };
  }

  private async paginated(query: PaymentMethodQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const where = and(
      eq(paymentMethods.organizationId, orgId),
      query.status ? eq(paymentMethods.status, query.status) : undefined,
    );
    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(paymentMethods.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(paymentMethods.id) }).from(paymentMethods).where(where);

    return {
      getAllPaymentMethod: rows,
      totalPaymentMethod: Number(total.total ?? 0),
    };
  }

  private baseQuery() {
    return this.db
      .select({
        id: paymentMethods.id,
        subAccountId: paymentMethods.subAccountId,
        methodName: paymentMethods.methodName,
        logo: paymentMethods.logo,
        ownerAccount: paymentMethods.ownerAccount,
        instruction: paymentMethods.instruction,
        isActive: paymentMethods.isActive,
        status: paymentMethods.status,
        createdAt: paymentMethods.createdAt,
        updatedAt: paymentMethods.updatedAt,
        subAccount: {
          id: subAccounts.id,
          name: subAccounts.name,
          accountId: subAccounts.accountId,
          status: subAccounts.status,
        },
      })
      .from(paymentMethods)
      .leftJoin(subAccounts, eq(subAccounts.id, paymentMethods.subAccountId));
  }

  private async ensurePaymentMethodExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(and(eq(paymentMethods.id, id), eq(paymentMethods.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Payment method not found.");
    }
  }

  private async ensureSubAccountExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(eq(subAccounts.id, id), eq(subAccounts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Sub account not found.");
    }
  }

  private pagination(query: PaymentMethodQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return { limit, skip: (page - 1) * limit };
  }
}
