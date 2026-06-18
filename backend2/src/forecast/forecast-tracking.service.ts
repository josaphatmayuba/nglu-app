import { Inject, Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { currencies, forecastSnapshots, saleInvoices } from "../database/schema";
import type { Database } from "../database/types";
import { ForecastService, type ForecastMode } from "./forecast.service";
import type { ForecastScope } from "./forecast.types";
import { monthKey, round2 } from "./forecast.util";

/**
 * Boucle prevu vs reel : enregistre des snapshots de prevision et les compare
 * au reel (ventes encaissees du mois) pour mesurer l'ecart par devise.
 * Le "reel" de reference ici = total des ventes du mois (la grandeur qu'on
 * projette en tendance) ; sert d'indicateur d'auto-correction.
 */
@Injectable()
export class ForecastTrackingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly forecast: ForecastService,
  ) {}

  /**
   * Fige le net prevu (mode/scope donnes) pour chaque mois de l'horizon x devise.
   * Idempotent par jour : un seul snapshot par (org, takenAt, mois, scope, mode, devise).
   */
  async snapshot(orgId: number, mode: ForecastMode, scope: ForecastScope, horizonMonths: number) {
    const projection = await this.forecast.cashFlow(orgId, { horizonMonths, mode, scope });
    const today = monthKey(new Date()) + "-01"; // 1er du mois courant (date stable)
    let saved = 0;

    for (const m of projection.months) {
      for (const c of m.currencies) {
        const existing = await this.db
          .select({ id: forecastSnapshots.id })
          .from(forecastSnapshots)
          .where(
            and(
              eq(forecastSnapshots.organizationId, orgId),
              eq(forecastSnapshots.takenAt, today),
              eq(forecastSnapshots.targetMonth, m.month),
              eq(forecastSnapshots.scope, scope),
              eq(forecastSnapshots.mode, mode),
              c.currencyId == null
                ? sql`${forecastSnapshots.currencyId} is null`
                : eq(forecastSnapshots.currencyId, c.currencyId),
            ),
          )
          .limit(1);
        if (existing.length) continue;

        await this.db.insert(forecastSnapshots).values({
          organizationId: orgId,
          takenAt: today,
          targetMonth: m.month,
          scope,
          mode,
          currencyId: c.currencyId ?? null,
          predictedNet: String(c.net),
        });
        saved++;
      }
    }
    return { saved };
  }

  /** Ventes reelles d'un mois (YYYY-MM) par devise. */
  private async actualSalesByCurrency(orgId: number, month: string) {
    const rows = await this.db
      .select({
        currencyId: saleInvoices.currencyId,
        currencyCode: currencies.currencyCode,
        total: sql<string>`coalesce(sum(${saleInvoices.totalAmount}), 0)`,
      })
      .from(saleInvoices)
      .leftJoin(currencies, eq(currencies.id, saleInvoices.currencyId))
      .where(
        and(
          eq(saleInvoices.organizationId, orgId),
          eq(saleInvoices.status, "true"),
          sql`date_format(${saleInvoices.date}, '%Y-%m') = ${month}`,
        ),
      )
      .groupBy(saleInvoices.currencyId);
    return rows.map((r) => ({
      currencyId: r.currencyId ?? null,
      currencyCode: r.currencyCode ?? null,
      actual: round2(Number(r.total || 0)),
    }));
  }

  /**
   * Ecart prevu vs reel pour les mois DEJA ECOULES (snapshots dont le mois cible
   * est <= mois courant). Pour chaque (mois, devise) : prevu, reel, ecart, %.
   */
  async variance(orgId: number, scope: ForecastScope = "ventes") {
    const nowMonth = monthKey(new Date());
    const snaps = await this.db
      .select({
        targetMonth: forecastSnapshots.targetMonth,
        currencyId: forecastSnapshots.currencyId,
        predictedNet: forecastSnapshots.predictedNet,
      })
      .from(forecastSnapshots)
      .where(and(eq(forecastSnapshots.organizationId, orgId), eq(forecastSnapshots.scope, scope)));

    // On garde le snapshot le plus RECENT par (mois, devise) et seulement le passe.
    const past = snaps.filter((s) => s.targetMonth <= nowMonth);
    const byKey = new Map<string, { month: string; currencyId: number | null; predicted: number }>();
    for (const s of past) {
      const key = `${s.targetMonth}|${s.currencyId ?? "null"}`;
      byKey.set(key, { month: s.targetMonth, currencyId: s.currencyId ?? null, predicted: Number(s.predictedNet) });
    }

    const months = [...new Set([...byKey.values()].map((v) => v.month))];
    const actualsByMonth = new Map<string, Awaited<ReturnType<typeof this.actualSalesByCurrency>>>();
    for (const month of months) {
      actualsByMonth.set(month, await this.actualSalesByCurrency(orgId, month));
    }

    const rows = [...byKey.values()].map((v) => {
      const actuals = actualsByMonth.get(v.month) || [];
      const match = actuals.find((a) => a.currencyId === v.currencyId);
      const actual = match ? match.actual : 0;
      const diff = round2(actual - v.predicted);
      const pct = v.predicted !== 0 ? round2((diff / Math.abs(v.predicted)) * 100) : null;
      return {
        month: v.month,
        currencyId: v.currencyId,
        currencyCode: match?.currencyCode ?? null,
        predicted: v.predicted,
        actual,
        diff,
        pct,
      };
    });

    rows.sort((a, b) => a.month.localeCompare(b.month));

    // Biais moyen (sur/sous-estimation) pour l'auto-correction.
    const pcts = rows.map((r) => r.pct).filter((p): p is number => p != null);
    const avgBiasPct = pcts.length ? round2(pcts.reduce((t, p) => t + p, 0) / pcts.length) : null;

    return { scope, rows, avgBiasPct };
  }
}
