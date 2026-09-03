import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  adjustInvoiceProducts,
  adjustInvoices,
  announcements,
  attachments,
  dimensionUnits,
  emailConfigs,
  emails,
  manualPayments,
  paymentPurchaseInvoices,
  paymentSaleInvoices,
  products,
  productProductAttributeValues,
  purchaseReorderInvoices,
  quoteProducts,
  quotes,
  returnPurchaseInvoices,
  returnSaleInvoices,
  saleInvoiceProducts,
  saleInvoices,
  weightUnits,
} from "../database/schema";
import type { Database } from "../database/types";

type Config = {
  table: any;
  listKey?: string;
  totalKey?: string;
  searchable?: string[];
  activeField?: "status" | "isActive";
  // true si la table porte organization_id : on isole les lignes par
  // organisation. Les resources sans ce flag n ont PAS encore de colonne org
  // en base (voir migration a prevoir : quotes, manualPayments, adjustInvoices,
  // emails, emailConfigs, announcements) et restent non isolees pour l instant.
  orgScoped?: boolean;
};

@Injectable()
export class LegacyModulesService {
  private readonly configs: Record<string, Config> = {
    announcement: { table: announcements, listKey: "getAllAnnouncement", totalKey: "totalAnnouncement", searchable: ["title", "description"] },
    "email-config": { table: emailConfigs, listKey: "getAllEmailConfig", totalKey: "totalEmailConfig", searchable: ["emailConfigName", "emailHost", "emailUser"] },
    email: { table: emails, listKey: "getAllEmail", totalKey: "totalEmail", searchable: ["emailConfigName", "to", "subject"] },
    "manual-payment": { table: manualPayments, listKey: "getAllManualPayment", totalKey: "totalManualPayment", searchable: ["note", "paymentStatus"] },
    "payment-sale-invoice": { table: paymentSaleInvoices, listKey: "getAllPaymentSaleInvoice", totalKey: "totalPaymentSaleInvoice", searchable: ["note"], orgScoped: true },
    "payment-purchase-invoice": { table: paymentPurchaseInvoices, listKey: "getAllPaymentPurchaseInvoice", totalKey: "totalPaymentPurchaseInvoice", searchable: ["note"], orgScoped: true },
    "adjust-inventory": { table: adjustInvoices, listKey: "getAllAdjustInvoice", totalKey: "_count", searchable: ["note"] },
    quote: { table: quotes, listKey: "getAllQuote", totalKey: "totalQuote", searchable: ["quoteName", "note"] },
    "purchase-reorder-invoice": { table: purchaseReorderInvoices, listKey: "getAllPurchaseReorderInvoice", totalKey: "totalReorderInvoice", searchable: ["reorderInvoiceId"] },
    "return-purchase-invoice": { table: returnPurchaseInvoices, listKey: "allPurchaseInvoice", totalKey: "aggregations", searchable: ["id", "invoiceMemoNo"], orgScoped: true },
    "return-sale-invoice": { table: returnSaleInvoices, listKey: "allSaleInvoice", totalKey: "aggregations", searchable: ["id", "invoiceMemoNo"], orgScoped: true },
    "product-product-attribute-value": {
      table: productProductAttributeValues,
      listKey: "getAllProductProductAttributeValue",
      totalKey: "totalProductProductAttributeValue",
    },
    "dimension-unit": { table: dimensionUnits, listKey: "getAllDimensionUnit", totalKey: "totalDimensionUnit", searchable: ["name"] },
    "weight-unit": { table: weightUnits, listKey: "getAllWeightUnit", totalKey: "totalWeightUnit", searchable: ["name"] },
    files: { table: attachments, listKey: "getAllFiles", totalKey: "totalFiles", searchable: ["name"] },
    "slider-images": { table: attachments, listKey: "getAllSliderImages", totalKey: "totalSliderImages", searchable: ["name"] },
    "product-image": { table: attachments, listKey: "getAllProductImage", totalKey: "totalProductImage", searchable: ["name"] },
    "customer-profile-image": { table: attachments, listKey: "getAllCustomerProfileImage", totalKey: "totalCustomerProfileImage", searchable: ["name"] },
    "product-reports": { table: products, listKey: "getAllProduct", totalKey: "totalProduct", searchable: ["name", "sku"], orgScoped: true },
  };

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Filtre organisation applique uniquement aux resources org-scoped.
  private orgFilter(cfg: Config, orgId: number) {
    return cfg.orgScoped ? eq(cfg.table.organizationId, orgId) : undefined;
  }

  async list(resource: string, query: Record<string, string>, orgId: number) {
    if (resource === "reorder-quantity") return this.reorderQuantity(query, orgId);
    if (resource === "product-reports") return this.productReports(query, orgId);

    const cfg = this.config(resource);
    const table = cfg.table;
    const orgClause = this.orgFilter(cfg, orgId);

    if (resource === "email" && query["emailConfigName"]) {
      const rows = await this.db.select().from(table).where(eq(table.emailConfigName, query["emailConfigName"])).orderBy(desc(table.id));
      return rows;
    }

    if (query["query"] === "all" || Object.keys(query).length === 0) {
      const where = and(table.status ? eq(table.status, "true") : undefined, orgClause);
      const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id));
      if (query["query"] === "all") return rows;
      return this.wrap(resource, cfg, rows, rows.length);
    }

    const where = and(this.whereClause(cfg, query), orgClause);
    const { skip, limit } = this.pagination(query);
    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(table).where(where);
    return this.wrap(resource, cfg, rows, Number(count));
  }

  async findOne(resource: string, id: string, orgId: number) {
    const cfg = this.config(resource);
    const table = cfg.table;
    const rows = await this.db.select().from(table).where(and(eq(table.id, id as any), this.orgFilter(cfg, orgId))).limit(1);
    if (!rows.length) throw new NotFoundException(`${resource} not found.`);

    if (resource === "adjust-inventory") {
      const products = await this.db.select().from(adjustInvoiceProducts).where(eq(adjustInvoiceProducts.invoiceId, Number(id)));
      return { adjustInvoice: { ...rows[0], adjustInvoiceProduct: products } };
    }

    if (resource === "quote") {
      const items = await this.db.select().from(quoteProducts).where(eq(quoteProducts.quoteId, Number(id)));
      return { ...rows[0], quoteProduct: items };
    }

    return rows[0];
  }

  async create(resource: string, body: Record<string, any>, orgId: number): Promise<any> {
    if (resource === "reorder-quantity") {
      return this.create("purchase-reorder-invoice", body, orgId);
    }

    const cfg = this.config(resource);
    const values = this.prepareValues(resource, body);
    const payload: Record<string, any> = {
      ...values,
      ...(cfg.orgScoped ? { organizationId: orgId } : {}),
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };
    if (cfg.table.status) payload["status"] = values.status ?? "true";
    const [result] = await this.db.insert(cfg.table).values(payload);
    const id = Number(result.insertId);

    if (resource === "adjust-inventory" && Array.isArray(body.adjustInvoiceProduct)) {
      await this.insertChildren(adjustInvoiceProducts, body.adjustInvoiceProduct, { invoiceId: id });
    }
    if (resource === "quote" && Array.isArray(body.quoteProduct)) {
      await this.insertChildren(quoteProducts, body.quoteProduct, { quoteId: id });
    }

    return this.findOne(resource, String(id), orgId);
  }

  async update(resource: string, id: string, body: Record<string, any>, orgId: number) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg, id, resource, orgId);
    await this.db
      .update(cfg.table)
      .set({ ...this.prepareValues(resource, body, true), updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(cfg.table.id, id as any), this.orgFilter(cfg, orgId)));
    return this.findOne(resource, id, orgId);
  }

  async patch(resource: string, id: string | null, body: Record<string, any>, orgId: number) {
    if (resource === "manual-payment" && id === null) {
      return { message: "Manual payment updated successfully" };
    }

    if (resource === "manual-payment" && body.paymentStatus) {
      return this.update(resource, String(id), body, orgId);
    }

    const cfg = this.config(resource);
    await this.ensureExists(cfg, String(id), resource, orgId);
    await this.db
      .update(cfg.table)
      .set({ status: body.status ?? "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(cfg.table.id, id as any), this.orgFilter(cfg, orgId)));
    return { message: `${resource} status updated successfully` };
  }

  async delete(resource: string, id: string, orgId: number) {
    const cfg = this.config(resource);
    await this.ensureExists(cfg, id, resource, orgId);
    // Soft delete quand la table le supporte ; sinon DELETE physique (comportement historique).
    if (cfg.table.status) {
      await this.db
        .update(cfg.table)
        .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(cfg.table.id, id as any), this.orgFilter(cfg, orgId)));
    } else {
      await this.db.delete(cfg.table).where(and(eq(cfg.table.id, id as any), this.orgFilter(cfg, orgId)));
    }
    return { message: `${resource} deleted successfully` };
  }

  async verifyManualPayment(id: string, body: Record<string, any>, orgId: number) {
    return this.update("manual-payment", id, { ...body, paymentStatus: body.paymentStatus ?? "verified" }, orgId);
  }

  private async reorderQuantity(query: Record<string, string>, orgId: number) {
    const { skip, limit } = this.pagination(query);
    const reorderCond = sql`${products.reorderQuantity} IS NOT NULL AND ${products.productQuantity} <= ${products.reorderQuantity}`;
    const rows = await this.db
      .select()
      .from(products)
      .where(and(reorderCond, eq(products.organizationId, orgId)))
      .orderBy(desc(products.id))
      .limit(limit)
      .offset(skip);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(reorderCond, eq(products.organizationId, orgId)));
    return { getAllReOderList: rows, _count: { id: Number(count) } };
  }

  private async productReports(query: Record<string, string>, orgId: number) {
    const { skip, limit } = this.pagination(query);

    if (query["query"] === "top-selling-products") {
      const sold = await this.db
        .select({
          productId: saleInvoiceProducts.productId,
          totalQuantitySold: sql<number>`SUM(${saleInvoiceProducts.productQuantity})`,
        })
        .from(saleInvoiceProducts)
        .innerJoin(saleInvoices, and(eq(saleInvoices.id, saleInvoiceProducts.invoiceId), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, orgId)))
        .groupBy(saleInvoiceProducts.productId)
        .orderBy(desc(sql`SUM(${saleInvoiceProducts.productQuantity})`))
        .limit(limit)
        .offset(skip);

      const ids = sold.map((row) => Number(row.productId)).filter(Boolean);
      const rows = ids.length
        ? await this.db.select().from(products).where(and(inArray(products.id, ids as any), eq(products.organizationId, orgId)))
        : [];
      const sorted = ids.map((id) => rows.find((row) => Number(row.id) === id)).filter(Boolean);
      return { getAllTopSellingProduct: sorted, totalTopSellingProduct: sorted.length };
    }

    const rows = await this.db.select().from(products).where(eq(products.organizationId, orgId)).orderBy(desc(products.id)).limit(limit).offset(skip);
    return { getAllNewProduct: rows, totalNewProduct: rows.length };
  }

  private wrap(resource: string, cfg: Config, rows: any[], count: number) {
    if (resource === "manual-payment") {
      const amount = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      return { getAllManualPayment: rows, totalManualPayment: count, aggregations: { _sum: { amount } } };
    }

    if (cfg.totalKey === "_count") {
      return { [cfg.listKey ?? "data"]: rows, _count: { id: count } };
    }

    if (cfg.totalKey === "aggregations") {
      return { [cfg.listKey ?? "data"]: rows, aggregations: { _count: count } };
    }

    return { [cfg.listKey ?? "data"]: rows, [cfg.totalKey ?? "total"]: count };
  }

  private prepareValues(resource: string, body: Record<string, any>, partial = false) {
    const ignored = new Set(["products", "adjustInvoiceProduct", "quoteProduct"]);
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(body ?? {})) {
      if (ignored.has(key) || value === undefined || value === "") continue;
      if (key.toLowerCase().includes("date") && value) {
        result[key] = new Date(value as any);
      } else {
        result[key] = value;
      }
    }

    if (!partial && (resource === "manual-payment" || resource === "payment-sale-invoice" || resource === "payment-purchase-invoice") && !result.date) {
      result.date = new Date();
    }
    if (!partial && resource === "adjust-inventory" && !result.date) result.date = new Date();
    if (!partial && resource === "quote" && !result.quoteDate) result.quoteDate = new Date();
    return result;
  }

  private async insertChildren(table: any, rows: Record<string, any>[], base: Record<string, any>) {
    if (!rows.length) return;
    const values = rows.map((row) => ({
      ...base,
      ...row,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }));
    await this.db.insert(table).values(values);
  }

  private whereClause(cfg: Config, query: Record<string, string>) {
    const table = cfg.table;
    const clauses = [];
    if (query["status"] && table.status) {
      clauses.push(or(...query["status"].split(",").map((status) => eq(table.status, status))));
    }
    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const fields = cfg.searchable ?? [];
      if (fields.length) clauses.push(or(...fields.filter((field) => table[field]).map((field) => like(table[field], key))));
    }
    if (!clauses.length && table.status) return eq(table.status, "true");
    return clauses.length ? and(...clauses) : undefined;
  }

  private async ensureExists(cfg: Config, id: string, resource: string, orgId: number) {
    const rows = await this.db.select({ id: cfg.table.id }).from(cfg.table).where(and(eq(cfg.table.id, id as any), this.orgFilter(cfg, orgId))).limit(1);
    if (!rows.length) throw new NotFoundException(`${resource} not found.`);
  }

  private config(resource: string) {
    const cfg = this.configs[resource];
    if (!cfg) throw new BadRequestException(`Unsupported resource: ${resource}`);
    return cfg;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const count = Number(q["count"] ?? 10);
    return { skip: (page - 1) * count, limit: count };
  }
}
