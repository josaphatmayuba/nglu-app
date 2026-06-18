import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { farmosAnimals, farmosProductionLogs, farmosReproductionEvents } from "../database/schema";
import type { Database } from "../database/types";
import { addMonths, monthKey, round2 } from "./forecast.util";

const DEFAULT_LOOKBACK_MONTHS = 6;

export interface ProductionPoint {
  month: string;
  /** Valeur projetee (oeufs en unites, ou naissances en tetes). */
  value: number;
  layer: 1 | 2;
  confidence: "certain" | "estimated";
  basis: string;
}

export interface ProductionSeries {
  kind: "eggs" | "births";
  unit: string;
  species?: string;
  points: ProductionPoint[];
}

/**
 * Projection de PRODUCTION (grandeur non monetaire) : oeufs et naissances.
 * - Oeufs : tendance N2 (moyenne mensuelle des production_logs type "egg").
 * - Naissances : N1 CERTAIN (expected_due_date des reproductions en cours) +
 *   complement tendance N2 possible plus tard.
 * Sert le moteur generique multi-grandeurs (kind=stock/livestock).
 */
@Injectable()
export class ForecastProductionService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async production(orgId: number, horizonMonths: number, species?: string | null, lookbackMonths = DEFAULT_LOOKBACK_MONTHS) {
    const [eggs, births] = await Promise.all([
      this.eggsTrend(orgId, horizonMonths, species, lookbackMonths),
      this.birthsCommitted(orgId, horizonMonths, species),
    ]);
    return { horizonMonths, lookbackMonths, species: species ?? null, series: [eggs, births].filter((s) => s.points.length > 0) };
  }

  /** Oeufs — tendance : moyenne mensuelle historique extrapolee. */
  private async eggsTrend(orgId: number, horizonMonths: number, species: string | null | undefined, lookbackMonths: number): Promise<ProductionSeries> {
    const since = `${monthKey(addMonths(new Date(), -lookbackMonths))}-01`;
    const where = species
      ? and(
          eq(farmosProductionLogs.organizationId, orgId),
          eq(farmosProductionLogs.isActive, 1),
          eq(farmosProductionLogs.productType, "egg"),
          gte(farmosProductionLogs.logDate, since),
          eq(farmosProductionLogs.species, species),
        )
      : and(
          eq(farmosProductionLogs.organizationId, orgId),
          eq(farmosProductionLogs.isActive, 1),
          eq(farmosProductionLogs.productType, "egg"),
          gte(farmosProductionLogs.logDate, since),
        );
    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${farmosProductionLogs.quantity}), 0)` })
      .from(farmosProductionLogs)
      .where(where);

    const monthlyAvg = round2(Number(row?.total || 0) / lookbackMonths);
    const now = new Date();
    const points: ProductionPoint[] = [];
    if (monthlyAvg > 0) {
      for (let i = 1; i <= horizonMonths; i++) {
        points.push({
          month: monthKey(addMonths(now, i)),
          value: monthlyAvg,
          layer: 2,
          confidence: "estimated",
          basis: `moyenne ${lookbackMonths} derniers mois`,
        });
      }
    }
    return { kind: "eggs", unit: "œufs", points };
  }

  /** Naissances — CERTAIN : sommes des offspring attendus par mois d'echeance. */
  private async birthsCommitted(orgId: number, horizonMonths: number, species?: string | null): Promise<ProductionSeries> {
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
      const m = r.dueDate.slice(0, 7); // YYYY-MM
      if (m > horizonEnd) continue;
      // Faute de comptage precis, 1 portee attendue compte au moins 1 petit.
      const count = r.offspring && r.offspring > 0 ? r.offspring : 1;
      byMonth.set(m, (byMonth.get(m) || 0) + count);
    }

    const points: ProductionPoint[] = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        value,
        layer: 1 as const,
        confidence: "certain" as const,
        basis: "gestations en cours (échéance attendue)",
      }));

    return { kind: "births", unit: "têtes", points };
  }
}
