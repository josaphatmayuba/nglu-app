import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, forecastExternalRefs } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey } from "../forecast.util";

// Types de reference reconnus comme FLUX de tresorerie recurrents.
const INFLOW = "cashflow_inflow";
const OUTFLOW = "cashflow_outflow";

/**
 * Niveau 2 (reference externe) — flux de tresorerie recurrents saisis a la main
 * (table forecast_external_refs, source manuelle prioritaire). Chaque reference
 * active de type cashflow_inflow/outflow genere un flux mensuel sur l'horizon,
 * par devise. Badge de provenance porte par `source` (manual/api/ia).
 */
@Injectable()
export class ExternalRefProducer implements ForecastProducer {
  readonly scope = "compta" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]> {
    const refs = await this.db
      .select({
        kind: forecastExternalRefs.kind,
        label: forecastExternalRefs.label,
        value: forecastExternalRefs.value,
        source: forecastExternalRefs.source,
        currencyId: forecastExternalRefs.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(forecastExternalRefs)
      .leftJoin(currencies, eq(currencies.id, forecastExternalRefs.currencyId))
      .where(
        and(
          eq(forecastExternalRefs.organizationId, orgId),
          eq(forecastExternalRefs.isActive, 1),
        ),
      );

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const r of refs) {
      if (r.kind !== INFLOW && r.kind !== OUTFLOW) continue;
      const amount = Number(r.value || 0);
      if (amount <= 0) continue;
      const signed = r.kind === OUTFLOW ? -amount : amount;
      const badge = r.source === "api" ? "réf. API" : r.source === "ia" ? "estimé IA" : "réf. interne";

      for (let i = 1; i < horizonMonths; i++) {
        lines.push({
          month: monthKey(addMonths(now, i)),
          amount: signed,
          currencyId: r.currencyId ?? null,
          currencyCode: r.currencyCode ?? null,
          currencySymbol: r.currencySymbol ?? null,
          layer: 2,
          confidence: "estimated",
          scope: "compta",
          source: r.label,
          basis: badge,
        });
      }
    }

    return lines;
  }
}
