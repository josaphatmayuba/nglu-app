import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, farmosSales } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey, round2 } from "../forecast.util";

const LOOKBACK_MONTHS = 6;

/**
 * Niveau 2 (tendance) — recettes de ventes FarmOS ESTIMEES : moyenne mensuelle
 * des ventes d'elevage des LOOKBACK_MONTHS derniers mois, par devise, extrapolee
 * en ENTREE future. Une vente d'animal n'etant jamais "engagee", elle reste en
 * couche 2 (mode Realiste). Aucune conversion entre devises.
 */
@Injectable()
export class FarmosSalesTrendProducer implements ForecastProducer {
  readonly scope = "farmos" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]> {
    const since = addMonths(new Date(), -LOOKBACK_MONTHS);
    const sinceStr = `${monthKey(since)}-01`;

    const rows = await this.db
      .select({
        currencyId: farmosSales.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        total: sql<string>`coalesce(sum(${farmosSales.totalAmount}), 0)`,
      })
      .from(farmosSales)
      .leftJoin(currencies, eq(currencies.id, farmosSales.currencyId))
      .where(
        and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, sinceStr),
        ),
      )
      .groupBy(farmosSales.currencyId);

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const r of rows) {
      const monthlyAvg = round2(Number(r.total || 0) / LOOKBACK_MONTHS);
      if (monthlyAvg <= 0) continue;

      for (let i = 1; i < horizonMonths; i++) {
        lines.push({
          month: monthKey(addMonths(now, i)),
          amount: monthlyAvg, // entree estimee
          currencyId: r.currencyId ?? null,
          currencyCode: r.currencyCode ?? null,
          currencySymbol: r.currencySymbol ?? null,
          layer: 2,
          confidence: "estimated",
          scope: "farmos",
          source: "Ventes élevage (tendance)",
          basis: `moyenne ${LOOKBACK_MONTHS} derniers mois`,
        });
      }
    }

    return lines;
  }
}
