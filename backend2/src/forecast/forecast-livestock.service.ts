import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNotNull, ne, notInArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  farmosAnimals,
  farmosMortalityEvents,
  farmosReproductionEvents,
  farmosSales,
} from "../database/schema";
import type { Database } from "../database/types";
import { addMonths, monthKey, round2 } from "./forecast.util";

const LOOKBACK_MONTHS = 6;
/** Croissance de l'incertitude par mois sur le cheptel projete (plafond 40%). */
const UNCERTAINTY_PER_MONTH = 0.03;
const UNCERTAINTY_CAP = 0.4;
/** Statuts d'animaux comptant comme SORTIS du cheptel vivant. */
const DEAD_OR_GONE = ["dead", "deceased", "decede", "décédé", "sold", "vendu"];
/** Produits de vente qui retirent un animal du cheptel (vif/abattu), pas l'oeuf/lait. */
const LIVE_SALE_TYPES = ["animal", "live", "vif", "meat", "viande", "carcass", "carcasse"];

/** Un mois de la projection de cheptel. */
export interface LivestockPoint {
  month: string;
  /** Tetes projetees (valeur mediane). */
  head: number;
  /** Bornes basse/haute du cone d'incertitude. */
  headLow: number;
  headHigh: number;
  births: number;
  deaths: number;
  exits: number;
}

/** Recette de vente projetee deduite du cheptel, par devise. */
export interface LivestockRevenuePoint {
  month: string;
  currencyId: number | null;
  currencyCode: string | null;
  currencySymbol: string | null;
  amount: number;
  basis: string;
}

/**
 * Projection du CHEPTEL (grandeur livestock, unite = tetes) dans le temps.
 *
 * Part de l'effectif REEL courant et applique mois par mois les leviers, dont
 * les taux sont CALCULES SUR L'HISTORIQUE FarmOS (pas saisis a la main) :
 *  - naissances : N1 certain (gestations en cours) + N2 tendance (rythme passe)
 *  - mortalite  : N2 estime (taux mensuel historique applique au cheptel)
 *  - ventes/abattage/sorties : N2 tendance (tetes sorties/mois en moyenne)
 *
 * Le cheptel projete alimente AUSSI le cashflow : tetes vendues x prix moyen
 * historique par devise => recette previsionnelle d'elevage.
 */
@Injectable()
export class ForecastLivestockService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async livestock(orgId: number, horizonMonths: number) {
    const since = `${monthKey(addMonths(new Date(), -LOOKBACK_MONTHS))}-01`;
    const [current, births, monthlyDeaths, monthlyExits, avgPrices] = await Promise.all([
      this.currentHead(orgId),
      this.birthsByMonth(orgId, horizonMonths),
      this.monthlyDeathRate(orgId, since, undefined),
      this.monthlyExitHead(orgId, since),
      this.avgSalePricePerHead(orgId, since),
    ]);

    const now = new Date();
    const points: LivestockPoint[] = [];
    // Le taux de mortalite mensuel est calcule a partir du cheptel courant
    // (faute d'historique d'effectif, on prend l'effectif present comme base).
    const monthlyMortalityRate = current > 0 ? monthlyDeaths / current : 0;

    let head = current;
    for (let i = 1; i <= horizonMonths; i++) {
      const month = monthKey(addMonths(now, i));
      const b = births.get(month) || 0;
      const d = Math.round(head * monthlyMortalityRate);
      const x = Math.round(monthlyExits);
      head = Math.max(0, head + b - d - x);

      const spread = Math.min(UNCERTAINTY_PER_MONTH * i, UNCERTAINTY_CAP);
      points.push({
        month,
        head,
        headLow: Math.max(0, Math.round(head * (1 - spread))),
        headHigh: Math.round(head * (1 + spread)),
        births: b,
        deaths: d,
        exits: x,
      });
    }

    // Impact financier : tetes sorties par vente x prix moyen par devise.
    const revenue: LivestockRevenuePoint[] = [];
    if (monthlyExits > 0 && avgPrices.length > 0) {
      for (const p of points) {
        for (const price of avgPrices) {
          revenue.push({
            month: p.month,
            currencyId: price.currencyId,
            currencyCode: price.currencyCode,
            currencySymbol: price.currencySymbol,
            amount: round2(p.exits * price.avgPrice),
            basis: `${p.exits} têtes × ${round2(price.avgPrice)} prix moyen ${LOOKBACK_MONTHS} mois`,
          });
        }
      }
    }

    return {
      horizonMonths,
      unit: "têtes",
      current,
      basis: `effectif réel ${current} têtes ; mortalité ${round2(monthlyMortalityRate * 100)}%/mois, ${Math.round(monthlyExits)} sorties/mois (moyenne ${LOOKBACK_MONTHS} mois)`,
      points,
      revenue,
    };
  }

  /** Effectif vivant courant = somme des tetes des animaux actifs non sortis. */
  private async currentHead(orgId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(coalesce(${farmosAnimals.count}, 1)), 0)` })
      .from(farmosAnimals)
      .where(
        and(
          eq(farmosAnimals.organizationId, orgId),
          eq(farmosAnimals.isActive, 1),
          notInArray(farmosAnimals.status, DEAD_OR_GONE),
        ),
      );
    return Number(row?.total || 0);
  }

  /** Naissances certaines par mois d'echeance (gestations en cours). */
  private async birthsByMonth(orgId: number, horizonMonths: number): Promise<Map<string, number>> {
    const today = `${monthKey(new Date())}-01`;
    const rows = await this.db
      .select({
        dueDate: farmosReproductionEvents.expectedDueDate,
        offspring: farmosReproductionEvents.offspringCount,
      })
      .from(farmosReproductionEvents)
      .where(
        and(
          eq(farmosReproductionEvents.organizationId, orgId),
          eq(farmosReproductionEvents.isActive, 1),
          isNotNull(farmosReproductionEvents.expectedDueDate),
          gte(farmosReproductionEvents.expectedDueDate, today),
        ),
      );

    const horizonEnd = monthKey(addMonths(new Date(), horizonMonths));
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      if (!r.dueDate) continue;
      const m = r.dueDate.slice(0, 7);
      if (m > horizonEnd) continue;
      const count = r.offspring && r.offspring > 0 ? r.offspring : 1;
      byMonth.set(m, (byMonth.get(m) || 0) + count);
    }
    return byMonth;
  }

  /** Tetes mortes / mois (moyenne historique) — base du taux de mortalite. */
  private async monthlyDeathRate(orgId: number, since: string, _species?: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${farmosMortalityEvents.count}), 0)` })
      .from(farmosMortalityEvents)
      .where(
        and(
          eq(farmosMortalityEvents.organizationId, orgId),
          eq(farmosMortalityEvents.isActive, 1),
          gte(farmosMortalityEvents.eventDate, since),
        ),
      );
    return Number(row?.total || 0) / LOOKBACK_MONTHS;
  }

  /** Tetes sorties par vente / mois (animaux vifs ou abattus) — tendance. */
  private async monthlyExitHead(orgId: number, since: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${farmosSales.quantity}), 0)` })
      .from(farmosSales)
      .where(
        and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          // Vente liee a un animal OU produit de type vif/viande (pas oeuf/lait).
          sql`(${farmosSales.animalId} is not null or lower(coalesce(${farmosSales.productType}, '')) in (${sql.join(LIVE_SALE_TYPES.map((t) => sql`${t}`), sql`, `)}))`,
        ),
      );
    return Number(row?.total || 0) / LOOKBACK_MONTHS;
  }

  /** Prix moyen par tete vendue, par devise (sur les ventes d'animaux). */
  private async avgSalePricePerHead(orgId: number, since: string) {
    const rows = await this.db
      .select({
        currencyId: farmosSales.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
        amount: sql<string>`coalesce(sum(${farmosSales.totalAmount}), 0)`,
        qty: sql<string>`coalesce(sum(${farmosSales.quantity}), 0)`,
      })
      .from(farmosSales)
      .leftJoin(currencies, eq(currencies.id, farmosSales.currencyId))
      .where(
        and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          isNotNull(farmosSales.animalId),
          ne(farmosSales.quantity, "0"),
        ),
      )
      .groupBy(farmosSales.currencyId);

    return rows
      .map((r) => {
        const qty = Number(r.qty || 0);
        const amount = Number(r.amount || 0);
        return {
          currencyId: r.currencyId ?? null,
          currencyCode: r.currencyCode ?? null,
          currencySymbol: r.currencySymbol ?? null,
          avgPrice: qty > 0 ? amount / qty : 0,
        };
      })
      .filter((p) => p.avgPrice > 0);
  }
}
