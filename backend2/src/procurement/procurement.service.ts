import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  goodsReceiptLines,
  goodsReceipts,
  products,
  purchaseOrderLines,
  purchaseOrders,
  stockMovements,
  warehouses,
} from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class ProcurementService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ─── Entrepots ────────────────────────────────────────────────────────────

  listWarehouses(orgId: number) {
    return this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.organizationId, orgId), eq(warehouses.isActive, 1)))
      .orderBy(desc(warehouses.id));
  }

  async createWarehouse(input: { name: string; code?: string; siteId?: number }, orgId: number) {
    const [row] = await this.db
      .insert(warehouses)
      .values({ organizationId: orgId, name: input.name, code: input.code, siteId: input.siteId })
      .$returningId();
    return { id: row.id };
  }

  // ─── Bons de commande ──────────────────────────────────────────────────────

  listOrders(orgId: number, status?: string) {
    const conds = [eq(purchaseOrders.organizationId, orgId)];
    if (status) conds.push(eq(purchaseOrders.status, status));
    return this.db
      .select()
      .from(purchaseOrders)
      .where(and(...conds))
      .orderBy(desc(purchaseOrders.id));
  }

  async getOrder(orderId: number, orgId: number) {
    const [order] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.organizationId, orgId)))
      .limit(1);
    if (!order) throw new NotFoundException(`Bon de commande #${orderId} introuvable.`);
    const lines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, orderId));
    return { order, lines };
  }

  async createOrder(
    input: {
      supplierId?: number;
      warehouseId?: number;
      currencyId?: number;
      expectedDate?: string;
      note?: string;
      lines: Array<{ productId: number; quantity: number; unitPrice?: number }>;
    },
    orgId: number,
    userId?: number,
  ) {
    if (!input.lines?.length) throw new BadRequestException("Un bon de commande exige au moins une ligne.");
    const total = input.lines.reduce((s, l) => s + l.quantity * (l.unitPrice ?? 0), 0);
    return this.db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          organizationId: orgId,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          currencyId: input.currencyId,
          expectedDate: input.expectedDate ? new Date(input.expectedDate) : undefined,
          note: input.note,
          status: "draft",
          totalAmount: total.toFixed(2),
          createdBy: userId,
        })
        .$returningId();
      await tx.insert(purchaseOrderLines).values(
        input.lines.map((l) => ({
          organizationId: orgId,
          purchaseOrderId: po.id,
          productId: l.productId,
          quantity: l.quantity.toFixed(3),
          unitPrice: (l.unitPrice ?? 0).toFixed(2),
        })),
      );
      await tx
        .update(purchaseOrders)
        .set({ reference: `PO-${po.id}` })
        .where(eq(purchaseOrders.id, po.id));
      return { id: po.id, reference: `PO-${po.id}`, totalAmount: total };
    });
  }

  /** Transition de statut simple (draft -> ordered -> received / cancelled). */
  async setOrderStatus(orderId: number, status: string, orgId: number) {
    const allowed = ["draft", "ordered", "received", "cancelled"];
    if (!allowed.includes(status)) throw new BadRequestException(`Statut invalide: ${status}.`);
    await this.getOrder(orderId, orgId);
    await this.db
      .update(purchaseOrders)
      .set({ status })
      .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.organizationId, orgId)));
    return { id: orderId, status };
  }

  // ─── Receptions (entree en stock) ────────────────────────────────────────────

  /**
   * Receptionne des lignes d'un bon de commande : cree un goods_receipt, des
   * stock_movements (entree), incremente received_quantity et le stock produit.
   * Marque la commande "received" si tout est recu.
   */
  async receiveOrder(
    orderId: number,
    input: { warehouseId: number; lines: Array<{ productId: number; quantity: number; unitCost?: number; purchaseOrderLineId?: number }> },
    orgId: number,
    userId?: number,
  ) {
    const { order, lines: poLines } = await this.getOrder(orderId, orgId);
    if (order.status === "cancelled") throw new BadRequestException("Commande annulee.");
    if (!input.lines?.length) throw new BadRequestException("Aucune ligne a receptionner.");

    return this.db.transaction(async (tx) => {
      const [gr] = await tx
        .insert(goodsReceipts)
        .values({
          organizationId: orgId,
          purchaseOrderId: orderId,
          warehouseId: input.warehouseId,
          receivedBy: userId,
        })
        .$returningId();
      await tx
        .update(goodsReceipts)
        .set({ reference: `GR-${gr.id}` })
        .where(eq(goodsReceipts.id, gr.id));

      for (const l of input.lines) {
        if (!(l.quantity > 0)) continue;
        await tx.insert(goodsReceiptLines).values({
          organizationId: orgId,
          goodsReceiptId: gr.id,
          purchaseOrderLineId: l.purchaseOrderLineId,
          productId: l.productId,
          quantity: l.quantity.toFixed(3),
          unitCost: l.unitCost != null ? l.unitCost.toFixed(2) : undefined,
        });
        // Mouvement de stock (entree)
        await tx.insert(stockMovements).values({
          organizationId: orgId,
          warehouseId: input.warehouseId,
          productId: l.productId,
          movementType: "IN",
          quantity: l.quantity.toFixed(3),
          unitCost: l.unitCost != null ? l.unitCost.toFixed(2) : undefined,
          reference: `GR-${gr.id}`,
          sourceModule: "goods_receipt",
          relatedId: String(gr.id),
          createdBy: userId,
        });
        // received_quantity sur la ligne de commande
        if (l.purchaseOrderLineId) {
          await tx
            .update(purchaseOrderLines)
            .set({ receivedQuantity: sql`${purchaseOrderLines.receivedQuantity} + ${l.quantity}` })
            .where(eq(purchaseOrderLines.id, l.purchaseOrderLineId));
        }
        // Stock produit global (compat avec l'existant productQuantity)
        await tx
          .update(products)
          .set({ productQuantity: sql`${products.productQuantity} + ${Math.round(l.quantity)}`, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(products.id, l.productId));
      }

      // Commande recue en totalite ?
      const fullyReceived = poLines.every((pl) => {
        const recv = input.lines
          .filter((il) => il.purchaseOrderLineId === pl.id)
          .reduce((s, il) => s + il.quantity, 0);
        return Number(pl.receivedQuantity) + recv >= Number(pl.quantity);
      });
      await tx
        .update(purchaseOrders)
        .set({ status: fullyReceived ? "received" : "ordered" })
        .where(eq(purchaseOrders.id, orderId));

      return { goodsReceiptId: gr.id, reference: `GR-${gr.id}`, fullyReceived };
    });
  }

  // ─── Stock ─────────────────────────────────────────────────────────────────

  /** Niveau de stock par produit dans un entrepot (somme des mouvements IN - OUT). */
  async stockLevels(warehouseId: number, orgId: number) {
    const rows = await this.db
      .select({
        productId: stockMovements.productId,
        inQty: sql<string>`coalesce(sum(case when ${stockMovements.movementType} = 'IN' then ${stockMovements.quantity} else 0 end), 0)`,
        outQty: sql<string>`coalesce(sum(case when ${stockMovements.movementType} = 'OUT' then ${stockMovements.quantity} else 0 end), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, orgId),
          eq(stockMovements.warehouseId, warehouseId),
        ),
      )
      .groupBy(stockMovements.productId);
    return rows.map((r) => ({
      productId: r.productId,
      onHand: Math.round((Number(r.inQty) - Number(r.outQty)) * 1000) / 1000,
    }));
  }

  /** Mouvement manuel (entree/sortie/ajustement). */
  async createMovement(
    input: { warehouseId: number; productId: number; movementType: "IN" | "OUT" | "ADJUST"; quantity: number; unitCost?: number; note?: string },
    orgId: number,
    userId?: number,
  ) {
    if (!(input.quantity > 0)) throw new BadRequestException("Quantite invalide.");
    const [row] = await this.db
      .insert(stockMovements)
      .values({
        organizationId: orgId,
        warehouseId: input.warehouseId,
        productId: input.productId,
        movementType: input.movementType,
        quantity: input.quantity.toFixed(3),
        unitCost: input.unitCost != null ? input.unitCost.toFixed(2) : undefined,
        note: input.note,
        sourceModule: "manual",
        createdBy: userId,
      })
      .$returningId();
    return { id: row.id };
  }

  listMovements(warehouseId: number, orgId: number) {
    return this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, orgId),
          eq(stockMovements.warehouseId, warehouseId),
        ),
      )
      .orderBy(desc(stockMovements.id))
      .limit(100);
  }
}
