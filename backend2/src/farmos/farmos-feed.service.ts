import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { Database } from "../database/types";
import { farmosFeedLots, farmosFeedMovements, farmosMedicines } from "../database/schema";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import { FarmosService } from "./farmos.service";
import type {
  BulkFeedMovementDto,
  CreateFeedLotDto,
  CreateFeedMovementDto,
} from "./dto/farmos.dto";

// Phase 1 du chantier stock d'aliment (mouvements + lots + alertes).
// Fichier separe de farmos.service.ts (4377 lignes, pattern deja etabli par
// les autres modules dedies : farmos-benchmarks.ts, farmos-saved-reports, ...).
//
// PIEGE DOUBLE COMPTAGE STOCK :
// - farmos.service.ts#createExpense incremente deja farmos_medicines.quantity
//   quand on lui passe related_medicine_id + quantity (~L1670-1683).
// - Donc a la RECEPTION d'un lot, on passe par this.farmos.createExpense (pour
//   garder la sync ledger + workflow d'approbation) et le mouvement 'in' cree
//   ici n'est qu'un enregistrement d'audit : il NE touche PAS farmos_medicines.quantity
//   lui-meme (createExpense s'en charge). On ne fait pas de deuxieme increment.
// - A la SORTIE/DISTRIBUTION, on reutilise consumeMedicine (deja ecrit et teste)
//   plutot que de reecrire la logique de decrement.
@Injectable()
export class FarmosFeedService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtime: RealtimeDataPublisher,
    private readonly farmos: FarmosService,
  ) {}

  private readonly logger = new Logger(FarmosFeedService.name);

  private async publish(kind: string, tables: string[], action: "created" | "updated" | "deleted", entityId: number | string, orgId: number) {
    try {
      await this.realtime.publishDataUpdated({
        entity: "farmos",
        action,
        entityId,
        scope: { module: "farmos", tenantId: orgId },
        permissions: ["readAll-farmos"],
        tags: ["farmos", kind, ...tables],
      });
    } catch (error) {
      this.logger.warn(`realtime publish failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Fail-open sur species NULL : copie le pattern de listTreatments/listSales.
  // farmos_feed_movements a une colonne species directe (comme farmos_sales).
  private movementSpeciesFilter(speciesScope: "all" | string[]) {
    if (speciesScope === "all") return undefined;
    if (!speciesScope.length) return sql`1 = 0`;
    return or(isNull(farmosFeedMovements.species), inArray(farmosFeedMovements.species, speciesScope));
  }

  private async getFeedMedicine(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(farmosMedicines)
      .where(and(eq(farmosMedicines.id, id), eq(farmosMedicines.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Aliment introuvable.");
    return row;
  }

  // ─── Référentiel ─────────────────────────────────────────────────────────

  async listFeedReferences(orgId: number) {
    return this.db
      .select()
      .from(farmosMedicines)
      .where(and(eq(farmosMedicines.organizationId, orgId), eq(farmosMedicines.isActive, 1), eq(farmosMedicines.kind, "feed")))
      .orderBy(asc(farmosMedicines.name));
  }

  // ─── Lots ────────────────────────────────────────────────────────────────

  async listFeedLots(orgId: number, medicineId?: number) {
    const conditions = [eq(farmosFeedLots.organizationId, orgId), eq(farmosFeedLots.isActive, 1)];
    if (medicineId) conditions.push(eq(farmosFeedLots.medicineId, medicineId));
    return this.db
      .select()
      .from(farmosFeedLots)
      .where(and(...conditions))
      .orderBy(desc(farmosFeedLots.receivedDate), desc(farmosFeedLots.id));
  }

  // Calcule le CMP (cout moyen pondere) sur les lots actifs restants,
  // GROUPE PAR DEVISE (currencyId) — ne jamais mélanger des montants de
  // devises différentes dans un seul nombre (cf. ledger/exchange.service.ts :
  // aucune conversion silencieuse, chaque montant reste dans sa devise).
  // Retourne un groupe par devise ; le groupe "principal" (plus grosse
  // quantité restante) sert de fallback pour farmos_medicines.unit_price/
  // currency_id (compat champs existants utilisés ailleurs : factures,
  // dépenses, movement out fallback L296-298...).
  private computeCostGroups(lots: { quantityRemaining: unknown; unitCost: unknown; currencyId: unknown }[]) {
    const groups = new Map<string, { currencyId: number | null; totalQty: number; totalValue: number }>();
    for (const lot of lots) {
      const qty = Number(lot.quantityRemaining || 0);
      const cost = Number(lot.unitCost || 0);
      const currencyId = lot.currencyId != null ? Number(lot.currencyId) : null;
      const key = String(currencyId);
      const g = groups.get(key) || { currencyId, totalQty: 0, totalValue: 0 };
      g.totalQty += qty;
      g.totalValue += qty * cost;
      groups.set(key, g);
    }
    return Array.from(groups.values())
      .filter((g) => g.totalQty > 0)
      .map((g) => ({ currencyId: g.currencyId, amount: g.totalValue / g.totalQty, totalQty: g.totalQty }))
      .sort((a, b) => b.totalQty - a.totalQty);
  }

  // Recalcule le CMP (cout moyen pondere) sur les lots actifs restants et le
  // reporte dans farmos_medicines.unit_price (reference d'affichage/alerte).
  // Ne mélange plus des devises différentes : le groupe avec la plus grosse
  // quantité restante devient le "prix principal" (compat champs existants) ;
  // les autres devises sont exposées séparément via getFeedStock (unitPrices).
  private async recomputeAverageCost(medicineId: number, orgId: number) {
    const lots = await this.db
      .select({ quantityRemaining: farmosFeedLots.quantityRemaining, unitCost: farmosFeedLots.unitCost, currencyId: farmosFeedLots.currencyId })
      .from(farmosFeedLots)
      .where(and(eq(farmosFeedLots.medicineId, medicineId), eq(farmosFeedLots.organizationId, orgId), eq(farmosFeedLots.isActive, 1)));
    const groups = this.computeCostGroups(lots);
    if (groups.length > 0) {
      const main = groups[0];
      await this.db
        .update(farmosMedicines)
        .set({ unitPrice: String(main.amount.toFixed(2)), currencyId: main.currencyId ?? undefined })
        .where(and(eq(farmosMedicines.id, medicineId), eq(farmosMedicines.organizationId, orgId)));
    }
  }

  // Réception d'un lot : crée le lot + un mouvement 'in' d'audit + une dépense
  // (categorie feed) qui incrémente réellement farmos_medicines.quantity via
  // createExpense. Voir commentaire de tête de fichier (piège double comptage).
  async createFeedLot(input: CreateFeedLotDto, orgId: number, userId: number | null) {
    const medicine = await this.getFeedMedicine(input.medicine_id, orgId);
    if (medicine.kind !== "feed") {
      throw new BadRequestException("Cet article n'est pas un aliment (kind != feed).");
    }
    if (!(Number(input.quantity_in) > 0)) throw new BadRequestException("quantity_in doit être > 0.");

    const unitCost = input.unit_cost != null ? Number(input.unit_cost) : 0;
    const totalAmount = unitCost > 0 ? unitCost * Number(input.quantity_in) : null;

    // 1) Dépense (categorie feed) : source de vérité pour l'incrément du stock
    // + sync ledger + workflow d'approbation. On la crée d'abord pour obtenir
    // expenseId, même si le montant est 0 (réception gratuite/don) — on ne
    // crée alors pas de dépense, juste le lot + mouvement d'audit.
    let expenseId: number | null = null;
    if (totalAmount != null && totalAmount > 0) {
      // GARDE-FOU cohérence stock : la `quantity` envoyée à createExpense DOIT
      // rester égale à `quantityIn` persisté sur le lot (ligne ~163) — c'est
      // cette égalité qui garantit que SUM(quantityIn) des lots actifs (base
      // de recomputeFeedStock) correspond bien à ce que createExpense a
      // incrémenté sur farmos_medicines.quantity. Ne jamais les faire diverger
      // (ex: arrondi, quantité recalculée) sans mettre à jour les deux en même
      // temps.
      const res = await this.farmos.createExpense(
        {
          category: "feed",
          description: `Réception aliment: ${medicine.name}${input.lot_code ? ` (lot ${input.lot_code})` : ""}`,
          quantity: Number(input.quantity_in),
          unit: input.unit ?? medicine.unit ?? null,
          amount: totalAmount,
          currency_id: input.currency_id ?? medicine.currencyId ?? null,
          supplier: input.supplier ?? medicine.supplier ?? null,
          expense_date: input.received_date,
          related_medicine_id: medicine.id,
          notes: input.notes ?? null,
        } as any,
        orgId,
      );
      expenseId = res.id;
    } else {
      // Pas de dépense (montant nul) : on incrémente quand même le stock ici,
      // seul cas où ce service touche farmos_medicines.quantity directement.
      const newQty = Number(medicine.quantity || 0) + Number(input.quantity_in);
      await this.db.update(farmosMedicines).set({ quantity: String(newQty) }).where(and(eq(farmosMedicines.id, medicine.id), eq(farmosMedicines.organizationId, orgId)));
    }

    // 2) Lot
    const [lotRes] = await this.db.insert(farmosFeedLots).values({
      organizationId: orgId,
      medicineId: medicine.id,
      lotCode: input.lot_code ?? null,
      supplier: input.supplier ?? null,
      supplierId: input.supplier_id ?? null,
      receivedDate: input.received_date,
      expiryDate: input.expiry_date ?? null,
      quantityIn: String(input.quantity_in),
      quantityRemaining: String(input.quantity_in),
      unit: input.unit ?? medicine.unit ?? null,
      unitCost: unitCost > 0 ? String(unitCost) : null,
      currencyId: input.currency_id ?? medicine.currencyId ?? null,
      expenseId,
      notes: input.notes ?? null,
    }).$returningId();
    const lotId = Number(lotRes.id);

    // 3) Mouvement 'in' — audit uniquement, n'incrémente PAS quantity (déjà
    // fait par createExpense ci-dessus, ou par le fallback sans montant).
    const [movRes] = await this.db.insert(farmosFeedMovements).values({
      organizationId: orgId,
      medicineId: medicine.id,
      feedLotId: lotId,
      movementType: "in",
      movementDate: input.received_date,
      quantity: String(input.quantity_in),
      unit: input.unit ?? medicine.unit ?? null,
      unitCost: unitCost > 0 ? String(unitCost) : null,
      totalCost: totalAmount != null ? String(totalAmount) : null,
      currencyId: input.currency_id ?? medicine.currencyId ?? null,
      expenseId,
      recordedBy: userId,
      notes: input.notes ?? null,
    }).$returningId();

    await this.recomputeAverageCost(medicine.id, orgId);
    await this.publish("createFeedLot", ["feedMovements", "medicines", "expenses"], "created", lotId, orgId);
    return { id: lotId, movementId: Number(movRes.id), expenseId };
  }

  async deleteFeedLot(id: number, orgId: number) {
    const [lot] = await this.db.select().from(farmosFeedLots).where(and(eq(farmosFeedLots.id, id), eq(farmosFeedLots.organizationId, orgId))).limit(1);
    if (!lot) throw new NotFoundException("Lot introuvable.");
    await this.db.update(farmosFeedLots).set({ isActive: 0 }).where(and(eq(farmosFeedLots.id, id), eq(farmosFeedLots.organizationId, orgId)));

    // Contre-mouvement d'audit ('adjust' négatif) pour tracer le retrait du
    // lot. Décrément = quantityIn (pas quantityRemaining) : recomputeFeedStock
    // (source de vérité de la réconciliation, ~L449-455) base son calcul sur
    // SUM(quantityIn) des lots actifs ; un lot qui passe isActive=0 sort donc
    // entièrement de cette somme, y compris la part déjà consommée. Décrémenter
    // seulement quantityRemaining ici créerait un écart avec un recompute
    // ultérieur sur un lot partiellement consommé.
    const quantityIn = Number(lot.quantityIn || 0);
    if (quantityIn > 0) {
      await this.db.insert(farmosFeedMovements).values({
        organizationId: orgId,
        medicineId: lot.medicineId,
        feedLotId: lot.id,
        movementType: "adjust",
        movementDate: new Date().toISOString().slice(0, 10),
        quantity: String(-quantityIn),
        unit: lot.unit,
        notes: "Annulation lot (suppression).",
      });
      const medicine = await this.getFeedMedicine(Number(lot.medicineId), orgId);
      const newQty = Math.max(0, Number(medicine.quantity || 0) - quantityIn);
      await this.db.update(farmosMedicines).set({ quantity: String(newQty) }).where(and(eq(farmosMedicines.id, medicine.id), eq(farmosMedicines.organizationId, orgId)));
    }
    await this.recomputeAverageCost(Number(lot.medicineId), orgId);
    await this.publish("deleteFeedLot", ["feedMovements", "medicines"], "deleted", id, orgId);
    return { message: "Lot supprimé." };
  }

  // ─── Mouvements ──────────────────────────────────────────────────────────

  async listFeedMovements(
    orgId: number,
    filters: { from?: string; to?: string; medicineId?: number; buildingId?: number; lot?: string; species?: string },
    speciesScope: "all" | string[] = "all",
  ) {
    const conditions = [eq(farmosFeedMovements.organizationId, orgId), eq(farmosFeedMovements.isActive, 1)];
    if (filters.from) conditions.push(gte(farmosFeedMovements.movementDate, filters.from));
    if (filters.to) conditions.push(lte(farmosFeedMovements.movementDate, filters.to));
    if (filters.medicineId) conditions.push(eq(farmosFeedMovements.medicineId, filters.medicineId));
    if (filters.buildingId) conditions.push(eq(farmosFeedMovements.buildingId, filters.buildingId));
    if (filters.lot) conditions.push(eq(farmosFeedMovements.lot, filters.lot));
    if (filters.species) conditions.push(eq(farmosFeedMovements.species, filters.species));
    const speciesFilter = this.movementSpeciesFilter(speciesScope);
    if (speciesFilter) conditions.push(speciesFilter);
    return this.db
      .select()
      .from(farmosFeedMovements)
      .where(and(...conditions))
      .orderBy(desc(farmosFeedMovements.movementDate), desc(farmosFeedMovements.id));
  }

  // Distribution : sortie de stock en FIFO sur les lots actifs (receivedDate
  // croissante), valorisée au coût du lot consommé. Décrément réel du stock
  // via this.farmos.consumeMedicine (pas de réécriture de la logique).
  async createFeedMovement(input: CreateFeedMovementDto, orgId: number, userId: number | null) {
    const medicine = await this.getFeedMedicine(input.medicine_id, orgId);
    const movementType = input.movement_type ?? "out";
    const quantity = Number(input.quantity);
    if (!(quantity > 0)) throw new BadRequestException("quantity doit être > 0.");

    let totalCost: number | null = null;
    let unitCost: number | null = null;

    if (movementType === "out" || movementType === "loss") {
      // FIFO : consomme les lots actifs les plus anciens en premier.
      const lots = await this.db
        .select()
        .from(farmosFeedLots)
        .where(and(eq(farmosFeedLots.medicineId, medicine.id), eq(farmosFeedLots.organizationId, orgId), eq(farmosFeedLots.isActive, 1)))
        .orderBy(asc(farmosFeedLots.receivedDate), asc(farmosFeedLots.id));

      let remainingToConsume = quantity;
      let costAccum = 0;
      for (const lot of lots) {
        if (remainingToConsume <= 0) break;
        const lotRemaining = Number(lot.quantityRemaining || 0);
        if (lotRemaining <= 0) continue;
        const take = Math.min(lotRemaining, remainingToConsume);
        costAccum += take * Number(lot.unitCost || 0);
        await this.db
          .update(farmosFeedLots)
          .set({ quantityRemaining: String(lotRemaining - take) })
          .where(and(eq(farmosFeedLots.id, lot.id), eq(farmosFeedLots.organizationId, orgId)));
        remainingToConsume -= take;
      }
      // Si le FIFO ne couvre pas toute la quantité (stock lots insuffisant vs
      // quantity affichée), on ne bloque pas la saisie terrain : le reliquat
      // est valorisé au CMP courant (unitPrice) en fallback.
      if (remainingToConsume > 0) {
        costAccum += remainingToConsume * Number(medicine.unitPrice || 0);
      }
      totalCost = costAccum > 0 ? costAccum : null;
      unitCost = quantity > 0 && totalCost != null ? totalCost / quantity : null;

      await this.farmos.consumeMedicine(medicine.id, quantity, orgId);
    } else if (movementType === "adjust") {
      // Ajustement libre (inventaire) : peut être positif ou négatif ; ne
      // touche pas le FIFO des lots, juste la quantité globale de l'article.
      const current = Number(medicine.quantity || 0);
      const next = Math.max(0, current + quantity * (input.adjust_direction === "decrease" ? -1 : 1));
      await this.db.update(farmosMedicines).set({ quantity: String(next) }).where(and(eq(farmosMedicines.id, medicine.id), eq(farmosMedicines.organizationId, orgId)));
    }

    const [res] = await this.db.insert(farmosFeedMovements).values({
      organizationId: orgId,
      medicineId: medicine.id,
      feedLotId: input.feed_lot_id ?? null,
      movementType,
      movementDate: input.movement_date,
      quantity: String(quantity),
      unit: input.unit ?? medicine.unit ?? null,
      unitCost: unitCost != null ? String(unitCost.toFixed(4)) : null,
      totalCost: totalCost != null ? String(totalCost.toFixed(2)) : null,
      currencyId: input.currency_id ?? medicine.currencyId ?? null,
      buildingId: input.building_id ?? null,
      boxId: input.box_id ?? null,
      animalId: input.animal_id ?? null,
      lot: input.lot ?? null,
      species: input.species ?? null,
      animalCount: input.animal_count ?? null,
      rationPerAnimal: input.ration_per_animal != null ? String(input.ration_per_animal) : null,
      recordedBy: userId,
      notes: input.notes ?? null,
    }).$returningId();

    await this.recomputeAverageCost(medicine.id, orgId);
    await this.publish("createFeedMovement", ["feedMovements", "medicines", "expenses"], "created", res.id, orgId);
    return { id: res.id };
  }

  async createFeedMovementsBulk(input: BulkFeedMovementDto, orgId: number, userId: number | null) {
    const rows = Array.isArray(input.movements) ? input.movements : [];
    const created: number[] = [];
    const errors: { index: number; message: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const res = await this.createFeedMovement(rows[i], orgId, userId);
        created.push(res.id);
      } catch (e) {
        errors.push({ index: i, message: e instanceof Error ? e.message : String(e) });
      }
    }
    return { total: rows.length, created: created.length, ids: created, errors };
  }

  async deleteFeedMovement(id: number, orgId: number) {
    const [row] = await this.db.select().from(farmosFeedMovements).where(and(eq(farmosFeedMovements.id, id), eq(farmosFeedMovements.organizationId, orgId))).limit(1);
    if (!row) throw new NotFoundException("Mouvement introuvable.");
    await this.db.update(farmosFeedMovements).set({ isActive: 0 }).where(and(eq(farmosFeedMovements.id, id), eq(farmosFeedMovements.organizationId, orgId)));

    // Réincrément : on annule l'effet du mouvement sur le stock global. Les
    // mouvements 'in' n'ayant pas touché quantity eux-mêmes (voir en-tête),
    // on ne réincrémente que pour out/loss/adjust.
    const medicine = await this.getFeedMedicine(Number(row.medicineId), orgId);
    const qty = Number(row.quantity || 0);
    if (row.movementType === "out" || row.movementType === "loss") {
      const newQty = Number(medicine.quantity || 0) + qty;
      await this.db.update(farmosMedicines).set({ quantity: String(newQty) }).where(and(eq(farmosMedicines.id, medicine.id), eq(farmosMedicines.organizationId, orgId)));
      if (row.feedLotId) {
        const [lot] = await this.db.select().from(farmosFeedLots).where(and(eq(farmosFeedLots.id, Number(row.feedLotId)), eq(farmosFeedLots.organizationId, orgId))).limit(1);
        if (lot) {
          await this.db
            .update(farmosFeedLots)
            .set({ quantityRemaining: String(Number(lot.quantityRemaining || 0) + qty) })
            .where(and(eq(farmosFeedLots.id, lot.id), eq(farmosFeedLots.organizationId, orgId)));
        }
      }
    } else if (row.movementType === "adjust") {
      const newQty = Math.max(0, Number(medicine.quantity || 0) - qty);
      await this.db.update(farmosMedicines).set({ quantity: String(newQty) }).where(and(eq(farmosMedicines.id, medicine.id), eq(farmosMedicines.organizationId, orgId)));
    }

    await this.recomputeAverageCost(medicine.id, orgId);
    await this.publish("deleteFeedMovement", ["feedMovements", "medicines"], "deleted", id, orgId);
    return { message: "Mouvement supprimé." };
  }

  // ─── Stock & alertes ─────────────────────────────────────────────────────

  async getFeedStock(orgId: number) {
    const items = await this.listFeedReferences(orgId);
    const today = new Date();
    const since30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const since14 = new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    const results = [];
    for (const item of items) {
      const outs = await this.db
        .select({ quantity: farmosFeedMovements.quantity, movementDate: farmosFeedMovements.movementDate })
        .from(farmosFeedMovements)
        .where(
          and(
            eq(farmosFeedMovements.medicineId, item.id),
            eq(farmosFeedMovements.organizationId, orgId),
            eq(farmosFeedMovements.isActive, 1),
            eq(farmosFeedMovements.movementType, "out"),
            gte(farmosFeedMovements.movementDate, since30),
          ),
        );
      const sum14 = outs.filter((o) => o.movementDate >= since14).reduce((s, o) => s + Number(o.quantity || 0), 0);
      const sum30 = outs.reduce((s, o) => s + Number(o.quantity || 0), 0);
      const avgDaily14 = sum14 / 14;
      const avgDaily30 = sum30 / 30;
      const avgDaily = avgDaily14 > 0 ? avgDaily14 : avgDaily30;
      const quantity = Number(item.quantity || 0);
      const coverageDays = avgDaily > 0 ? Math.round(quantity / avgDaily) : null;

      // CMP par devise réellement présente parmi les lots actifs (voir
      // computeCostGroups) : évite d'afficher un prix qui mélange des
      // devises différentes derrière une seule étiquette. unitPrice/currencyId
      // existants restent inchangés (compat), unitPrices est le détail fiable.
      const activeLots = await this.db
        .select({ quantityRemaining: farmosFeedLots.quantityRemaining, unitCost: farmosFeedLots.unitCost, currencyId: farmosFeedLots.currencyId })
        .from(farmosFeedLots)
        .where(and(eq(farmosFeedLots.medicineId, item.id), eq(farmosFeedLots.organizationId, orgId), eq(farmosFeedLots.isActive, 1)));
      const unitPrices = this.computeCostGroups(activeLots).map((g) => ({ currencyId: g.currencyId, amount: Math.round(g.amount * 100) / 100 }));

      let status: "ok" | "low" | "critical" | "expired" = "ok";
      const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
      const daysToExpiry = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / 86400000) : null;
      if (daysToExpiry != null && daysToExpiry < 0) status = "expired";
      else if (item.minQuantity != null && quantity <= Number(item.minQuantity) * 0.5) status = "critical";
      else if (item.minQuantity != null && quantity <= Number(item.minQuantity)) status = "low";
      else if (coverageDays != null && coverageDays <= 3) status = "critical";
      else if (coverageDays != null && coverageDays <= 7) status = "low";

      results.push({
        ...item,
        avgDailyConsumption14: Math.round(avgDaily14 * 100) / 100,
        avgDailyConsumption30: Math.round(avgDaily30 * 100) / 100,
        coverageDays,
        daysToExpiry,
        status,
        unitPrices,
      });
    }
    return results;
  }

  async getFeedAlerts(orgId: number) {
    const stock = await this.getFeedStock(orgId);
    return stock.filter((s) => s.alertEnabled && (s.status === "low" || s.status === "critical" || s.status === "expired"));
  }

  // Réconciliation : recalcule farmos_medicines.quantity comme (somme des
  // quantity_in des lots actifs) + (delta net des mouvements out/loss/adjust
  // tracés), PAS un SUM(quantityIn) partant de zéro.
  //
  // GARDE-FOU CRITIQUE (incident dev du 16/08/2026, org 1, ids 11/13/15 mis à
  // 0 et id 12 amputé de son stock historique) :
  // Beaucoup d'aliments ont du stock "hérité" — une `quantity` posée avant
  // l'introduction du système de lots/mouvements — et n'ont donc NI lot NI
  // mouvement en base. Pour ces aliments, `SUM(quantityIn lots actifs)` vaut
  // 0 alors que le vrai stock ne l'est pas : recalculer les écraserait à 0.
  // On ne peut reconstituer un solde d'ouverture fiable pour ces aliments sans
  // information supplémentaire (pas de colonne "solde d'ouverture" en base) :
  // on choisit donc explicitement de NE PAS RECALCULER plutôt que d'écraser.
  //
  // Règle : si un aliment n'a AUCUN mouvement actif dans farmos_feed_movements,
  // recompute() SKIP cet aliment (quantity inchangée). Seuls les aliments qui
  // ont au moins un mouvement tracé (donc au moins un lot créé via
  // createFeedLot, qui insère systématiquement un mouvement 'in' d'audit)
  // sont recalculés, et uniquement à partir de SUM(quantityIn) des lots actifs
  // de CET aliment + delta net des mouvements out/loss/adjust (les 'in' sont
  // de l'audit pur, déjà comptés dans quantityIn des lots, cf. createFeedLot).
  async recomputeFeedStock(orgId: number) {
    const items = await this.listFeedReferences(orgId);
    const updated: { id: number; previousQuantity: number; newQuantity: number }[] = [];
    const skipped: { id: number; reason: string }[] = [];
    for (const item of items) {
      const movements = await this.db
        .select({ movementType: farmosFeedMovements.movementType, quantity: farmosFeedMovements.quantity })
        .from(farmosFeedMovements)
        .where(and(eq(farmosFeedMovements.medicineId, item.id), eq(farmosFeedMovements.organizationId, orgId), eq(farmosFeedMovements.isActive, 1)));

      if (movements.length === 0) {
        // Aucun mouvement tracé pour cet aliment => impossible de distinguer
        // "jamais eu de stock" de "stock hérité pré-lots". On NE TOUCHE PAS
        // quantity. C'est le garde-fou qui aurait évité l'incident du
        // 16/08/2026 (ids 11/13/15 écrasés à 0).
        skipped.push({ id: item.id, reason: "no_movements" });
        continue;
      }

      let total = 0;
      for (const m of movements) {
        const q = Number(m.quantity || 0);
        if (m.movementType === "in") continue; // audit only, déjà compté via quantity_in du lot / createExpense
        if (m.movementType === "out" || m.movementType === "loss") total -= q;
        else if (m.movementType === "adjust") total += q;
      }
      // Base = somme quantity_in des lots actifs de cet aliment (seulement
      // pertinent ici car on sait déjà, via la présence de mouvements, que cet
      // aliment est bien entré dans le système de lots).
      const lots = await this.db
        .select({ quantityIn: farmosFeedLots.quantityIn })
        .from(farmosFeedLots)
        .where(and(eq(farmosFeedLots.medicineId, item.id), eq(farmosFeedLots.organizationId, orgId), eq(farmosFeedLots.isActive, 1)));
      const totalIn = lots.reduce((s, l) => s + Number(l.quantityIn || 0), 0);
      const newQty = Math.max(0, totalIn + total);
      const previous = Number(item.quantity || 0);
      if (Math.abs(newQty - previous) > 0.001) {
        await this.db.update(farmosMedicines).set({ quantity: String(newQty) }).where(and(eq(farmosMedicines.id, item.id), eq(farmosMedicines.organizationId, orgId)));
        updated.push({ id: item.id, previousQuantity: previous, newQuantity: newQty });
      }
    }
    if (updated.length) await this.publish("recomputeFeed", ["medicines"], "updated", 0, orgId);
    return { checked: items.length, updated: updated.length, skipped: skipped.length, details: updated };
  }
}
