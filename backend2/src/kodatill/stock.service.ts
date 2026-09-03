import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, gt, isNotNull, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktStockItems, ktStockMovements } from "../database/schema";
import type { Database } from "../database/types";
import { AdjustStockDto, RestockDto } from "./dto/stock.dto";

@Injectable()
export class StockService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async findOneInternal(tx: Database, id: number, orgId: number) {
    const rows = await tx
      .select()
      .from(ktStockItems)
      .where(and(eq(ktStockItems.id, id), eq(ktStockItems.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Article de stock introuvable.");
    return rows[0];
  }

  /**
   * Liste des kt_stock_items de l'organisation. state est calcule cote requete
   * (pas de colonne derivee stockee) : low = qty <= reorderThreshold ET qty > 0,
   * out = qty <= 0. Le filtre state est donc applique en JS apres selection,
   * le volume par organisation restant faible (un item par produit/succursale).
   */
  async list(orgId: number, filter: { branchId?: string; state?: "ok" | "low" | "out" }) {
    const conditions = [eq(ktStockItems.organizationId, orgId), eq(ktStockItems.status, "true")];

    if (filter.branchId) {
      const branchId = Number(filter.branchId);
      if (Number.isInteger(branchId)) conditions.push(eq(ktStockItems.branchId, branchId));
    }

    const rows = await this.db
      .select()
      .from(ktStockItems)
      .where(and(...conditions))
      .orderBy(desc(ktStockItems.id));

    if (!filter.state) return rows;

    return rows.filter((row) => {
      const qty = Number(row.qty);
      const threshold = row.reorderThreshold !== null ? Number(row.reorderThreshold) : null;
      const isOut = qty <= 0;
      const isLow = !isOut && threshold !== null && qty <= threshold;

      if (filter.state === "out") return isOut;
      if (filter.state === "low") return isLow;
      return !isOut && !isLow;
    });
  }

  async findOne(id: number, orgId: number) {
    return this.findOneInternal(this.db, id, orgId);
  }

  /** Items dont le seuil de reappro est defini et atteint/depasse, pour bandeau d'alerte dashboard. */
  async alerts(orgId: number) {
    return this.db
      .select()
      .from(ktStockItems)
      .where(
        and(
          eq(ktStockItems.organizationId, orgId),
          eq(ktStockItems.status, "true"),
          isNotNull(ktStockItems.reorderThreshold),
          lte(ktStockItems.qty, sql`${ktStockItems.reorderThreshold}`),
        ),
      )
      .orderBy(asc(ktStockItems.qty));
  }

  async movements(id: number, orgId: number) {
    await this.findOneInternal(this.db, id, orgId);

    return this.db
      .select()
      .from(ktStockMovements)
      .where(and(eq(ktStockMovements.stockItemId, id), eq(ktStockMovements.organizationId, orgId)))
      .orderBy(desc(ktStockMovements.createdAt), desc(ktStockMovements.id));
  }

  async restock(id: number, input: RestockDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const item = await this.findOneInternal(tx, id, orgId);
      const newQty = Number(item.qty) + input.qty;

      await tx
        .update(ktStockItems)
        .set({
          qty: newQty.toFixed(3),
          ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice.toFixed(2) } : {}),
        })
        .where(and(eq(ktStockItems.id, id), eq(ktStockItems.organizationId, orgId)));

      await tx.insert(ktStockMovements).values({
        organizationId: orgId,
        stockItemId: id,
        type: "in",
        qty: input.qty.toFixed(3),
        qtyAfter: newQty.toFixed(3),
        supplierName: input.supplierName,
        userId,
        createdAt: new Date(),
      });

      return this.findOneInternal(tx, id, orgId);
    });
  }

  async adjust(id: number, input: AdjustStockDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const item = await this.findOneInternal(tx, id, orgId);
      const newQty = Number(item.qty) + input.delta;

      if (newQty < 0) {
        throw new BadRequestException("L'ajustement rendrait la quantite negative.");
      }

      await tx
        .update(ktStockItems)
        .set({ qty: newQty.toFixed(3) })
        .where(and(eq(ktStockItems.id, id), eq(ktStockItems.organizationId, orgId)));

      await tx.insert(ktStockMovements).values({
        organizationId: orgId,
        stockItemId: id,
        type: "adjust",
        qty: input.delta.toFixed(3),
        qtyAfter: newQty.toFixed(3),
        reason: input.reason,
        userId,
        createdAt: new Date(),
      });

      return this.findOneInternal(tx, id, orgId);
    });
  }
}
