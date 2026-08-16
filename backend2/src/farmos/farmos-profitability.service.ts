import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  farmosAnimalOperations,
  farmosAnimals,
  farmosBatchAdjustments,
  farmosExpenses,
  farmosFeedMovements,
  farmosMedicines,
  farmosMortalityEvents,
  farmosPriceList,
  farmosProductionLogs,
  farmosProfitabilitySnapshots,
  farmosSales,
  farmosTreatments,
  farmosVaccinations,
} from "../database/schema";
import type { Database } from "../database/types";
import type { FarmosSpeciesScope } from "../auth/decorators/farmos-species-scope.decorator";
import type { CreateProfitabilitySnapshotDto } from "./dto/farmos.dto";

// ─── Rentabilité (P&L) par animal / lot — Phase 3 ──────────────────────────
//
// Décision d'archi (architecte) : calcul À LA VOLÉE en SQL (GROUP BY), pas de
// table matérialisée pour l'affichage. Volume réel = 100-1000 animaux, les
// index (organization_id, …) existants suffisent largement.
// `farmos_profitability_snapshots` sert UNIQUEMENT à figer une clôture sur
// demande explicite (bouton "Figer la clôture du mois"), jamais à l'affichage
// temps réel — un snapshot rendrait le chiffre faux dès qu'une dépense est
// saisie au champ.
//
// RÈGLE DE PRÉSENTATION NON NÉGOCIABLE (source d'erreur de lecture n°1 d'un
// P&L d'élevage) : on ne mélange JAMAIS ces 3 indicateurs en un seul chiffre :
//  - realizedProfit  = encaissé (ventes réelles) − décaissé (dépenses réelles)
//  - marginWithValuedProduction = realizedProfit + revenu THÉORIQUE de la
//    production non vendue (lait/oeufs/laine valorisés au tarif catalogue)
//  - latentHerdValue = plus-value latente du cheptel vivant non vendu
//    (farmos_animals.estimated_value), jamais additionnée au profit.
//
// DEVISES : plusieurs sources portent currency_id (ventes, dépenses, aliment,
// opérations…). Agréger sans conversion produit un faux total (incident connu
// "2e ligne USD fantôme"). v1 = un bloc de résultat PAR DEVISE, jamais de taux
// de change en dur. `farmos_animals.estimated_value` n'a pas de currency_id en
// base ; on le regroupe sous la clé null ("devise non spécifiée").
@Injectable()
export class FarmosProfitabilityService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private currencyKey(id: number | null | undefined) {
    return id == null ? "null" : String(id);
  }

  // RBAC par espèce (Phase 2) : fail-open sur species NULL, copie du pattern
  // farmos-feed.service.ts#movementSpeciesFilter / farmos-operations.service.ts#listOperations
  // (eux-mêmes copiés de listTreatments). Un scope vide bloque tout (1=0).
  private speciesFilter(column: any, speciesScope: FarmosSpeciesScope) {
    if (speciesScope === "all") return undefined;
    if (!speciesScope.length) return sql`1 = 0`;
    return or(isNull(column), inArray(column, speciesScope));
  }

  // ── Coût acquisition / achat (farmos_batch_adjustments, reason=purchase) ──
  // TROU DE DONNÉES CONNU : la table n'a ni coût ni devise. On utilise
  // farmos_animals.estimated_value comme proxy du coût d'acquisition (au
  // mieux, valeur estimée à la création de la fiche), clairement labellisé
  // "estimated" dans le breakdown — jamais mélangé aux coûts réels décaissés
  // (farmos_expenses reste la source de vérité des dépenses réelles).
  // NB: farmos_batch_adjustments n'a pas de colonne species propre ; le scope
  // espèce est déjà appliqué en amont via animalIds (filtré sur farmos_animals.species
  // par l'appelant), donc pas de filtre supplémentaire ici.
  private async acquisitionCostByAnimal(orgId: number, animalIds?: number[]) {
    const where = animalIds?.length
      ? and(eq(farmosBatchAdjustments.organizationId, orgId), eq(farmosBatchAdjustments.isActive, 1), eq(farmosBatchAdjustments.reason, "purchase"), inArray(farmosBatchAdjustments.animalId, animalIds))
      : and(eq(farmosBatchAdjustments.organizationId, orgId), eq(farmosBatchAdjustments.isActive, 1), eq(farmosBatchAdjustments.reason, "purchase"));
    const rows = await this.db
      .select({ animalId: farmosBatchAdjustments.animalId, delta: sql<number>`COALESCE(SUM(${farmosBatchAdjustments.delta}), 0)` })
      .from(farmosBatchAdjustments)
      .where(where)
      .groupBy(farmosBatchAdjustments.animalId);
    if (!rows.length) return new Map<number, number>();
    const ids = rows.map((r) => Number(r.animalId));
    const animals = await this.db
      .select({ id: farmosAnimals.id, estimatedValue: farmosAnimals.estimatedValue })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.organizationId, orgId), inArray(farmosAnimals.id, ids)));
    const valueById = new Map(animals.map((a) => [Number(a.id), Number(a.estimatedValue ?? 0)]));
    const out = new Map<number, number>();
    for (const r of rows) {
      const id = Number(r.animalId);
      out.set(id, valueById.get(id) ?? 0);
    }
    return out;
  }

  // ── Revenus par animal (ventes directes) ──────────────────────────────
  private async revenueByAnimal(orgId: number, from?: string, to?: string, species?: string, speciesScope: FarmosSpeciesScope = "all") {
    const clauses = [eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1)];
    if (from) clauses.push(gte(farmosSales.saleDate, from));
    if (to) clauses.push(lte(farmosSales.saleDate, to));
    if (species) clauses.push(eq(farmosSales.species, species));
    const scopeFilter = this.speciesFilter(farmosSales.species, speciesScope);
    if (scopeFilter) clauses.push(scopeFilter);
    return this.db
      .select({
        animalId: farmosSales.animalId,
        species: farmosSales.species,
        currencyId: farmosSales.currencyId,
        total: sql<number>`COALESCE(SUM(${farmosSales.totalAmount}), 0)`,
      })
      .from(farmosSales)
      .where(and(...clauses))
      .groupBy(farmosSales.animalId, farmosSales.species, farmosSales.currencyId);
  }

  // ── Coûts directs (farmos_expenses.related_animal_id) ─────────────────
  private async directExpensesByAnimal(orgId: number, from?: string, to?: string) {
    const clauses = [eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), sql`${farmosExpenses.relatedAnimalId} IS NOT NULL`];
    if (from) clauses.push(gte(farmosExpenses.expenseDate, from));
    if (to) clauses.push(lte(farmosExpenses.expenseDate, to));
    return this.db
      .select({
        animalId: farmosExpenses.relatedAnimalId,
        currencyId: farmosExpenses.currencyId,
        category: farmosExpenses.category,
        total: sql<number>`COALESCE(SUM(${farmosExpenses.amount}), 0)`,
      })
      .from(farmosExpenses)
      .where(and(...clauses))
      .groupBy(farmosExpenses.relatedAnimalId, farmosExpenses.currencyId, farmosExpenses.category);
  }

  // ── Coûts de ferme (expenses SANS related_animal_id) — à allouer ──────
  // Prorata au nombre de jours de présence : approximé par le nombre
  // d'animaux vivants (isActive=1) de l'espèce sur la période, faute de
  // dates d'entrée/sortie exploitables pour chaque tête. Poids = 1 par
  // fiche animal (une fiche = 1 tête ou 1 lot ; count reflète le lot).
  private async unallocatedFarmExpenses(orgId: number, from?: string, to?: string) {
    const clauses = [eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), isNull(farmosExpenses.relatedAnimalId)];
    if (from) clauses.push(gte(farmosExpenses.expenseDate, from));
    if (to) clauses.push(lte(farmosExpenses.expenseDate, to));
    return this.db
      .select({
        currencyId: farmosExpenses.currencyId,
        category: farmosExpenses.category,
        total: sql<number>`COALESCE(SUM(${farmosExpenses.amount}), 0)`,
      })
      .from(farmosExpenses)
      .where(and(...clauses))
      .groupBy(farmosExpenses.currencyId, farmosExpenses.category);
  }

  private async livestockWeightBySpecies(orgId: number, speciesScope: FarmosSpeciesScope = "all") {
    const clauses = [eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1)];
    const scopeFilter = this.speciesFilter(farmosAnimals.species, speciesScope);
    if (scopeFilter) clauses.push(scopeFilter);
    const rows = await this.db
      .select({ species: farmosAnimals.species, count: sql<number>`COALESCE(SUM(GREATEST(${farmosAnimals.count}, 1)), 0)` })
      .from(farmosAnimals)
      .where(and(...clauses))
      .groupBy(farmosAnimals.species);
    return new Map(rows.map((r) => [r.species, Number(r.count) || 1]));
  }

  // ── Aliment (farmos_feed_movements.total_cost, phase 1) ───────────────
  private async feedCost(orgId: number, from?: string, to?: string, speciesScope: FarmosSpeciesScope = "all") {
    const clauses = [eq(farmosFeedMovements.organizationId, orgId), eq(farmosFeedMovements.isActive, 1), eq(farmosFeedMovements.movementType, "out")];
    if (from) clauses.push(gte(farmosFeedMovements.movementDate, from));
    if (to) clauses.push(lte(farmosFeedMovements.movementDate, to));
    const scopeFilter = this.speciesFilter(farmosFeedMovements.species, speciesScope);
    if (scopeFilter) clauses.push(scopeFilter);
    return this.db
      .select({
        animalId: farmosFeedMovements.animalId,
        lot: farmosFeedMovements.lot,
        species: farmosFeedMovements.species,
        buildingId: farmosFeedMovements.buildingId,
        currencyId: farmosFeedMovements.currencyId,
        animalCount: farmosFeedMovements.animalCount,
        total: sql<number>`COALESCE(SUM(${farmosFeedMovements.totalCost}), 0)`,
      })
      .from(farmosFeedMovements)
      .where(and(...clauses))
      .groupBy(farmosFeedMovements.animalId, farmosFeedMovements.lot, farmosFeedMovements.species, farmosFeedMovements.buildingId, farmosFeedMovements.currencyId, farmosFeedMovements.animalCount);
  }

  // ── Traitements (farmos_treatments × farmos_medicines.unit_price) ─────
  // TROU DE DONNÉES CONNU : farmos_treatments ne stocke pas la quantité
  // consommée (elle transite en DTO au moment de createTreatment sans être
  // persistée). Approximation : 1 dose = 1 unité de unit_price. Labellisé
  // "estimated" dans le breakdown, jamais confondu avec un coût facturé.
  private async treatmentCostByAnimal(orgId: number, from?: string, to?: string) {
    const clauses = [eq(farmosTreatments.organizationId, orgId), eq(farmosTreatments.isActive, 1), sql`${farmosTreatments.medicineId} IS NOT NULL`];
    if (from) clauses.push(gte(farmosTreatments.startDate, from));
    if (to) clauses.push(lte(farmosTreatments.startDate, to));
    const rows = await this.db
      .select({
        animalId: farmosTreatments.animalId,
        currencyId: farmosMedicines.currencyId,
        total: sql<number>`COALESCE(SUM(COALESCE(${farmosMedicines.unitPrice}, 0)), 0)`,
      })
      .from(farmosTreatments)
      .innerJoin(farmosMedicines, eq(farmosMedicines.id, farmosTreatments.medicineId))
      .where(and(...clauses, eq(farmosMedicines.organizationId, orgId)))
      .groupBy(farmosTreatments.animalId, farmosMedicines.currencyId);
    return rows;
  }

  // ── Vaccinations (espèce/lot × animal_count) ───────────────────────────
  // Pas de FK vers farmos_medicines : jointure best-effort par nom (vaccine
  // = medicines.name), collation explicite requise (piège collation MySQL 8).
  private async vaccinationCostBySpecies(orgId: number, from?: string, to?: string) {
    const clauses = [eq(farmosVaccinations.organizationId, orgId), eq(farmosVaccinations.isActive, 1)];
    if (from) clauses.push(gte(farmosVaccinations.dueDate, from));
    if (to) clauses.push(lte(farmosVaccinations.dueDate, to));
    const rows = await this.db
      .select({
        species: farmosVaccinations.species,
        currencyId: farmosMedicines.currencyId,
        total: sql<number>`COALESCE(SUM(COALESCE(${farmosMedicines.unitPrice}, 0) * GREATEST(COALESCE(${farmosVaccinations.animalCount}, 1), 1)), 0)`,
      })
      .from(farmosVaccinations)
      .innerJoin(
        farmosMedicines,
        and(
          eq(farmosMedicines.organizationId, orgId),
          sql`LOWER(${farmosMedicines.name}) collate utf8mb4_0900_ai_ci = LOWER(${farmosVaccinations.vaccine}) collate utf8mb4_0900_ai_ci`,
        ),
      )
      .where(and(...clauses))
      .groupBy(farmosVaccinations.species, farmosMedicines.currencyId);
    return rows;
  }

  // ── Opérations zootechniques (phase 2) ─────────────────────────────────
  private async operationCost(orgId: number, from?: string, to?: string, speciesScope: FarmosSpeciesScope = "all") {
    const clauses = [eq(farmosAnimalOperations.organizationId, orgId), eq(farmosAnimalOperations.isActive, 1), sql`${farmosAnimalOperations.cost} IS NOT NULL`];
    if (from) clauses.push(gte(farmosAnimalOperations.operationDate, from));
    if (to) clauses.push(lte(farmosAnimalOperations.operationDate, to));
    const scopeFilter = this.speciesFilter(farmosAnimalOperations.species, speciesScope);
    if (scopeFilter) clauses.push(scopeFilter);
    return this.db
      .select({
        animalId: farmosAnimalOperations.animalId,
        lot: farmosAnimalOperations.lot,
        species: farmosAnimalOperations.species,
        currencyId: farmosAnimalOperations.currencyId,
        total: sql<number>`COALESCE(SUM(${farmosAnimalOperations.cost}), 0)`,
      })
      .from(farmosAnimalOperations)
      .where(and(...clauses))
      .groupBy(farmosAnimalOperations.animalId, farmosAnimalOperations.lot, farmosAnimalOperations.species, farmosAnimalOperations.currencyId);
  }

  // ── Mortalité (imputée au LOT, jamais à l'animal mort) ─────────────────
  private async mortalityLossByLot(orgId: number, from?: string, to?: string) {
    const clauses = [eq(farmosMortalityEvents.organizationId, orgId), eq(farmosMortalityEvents.isActive, 1), sql`${farmosMortalityEvents.estimatedLoss} IS NOT NULL`];
    if (from) clauses.push(gte(farmosMortalityEvents.eventDate, from));
    if (to) clauses.push(lte(farmosMortalityEvents.eventDate, to));
    return this.db
      .select({
        lot: farmosMortalityEvents.lot,
        species: farmosMortalityEvents.species,
        total: sql<number>`COALESCE(SUM(${farmosMortalityEvents.estimatedLoss}), 0)`,
      })
      .from(farmosMortalityEvents)
      .where(and(...clauses))
      .groupBy(farmosMortalityEvents.lot, farmosMortalityEvents.species);
  }

  // ── Production valorisée (théorique, séparée du réalisé) ──────────────
  private async valuedProduction(orgId: number, from?: string, to?: string, species?: string) {
    const clauses = [eq(farmosProductionLogs.organizationId, orgId), eq(farmosProductionLogs.isActive, 1)];
    if (from) clauses.push(gte(farmosProductionLogs.logDate, from));
    if (to) clauses.push(lte(farmosProductionLogs.logDate, to));
    if (species) clauses.push(eq(farmosProductionLogs.species, species));
    const rows = await this.db
      .select({
        animalId: farmosProductionLogs.animalId,
        buildingId: farmosProductionLogs.buildingId,
        species: farmosProductionLogs.species,
        productType: farmosProductionLogs.productType,
        currencyId: farmosPriceList.currencyId,
        theoreticalRevenue: sql<number>`COALESCE(SUM(${farmosProductionLogs.quantity} * COALESCE(${farmosPriceList.unitPrice}, 0)), 0)`,
      })
      .from(farmosProductionLogs)
      .leftJoin(
        farmosPriceList,
        and(
          eq(farmosPriceList.organizationId, orgId),
          eq(farmosPriceList.isActive, 1),
          eq(farmosPriceList.saleSource, "production"),
          eq(farmosPriceList.productType, farmosProductionLogs.productType),
          sql`(${farmosPriceList.species} IS NULL OR ${farmosPriceList.species} = ${farmosProductionLogs.species})`,
        ),
      )
      .where(and(...clauses))
      .groupBy(farmosProductionLogs.animalId, farmosProductionLogs.buildingId, farmosProductionLogs.species, farmosProductionLogs.productType, farmosPriceList.currencyId);
    return rows;
  }

  // ── Plus-value latente du cheptel vivant (jamais mêlée au profit) ─────
  private async latentHerdValue(orgId: number, species?: string) {
    const clauses = [eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1), sql`${farmosAnimals.estimatedValue} IS NOT NULL`];
    if (species) clauses.push(eq(farmosAnimals.species, species));
    const rows = await this.db
      .select({
        species: farmosAnimals.species,
        lot: farmosAnimals.lot,
        total: sql<number>`COALESCE(SUM(${farmosAnimals.estimatedValue}), 0)`,
        animalCount: sql<number>`COUNT(*)`,
      })
      .from(farmosAnimals)
      .where(and(...clauses))
      .groupBy(farmosAnimals.species, farmosAnimals.lot);
    return rows;
  }

  // ── Résumé KPI (payload minuscule → écran mobile) ──────────────────────
  async getSummary(orgId: number, from?: string, to?: string, species?: string, currencyId?: number, speciesScope: FarmosSpeciesScope = "all") {
    const [revenueRows, directExpRows, unallocExpRows, feedRows, treatRows, vaxRows, opRows, mortRows, prodRows, latentRows, livestockWeights] = await Promise.all([
      this.revenueByAnimal(orgId, from, to, species, speciesScope),
      this.directExpensesByAnimal(orgId, from, to),
      this.unallocatedFarmExpenses(orgId, from, to),
      this.feedCost(orgId, from, to, speciesScope),
      this.treatmentCostByAnimal(orgId, from, to),
      this.vaccinationCostBySpecies(orgId, from, to),
      this.operationCost(orgId, from, to, speciesScope),
      this.mortalityLossByLot(orgId, from, to),
      this.valuedProduction(orgId, from, to, species),
      this.latentHerdValue(orgId, species),
      this.livestockWeightBySpecies(orgId, speciesScope),
    ]);

    const byCurrency = new Map<string, { currencyId: number | null; revenue: number; cost: number; theoreticalProductionRevenue: number; latentHerdValue: number }>();
    const bucket = (id: number | null | undefined) => {
      const key = this.currencyKey(id);
      if (!byCurrency.has(key)) byCurrency.set(key, { currencyId: id ?? null, revenue: 0, cost: 0, theoreticalProductionRevenue: 0, latentHerdValue: 0 });
      return byCurrency.get(key)!;
    };

    for (const r of revenueRows) bucket(r.currencyId).revenue += Number(r.total ?? 0);
    for (const r of directExpRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    for (const r of unallocExpRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    for (const r of feedRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    for (const r of treatRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    for (const r of vaxRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    for (const r of opRows) bucket(r.currencyId).cost += Number(r.total ?? 0);
    // Mortalité : coût de ferme sans devise dédiée (estimated_loss n'a pas de
    // currency_id) -> regroupé sous la devise par défaut de l'org (null).
    for (const r of mortRows) bucket(null).cost += Number(r.total ?? 0);
    for (const r of prodRows) bucket(r.currencyId).theoreticalProductionRevenue += Number(r.theoreticalRevenue ?? 0);
    for (const r of latentRows) bucket(null).latentHerdValue += Number(r.total ?? 0);

    const filtered = Array.from(byCurrency.values()).filter((b) => !currencyId || b.currencyId === currencyId);
    return filtered.map((b) => ({
      currencyId: b.currencyId,
      realizedRevenue: Math.round(b.revenue * 100) / 100,
      realizedCost: Math.round(b.cost * 100) / 100,
      realizedProfit: Math.round((b.revenue - b.cost) * 100) / 100,
      theoreticalProductionRevenue: Math.round(b.theoreticalProductionRevenue * 100) / 100,
      marginWithValuedProduction: Math.round((b.revenue - b.cost + b.theoreticalProductionRevenue) * 100) / 100,
      latentHerdValue: Math.round(b.latentHerdValue * 100) / 100,
    }));
  }

  // ── Par lot ──────────────────────────────────────────────────────────
  async getByLot(orgId: number, from?: string, to?: string, species?: string, speciesScope: FarmosSpeciesScope = "all") {
    const animalScopeFilter = this.speciesFilter(farmosAnimals.species, speciesScope);
    const [revenueRows, feedRows, opRows, mortRows, livestock] = await Promise.all([
      this.db
        .select({
          lot: farmosAnimals.lot,
          species: farmosAnimals.species,
          currencyId: farmosSales.currencyId,
          total: sql<number>`COALESCE(SUM(${farmosSales.totalAmount}), 0)`,
        })
        .from(farmosSales)
        .innerJoin(farmosAnimals, and(eq(farmosAnimals.id, farmosSales.animalId), eq(farmosAnimals.organizationId, orgId)))
        .where(and(
          eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1),
          ...(from ? [gte(farmosSales.saleDate, from)] : []),
          ...(to ? [lte(farmosSales.saleDate, to)] : []),
          ...(species ? [eq(farmosAnimals.species, species)] : []),
          ...(animalScopeFilter ? [animalScopeFilter] : []),
        ))
        .groupBy(farmosAnimals.lot, farmosAnimals.species, farmosSales.currencyId),
      this.feedCost(orgId, from, to, speciesScope),
      this.operationCost(orgId, from, to, speciesScope),
      this.mortalityLossByLot(orgId, from, to),
      this.db
        .select({ lot: farmosAnimals.lot, species: farmosAnimals.species, count: sql<number>`COALESCE(SUM(GREATEST(${farmosAnimals.count}, 1)), 0)` })
        .from(farmosAnimals)
        .where(and(
          eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1),
          ...(species ? [eq(farmosAnimals.species, species)] : []),
          ...(animalScopeFilter ? [animalScopeFilter] : []),
        ))
        .groupBy(farmosAnimals.lot, farmosAnimals.species),
    ]);

    const byLot = new Map<string, { lot: string; species: string | null; currencyId: number | null; revenue: number; cost: number; animalCount: number }>();
    const key = (lot: string | null | undefined, currencyId: number | null | undefined) => `${lot || "—"}::${this.currencyKey(currencyId)}`;
    const bucket = (lot: string | null | undefined, species: string | null | undefined, currencyId: number | null | undefined) => {
      const k = key(lot, currencyId);
      if (!byLot.has(k)) byLot.set(k, { lot: lot || "—", species: species ?? null, currencyId: currencyId ?? null, revenue: 0, cost: 0, animalCount: 0 });
      return byLot.get(k)!;
    };
    for (const r of revenueRows) bucket(r.lot, r.species, r.currencyId).revenue += Number(r.total ?? 0);
    for (const r of feedRows) bucket(r.lot, r.species, r.currencyId).cost += Number(r.total ?? 0);
    for (const r of opRows) bucket(r.lot, r.species, r.currencyId).cost += Number(r.total ?? 0);
    for (const r of mortRows) bucket(r.lot, r.species, null).cost += Number(r.total ?? 0);
    const countByLot = new Map(livestock.map((l) => [l.lot || "—", Number(l.count) || 0]));
    for (const b of byLot.values()) b.animalCount = countByLot.get(b.lot) ?? 0;

    return Array.from(byLot.values())
      .map((b) => ({ ...b, profit: Math.round((b.revenue - b.cost) * 100) / 100, revenue: Math.round(b.revenue * 100) / 100, cost: Math.round(b.cost * 100) / 100 }))
      .sort((a, b) => b.profit - a.profit);
  }

  // ── Par animal (paginé) ─────────────────────────────────────────────
  async getByAnimal(orgId: number, opts: { from?: string; to?: string; species?: string; lot?: string; limit?: number; offset?: number; sort?: string }, speciesScope: FarmosSpeciesScope = "all") {
    const { from, to, species, lot, limit = 50, offset = 0, sort = "profit_desc" } = opts;
    const animalClauses = [eq(farmosAnimals.organizationId, orgId), eq(farmosAnimals.isActive, 1)];
    if (species) animalClauses.push(eq(farmosAnimals.species, species));
    if (lot) animalClauses.push(sql`${farmosAnimals.lot} collate utf8mb4_0900_ai_ci = ${lot} collate utf8mb4_0900_ai_ci`);
    const animalScopeFilter = this.speciesFilter(farmosAnimals.species, speciesScope);
    if (animalScopeFilter) animalClauses.push(animalScopeFilter);

    const animals = await this.db
      .select({ id: farmosAnimals.id, name: farmosAnimals.name, species: farmosAnimals.species, lot: farmosAnimals.lot, barn: farmosAnimals.barn, estimatedValue: farmosAnimals.estimatedValue })
      .from(farmosAnimals)
      .where(and(...animalClauses));
    const animalIds = animals.map((a) => Number(a.id));
    if (!animalIds.length) return { rows: [], total: 0, limit, offset };

    const [revenueRows, expRows, feedRows, treatRows, opRows, acqMap] = await Promise.all([
      this.db
        .select({ animalId: farmosSales.animalId, currencyId: farmosSales.currencyId, total: sql<number>`COALESCE(SUM(${farmosSales.totalAmount}), 0)` })
        .from(farmosSales)
        .where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1), inArray(farmosSales.animalId, animalIds), ...(from ? [gte(farmosSales.saleDate, from)] : []), ...(to ? [lte(farmosSales.saleDate, to)] : [])))
        .groupBy(farmosSales.animalId, farmosSales.currencyId),
      this.db
        .select({ animalId: farmosExpenses.relatedAnimalId, currencyId: farmosExpenses.currencyId, total: sql<number>`COALESCE(SUM(${farmosExpenses.amount}), 0)` })
        .from(farmosExpenses)
        .where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), inArray(farmosExpenses.relatedAnimalId, animalIds), ...(from ? [gte(farmosExpenses.expenseDate, from)] : []), ...(to ? [lte(farmosExpenses.expenseDate, to)] : [])))
        .groupBy(farmosExpenses.relatedAnimalId, farmosExpenses.currencyId),
      this.db
        .select({ animalId: farmosFeedMovements.animalId, currencyId: farmosFeedMovements.currencyId, total: sql<number>`COALESCE(SUM(${farmosFeedMovements.totalCost}), 0)` })
        .from(farmosFeedMovements)
        .where(and(eq(farmosFeedMovements.organizationId, orgId), eq(farmosFeedMovements.isActive, 1), eq(farmosFeedMovements.movementType, "out"), inArray(farmosFeedMovements.animalId, animalIds), ...(from ? [gte(farmosFeedMovements.movementDate, from)] : []), ...(to ? [lte(farmosFeedMovements.movementDate, to)] : [])))
        .groupBy(farmosFeedMovements.animalId, farmosFeedMovements.currencyId),
      this.treatmentCostByAnimal(orgId, from, to),
      this.db
        .select({ animalId: farmosAnimalOperations.animalId, currencyId: farmosAnimalOperations.currencyId, total: sql<number>`COALESCE(SUM(${farmosAnimalOperations.cost}), 0)` })
        .from(farmosAnimalOperations)
        .where(and(eq(farmosAnimalOperations.organizationId, orgId), eq(farmosAnimalOperations.isActive, 1), sql`${farmosAnimalOperations.cost} IS NOT NULL`, inArray(farmosAnimalOperations.animalId, animalIds), ...(from ? [gte(farmosAnimalOperations.operationDate, from)] : []), ...(to ? [lte(farmosAnimalOperations.operationDate, to)] : [])))
        .groupBy(farmosAnimalOperations.animalId, farmosAnimalOperations.currencyId),
      this.acquisitionCostByAnimal(orgId, animalIds),
    ]);

    const revByAnimal = new Map<number, { total: number; currencyId: number | null }>();
    for (const r of revenueRows) { if (r.animalId == null) continue; revByAnimal.set(Number(r.animalId), { total: Number(r.total ?? 0), currencyId: r.currencyId ?? null }); }
    const costByAnimal = new Map<number, number>();
    const addCost = (rows: { animalId: number | null; total: number }[]) => {
      for (const r of rows) { if (r.animalId == null) continue; const id = Number(r.animalId); costByAnimal.set(id, (costByAnimal.get(id) ?? 0) + Number(r.total ?? 0)); }
    };
    addCost(expRows as any); addCost(feedRows as any); addCost(treatRows as any); addCost(opRows as any);

    const rows = animals.map((a) => {
      const id = Number(a.id);
      const revenue = Math.round((revByAnimal.get(id)?.total ?? 0) * 100) / 100;
      const acquisitionCost = Math.round((acqMap.get(id) ?? 0) * 100) / 100;
      const cost = Math.round(((costByAnimal.get(id) ?? 0) + acquisitionCost) * 100) / 100;
      return {
        animalId: id, name: a.name, species: a.species, lot: a.lot, barn: a.barn,
        currencyId: revByAnimal.get(id)?.currencyId ?? null,
        revenue, cost, acquisitionCost, profit: Math.round((revenue - cost) * 100) / 100,
        latentValue: a.estimatedValue != null ? Number(a.estimatedValue) : null,
      };
    }).filter((r) => r.revenue !== 0 || r.cost !== 0);

    const sorters: Record<string, (a: any, b: any) => number> = {
      profit_desc: (a, b) => b.profit - a.profit,
      profit_asc: (a, b) => a.profit - b.profit,
      revenue_desc: (a, b) => b.revenue - a.revenue,
      cost_desc: (a, b) => b.cost - a.cost,
    };
    rows.sort(sorters[sort] || sorters.profit_desc);

    return { rows: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
  }

  // ── Timeline détaillée pour un animal (drill-down) ─────────────────────
  async getAnimalTimeline(orgId: number, animalId: number, speciesScope: FarmosSpeciesScope = "all") {
    const animalScopeFilter = this.speciesFilter(farmosAnimals.species, speciesScope);
    const [animal] = await this.db
      .select({ id: farmosAnimals.id, name: farmosAnimals.name, species: farmosAnimals.species, lot: farmosAnimals.lot, estimatedValue: farmosAnimals.estimatedValue })
      .from(farmosAnimals)
      .where(and(eq(farmosAnimals.id, animalId), eq(farmosAnimals.organizationId, orgId), ...(animalScopeFilter ? [animalScopeFilter] : [])))
      .limit(1);
    if (!animal) throw new NotFoundException("Animal not found.");

    const [sales, expenses, feed, treatments, operations] = await Promise.all([
      this.db.select({ date: farmosSales.saleDate, amount: farmosSales.totalAmount, currencyId: farmosSales.currencyId, label: farmosSales.productType })
        .from(farmosSales).where(and(eq(farmosSales.organizationId, orgId), eq(farmosSales.isActive, 1), eq(farmosSales.animalId, animalId))),
      this.db.select({ date: farmosExpenses.expenseDate, amount: farmosExpenses.amount, currencyId: farmosExpenses.currencyId, label: farmosExpenses.category })
        .from(farmosExpenses).where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), eq(farmosExpenses.relatedAnimalId, animalId))),
      this.db.select({ date: farmosFeedMovements.movementDate, amount: farmosFeedMovements.totalCost, currencyId: farmosFeedMovements.currencyId, label: sql<string>`'feed'` })
        .from(farmosFeedMovements).where(and(eq(farmosFeedMovements.organizationId, orgId), eq(farmosFeedMovements.isActive, 1), eq(farmosFeedMovements.movementType, "out"), eq(farmosFeedMovements.animalId, animalId))),
      this.db.select({ date: farmosTreatments.startDate, amount: farmosMedicines.unitPrice, currencyId: farmosMedicines.currencyId, label: farmosTreatments.medicineName })
        .from(farmosTreatments).innerJoin(farmosMedicines, eq(farmosMedicines.id, farmosTreatments.medicineId))
        .where(and(eq(farmosTreatments.organizationId, orgId), eq(farmosTreatments.isActive, 1), eq(farmosTreatments.animalId, animalId))),
      this.db.select({ date: farmosAnimalOperations.operationDate, amount: farmosAnimalOperations.cost, currencyId: farmosAnimalOperations.currencyId, label: farmosAnimalOperations.operationCode })
        .from(farmosAnimalOperations).where(and(eq(farmosAnimalOperations.organizationId, orgId), eq(farmosAnimalOperations.isActive, 1), eq(farmosAnimalOperations.animalId, animalId), sql`${farmosAnimalOperations.cost} IS NOT NULL`)),
    ]);

    const events = [
      ...sales.map((s) => ({ date: s.date, kind: "revenue", category: s.label || "sale", amount: Number(s.amount ?? 0), currencyId: s.currencyId ?? null })),
      ...expenses.map((e) => ({ date: e.date, kind: "cost", category: e.label || "expense", amount: Number(e.amount ?? 0), currencyId: e.currencyId ?? null })),
      ...feed.map((f) => ({ date: f.date, kind: "cost", category: "feed", amount: Number(f.amount ?? 0), currencyId: f.currencyId ?? null })),
      ...treatments.map((t) => ({ date: t.date, kind: "cost", category: `treatment:${t.label || "medicine"}`, amount: Number(t.amount ?? 0), currencyId: t.currencyId ?? null, estimated: true })),
      ...operations.map((o) => ({ date: o.date, kind: "cost", category: `operation:${o.label}`, amount: Number(o.amount ?? 0), currencyId: o.currencyId ?? null })),
    ].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

    const revenue = Math.round(events.filter((e) => e.kind === "revenue").reduce((a, e) => a + e.amount, 0) * 100) / 100;
    const cost = Math.round(events.filter((e) => e.kind === "cost").reduce((a, e) => a + e.amount, 0) * 100) / 100;

    return {
      animal: { id: Number(animal.id), name: animal.name, species: animal.species, lot: animal.lot },
      events,
      revenue, cost, profit: Math.round((revenue - cost) * 100) / 100,
      latentValue: animal.estimatedValue != null ? Number(animal.estimatedValue) : null,
    };
  }

  // ── Top postes de coût (tous animaux/lots confondus, sur la période) ──
  async getCostDrivers(orgId: number, from?: string, to?: string, speciesScope: FarmosSpeciesScope = "all") {
    const [expRows, feedTotal, treatTotal, vaxRows, opTotal, mortTotal] = await Promise.all([
      this.db
        .select({ category: farmosExpenses.category, currencyId: farmosExpenses.currencyId, total: sql<number>`COALESCE(SUM(${farmosExpenses.amount}), 0)` })
        .from(farmosExpenses)
        .where(and(eq(farmosExpenses.organizationId, orgId), eq(farmosExpenses.isActive, 1), ...(from ? [gte(farmosExpenses.expenseDate, from)] : []), ...(to ? [lte(farmosExpenses.expenseDate, to)] : [])))
        .groupBy(farmosExpenses.category, farmosExpenses.currencyId),
      this.feedCost(orgId, from, to, speciesScope),
      this.treatmentCostByAnimal(orgId, from, to),
      this.vaccinationCostBySpecies(orgId, from, to),
      this.operationCost(orgId, from, to, speciesScope),
      this.mortalityLossByLot(orgId, from, to),
    ]);

    const driverMap = new Map<string, { label: string; currencyId: number | null; total: number }>();
    const add = (label: string, currencyId: number | null, amount: number) => {
      const k = `${label}::${this.currencyKey(currencyId)}`;
      const cur = driverMap.get(k) ?? { label, currencyId, total: 0 };
      cur.total += amount;
      driverMap.set(k, cur);
    };
    for (const r of expRows) add(`expense:${r.category}`, r.currencyId ?? null, Number(r.total ?? 0));
    for (const r of feedTotal) add("feed", r.currencyId ?? null, Number(r.total ?? 0));
    for (const r of treatTotal) add("treatment", r.currencyId ?? null, Number(r.total ?? 0));
    for (const r of vaxRows) add("vaccination", r.currencyId ?? null, Number(r.total ?? 0));
    for (const r of opTotal) add("operation", r.currencyId ?? null, Number(r.total ?? 0));
    for (const r of mortTotal) add("mortality", null, Number(r.total ?? 0));

    return Array.from(driverMap.values())
      .map((d) => ({ ...d, total: Math.round(d.total * 100) / 100 }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }

  // ── CSV export (par animal) ─────────────────────────────────────────
  async exportCsv(orgId: number, from?: string, to?: string, species?: string, speciesScope: FarmosSpeciesScope = "all") {
    const { rows } = await this.getByAnimal(orgId, { from, to, species, limit: 100000, offset: 0 }, speciesScope);
    const header = ["animal_id", "name", "species", "lot", "barn", "currency_id", "revenue", "cost", "acquisition_cost", "profit", "latent_value"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.animalId, csvEscape(r.name), csvEscape(r.species), csvEscape(r.lot), csvEscape(r.barn),
        r.currencyId ?? "", r.revenue, r.cost, r.acquisitionCost, r.profit, r.latentValue ?? "",
      ].join(","));
    }
    return lines.join("\n");
  }

  // ── Snapshot de clôture (figé, sur demande explicite uniquement) ──────
  async createSnapshot(orgId: number, input: CreateProfitabilitySnapshotDto, userId: number | null) {
    const { scope, scope_key, period_start, period_end, currency_id } = input;
    let revenue = 0, cost = 0, animalCount: number | null = null;
    let costBreakdown: Record<string, number> = {};
    let revenueBreakdown: Record<string, number> = {};

    if (scope === "animal") {
      const timeline = await this.getAnimalTimeline(orgId, Number(scope_key));
      revenue = timeline.revenue; cost = timeline.cost; animalCount = 1;
      for (const e of timeline.events) {
        const bucket = e.kind === "revenue" ? revenueBreakdown : costBreakdown;
        bucket[e.category] = (bucket[e.category] ?? 0) + e.amount;
      }
    } else if (scope === "lot") {
      const lots = await this.getByLot(orgId, period_start, period_end);
      const match = lots.find((l) => String(l.lot) === scope_key);
      revenue = match?.revenue ?? 0; cost = match?.cost ?? 0; animalCount = match?.animalCount ?? 0;
    } else if (scope === "species") {
      const summaries = await this.getSummary(orgId, period_start, period_end, scope_key, currency_id ?? undefined);
      const match = summaries[0];
      revenue = match?.realizedRevenue ?? 0; cost = match?.realizedCost ?? 0;
    } else {
      const summaries = await this.getSummary(orgId, period_start, period_end, undefined, currency_id ?? undefined);
      const match = summaries[0];
      revenue = match?.realizedRevenue ?? 0; cost = match?.realizedCost ?? 0;
    }

    const [res] = await this.db.insert(farmosProfitabilitySnapshots).values({
      organizationId: orgId,
      scope,
      scopeKey: scope_key,
      periodStart: period_start,
      periodEnd: period_end,
      revenue: String(revenue),
      cost: String(cost),
      profit: String(Math.round((revenue - cost) * 100) / 100),
      currencyId: currency_id ?? null,
      costBreakdown,
      revenueBreakdown,
      animalCount,
      generatedBy: userId ?? null,
    });
    return this.getSnapshot(Number(res.insertId), orgId);
  }

  private async getSnapshot(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosProfitabilitySnapshots)
      .where(and(eq(farmosProfitabilitySnapshots.id, id), eq(farmosProfitabilitySnapshots.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Snapshot not found.");
    return row;
  }

  async listSnapshots(orgId: number, scope?: string, scopeKey?: string) {
    const clauses = [eq(farmosProfitabilitySnapshots.organizationId, orgId), eq(farmosProfitabilitySnapshots.isActive, 1)];
    if (scope) clauses.push(eq(farmosProfitabilitySnapshots.scope, scope));
    if (scopeKey) clauses.push(eq(farmosProfitabilitySnapshots.scopeKey, scopeKey));
    return this.db
      .select()
      .from(farmosProfitabilitySnapshots)
      .where(and(...clauses))
      .orderBy(sql`${farmosProfitabilitySnapshots.periodEnd} DESC`, sql`${farmosProfitabilitySnapshots.id} DESC`);
  }
}

function csvEscape(value: unknown) {
  let s = String(value ?? "");
  // Anti-injection formule CSV (Excel/LibreOffice) : un champ commençant par
  // =, +, -, @ ou une tabulation/CR peut s'exécuter à l'ouverture du fichier.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
