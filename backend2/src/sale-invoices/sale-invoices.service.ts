import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  paymentSaleInvoices,
  products,
  saleInvoiceProducts,
  saleInvoices,
  transactions,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreatePaymentSaleInvoiceDto,
  CreateSaleInvoiceDto,
  UpdateHoldDto,
  UpdateOrderStatusDto,
  UpdateSaleInvoiceDto,
} from "./dto/sale-invoice.dto";

function generateInvoiceId(prefix: string, length = 13): string {
  const chars = "ABCDEFGHOPQRSTUYZ0123456IJKLMN789VWX";
  let id = prefix + "_";
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

@Injectable()
export class SaleInvoicesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateSaleInvoiceDto, orgId: number) {
    // 1. Validate products and stock
    const productData: Array<{
      id: number;
      productQuantity: number;
      productPurchasePrice: number;
      productSalePrice: number;
    }> = [];

    for (const item of input.saleInvoiceProduct) {
      const [product] = await this.db
        .select({
          id: products.id,
          productQuantity: products.productQuantity,
          productPurchasePrice: products.productPurchasePrice,
          productSalePrice: products.productSalePrice,
        })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!product) {
        throw new BadRequestException(`Product with id ${item.productId} not found.`);
      }

      if ((product.productQuantity ?? 0) < item.productQuantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}. Available: ${product.productQuantity}, Requested: ${item.productQuantity}`,
        );
      }

      productData.push({
        id: product.id,
        productQuantity: product.productQuantity ?? 0,
        productPurchasePrice: product.productPurchasePrice ?? 0,
        productSalePrice: product.productSalePrice ?? 0,
      });
    }

    // 2. Calculate totals
    let totalAmount = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;
    let totalPurchasePrice = 0;

    for (let i = 0; i < input.saleInvoiceProduct.length; i++) {
      const item = input.saleInvoiceProduct[i];
      const discount = item.productDiscount ?? 0;
      const tax = item.tax ?? 0;
      const subtotal = item.productQuantity * item.productUnitSalePrice;
      const discountAmount = subtotal * (discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (tax / 100);
      const finalAmount = taxableAmount + taxAmount;

      totalAmount += taxableAmount;
      totalTaxAmount += taxAmount;
      totalDiscountAmount += discountAmount;
      totalPurchasePrice += item.productQuantity * (productData[i]?.productPurchasePrice ?? 0);
    }

    const totalPaidAmount = (input.paidAmount ?? []).reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = totalAmount + totalTaxAmount - totalPaidAmount;
    const profit = totalAmount - totalPurchasePrice;

    // 3. Create invoice
    const invoiceId = generateInvoiceId("S");

    // Resolve currency: explicit input or fallback to app default
    let currencyId = input.currencyId ?? null;
    if (!currencyId) {
      const [setting] = await this.db.select({ currencyId: appSettings.currencyId }).from(appSettings).limit(1);
      currencyId = setting?.currencyId ?? null;
    }

    await this.db.insert(saleInvoices).values({
      id: invoiceId,
      organizationId: orgId,
      date: new Date(input.date),
      invoiceMemoNo: input.invoiceMemoNo ?? null,
      totalAmount,
      totalTaxAmount,
      totalDiscountAmount,
      paidAmount: totalPaidAmount,
      dueAmount,
      profit,
      customerId: input.customerId,
      currencyId,
      userId: input.userId,
      note: input.note ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      isHold: "false",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // 4. Create sale invoice products
    for (let i = 0; i < input.saleInvoiceProduct.length; i++) {
      const item = input.saleInvoiceProduct[i];
      const discount = item.productDiscount ?? 0;
      const tax = item.tax ?? 0;
      const subtotal = item.productQuantity * item.productUnitSalePrice;
      const discountAmount = subtotal * (discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (tax / 100);
      const finalAmount = taxableAmount + taxAmount;

      await this.db.insert(saleInvoiceProducts).values({
        invoiceId,
        productId: item.productId,
        productQuantity: item.productQuantity,
        productUnitSalePrice: item.productUnitSalePrice,
        productDiscount: discount,
        productFinalAmount: finalAmount,
        tax,
        taxAmount,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    // 5. Create transactions
    // Cost of sales
    await this.db.insert(transactions).values({
      date: sql`CURRENT_TIMESTAMP`,
      debitId: 9,
      creditId: 3,
      particulars: `Cost of sales for invoice ${invoiceId}`,
      amount: totalPurchasePrice,
      type: "sale",
      relatedId: invoiceId,
      organizationId: orgId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Account receivable
    await this.db.insert(transactions).values({
      date: sql`CURRENT_TIMESTAMP`,
      debitId: 4,
      creditId: 8,
      particulars: `Sale invoice ${invoiceId}`,
      amount: totalAmount + totalTaxAmount,
      type: "sale",
      relatedId: invoiceId,
      organizationId: orgId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // VAT transaction if applicable
    if (totalTaxAmount > 0) {
      await this.db.insert(transactions).values({
        date: sql`CURRENT_TIMESTAMP`,
        debitId: 16,
        creditId: 8,
        particulars: `VAT for sale invoice ${invoiceId}`,
        amount: totalTaxAmount,
        type: "sale",
        relatedId: invoiceId,
        organizationId: orgId,
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    // Payment transactions
    for (const payment of input.paidAmount ?? []) {
      if (payment.amount > 0) {
        await this.db.insert(transactions).values({
          date: sql`CURRENT_TIMESTAMP`,
          debitId: payment.paymentType ?? 1,
          creditId: 4,
          particulars: `Payment for sale invoice ${invoiceId}`,
          amount: payment.amount,
          type: "sale",
          relatedId: invoiceId,
          organizationId: orgId,
          status: "true",
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
      }
    }

    // 6. Update product stock
    for (let i = 0; i < input.saleInvoiceProduct.length; i++) {
      const item = input.saleInvoiceProduct[i];
      const pd = productData[i];
      if (pd) {
        const newQty = pd.productQuantity - item.productQuantity;
        await this.db
          .update(products)
          .set({ productQuantity: newQty, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(products.id, item.productId));
      }
    }

    return this.findOne(invoiceId, orgId);
  }

  async findAll(query: Record<string, string>, orgId: number) {
    if (query["query"] === "info") {
      const [row] = await this.db
        .select({
          totalCount: count(saleInvoices.id),
          totalAmount: sum(saleInvoices.totalAmount),
          totalPaidAmount: sum(saleInvoices.paidAmount),
          totalDueAmount: sum(saleInvoices.dueAmount),
          totalProfit: sum(saleInvoices.profit),
        })
        .from(saleInvoices)
        .where(eq(saleInvoices.organizationId, orgId));

      return {
        _count: { id: Number(row.totalCount ?? 0) },
        _sum: {
          totalAmount: row.totalAmount ?? null,
          paidAmount: row.totalPaidAmount ?? null,
          dueAmount: row.totalDueAmount ?? null,
          profit: row.totalProfit ?? null,
        },
      };
    }

    const { skip, limit } = this.pagination(query);
    const conditions = this.filterConditions(query, orgId);
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db
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
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerPhone: customers.phone,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(saleInvoices)
      .leftJoin(customers, eq(customers.id, saleInvoices.customerId))
      .leftJoin(currencies, eq(currencies.id, saleInvoices.currencyId))
      .where(where)
      .orderBy(desc(saleInvoices.createdAt))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(saleInvoices.id) })
      .from(saleInvoices)
      .where(where);

    return { getAllSaleInvoice: rows, totalSaleInvoice: Number(total ?? 0) };
  }

  async findHold() {
    return this.db
      .select()
      .from(saleInvoices)
      .where(eq(saleInvoices.isHold, "true"))
      .orderBy(desc(saleInvoices.createdAt));
  }

  async findByCustomer(customerId: number) {
    return this.db
      .select()
      .from(saleInvoices)
      .where(eq(saleInvoices.customerId, customerId))
      .orderBy(desc(saleInvoices.createdAt));
  }

  async findOne(id: string, orgId?: number) {
    const where = orgId !== undefined
      ? and(eq(saleInvoices.id, id), eq(saleInvoices.organizationId, orgId))
      : eq(saleInvoices.id, id);
    const rows = await this.db.select().from(saleInvoices).where(where).limit(1);

    if (!rows.length) {
      throw new NotFoundException("Sale invoice not found.");
    }

    const invoiceProducts = await this.db
      .select({
        id: saleInvoiceProducts.id,
        invoiceId: saleInvoiceProducts.invoiceId,
        productId: saleInvoiceProducts.productId,
        productQuantity: saleInvoiceProducts.productQuantity,
        productUnitSalePrice: saleInvoiceProducts.productUnitSalePrice,
        productDiscount: saleInvoiceProducts.productDiscount,
        productFinalAmount: saleInvoiceProducts.productFinalAmount,
        tax: saleInvoiceProducts.tax,
        taxAmount: saleInvoiceProducts.taxAmount,
        productName: products.name,
      })
      .from(saleInvoiceProducts)
      .leftJoin(products, eq(products.id, saleInvoiceProducts.productId))
      .where(eq(saleInvoiceProducts.invoiceId, id));

    const customerRows = rows[0].customerId
      ? await this.db
          .select()
          .from(customers)
          .where(eq(customers.id, rows[0].customerId))
          .limit(1)
      : [];

    return {
      ...rows[0],
      saleInvoiceProduct: invoiceProducts,
      customer: customerRows[0] ?? null,
    };
  }

  async update(id: string, input: UpdateSaleInvoiceDto) {
    const rows = await this.db
      .select({ id: saleInvoices.id })
      .from(saleInvoices)
      .where(eq(saleInvoices.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Sale invoice not found.");
    }

    await this.db
      .update(saleInvoices)
      .set({
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.invoiceMemoNo !== undefined ? { invoiceMemoNo: input.invoiceMemoNo } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(saleInvoices.id, id));

    return this.findOne(id);
  }

  async updateHold(id: string, input: UpdateHoldDto) {
    const rows = await this.db
      .select({ id: saleInvoices.id })
      .from(saleInvoices)
      .where(eq(saleInvoices.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Sale invoice not found.");
    }

    await this.db
      .update(saleInvoices)
      .set({ isHold: input.isHold, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(saleInvoices.id, id));

    return { message: "Hold status updated." };
  }

  async updateOrderStatus(input: UpdateOrderStatusDto) {
    await this.db
      .update(saleInvoices)
      .set({ orderStatus: input.orderStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(saleInvoices.id, input.id));

    return { message: "Order status updated." };
  }

  // Payment sale invoices
  async createPayment(input: CreatePaymentSaleInvoiceDto) {
    // Validate invoice exists
    const [invoice] = await this.db
      .select({ id: saleInvoices.id, dueAmount: saleInvoices.dueAmount })
      .from(saleInvoices)
      .where(eq(saleInvoices.id, input.saleInvoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException("Sale invoice not found.");
    }

    // Create payment record
    await this.db.insert(paymentSaleInvoices).values({
      date: new Date(input.date),
      amount: input.amount,
      saleInvoiceId: input.saleInvoiceId,
      note: input.note ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Create transaction
    await this.db.insert(transactions).values({
      date: sql`CURRENT_TIMESTAMP`,
      debitId: 1,
      creditId: 4,
      particulars: `Payment for sale invoice ${input.saleInvoiceId}`,
      amount: input.amount,
      type: "sale_payment",
      relatedId: input.saleInvoiceId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Update invoice paid/due amounts
    const newPaidAmount = (invoice.dueAmount ?? 0) > 0
      ? Math.min(input.amount, invoice.dueAmount ?? 0)
      : input.amount;

    await this.db
      .update(saleInvoices)
      .set({
        paidAmount: sql`paidAmount + ${newPaidAmount}`,
        dueAmount: sql`dueAmount - ${newPaidAmount}`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(saleInvoices.id, input.saleInvoiceId));

    return { message: "Payment recorded successfully." };
  }

  async findAllPayments(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(paymentSaleInvoices)
        .orderBy(desc(paymentSaleInvoices.id));
    }

    if (query["query"] === "info") {
      const [row] = await this.db
        .select({ total: sum(paymentSaleInvoices.amount), cnt: count(paymentSaleInvoices.id) })
        .from(paymentSaleInvoices);
      return { _count: { id: Number(row.cnt ?? 0) }, _sum: { amount: row.total ?? null } };
    }

    const { skip, limit } = this.pagination(query);

    const rows = await this.db
      .select()
      .from(paymentSaleInvoices)
      .orderBy(desc(paymentSaleInvoices.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(paymentSaleInvoices.id) })
      .from(paymentSaleInvoices);

    return { getAllPayment: rows, totalPayment: Number(total ?? 0) };
  }

  private filterConditions(query: Record<string, string>, orgId: number) {
    const conditions = [eq(saleInvoices.organizationId, orgId)];

    if (query["startDate"]) {
      conditions.push(gte(saleInvoices.date, new Date(query["startDate"])));
    }
    if (query["endDate"]) {
      conditions.push(lte(saleInvoices.date, new Date(query["endDate"])));
    }
    if (query["status"]) {
      conditions.push(eq(saleInvoices.isHold, query["status"]));
    }
    if (query["customerId"]) {
      conditions.push(eq(saleInvoices.customerId, Number(query["customerId"])));
    }

    return conditions;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}
