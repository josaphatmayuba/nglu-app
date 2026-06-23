import { Inject, Injectable } from "@nestjs/common";
import { and, between, desc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  products,
  purchaseInvoices,
  realEstateLeases,
  realEstateMaintenanceRequests,
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

  async getDashboardData(query: DashboardQueryDto, org: number) {
    const { start, end } = this.resolveDates(query);

    const [salesAgg, purchaseAgg, salesReturn, purchaseReturn, monthly, accounts, topCustomers, topProducts, kpis, revenueByCurrency] =
      await Promise.all([
        this.salesAggregates(start, end, org),
        this.purchaseAggregates(start, end, org),
        this.salesReturnTotal(start, end, org),
        this.purchaseReturnTotal(start, end, org),
        this.monthlyChart(start, end, org),
        this.accountsBalance(start, end, org),
        this.topCustomers(start, end, org),
        this.topProducts(start, end, org),
        this.kpiTrends(end, org),
        this.salesByCurrency(start, end, org),
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

  private async salesAggregates(start: Date, end: Date, org: number) {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
        paid: sql<number>`COALESCE(SUM(${saleInvoices.paidAmount}), 0)`,
        due: sql<number>`COALESCE(SUM(${saleInvoices.dueAmount}), 0)`,
      })
      .from(saleInvoices)
      .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)));
    return { total: Number(row.total), paid: Number(row.paid), due: Number(row.due) };
  }

  private async purchaseAggregates(start: Date, end: Date, org: number) {
    const [row] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${purchaseInvoices.totalAmount}), 0)`,
        paid: sql<number>`COALESCE(SUM(${purchaseInvoices.paidAmount}), 0)`,
        due: sql<number>`COALESCE(SUM(${purchaseInvoices.dueAmount}), 0)`,
      })
      .from(purchaseInvoices)
      .where(and(between(purchaseInvoices.date, start, end), eq(purchaseInvoices.status, "true"), eq(purchaseInvoices.organizationId, org)));
    return { total: Number(row.total), paid: Number(row.paid), due: Number(row.due) };
  }

  // Isolation P2 : returnSaleInvoice / returnPurchaseInvoice portent desormais
  // organization_id (migration 0178, backfille depuis la facture parente).
  private async salesReturnTotal(start: Date, end: Date, org: number) {
    const [row] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${returnSaleInvoices.totalAmount}), 0)` })
      .from(returnSaleInvoices)
      .where(and(between(returnSaleInvoices.date, start, end), eq(returnSaleInvoices.organizationId, org)));
    return Number(row.total);
  }

  private async purchaseReturnTotal(start: Date, end: Date, org: number) {
    const [row] = await this.db
      .select({ total: sql<number>`COALESCE(SUM(${returnPurchaseInvoices.totalAmount}), 0)` })
      .from(returnPurchaseInvoices)
      .where(and(between(returnPurchaseInvoices.date, start, end), eq(returnPurchaseInvoices.organizationId, org)));
    return Number(row.total);
  }

  private async monthlyChart(start: Date, end: Date, org: number) {
    const [salesRows, purchaseRows] = await Promise.all([
      this.db
        .select({
          month: sql<string>`DATE_FORMAT(${saleInvoices.date}, '%b %y')`,
          minDate: sql<string>`MIN(${saleInvoices.date})`,
          sales: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
        })
        .from(saleInvoices)
        .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)))
        .groupBy(sql`DATE_FORMAT(${saleInvoices.date}, '%b %y')`)
        .orderBy(sql`MIN(${saleInvoices.date})`),

      this.db
        .select({
          month: sql<string>`DATE_FORMAT(${purchaseInvoices.date}, '%b %y')`,
          purchases: sql<number>`COALESCE(SUM(${purchaseInvoices.totalAmount}), 0)`,
        })
        .from(purchaseInvoices)
        .where(and(between(purchaseInvoices.date, start, end), eq(purchaseInvoices.status, "true"), eq(purchaseInvoices.organizationId, org)))
        .groupBy(sql`DATE_FORMAT(${purchaseInvoices.date}, '%b %y')`),
    ]);

    const purchaseMap = new Map(purchaseRows.map((r) => [r.month, Number(r.purchases)]));

    return salesRows.map((r) => ({
      month: r.month,
      sales: Math.round(Number(r.sales)),
      purchases: Math.round(purchaseMap.get(r.month) ?? 0),
    }));
  }

  private async accountsBalance(start: Date, end: Date, org: number) {
    // Sous-comptes ET ecritures filtres par org (isolation P2).
    const allAccounts = await this.db
      .select({ id: subAccounts.id, name: subAccounts.name })
      .from(subAccounts)
      .where(eq(subAccounts.organizationId, org));

    const [credits, debits] = await Promise.all([
      this.db
        .select({
          accountId: transactions.creditId,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(and(between(transactions.date, start, end), eq(transactions.status, "true"), eq(transactions.organizationId, org)))
        .groupBy(transactions.creditId),

      this.db
        .select({
          accountId: transactions.debitId,
          total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .where(and(between(transactions.date, start, end), eq(transactions.status, "true"), eq(transactions.organizationId, org)))
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

  private async topCustomers(start: Date, end: Date, org: number) {
    const rows = await this.db
      .select({
        customerId: saleInvoices.customerId,
        totalSales: sql<number>`SUM(${saleInvoices.totalAmount})`,
      })
      .from(saleInvoices)
      .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org), isNotNull(saleInvoices.customerId)))
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

  private async topProducts(start: Date, end: Date, org: number) {
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
        eq(saleInvoices.status, "true"),
        eq(saleInvoices.organizationId, org),
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

  private async kpiTrends(end: Date, org: number) {
    const trendStart = new Date(end);
    trendStart.setDate(trendStart.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);
    const trendEnd = new Date(end);
    trendEnd.setHours(23, 59, 59, 999);

    const [saleTrend, saleDueTrend, purTrend, purDueTrend] = await Promise.all([
      this.dailyTrend(saleInvoices, saleInvoices.totalAmount, saleInvoices.date, trendStart, trendEnd, org, saleInvoices.organizationId),
      this.dailyTrend(saleInvoices, saleInvoices.dueAmount, saleInvoices.date, trendStart, trendEnd, org, saleInvoices.organizationId),
      this.dailyTrend(purchaseInvoices, purchaseInvoices.totalAmount, purchaseInvoices.date, trendStart, trendEnd, org, purchaseInvoices.organizationId),
      this.dailyTrend(purchaseInvoices, purchaseInvoices.dueAmount, purchaseInvoices.date, trendStart, trendEnd, org, purchaseInvoices.organizationId),
    ]);

    return {
      totalSaleAmount: { value: saleTrend[6] ?? 0, trend: saleTrend, change: this.pct(saleTrend) },
      totalSaleDue: { value: saleDueTrend[6] ?? 0, trend: saleDueTrend, change: this.pct(saleDueTrend) },
      totalPurchaseAmount: { value: purTrend[6] ?? 0, trend: purTrend, change: this.pct(purTrend) },
      totalPurchaseDue: { value: purDueTrend[6] ?? 0, trend: purDueTrend, change: this.pct(purDueTrend) },
    };
  }

  private async dailyTrend(table: any, amountCol: any, dateCol: any, start: Date, end: Date, org: number, orgCol: any): Promise<number[]> {
    const conditions = [between(dateCol, start, end)];
    if (table.status) conditions.push(eq(table.status, "true"));
    if (orgCol) conditions.push(eq(orgCol, org));
    const where = and(...conditions);
    const rows = await this.db
      .select({
        day: sql<string>`DATE(${dateCol})`,
        total: sql<number>`COALESCE(SUM(${amountCol}), 0)`,
      })
      .from(table)
      .where(where)
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

  /** Devise par defaut lue depuis le parametre (appSetting.currencyId). Jamais codee en dur. */
  private async defaultCurrency() {
    const [setting] = await this.db
      .select({ currencyId: appSettings.currencyId })
      .from(appSettings)
      .limit(1);
    if (!setting?.currencyId) return null;
    const [cur] = await this.db
      .select({
        id: currencies.id,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(currencies)
      .where(eq(currencies.id, setting.currencyId))
      .limit(1);
    return cur ?? null;
  }

  private async salesByCurrency(start: Date, end: Date, org: number) {
    const rows = await this.db
      .select({
        currencyId: saleInvoices.currencyId,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
        total: sql<number>`COALESCE(SUM(${saleInvoices.totalAmount}), 0)`,
      })
      .from(saleInvoices)
      .leftJoin(currencies, eq(currencies.id, saleInvoices.currencyId))
      .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)))
      .groupBy(saleInvoices.currencyId, currencies.currencyCode, currencies.currencyName, currencies.currencySymbol);

    // Fallback = devise par defaut du parametre (pas une constante en dur).
    const def = await this.defaultCurrency();
    return rows.map((r) => ({
      currencyId: r.currencyId ?? def?.id ?? null,
      currencyCode: r.currencyCode ?? def?.currencyCode ?? null,
      currencyName: r.currencyName ?? def?.currencyName ?? null,
      currencySymbol: r.currencySymbol ?? def?.currencySymbol ?? null,
      amount: Math.round(Number(r.total)),
    }));
  }

  // ── SCRUM-142: aggregated startup endpoint ──────────────────────────────
  async getStartupData(query: DashboardQueryDto, org: number) {
    const { start, end } = this.resolveDates(query);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const [dashboardData, overdueLeases, pendingMaintenance, lowStock, invoiceCount] =
      await Promise.all([
        this.getDashboardData(query, org),

        // Active leases where nextInvoiceDate is past today
        this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(realEstateLeases)
          .where(
            and(
              eq(realEstateLeases.status, "active"),
              lt(realEstateLeases.nextInvoiceDate, todayStr),
              eq(realEstateLeases.organizationId, org),
            ),
          ),

        // Open or in-progress maintenance requests
        this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(realEstateMaintenanceRequests)
          .where(
            and(
              inArray(realEstateMaintenanceRequests.status, ["open", "in_progress"]),
              eq(realEstateMaintenanceRequests.isActive, true),
              eq(realEstateMaintenanceRequests.organizationId, org),
            ),
          ),

        // Products below reorder threshold
        this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(products)
          .where(
            and(
              eq(products.status, "true"),
              eq(products.organizationId, org),
              sql`${products.reorderQuantity} > 0`,
              sql`${products.productQuantity} <= ${products.reorderQuantity}`,
            ),
          ),

        // Sale invoices this period (for Header alert + SideNav badge)
        this.db
          .select({ count: sql<number>`COUNT(*)` })
          .from(saleInvoices)
          .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org))),
      ]);

    return {
      ...dashboardData,
      alerts: {
        overdueLeases: Number(overdueLeases[0]?.count ?? 0),
        pendingMaintenance: Number(pendingMaintenance[0]?.count ?? 0),
        lowStockItems: Number(lowStock[0]?.count ?? 0),
        monthlyInvoices: Number(invoiceCount[0]?.count ?? 0),
      },
      sidenavBadge: {
        unpaidInvoicesCount: Number(invoiceCount[0]?.count ?? 0),
      },
    };
  }

  // ── SCRUM-142: aggregated recent-activity endpoint ───────────────────────
  async getRecentActivity(query: DashboardQueryDto, org: number) {
    const { start, end } = this.resolveDates(query);

    const [recentSales, pendingOrders, receivedOrders, deliveredOrders] = await Promise.all([
      this.db
        .select()
        .from(saleInvoices)
        .where(and(between(saleInvoices.date, start, end), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)))
        .orderBy(desc(saleInvoices.date))
        .limit(5),

      this.cartOrdersByStatus("PENDING", org),
      this.cartOrdersByStatus("RECEIVED", org),
      this.cartOrdersByStatus("DELIVERED", org),
    ]);

    return {
      recentSales,
      cartOrders: {
        pending: pendingOrders,
        received: receivedOrders,
        delivered: deliveredOrders,
      },
    };
  }

  private async cartOrdersByStatus(status: string, org: number) {
    const [countRow] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(saleInvoices)
      .where(and(eq(saleInvoices.orderStatus, status), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)));

    const items = await this.db
      .select()
      .from(saleInvoices)
      .where(and(eq(saleInvoices.orderStatus, status), eq(saleInvoices.status, "true"), eq(saleInvoices.organizationId, org)))
      .orderBy(desc(saleInvoices.date))
      .limit(5);

    return { count: Number(countRow?.count ?? 0), items };
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
