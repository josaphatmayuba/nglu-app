import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, farmosAnimals, farmosSales } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastContext, ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey, round2 } from "../forecast.util";

const DEFAULT_LOOKBACK_MONTHS = 6;

/**
 * Niveau 2 (tendance) — recettes de ventes FarmOS ESTIMEES : moyenne mensuelle
 * des ventes d'elevage des derniers mois, par devise, extrapolee
 * en ENTREE future. Une vente d'animal n'etant jamais "engagee", elle reste en
 * couche 2 (mode Realiste). Aucune conversion entre devises.
 */
@Injectable()
export class FarmosSalesTrendProducer implements ForecastProducer {
  readonly scope = "farmos" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number, context: ForecastContext = {}): Promise<ForecastLine[]> {
    const lookbackMonths = context.lookbackMonths ?? DEFAULT_LOOKBACK_MONTHS;
    const since = addMonths(new Date(), -lookbackMonths);
    const sinceStr = `${monthKey(since)}-01`;
    const species = context.species || null;
    const where = species
      ? and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, sinceStr),
          or(eq(farmosSales.species, species), eq(farmosAnimals.species, species)),
        )
      : and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, sinceStr),
        );

    const rows = await this.db
      .select({
        currencyId: farmosSales.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        total: sql<string>`coalesce(sum(${farmosSales.totalAmount}), 0)`,
      })
      .from(farmosSales)
      .leftJoin(currencies, eq(currencies.id, farmosSales.currencyId))
      .leftJoin(farmosAnimals, and(eq(farmosAnimals.id, farmosSales.animalId), eq(farmosAnimals.organizationId, orgId)))
      .where(where)
      .groupBy(farmosSales.currencyId);

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const r of rows) {
      const monthlyAvg = round2(Number(r.total || 0) / lookbackMonths);
      if (monthlyAvg <= 0) continue;

      for (let i = 1; i <= horizonMonths; i++) {
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
          basis: `moyenne ${lookbackMonths} derniers mois`,
        });
      }
    }

    return lines;
  }
}
