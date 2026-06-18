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

// Cone d'incertitude : +/-3% de marge par mois d'eloignement, plafonne a +/-40%.
const UNCERTAINTY_PER_MONTH = 0.03;
const UNCERTAINTY_MAX = 0.4;

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
  species?: string | null;
  lookbackMonths?: number;
  /**
   * Simulation "et si ?" : multiplicateurs par scope appliques aux FLUX
   * (pas au solde de depart, qui est reel). Ex. { domus: 1.1, hr: 0.9 } =
   * "+10% de loyers, -10% de salaires". Absent ou 1 = inchange.
   */
  adjustments?: Partial<Record<ForecastScope, number>>;
}

interface CurrencyBucket {
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  /** Variation nette du mois (entrees - sorties), HORS solde de depart. */
  net: number;
  /** Solde de depart (lignes opening) — point de depart de la courbe, pas un flux. */
  opening: number;
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
    const context = { species: query.species ?? null, lookbackMonths: query.lookbackMonths };
    const produced = await Promise.all(
      producers.map((p) => p.produce(orgId, query.horizonMonths, context)),
    );
    const rawLines = produced
      .flat()
      .filter((l) => l.layer <= maxLayer);

    // Simulation "et si ?" : on multiplie le montant des FLUX par le facteur du
    // scope (le solde de depart `opening` reste reel, jamais ajuste).
    const adj = query.adjustments ?? {};
    const lines: ForecastLine[] = rawLines.map((l) => {
      const factor = l.opening ? 1 : (adj[l.scope] ?? 1);
      return factor === 1 ? l : { ...l, amount: round2(l.amount * factor) };
    });

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
          opening: 0,
          lines: [],
        } satisfies CurrencyBucket);
      if (line.opening) bucket.opening = round2(bucket.opening + line.amount);
      else bucket.net = round2(bucket.net + line.amount);
      bucket.lines.push(line);
      monthMap.set(key, bucket);
      byMonth.set(line.month, monthMap);
    }

    // 3. Mise en forme triee par mois croissant, avec CONE D'INCERTITUDE :
    // la marge s'elargit avec l'eloignement (UNCERTAINTY_PER_MONTH par mois,
    // plafonnee). Plus l'horizon est lointain, moins le chiffre est sec.
    const sortedMonths = [...byMonth.keys()].sort();
    const months = sortedMonths.map((month, index) => {
      const margin = Math.min(index * UNCERTAINTY_PER_MONTH, UNCERTAINTY_MAX);
      return {
        month,
        // Marge d'incertitude appliquee (0 sur le 1er mois, croissante ensuite).
        uncertainty: round2(margin),
        currencies: [...byMonth.get(month)!.values()].map((b) => ({
          currencyId: b.currencyId,
          currencyCode: b.currencyCode,
          currencySymbol: b.currencySymbol,
          net: b.net,
          opening: b.opening,
          // Fourchette basse/haute du flux net (cone d'incertitude).
          netLow: round2(b.net * (1 - margin)),
          netHigh: round2(b.net * (1 + margin)),
          lines: b.lines,
        })),
      };
    });

    return {
      mode: query.mode,
      maxLayer,
      horizonMonths: query.horizonMonths,
      lookbackMonths: query.lookbackMonths,
      scope: query.scope,
      species: query.species ?? null,
      months,
    };
  }
}
