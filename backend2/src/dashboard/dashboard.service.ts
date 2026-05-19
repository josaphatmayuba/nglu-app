import { Inject, Injectable } from "@nestjs/common";
import { and, between, desc, eq, isNotNull, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  products,
  purchaseInvoices,
  returnPurchaseInvoices,
  returnSaleInvoices,
  saleInvoiceProducts,
  saleInvoices,
  subAccounts,
  transactions,
} from "../database/schema";
import type { Database } from "../database/types";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async getDashboardData(query: DashboardQueryDto) {
    const { start, end } = this.resolveDates(query);

    const [salesAgg, purchaseAgg, salesReturn, purchaseReturn, monthly, accounts, topCustomers, topProducts, kpis, revenueByCurrency] =
      await Promise.all([
        this.salesAggregates(start, end),
        this.purchaseAggregates(start, end),
        this.salesReturnTotal(start, end),
        this.purchaseReturnTotal(start, end),
        this.monthlyChart(start, end),
        this.accountsBalance(start, end),
        this.topCustomers(start, end),
        this.topProducts(start, end),
        this.kpiTrends(end),
        this.salesByCurrency(start, end),
      ]);

    return {
      kpis,
      revenue: {
        total: Math.round(salesAgg.total),
        byCurrency: revenueByCurrency,
      },
      sales: {
        totalSale: Math.round(salesAgg.total),
        breakdown: [
          { label: "Paid", value: Math.round(salesAgg.paid), color: "#3b82f6" },
          { label: "Due", value: Math.round(salesAgg.due), color: "#f59e0b" },
          { label: "Return", value: Math.round(salesReturn), color: "#ef4444" },
        ],
      },
      purchases: {
        totalPurchase: Math.round(purchaseAgg.total),
        breakdown: [
          { label: "Paid", value: Math.round(purchaseAgg.paid), color: "#10b981" },
          { label: "Due", value: Math.round(purchaseAgg.due), color: "#f59e0b" },
          { label: "Return", value: Math.round(purchaseReturn), color: "#ef4444" },
        ],
      },
      monthly,
      accounts,
      topCustomers,
      topProduct: topProducts,
    };
  }

  private async salesAggregates(start: Date, end: Date) {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
        paid: sql<number>`COALESCE(SUM(${saleInvoices.paidAmount}), 0)`,
        due: sql<number>`COALESCE(SUM(${saleInvoices.dueAmount}), 0)`,
      })
      .from(saleInvoices)
      .where(between(saleInvoices.date, start, end));
    return { total: Number(row.total), paid: Number(row.paid), due: Number(row.due) };
  }

  private async purchaseAggregates(start: Date, end: Date) {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${purchaseInvoices.totalAmount}), 0)`,
        paid: sql<number>`COALESCE(SUM(${purchaseInvoices.paidAmount}), 0)`,
        due: sql<number>`COALESCE(SUM(${purchaseInvoices.dueAmount}), 0)`,
      })
      .from(purchaseInvoices)
      .where(between(purchaseInvoices.date, start, end));
    return { total: Number(row.total), paid: Number(row.paid), due: Number(row.due) };
  }

  private async salesReturnTotal(start: Date, end: Date) {
    const [row] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${returnSaleInvoices.totalAmount}), 0)` })
      .from(returnSaleInvoices)
      .where(between(returnSaleInvoices.date, start, end));
    return Number(row.total);
  }

  private async purchaseReturnTotal(start: Date, end: Date) {
    const [row] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${returnPurchaseInvoices.totalAmount}), 0)` })
      .from(returnPurchaseInvoices)
      .where(between(returnPurchaseInvoices.date, start, end));
    return Number(row.total);
  }

  private async monthlyChart(start: Date, end: Date) {
    const [salesRows, purchaseRows] = await Promise.all([
      this.db
        .select({
          month: sql<string>`DATE_FORMAT(${saleInvoices.date}, '%b %y')`,
          minDate: sql<string>`MIN(${saleInvoices.date})`,
          sales: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
        })
        .from(saleInvoices)
        .where(between(saleInvoices.date, start, end))
        .groupBy(sql`DATE_FORMAT(${saleInvoices.date}, '%b %y')`)
        .orderBy(sql`MIN(${saleInvoices.date})`),

      this.db
        .select({
          month: sql<string>`DATE_FORMAT(${purchaseInvoices.date}, '%b %y')`,
          purchases: sql<number>`COALESCE(SUM(${purchaseInvoices.totalAmount}), 0)`,
        })
        .from(purchaseInvoices)
        .where(between(purchaseInvoices.date, start, end))
        .groupBy(sql`DATE_FORMAT(${purchaseInvoices.date}, '%b %y')`),
    ]);

    const purchaseMap = new Map(purchaseRows.map((r) => [r.month, Number(r.purchases)]));

    return salesRows.map((r) => ({
      month: r.month,
      sales: Math.round(Number(r.sales)),
      purchases: Math.round(purchaseMap.get(r.month) ?? 0),
    }));
  }

  private async accountsBalance(start: Date, end: Date) {
    const allAccounts = await this.db.select({ id: subAccounts.id, name: subAccounts.name }).from(subAccounts);

    const [credits, debits] = await Promise.all([
      this.db
        .select({
          accountId: transactions.creditId,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(between(transactions.date, start, end))
        .groupBy(transactions.creditId),

      this.db
        .select({
          accountId: transactions.debitId,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(between(transactions.date, start, end))
        .groupBy(transactions.debitId),
    ]);

    const creditMap = new Map(credits.map((c) => [c.accountId, Number(c.total)]));
    const debitMap = new Map(debits.map((d) => [d.accountId, Number(d.total)]));

    return allAccounts
      .map((sa) => ({
        account: sa.name,
        amount: Math.round(Math.abs((creditMap.get(sa.id) ?? 0) - (debitMap.get(sa.id) ?? 0))),
      }))
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  private async topCustomers(start: Date, end: Date) {
    const rows = await this.db
      .select({
        customerId: saleInvoices.customerId,
        totalSales: sql<number>`SUM(${saleInvoices.totalAmount})`,
      })
      .from(saleInvoices)
      .where(and(between(saleInvoices.date, start, end), isNotNull(saleInvoices.customerId)))
      .groupBy(saleInvoices.customerId)
      .orderBy(desc(sql`SUM(${saleInvoices.totalAmount})`))
      .limit(5);

    const customerIds = rows.map((r) => r.customerId).filter(Boolean) as number[];
    if (!customerIds.length) return [];

    const customerRows = await this.db
      .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName, phone: customers.phone, username: customers.username })
      .from(customers)
      .where(sql`${customers.id} IN (${sql.join(customerIds.map((id) => sql`${id}`), sql`, `)})`);

    const customerMap = new Map(customerRows.map((c) => [c.id, c]));

    return rows.map((r) => {
      const c = customerMap.get(r.customerId!);
      const name = [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim() || c?.phone || c?.username || "Unknown";
      return {
        customer: name,
        username: c?.username ?? "Unknown",
        totalSales: Math.round(Number(r.totalSales)),
        phone: c?.phone ?? "N/A",
      };
    });
  }

  private async topProducts(start: Date, end: Date) {
    const rows = await this.db
      .select({
        productId: saleInvoiceProducts.productId,
        totalQuantity: sql<number>`SUM(${saleInvoiceProducts.productQuantity})`,
        totalSales: sql<number>`SUM(${saleInvoiceProducts.productFinalAmount})`,
      })
      .from(saleInvoiceProducts)
      .innerJoin(saleInvoices, and(
        eq(saleInvoices.id, saleInvoiceProducts.invoiceId),
        between(saleInvoices.date, start, end),
      ))
      .groupBy(saleInvoiceProducts.productId)
      .orderBy(desc(sql`SUM(${saleInvoiceProducts.productFinalAmount})`))
      .limit(5);

    if (!rows.length) return [];

    const productIds = rows.map((r) => r.productId);
    const productRows = await this.db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(sql`${products.id} IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})`);

    const productMap = new Map(productRows.map((p) => [p.id, p.name]));

    return rows.map((r) => ({
      product: productMap.get(r.productId) ?? `Product #${r.productId}`,
      quantity: Math.round(Number(r.totalQuantity)),
      amount: Math.round(Number(r.totalSales)),
    }));
  }

  private async kpiTrends(end: Date) {
    const trendStart = new Date(end);
    trendStart.setDate(trendStart.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);
    const trendEnd = new Date(end);
    trendEnd.setHours(23, 59, 59, 999);

    const [saleTrend, saleDueTrend, purTrend, purDueTrend] = await Promise.all([
      this.dailyTrend(saleInvoices, saleInvoices.totalAmount, saleInvoices.date, trendStart, trendEnd),
      this.dailyTrend(saleInvoices, saleInvoices.dueAmount, saleInvoices.date, trendStart, trendEnd),
      this.dailyTrend(purchaseInvoices, purchaseInvoices.totalAmount, purchaseInvoices.date, trendStart, trendEnd),
      this.dailyTrend(purchaseInvoices, purchaseInvoices.dueAmount, purchaseInvoices.date, trendStart, trendEnd),
    ]);

    return {
      totalSaleAmount: { value: saleTrend[6] ?? 0, trend: saleTrend, change: this.pct(saleTrend) },
      totalSaleDue: { value: saleDueTrend[6] ?? 0, trend: saleDueTrend, change: this.pct(saleDueTrend) },
      totalPurchaseAmount: { value: purTrend[6] ?? 0, trend: purTrend, change: this.pct(purTrend) },
      totalPurchaseDue: { value: purDueTrend[6] ?? 0, trend: purDueTrend, change: this.pct(purDueTrend) },
    };
  }

  private async dailyTrend(table: any, amountCol: any, dateCol: any, start: Date, end: Date): Promise<number[]> {
    const rows = await this.db
      .select({
        day: sql<string>`DATE(${dateCol})`,
        total: sql<number>`COALESCE(SUM(${amountCol}), 0)`,
      })
      .from(table)
      .where(between(dateCol, start, end))
      .groupBy(sql`DATE(${dateCol})`);

    const map = new Map(rows.map((r) => [r.day, Math.round(Number(r.total))]));
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      result.push(map.get(d.toISOString().slice(0, 10)) ?? 0);
    }
    return result;
  }

  private pct(trend: number[]): number {
    if (trend.length < 2) return 0;
    const prev = trend[trend.length - 2];
    const curr = trend[trend.length - 1];
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100 * 10) / 10;
  }

  private async salesByCurrency(start: Date, end: Date) {
    const rows = await this.db
      .select({
        currencyId: saleInvoices.currencyId,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
        total: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
      })
      .from(saleInvoices)
      .leftJoin(currencies, eq(currencies.id, saleInvoices.currencyId))
      .where(between(saleInvoices.date, start, end))
      .groupBy(saleInvoices.currencyId, currencies.currencyName, currencies.currencySymbol);

    return rows.map((r) => ({
      currencyId: r.currencyId,
      currencyName: r.currencyName ?? "CDF",
      currencySymbol: r.currencySymbol ?? "CDF",
      amount: Math.round(Number(r.total)),
    }));
  }

  private resolveDates(query: DashboardQueryDto) {
    const now = new Date();
    const start = query.startDate
      ? new Date(`${query.startDate}T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = query.endDate
      ? new Date(`${query.endDate}T23:59:59`)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }
}
