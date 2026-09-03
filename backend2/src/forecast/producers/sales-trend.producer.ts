import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, saleInvoices } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastContext, ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey, round2 } from "../forecast.util";

// Fenetre d'historique pour la moyenne mobile (mois).
const DEFAULT_LOOKBACK_MONTHS = 6;

/**
 * Niveau 2 (tendance) — recettes de ventes ESTIMEES : moyenne mensuelle des
 * ventes des derniers mois, par devise, extrapolee en ENTREE
 * sur chaque mois futur de l'horizon. Couche 2 => visible seulement en mode
 * Realiste/Optimiste (curseur). Aucune conversion entre devises.
 */
@Injectable()
export class SalesTrendProducer implements ForecastProducer {
  readonly scope = "ventes" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number, context: ForecastContext = {}): Promise<ForecastLine[]> {
    const lookbackMonths = context.lookbackMonths ?? DEFAULT_LOOKBACK_MONTHS;
    const since = addMonths(new Date(), -lookbackMonths);
    const sinceStr = `${monthKey(since)}-01`;

    // Total des ventes par devise sur la fenetre d'historique.
    const rows = await this.db
      .select({
        currencyId: saleInvoices.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        total: sql<string>`coalesce(sum(${saleInvoices.totalAmount}), 0)`,
      })
      .from(saleInvoices)
      .leftJoin(currencies, eq(currencies.id, saleInvoices.currencyId))
      .where(
        and(
          eq(saleInvoices.organizationId, orgId),
          eq(saleInvoices.status, "true"),
          gte(saleInvoices.date, sql`${sinceStr}`),
        ),
      )
      .groupBy(saleInvoices.currencyId);

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const r of rows) {
      const monthlyAvg = round2(Number(r.total || 0) / lookbackMonths);
      if (monthlyAvg <= 0) continue;

      // Le mois courant porte deja du reel : on commence la tendance au mois +1.
      for (let i = 1; i <= horizonMonths; i++) {
        lines.push({
          month: monthKey(addMonths(now, i)),
          amount: monthlyAvg, // entree estimee
          currencyId: r.currencyId ?? null,
          currencyCode: r.currencyCode ?? null,
          currencySymbol: r.currencySymbol ?? null,
          layer: 2,
          confidence: "estimated",
          scope: "compta",
          source: "Ventes (tendance)",
          basis: `moyenne ${lookbackMonths} derniers mois`,
        });
      }
    }

    return lines;
  }
}
