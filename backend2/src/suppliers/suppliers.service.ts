import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, or, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { suppliers, transactions } from "../database/schema";
import type { Database } from "../database/types";
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from "./dto/supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateSupplierDto, orgId: number) {
    await this.ensurePhoneAvailable(input.phone, orgId);
    if (input.email) {
      await this.ensureEmailAvailable(input.email, orgId);
    }

    const [result] = await this.db.insert(suppliers).values({
      organizationId: orgId,
      name: input.name,
      phone: input.phone,
      address: input.address ?? null,
      email: input.email ?? null,
      partyType: input.partyType ?? "company",
      supplierType: input.supplierType ?? "general",
      contactPerson: input.contactPerson ?? null,
      rccm: input.rccm ?? null,
      nationalId: input.nationalId ?? null,
      taxId: input.taxId ?? null,
      paymentTerms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId), orgId);
  }

  async findAll(query: SupplierQueryDto, orgId: number) {
    if (query.query === "all") {
      return this.supplierQuery().where(eq(suppliers.organizationId, orgId)).orderBy(desc(suppliers.id));
    }

    if (query.query === "info") {
      const [row] = await this.db
        .select({ countedId: count(suppliers.id) })
        .from(suppliers)
        .where(and(eq(suppliers.organizationId, orgId), eq(suppliers.status, "true")));
      return { _count: { id: Number(row.countedId ?? 0) } };
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
    const rows = await this.supplierQuery()
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Supplier not found.");
    }

    const totals = await this.supplierTotals(id, orgId);
    return { ...rows[0], ...totals };
  }

  async update(id: number, input: UpdateSupplierDto, orgId: number) {
    await this.ensureSupplierExists(id, orgId);
    if (input.phone) {
      await this.ensurePhoneAvailable(input.phone, orgId, id);
    }
    if (input.email) {
      await this.ensureEmailAvailable(input.email, orgId, id);
    }

    await this.db
      .update(suppliers)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.partyType !== undefined ? { partyType: input.partyType } : {}),
        ...(input.supplierType !== undefined ? { supplierType: input.supplierType } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
        ...(input.rccm !== undefined ? { rccm: input.rccm } : {}),
        ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
        ...(input.taxId !== undefined ? { taxId: input.taxId } : {}),
        ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)));

    return { message: "Supplier updated Successfully" };
  }

  async updateStatus(id: number, status: string, orgId: number) {
    await this.ensureSupplierExists(id, orgId);
    await this.db
      .update(suppliers)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)));
    return { message: "Supplier Hided Successfully" };
  }

  private async search(query: SupplierQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const key = `%${query.key?.trim() || ""}%`;
    const where = and(
      eq(suppliers.organizationId, orgId),
      or(
        like(suppliers.name, key),
        like(suppliers.phone, key),
        like(suppliers.email, key),
        like(suppliers.address, key),
      ),
    );
    const rows = await this.supplierQuery()
      .where(where)
      .orderBy(desc(suppliers.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(suppliers.id) }).from(suppliers).where(where);

    return {
      getAllSupplier: rows,
      totalSupplier: Number(total.total ?? 0),
    };
  }

  private async paginated(query: SupplierQueryDto, orgId: number) {
    const pagination = this.pagination(query);
    const statuses = this.csv(query.status || "true");
    const types = this.csv(query.type || "");
    const where = and(
      eq(suppliers.organizationId, orgId),
      statuses.length ? inArray(suppliers.status, statuses) : undefined,
      types.length ? inArray(suppliers.supplierType, types) : undefined,
    );
    const rows = await this.supplierQuery()
      .where(where)
      .orderBy(desc(suppliers.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db.select({ total: count(suppliers.id) }).from(suppliers).where(where);

    return {
      getAllSupplier: rows,
      totalSupplier: Number(total.total ?? 0),
    };
  }

  private async report(orgId: number) {
    const rows = await this.supplierQuery().where(eq(suppliers.organizationId, orgId)).orderBy(desc(suppliers.id));
    const enriched = await Promise.all(rows.map(async (supplier) => ({ ...supplier, ...(await this.supplierTotals(supplier.id, orgId)) })));
    const grandData = enriched.reduce(
      (totals, supplier) => ({
        grandTotalAmount: totals.grandTotalAmount + supplier.totalAmount,
        grandTotalPaidAmount: totals.grandTotalPaidAmount + supplier.totalPaidAmount,
        grandTotalReturnAmount: totals.grandTotalReturnAmount + supplier.totalReturnAmount,
        grandInstantPaidReturnAmount: totals.grandInstantPaidReturnAmount + supplier.instantPaidReturnAmount,
        grandDueAmount: totals.grandDueAmount + supplier.dueAmount,
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
      allSupplier: enriched,
    };
  }

  private supplierQuery() {
    return this.db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        address: suppliers.address,
        email: suppliers.email,
        partyType: suppliers.partyType,
        supplierType: suppliers.supplierType,
        contactPerson: suppliers.contactPerson,
        rccm: suppliers.rccm,
        nationalId: suppliers.nationalId,
        taxId: suppliers.taxId,
        paymentTerms: suppliers.paymentTerms,
        notes: suppliers.notes,
        status: suppliers.status,
        createdAt: suppliers.createdAt,
        updatedAt: suppliers.updatedAt,
      })
      .from(suppliers);
  }

  private async supplierTotals(supplierId: number, orgId: number) {
    const relatedIds = await this.purchaseRelatedIds(supplierId, orgId);
    if (!relatedIds.length) {
      return {
        totalAmount: 0,
        totalPaidAmount: 0,
        totalReturnAmount: 0,
        instantPaidReturnAmount: 0,
        dueAmount: 0,
        totalPurchaseInvoice: 0,
        totalReturnPurchaseInvoice: 0,
      };
    }

    const [purchaseCredit] = await this.totalByRelated(relatedIds, "purchase", "creditId", 5, orgId);
    const [purchaseDebit] = await this.totalByRelated(relatedIds, "purchase", "debitId", 5, orgId);
    const [returnDebit] = await this.totalByRelated(relatedIds, "purchase_return", "debitId", 5, orgId);
    const [returnCredit] = await this.totalByRelated(relatedIds, "purchase_return", "creditId", 5, orgId);
    const totalAmount = this.round(Number(purchaseCredit.total ?? 0));
    const totalPaidAmount = this.round(Number(purchaseDebit.total ?? 0));
    const totalReturnAmount = this.round(Number(returnDebit.total ?? 0));
    const instantPaidReturnAmount = this.round(Number(returnCredit.total ?? 0));

    return {
      totalAmount,
      totalPaidAmount,
      totalReturnAmount,
      instantPaidReturnAmount,
      dueAmount: this.round(totalAmount - totalReturnAmount - totalPaidAmount + instantPaidReturnAmount),
      totalPurchaseInvoice: relatedIds.length,
      totalReturnPurchaseInvoice: 0,
    };
  }

  private async purchaseRelatedIds(supplierId: number, orgId: number) {
    const rows = await this.db.execute(sql`
      select id from purchaseInvoice where supplierId = ${supplierId} and organization_id = ${orgId} and status = 'true'
    `);
    const result = Array.isArray(rows) ? rows[0] : rows;
    return (result as unknown as Array<{ id: number }>).map((row) => String(row.id));
  }

  private totalByRelated(relatedIds: string[], type: string, side: "debitId" | "creditId", accountId: number, orgId: number) {
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

  private async ensurePhoneAvailable(phone: string, orgId: number, currentId?: number) {
    const rows = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.organizationId, orgId), eq(suppliers.phone, phone)))
      .limit(1);
    if (rows.length && rows[0].id !== currentId) {
      throw new BadRequestException("Phone Number Exist, Try Another Phone Number!");
    }
  }

  private async ensureEmailAvailable(email: string, orgId: number, currentId?: number) {
    const rows = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.organizationId, orgId), eq(suppliers.email, email)))
      .limit(1);
    if (rows.length && rows[0].id !== currentId) {
      throw new BadRequestException("Supplier email already exists.");
    }
  }

  private async ensureSupplierExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Supplier not found.");
    }
  }

  private pagination(query: SupplierQueryDto) {
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
