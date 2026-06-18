import { Inject, Injectable } from "@nestjs/common";
import type {
  ForecastLayer,
  ForecastLine,
  ForecastProducer,
  ForecastScope,
} from "./forecast.types";
import { FORECAST_PRODUCERS } from "./forecast.types";
import { round2 } from "./forecast.util";

export type ForecastMode = "prudent" | "realiste" | "optimiste";

/** Couche maximale incluse selon le mode (curseur d'hypothese). */
const MODE_MAX_LAYER: Record<ForecastMode, ForecastLayer> = {
  prudent: 1,
  realiste: 2,
  optimiste: 3,
};

export interface CashFlowQuery {
  horizonMonths: number;
  mode: ForecastMode;
  scope: ForecastScope;
}

interface CurrencyBucket {
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  /** Variation nette du mois (entrees - sorties). */
  net: number;
  lines: ForecastLine[];
}

@Injectable()
export class ForecastService {
  constructor(
    @Inject(FORECAST_PRODUCERS) private readonly producers: ForecastProducer[],
  ) {}

  /**
   * Projection de tresorerie consolidee (ou filtree par scope), par mois x devise.
   * Aucune conversion entre devises : chaque devise est un sous-livre independant.
   */
  async cashFlow(orgId: number, query: CashFlowQuery) {
    const maxLayer = MODE_MAX_LAYER[query.mode];

    // 1. Collecte des lignes de tous les producteurs concernes par le scope.
    const producers = this.producers.filter(
      (p) => query.scope === "all" || p.scope === query.scope,
    );
    const produced = await Promise.all(
      producers.map((p) => p.produce(orgId, query.horizonMonths)),
    );
    const lines = produced
      .flat()
      .filter((l) => l.layer <= maxLayer);

    // 2. Agregation par mois x devise.
    const byMonth = new Map<string, Map<string, CurrencyBucket>>();
    for (const line of lines) {
      const monthMap = byMonth.get(line.month) ?? new Map<string, CurrencyBucket>();
      const key = String(line.currencyId ?? "null");
      const bucket =
        monthMap.get(key) ??
        ({
          currencyId: line.currencyId,
          currencyCode: line.currencyCode,
          currencySymbol: line.currencySymbol,
          net: 0,
          lines: [],
        } satisfies CurrencyBucket);
      bucket.net = round2(bucket.net + line.amount);
      bucket.lines.push(line);
      monthMap.set(key, bucket);
      byMonth.set(line.month, monthMap);
    }

    // 3. Mise en forme triee par mois croissant.
    const months = [...byMonth.keys()].sort().map((month) => ({
      month,
      currencies: [...byMonth.get(month)!.values()].map((b) => ({
        currencyId: b.currencyId,
        currencyCode: b.currencyCode,
        currencySymbol: b.currencySymbol,
        net: b.net,
        lines: b.lines,
      })),
    }));

    return {
      mode: query.mode,
      maxLayer,
      horizonMonths: query.horizonMonths,
      scope: query.scope,
      months,
    };
  }
}
