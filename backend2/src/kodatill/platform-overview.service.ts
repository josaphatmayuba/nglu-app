import { Inject, Injectable } from "@nestjs/common";
import { and, count, countDistinct, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  ktBusinessProfiles,
  ktCommissionEntries,
  ktOrders,
  ktSubscriptions,
  organizations,
} from "../database/schema";
import type { Database } from "../database/types";

// P4 SCRUM-302 : tableau de bord global du super_owner, vue cross-organisation
// par construction. Toutes les routes sont gardees SuperOwnerGuard (comme les
// autres modules platform-*). Les montants ne sont JAMAIS sommes entre devises
// differentes : chaque agregat monetaire est retourne groupe par currencyCode
// (record { [currencyCode]: total }), a afficher tel quel cote frontend avec
// le symbole/devise correspondant.
@Injectable()
export class PlatformOverviewService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Mois calendaire courant au format YYYY-MM (aligne sur periodMonth de PlatformCommissionsService). */
  private currentPeriod(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** KPI globaux tous perimetres confondus. */
  async getOverview() {
    const [{ value: activatedOrgs }] = await this.db
      .select({ value: countDistinct(ktBusinessProfiles.organizationId) })
      .from(ktBusinessProfiles)
      .where(eq(ktBusinessProfiles.status, "true"));

    const [{ value: subscribedOrgs }] = await this.db
      .select({ value: countDistinct(ktSubscriptions.organizationId) })
      .from(ktSubscriptions)
      .where(
        and(eq(ktSubscriptions.status, "true"), inArray(ktSubscriptions.subStatus, ["active", "trial"])),
      );

    const salesRows = await this.db
      .select({
        currencyCode: ktOrders.currencyCode,
        total: sql<string>`sum(${ktOrders.total})`,
      })
      .from(ktOrders)
      .where(and(eq(ktOrders.status, "true"), eq(ktOrders.orderStatus, "completed")))
      .groupBy(ktOrders.currencyCode);

    const totalSalesByCurrency: Record<string, number> = {};
    for (const row of salesRows) {
      totalSalesByCurrency[row.currencyCode] = this.round2(Number(row.total ?? 0));
    }

    const period = this.currentPeriod();
    const commissionRows = await this.db
      .select({
        currencyCode: ktCommissionEntries.currencyCode,
        total: sql<string>`sum(${ktCommissionEntries.commissionAmount})`,
      })
      .from(ktCommissionEntries)
      .where(and(eq(ktCommissionEntries.status, "true"), eq(ktCommissionEntries.periodMonth, period)))
      .groupBy(ktCommissionEntries.currencyCode);

    const commissionsThisMonthByCurrency: Record<string, number> = {};
    for (const row of commissionRows) {
      commissionsThisMonthByCurrency[row.currencyCode] = this.round2(Number(row.total ?? 0));
    }

    return {
      activatedOrganizations: Number(activatedOrgs),
      subscribedOrganizations: Number(subscribedOrgs),
      totalSalesByCurrency,
      commissionsThisMonthByCurrency,
      commissionsPeriod: period,
    };
  }

  /**
   * Liste des organisations ayant active KodaTill (= ont un kt_business_profiles),
   * avec metriques agregees par organisation. Pagination simple limit/offset :
   * suffisante pour cette phase (nombre d'organisations clientes attendu modeste),
   * on ne construit pas de curseur/tri avance tant que le volume ne le justifie pas.
   */
  async listCompanies(limit = 50, offset = 0) {
    const profiles = await this.db
      .select({
        organizationId: ktBusinessProfiles.organizationId,
        activityType: ktBusinessProfiles.activityType,
        organizationName: organizations.name,
      })
      .from(ktBusinessProfiles)
      .leftJoin(organizations, eq(organizations.id, ktBusinessProfiles.organizationId))
      .where(eq(ktBusinessProfiles.status, "true"))
      .orderBy(ktBusinessProfiles.organizationId)
      .limit(limit)
      .offset(offset);

    if (!profiles.length) return [];

    const orgIds = profiles.map((p) => p.organizationId);

    const subs = await this.db
      .select({
        organizationId: ktSubscriptions.organizationId,
        subStatus: ktSubscriptions.subStatus,
      })
      .from(ktSubscriptions)
      .where(and(eq(ktSubscriptions.status, "true"), inArray(ktSubscriptions.organizationId, orgIds)));
    const subStatusByOrg = new Map(subs.map((s) => [s.organizationId, s.subStatus]));

    const orderCounts = await this.db
      .select({
        organizationId: ktOrders.organizationId,
        orderCount: count(),
      })
      .from(ktOrders)
      .where(
        and(
          eq(ktOrders.status, "true"),
          eq(ktOrders.orderStatus, "completed"),
          inArray(ktOrders.organizationId, orgIds),
        ),
      )
      .groupBy(ktOrders.organizationId);
    const orderCountByOrg = new Map(orderCounts.map((o) => [o.organizationId, Number(o.orderCount)]));

    const salesRows = await this.db
      .select({
        organizationId: ktOrders.organizationId,
        currencyCode: ktOrders.currencyCode,
        total: sql<string>`sum(${ktOrders.total})`,
      })
      .from(ktOrders)
      .where(
        and(
          eq(ktOrders.status, "true"),
          eq(ktOrders.orderStatus, "completed"),
          inArray(ktOrders.organizationId, orgIds),
        ),
      )
      .groupBy(ktOrders.organizationId, ktOrders.currencyCode);

    const salesByOrg = new Map<number, Record<string, number>>();
    for (const row of salesRows) {
      const bucket = salesByOrg.get(row.organizationId) ?? {};
      bucket[row.currencyCode] = this.round2(Number(row.total ?? 0));
      salesByOrg.set(row.organizationId, bucket);
    }

    return profiles.map((p) => ({
      organizationId: p.organizationId,
      organizationName: p.organizationName ?? null,
      activityType: p.activityType,
      subscriptionStatus: subStatusByOrg.get(p.organizationId) ?? "none",
      totalSalesByCurrency: salesByOrg.get(p.organizationId) ?? {},
      orderCount: orderCountByOrg.get(p.organizationId) ?? 0,
    }));
  }
}
