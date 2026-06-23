import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  paymentPurchaseInvoices,
  products,
  purchaseInvoiceProducts,
  purchaseInvoices,
  suppliers,
  transactions,
} from "../database/schema";
import type { Database } from "../database/types";
import { LedgerService, type LedgerLineInput } from "../ledger/ledger.service";
import { WorkflowService } from "../workflow/workflow.service";
import {
  CreatePaymentPurchaseInvoiceDto,
  CreatePurchaseInvoiceDto,
} from "./dto/purchase-invoice.dto";

function generateInvoiceId(prefix: string, length = 13): string {
  const chars = "ABCDEFGHOPQRSTUYZ0123456IJKLMN789VWX";
  let id = prefix + "_";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly ledger: LedgerService,
    private readonly workflow: WorkflowService,
  ) {}

  /** Soumet la facture d'achat au circuit d'approbation (no-op si pas de workflow). */
  private async submitForApproval(invoiceId: string, orgId: number, userId?: number) {
    try {
      await this.workflow.submit(
        { workflowKey: "exp_approval", entityType: "purchase", entityId: String(invoiceId) },
        orgId,
        userId,
      );
    } catch (err) {
      console.warn("[PurchaseInvoices] submitForApproval skipped:", (err as Error).message);
    }
  }

  /** Approuve une facture d'achat ; comptabilise l'ecriture en attente a l'approbation finale. */
  async approveInvoice(invoiceId: string, comment: string | undefined, orgId: number, userId?: number) {
    const instances = await this.workflow.listInstances(orgId, "pending");
    const inst = instances.find(
      (i: any) => i.entityType === "purchase" && i.entityId === String(invoiceId),
    );
    if (!inst) throw new NotFoundException("Aucune instance d'approbation en attente pour cette facture.");
    const result = await this.workflow.approve((inst as any).id, comment, orgId, userId);
    if (result.status === "approved") {
      await this.ledger.approveAndPost("purchase", String(invoiceId), orgId, userId);
    }
    return { invoiceId, approval: result };
  }

  async create(input: CreatePurchaseInvoiceDto, orgId: number) {
    // 1. Validate supplier
    const [supplier] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.id, input.supplierId))
      .limit(1);

    if (!supplier) {
      throw new BadRequestException("Supplier not found.");
    }

    const invoiceProducts = input.purchaseInvoiceProduct ?? [];

    // 2. Calculate totals
    let totalPurchasePrice = 0;
    let totalTax = 0;

    for (const item of invoiceProducts) {
      const lineTotal = item.productQuantity * item.productUnitPurchasePrice;
      const taxAmount = lineTotal * ((item.tax ?? 0) / 100);
      totalPurchasePrice += lineTotal;
      totalTax += taxAmount;
    }

    const totalPaidAmount = (input.paidAmount ?? []).reduce((s, p) => s + p.amount, 0);
    const dueAmount = totalPurchasePrice + totalTax - totalPaidAmount;

    // 3. Create invoice
    const invoiceId = generateInvoiceId("P");

    // Resolve currency: explicit input or fallback to app default
    let currencyId = input.currencyId ?? null;
    if (!currencyId) {
      const [setting] = await this.db.select({ currencyId: appSettings.currencyId }).from(appSettings).limit(1);
      currencyId = setting?.currencyId ?? null;
    }

    await this.db.insert(purchaseInvoices).values({
      id: invoiceId,
      organizationId: orgId,
      date: new Date(input.date),
      invoiceMemoNo: input.invoiceMemoNo ?? null,
      supplierMemoNo: input.supplierMemoNo ?? null,
      totalAmount: totalPurchasePrice,
      totalTax,
      paidAmount: totalPaidAmount,
      dueAmount,
      supplierId: input.supplierId,
      currencyId,
      note: input.note ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // 4. Create invoice products
    for (const item of invoiceProducts) {
      const lineTotal = item.productQuantity * item.productUnitPurchasePrice;
      const taxAmount = lineTotal * ((item.tax ?? 0) / 100);
      const finalAmount = lineTotal + taxAmount;

      await this.db.insert(purchaseInvoiceProducts).values({
        invoiceId,
        productId: item.productId,
        productQuantity: item.productQuantity,
        productUnitPurchasePrice: item.productUnitPurchasePrice,
        productFinalAmount: finalAmount,
        tax: item.tax ?? 0,
        taxAmount,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    // 5. Create transactions
    if (totalPurchasePrice > 0) {
      await this.db.insert(transactions).values({
        date: sql`CURRENT_TIMESTAMP`,
        debitId: 3,
        creditId: 5,
        particulars: `Purchase invoice ${invoiceId}`,
        amount: totalPurchasePrice,
        type: "purchase",
        relatedId: invoiceId,
        organizationId: orgId,
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    if (totalTax > 0) {
      await this.db.insert(transactions).values({
        date: sql`CURRENT_TIMESTAMP`,
        debitId: 15,
        creditId: 5,
        particulars: `Tax for purchase invoice ${invoiceId}`,
        amount: totalTax,
        type: "purchase",
        relatedId: invoiceId,
        organizationId: orgId,
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    for (const payment of input.paidAmount ?? []) {
      if (payment.amount > 0) {
        await this.db.insert(transactions).values({
          date: sql`CURRENT_TIMESTAMP`,
          debitId: 5,
          creditId: payment.paymentType ?? 1,
          particulars: `Payment for purchase invoice ${invoiceId}`,
          amount: payment.amount,
          type: "purchase",
          relatedId: invoiceId,
          organizationId: orgId,
          status: "true",
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
      }
    }

    // 5 bis. Ecriture comptable moderne (partie double) via LedgerService.
    // Dual-write strangler ; idempotent par facture. Lignes alignees sur les
    // transactions plates ci-dessus (achat: debit 3/credit 5, tva: debit 15/credit 5,
    // paiement: debit 5/credit cash). Globalement equilibree.
    const ledgerLines: LedgerLineInput[] = [];
    if (totalPurchasePrice > 0) {
      ledgerLines.push(
        { accountId: 3, side: "DEBIT", amount: totalPurchasePrice, description: `Inventory ${invoiceId}` },
        { accountId: 5, side: "CREDIT", amount: totalPurchasePrice, description: `Purchase invoice ${invoiceId}` },
      );
    }
    if (totalTax > 0) {
      ledgerLines.push(
        { accountId: 15, side: "DEBIT", amount: totalTax, description: `VAT input ${invoiceId}` },
        { accountId: 5, side: "CREDIT", amount: totalTax, description: `Tax for purchase invoice ${invoiceId}` },
      );
    }
    for (const payment of input.paidAmount ?? []) {
      if (payment.amount > 0) {
        ledgerLines.push(
          { accountId: 5, side: "DEBIT", amount: payment.amount, description: `Payment ${invoiceId}` },
          { accountId: payment.paymentType ?? 1, side: "CREDIT", amount: payment.amount, description: `Payment for purchase invoice ${invoiceId}` },
        );
      }
    }
    if (ledgerLines.length >= 2) {
      await this.ledger.post(
        {
          reference: `PURCH-${invoiceId}`,
          particulars: `Purchase invoice ${invoiceId}`,
          sourceModule: "purchase",
          relatedId: invoiceId,
          idempotencyKey: `purchase:${invoiceId}`,
          lines: ledgerLines,
        },
        orgId,
      );
    }

    // 6. Update product stock (increase and recalculate avg purchase price)
    for (const item of invoiceProducts) {
      const [product] = await this.db
        .select({
          id: products.id,
          productQuantity: products.productQuantity,
          productPurchasePrice: products.productPurchasePrice,
        })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (product) {
        const currentQty = product.productQuantity ?? 0;
        const currentPrice = product.productPurchasePrice ?? 0;
        const totalQty = currentQty + item.productQuantity;
        const newAvgPrice =
          totalQty > 0
            ? (currentQty * currentPrice + item.productQuantity * item.productUnitPurchasePrice) /
              totalQty
            : item.productUnitPurchasePrice;

        await this.db
          .update(products)
          .set({
            productQuantity: totalQty,
            productPurchasePrice: newAvgPrice,
            ...(item.productUnitSalePrice !== undefined
              ? { productSalePrice: item.productUnitSalePrice }
              : {}),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(products.id, item.productId));
      }
    }

    // Soumet au circuit d'approbation (effectif si le module purchase est gate).
    await this.submitForApproval(invoiceId, orgId);

    return this.findOne(invoiceId, orgId);
  }

  async findAll(query: Record<string, string>, orgId: number) {
    if (query["query"] === "info") {
      const [row] = await this.db
        .select({
          totalCount: count(purchaseInvoices.id),
          totalAmount: sum(purchaseInvoices.totalAmount),
          totalPaidAmount: sum(purchaseInvoices.paidAmount),
          totalDueAmount: sum(purchaseInvoices.dueAmount),
        })
        .from(purchaseInvoices)
        .where(and(eq(purchaseInvoices.organizationId, orgId), eq(purchaseInvoices.status, "true")));

      return {
        _count: { id: Number(row.totalCount ?? 0) },
        _sum: {
          totalAmount: row.totalAmount ?? null,
          paidAmount: row.totalPaidAmount ?? null,
          dueAmount: row.totalDueAmount ?? null,
        },
      };
    }

    const { skip, limit } = this.pagination(query);
    const conditions = this.filterConditions(query, orgId);
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: purchaseInvoices.id,
        date: purchaseInvoices.date,
        invoiceMemoNo: purchaseInvoices.invoiceMemoNo,
        supplierMemoNo: purchaseInvoices.supplierMemoNo,
        totalAmount: purchaseInvoices.totalAmount,
        totalTax: purchaseInvoices.totalTax,
        paidAmount: purchaseInvoices.paidAmount,
        dueAmount: purchaseInvoices.dueAmount,
        supplierId: purchaseInvoices.supplierId,
        currencyId: purchaseInvoices.currencyId,
        note: purchaseInvoices.note,
        createdAt: purchaseInvoices.createdAt,
        updatedAt: purchaseInvoices.updatedAt,
        supplierName: suppliers.name,
        supplierPhone: suppliers.phone,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(purchaseInvoices)
      .leftJoin(suppliers, eq(suppliers.id, purchaseInvoices.supplierId))
      .leftJoin(currencies, eq(currencies.id, purchaseInvoices.currencyId))
      .where(where)
      .orderBy(desc(purchaseInvoices.createdAt))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(purchaseInvoices.id) })
      .from(purchaseInvoices)
      .where(where);

    return { getAllPurchaseInvoice: rows, totalPurchaseInvoice: Number(total ?? 0) };
  }

  async findOne(id: string, orgId?: number) {
    const where = orgId !== undefined
      ? and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.organizationId, orgId), eq(purchaseInvoices.status, "true"))
      : and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.status, "true"));

    const rows = await this.db
      .select({
        id: purchaseInvoices.id,
        organizationId: purchaseInvoices.organizationId,
        date: purchaseInvoices.date,
        invoiceMemoNo: purchaseInvoices.invoiceMemoNo,
        supplierMemoNo: purchaseInvoices.supplierMemoNo,
        totalAmount: purchaseInvoices.totalAmount,
        totalTax: purchaseInvoices.totalTax,
        paidAmount: purchaseInvoices.paidAmount,
        dueAmount: purchaseInvoices.dueAmount,
        supplierId: purchaseInvoices.supplierId,
        currencyId: purchaseInvoices.currencyId,
        note: purchaseInvoices.note,
        status: purchaseInvoices.status,
        createdAt: purchaseInvoices.createdAt,
        updatedAt: purchaseInvoices.updatedAt,
        currency: {
          id: currencies.id,
          currencyCode: currencies.currencyCode,
          currencyName: currencies.currencyName,
          currencySymbol: currencies.currencySymbol,
          decimalPlaces: currencies.decimalPlaces,
          status: currencies.status,
        },
      })
      .from(purchaseInvoices)
      .leftJoin(currencies, eq(purchaseInvoices.currencyId, currencies.id))
      .where(where)
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Purchase invoice not found.");
    }

    const invoiceProds = await this.db
      .select({
        id: purchaseInvoiceProducts.id,
        invoiceId: purchaseInvoiceProducts.invoiceId,
        productId: purchaseInvoiceProducts.productId,
        productQuantity: purchaseInvoiceProducts.productQuantity,
        productUnitPurchasePrice: purchaseInvoiceProducts.productUnitPurchasePrice,
        productFinalAmount: purchaseInvoiceProducts.productFinalAmount,
        tax: purchaseInvoiceProducts.tax,
        taxAmount: purchaseInvoiceProducts.taxAmount,
        productName: products.name,
      })
      .from(purchaseInvoiceProducts)
      .leftJoin(products, eq(products.id, purchaseInvoiceProducts.productId))
      .where(eq(purchaseInvoiceProducts.invoiceId, id));

    return {
      ...rows[0],
      purchaseInvoiceProduct: invoiceProds,
    };
  }

  // Payment purchase invoices
  async createPayment(input: CreatePaymentPurchaseInvoiceDto, orgId: number) {
    const [invoice] = await this.db
      .select({ id: purchaseInvoices.id, dueAmount: purchaseInvoices.dueAmount })
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, input.purchaseInvoiceId), eq(purchaseInvoices.status, "true"), eq(purchaseInvoices.organizationId, orgId)))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException("Purchase invoice not found.");
    }

    await this.db.insert(paymentPurchaseInvoices).values({
      date: new Date(input.date),
      amount: input.amount,
      purchaseInvoiceId: input.purchaseInvoiceId,
      note: input.note ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    await this.db.insert(transactions).values({
      organizationId: orgId,
      date: sql`CURRENT_TIMESTAMP`,
      debitId: 5,
      creditId: 1,
      particulars: `Payment for purchase invoice ${input.purchaseInvoiceId}`,
      amount: input.amount,
      type: "purchase_payment",
      relatedId: input.purchaseInvoiceId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const newPaidAmount = Math.min(input.amount, invoice.dueAmount ?? 0);

    await this.db
      .update(purchaseInvoices)
      .set({
        paidAmount: sql`paidAmount + ${newPaidAmount}`,
        dueAmount: sql`dueAmount - ${newPaidAmount}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(purchaseInvoices.id, input.purchaseInvoiceId));

    return { message: "Payment recorded successfully." };
  }

  async updateStatus(id: string, status: string, orgId: number) {
    const rows = await this.db
      .select({ id: purchaseInvoices.id })
      .from(purchaseInvoices)
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.organizationId, orgId)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Purchase invoice not found.");
    }

    await this.db
      .update(purchaseInvoices)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.organizationId, orgId)));

    await this.db
      .update(transactions)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(transactions.relatedId, id), eq(transactions.organizationId, orgId)));

    return { message: "Purchase invoice deleted successfully." };
  }

  async findAllPayments(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(paymentPurchaseInvoices)
        .orderBy(desc(paymentPurchaseInvoices.id));
    }

    if (query["query"] === "info") {
      const [row] = await this.db
        .select({
          total: sum(paymentPurchaseInvoices.amount),
          cnt: count(paymentPurchaseInvoices.id),
        })
        .from(paymentPurchaseInvoices);
      return { _count: { id: Number(row.cnt ?? 0) }, _sum: { amount: row.total ?? null } };
    }

    const { skip, limit } = this.pagination(query);

    const rows = await this.db
      .select()
      .from(paymentPurchaseInvoices)
      .orderBy(desc(paymentPurchaseInvoices.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(paymentPurchaseInvoices.id) })
      .from(paymentPurchaseInvoices);

    return { getAllPayment: rows, totalPayment: Number(total ?? 0) };
  }

  private filterConditions(query: Record<string, string>, orgId: number) {
    const conditions = [eq(purchaseInvoices.organizationId, orgId), eq(purchaseInvoices.status, "true")];

    if (query["startDate"]) {
      conditions.push(gte(purchaseInvoices.date, new Date(query["startDate"])));
    }
    if (query["endDate"]) {
      conditions.push(lte(purchaseInvoices.date, new Date(query["endDate"])));
    }
    if (query["supplierId"]) {
      conditions.push(eq(purchaseInvoices.supplierId, Number(query["supplierId"])));
    }

    return conditions;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}
