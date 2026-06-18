import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNotNull, ne, notInArray, or, sql } from "drizzle-orm";
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

const DEFAULT_LOOKBACK_MONTHS = 6;
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

  async livestock(orgId: number, horizonMonths: number, species?: string | null, lookbackMonths = DEFAULT_LOOKBACK_MONTHS) {
    const since = `${monthKey(addMonths(new Date(), -lookbackMonths))}-01`;
    const [current, births, monthlyDeaths, monthlyExits, avgPrices] = await Promise.all([
      this.currentHead(orgId, species),
      this.birthsByMonth(orgId, horizonMonths, species),
      this.monthlyDeathRate(orgId, since, species, lookbackMonths),
      this.monthlyExitHead(orgId, since, species, lookbackMonths),
      this.avgSalePricePerHead(orgId, since, species),
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
            basis: `${p.exits} têtes × ${round2(price.avgPrice)} prix moyen ${lookbackMonths} mois`,
          });
        }
      }
    }

    return {
      horizonMonths,
      lookbackMonths,
      species: species ?? null,
      unit: "têtes",
      current,
      basis: `effectif réel ${current} têtes ; mortalité ${round2(monthlyMortalityRate * 100)}%/mois, ${Math.round(monthlyExits)} sorties/mois (moyenne ${lookbackMonths} mois)`,
      points,
      revenue,
    };
  }

  /** Effectif vivant courant = somme des tetes des animaux actifs non sortis. */
  private async currentHead(orgId: number, species?: string | null): Promise<number> {
    const where = species
      ? and(
          eq(farmosAnimals.organizationId, orgId),
          eq(farmosAnimals.isActive, 1),
          notInArray(farmosAnimals.status, DEAD_OR_GONE),
          eq(farmosAnimals.species, species),
        )
      : and(
          eq(farmosAnimals.organizationId, orgId),
          eq(farmosAnimals.isActive, 1),
          notInArray(farmosAnimals.status, DEAD_OR_GONE),
        );
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(coalesce(${farmosAnimals.count}, 1)), 0)` })
      .from(farmosAnimals)
      .where(where);
    return Number(row?.total || 0);
  }

  /** Naissances certaines par mois d'echeance (gestations en cours). */
  private async birthsByMonth(orgId: number, horizonMonths: number, species?: string | null): Promise<Map<string, number>> {
    const today = `${monthKey(new Date())}-01`;
    const where = species
      ? and(
          eq(farmosReproductionEvents.organizationId, orgId),
          eq(farmosReproductionEvents.isActive, 1),
          isNotNull(farmosReproductionEvents.expectedDueDate),
          gte(farmosReproductionEvents.expectedDueDate, today),
          eq(farmosAnimals.species, species),
        )
      : and(
          eq(farmosReproductionEvents.organizationId, orgId),
          eq(farmosReproductionEvents.isActive, 1),
          isNotNull(farmosReproductionEvents.expectedDueDate),
          gte(farmosReproductionEvents.expectedDueDate, today),
        );
    const rows = await this.db
      .select({
        dueDate: farmosReproductionEvents.expectedDueDate,
        offspring: farmosReproductionEvents.offspringCount,
      })
      .from(farmosReproductionEvents)
      .leftJoin(farmosAnimals, and(eq(farmosAnimals.id, farmosReproductionEvents.animalId), eq(farmosAnimals.organizationId, orgId)))
      .where(where);

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
  private async monthlyDeathRate(orgId: number, since: string, species: string | null | undefined, lookbackMonths: number): Promise<number> {
    const where = species
      ? and(
          eq(farmosMortalityEvents.organizationId, orgId),
          eq(farmosMortalityEvents.isActive, 1),
          gte(farmosMortalityEvents.eventDate, since),
          eq(farmosMortalityEvents.species, species),
        )
      : and(
          eq(farmosMortalityEvents.organizationId, orgId),
          eq(farmosMortalityEvents.isActive, 1),
          gte(farmosMortalityEvents.eventDate, since),
        );
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${farmosMortalityEvents.count}), 0)` })
      .from(farmosMortalityEvents)
      .where(where);
    return Number(row?.total || 0) / lookbackMonths;
  }

  /** Tetes sorties par vente / mois (animaux vifs ou abattus) — tendance. */
  private async monthlyExitHead(orgId: number, since: string, species: string | null | undefined, lookbackMonths: number): Promise<number> {
    const liveSaleFilter = sql`(${farmosSales.animalId} is not null or lower(coalesce(${farmosSales.productType}, '')) in (${sql.join(LIVE_SALE_TYPES.map((t) => sql`${t}`), sql`, `)}))`;
    const where = species
      ? and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          liveSaleFilter,
          or(eq(farmosSales.species, species), eq(farmosAnimals.species, species)),
        )
      : and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          liveSaleFilter,
        );
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${farmosSales.quantity}), 0)` })
      .from(farmosSales)
      .leftJoin(farmosAnimals, and(eq(farmosAnimals.id, farmosSales.animalId), eq(farmosAnimals.organizationId, orgId)))
      .where(where);
    return Number(row?.total || 0) / lookbackMonths;
  }

  /** Prix moyen par tete vendue, par devise (sur les ventes d'animaux). */
  private async avgSalePricePerHead(orgId: number, since: string, species?: string | null) {
    const where = species
      ? and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          isNotNull(farmosSales.animalId),
          ne(farmosSales.quantity, "0"),
          or(eq(farmosSales.species, species), eq(farmosAnimals.species, species)),
        )
      : and(
          eq(farmosSales.organizationId, orgId),
          eq(farmosSales.isActive, 1),
          gte(farmosSales.saleDate, since),
          isNotNull(farmosSales.animalId),
          ne(farmosSales.quantity, "0"),
        );
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
      .leftJoin(farmosAnimals, and(eq(farmosAnimals.id, farmosSales.animalId), eq(farmosAnimals.organizationId, orgId)))
      .where(where)
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
