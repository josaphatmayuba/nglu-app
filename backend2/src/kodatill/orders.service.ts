import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  ktOrderCounters,
  ktOrderLines,
  ktOrderStatusHistory,
  ktOrders,
  ktPaymentMethods,
  ktPayments,
  ktProducts,
  ktStockItems,
  ktStockMovements,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateOrderDto,
  CreateOrderPaymentDto,
  OrderStatus,
  UpdateOrderLinesDto,
} from "./dto/orders.dto";

/**
 * Machine a etats explicite. Transitions autorisees dans l'ordre normal,
 * plus *→cancelled depuis n'importe quel etat non terminal.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["received", "cancelled"],
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Etats dans lesquels les lignes de commande restent modifiables.
const EDITABLE_STATUSES: OrderStatus[] = ["draft", "received"];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private computeLineTotal(qty: number, unitPrice: number, lineDiscount: number): number {
    return this.round2(qty * unitPrice - lineDiscount);
  }

  /**
   * Numerotation quotidienne par succursale, atomique via UPSERT (evite la
   * race condition d'un MAX+1 en caisse multi-poste).
   */
  private async nextOrderNumber(
    tx: Database,
    orgId: number,
    branchId: number,
    day: string,
  ): Promise<number> {
    await tx
      .insert(ktOrderCounters)
      .values({ organizationId: orgId, branchId, day, lastNumber: 1 })
      .onDuplicateKeyUpdate({
        set: { lastNumber: sql`last_number + 1` },
      });

    const [row] = await tx
      .select({ lastNumber: ktOrderCounters.lastNumber })
      .from(ktOrderCounters)
      .where(
        and(
          eq(ktOrderCounters.organizationId, orgId),
          eq(ktOrderCounters.branchId, branchId),
          eq(ktOrderCounters.day, day),
        ),
      )
      .limit(1);

    return row?.lastNumber ?? 1;
  }

  async create(input: CreateOrderDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      // Idempotence : un client_uuid deja vu pour cette org renvoie la commande
      // existante au lieu d'en creer une seconde (comportement UPSERT logique).
      const existing = await tx
        .select({ id: ktOrders.id })
        .from(ktOrders)
        .where(and(eq(ktOrders.organizationId, orgId), eq(ktOrders.clientUuid, input.clientUuid)))
        .limit(1);

      if (existing.length) {
        return this.findOneInternal(tx, existing[0].id, orgId);
      }

      const day = new Date().toISOString().slice(0, 10);
      const orderNumber = await this.nextOrderNumber(tx, orgId, input.branchId, day);
      const publicRef = `KT-${day.replace(/-/g, "")}-${String(orderNumber).padStart(4, "0")}-${randomUUID().slice(0, 4)}`;

      const lines = input.lines ?? [];
      let subtotal = 0;
      let discountTotal = 0;
      for (const l of lines) {
        const lineTotal = this.computeLineTotal(l.qty, l.unitPrice, l.lineDiscount ?? 0);
        subtotal += l.qty * l.unitPrice;
        discountTotal += l.lineDiscount ?? 0;
      }
      subtotal = this.round2(subtotal);
      discountTotal = this.round2(discountTotal);
      const total = this.round2(subtotal - discountTotal);

      const [result] = await tx.insert(ktOrders).values({
        organizationId: orgId,
        branchId: input.branchId,
        registerId: input.registerId,
        orderNumber,
        publicRef,
        channel: input.channel ?? "pos",
        tableId: input.tableId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        orderStatus: "draft",
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        taxTotal: "0.00",
        serviceTotal: "0.00",
        total: total.toFixed(2),
        currencyCode: input.currencyCode ?? "USD",
        paidTotal: "0.00",
        dueTotal: total.toFixed(2),
        openedByUserId: userId,
        clientUuid: input.clientUuid,
      });

      const orderId = Number(result.insertId);

      if (lines.length) {
        await tx.insert(ktOrderLines).values(
          lines.map((l) => ({
            organizationId: orgId,
            orderId,
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            qty: l.qty.toFixed(2),
            unitPrice: l.unitPrice.toFixed(2),
            lineDiscount: (l.lineDiscount ?? 0).toFixed(2),
            lineTotal: this.computeLineTotal(l.qty, l.unitPrice, l.lineDiscount ?? 0).toFixed(2),
            currencyCode: input.currencyCode ?? "USD",
          })),
        );
      }

      await tx.insert(ktOrderStatusHistory).values({
        organizationId: orgId,
        orderId,
        fromStatus: null,
        toStatus: "draft",
        userId,
      });

      return this.findOneInternal(tx, orderId, orgId);
    });
  }

  async findAll(
    orgId: number,
    filter: { status?: string; branchId?: string; from?: string; to?: string; channel?: string },
  ) {
    const conditions = [eq(ktOrders.organizationId, orgId), eq(ktOrders.status, "true")];

    if (filter.status) conditions.push(eq(ktOrders.orderStatus, filter.status as OrderStatus));
    if (filter.branchId) {
      const branchId = Number(filter.branchId);
      if (Number.isInteger(branchId)) conditions.push(eq(ktOrders.branchId, branchId));
    }
    if (filter.channel) conditions.push(eq(ktOrders.channel, filter.channel as any));
    if (filter.from) conditions.push(gte(sql`DATE(${ktOrders.createdAt})`, filter.from));
    if (filter.to) conditions.push(lte(sql`DATE(${ktOrders.createdAt})`, filter.to));

    return this.db
      .select()
      .from(ktOrders)
      .where(and(...conditions))
      .orderBy(desc(ktOrders.id));
  }

  private async findOneInternal(tx: Database, id: number, orgId: number) {
    const rows = await tx
      .select()
      .from(ktOrders)
      .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Commande introuvable.");

    const lines = await tx
      .select()
      .from(ktOrderLines)
      .where(
        and(
          eq(ktOrderLines.orderId, id),
          eq(ktOrderLines.organizationId, orgId),
          eq(ktOrderLines.status, "true"),
        ),
      )
      .orderBy(asc(ktOrderLines.id));

    return { ...rows[0], lines };
  }

  /**
   * Version complete pour l'affichage detail (GET /orders/:id) : ajoute
   * payments (avec nom de methode joint) et statusHistory en plus des
   * lignes deja fournies par findOneInternal. Volontairement separee de
   * findOneInternal pour ne pas alourdir les chemins d'ecriture
   * (create/updateLines/updateStatus/addPayment) qui n'en ont pas besoin.
   */
  async findOne(id: number, orgId: number) {
    const order = await this.findOneInternal(this.db, id, orgId);

    const payments = await this.db
      .select({
        id: ktPayments.id,
        orderId: ktPayments.orderId,
        methodId: ktPayments.methodId,
        methodName: ktPaymentMethods.name,
        amount: ktPayments.amount,
        currencyCode: ktPayments.currencyCode,
        reference: ktPayments.reference,
        gatewayStatus: ktPayments.gatewayStatus,
        receivedAt: ktPayments.receivedAt,
        userId: ktPayments.userId,
        createdAt: ktPayments.createdAt,
      })
      .from(ktPayments)
      .leftJoin(ktPaymentMethods, eq(ktPayments.methodId, ktPaymentMethods.id))
      .where(
        and(
          eq(ktPayments.orderId, id),
          eq(ktPayments.organizationId, orgId),
          eq(ktPayments.status, "true"),
        ),
      )
      .orderBy(asc(ktPayments.receivedAt), asc(ktPayments.id));

    const statusHistory = await this.db
      .select()
      .from(ktOrderStatusHistory)
      .where(and(eq(ktOrderStatusHistory.orderId, id), eq(ktOrderStatusHistory.organizationId, orgId)))
      .orderBy(asc(ktOrderStatusHistory.createdAt), asc(ktOrderStatusHistory.id));

    return { ...order, payments, statusHistory };
  }

  /** Recalcule subtotal/discountTotal/total a partir des lignes actives. */
  private async recomputeTotals(tx: Database, orderId: number, orgId: number, currencyCode: string) {
    const lines = await tx
      .select()
      .from(ktOrderLines)
      .where(
        and(
          eq(ktOrderLines.orderId, orderId),
          eq(ktOrderLines.organizationId, orgId),
          eq(ktOrderLines.status, "true"),
        ),
      );

    let subtotal = 0;
    let discountTotal = 0;
    for (const l of lines) {
      subtotal += Number(l.qty) * Number(l.unitPrice);
      discountTotal += Number(l.lineDiscount);
    }
    subtotal = this.round2(subtotal);
    discountTotal = this.round2(discountTotal);
    const total = this.round2(subtotal - discountTotal);

    const [order] = await tx
      .select({ paidTotal: ktOrders.paidTotal })
      .from(ktOrders)
      .where(and(eq(ktOrders.id, orderId), eq(ktOrders.organizationId, orgId)))
      .limit(1);
    const paidTotal = Number(order?.paidTotal ?? 0);
    const dueTotal = this.round2(total - paidTotal);

    await tx
      .update(ktOrders)
      .set({
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        total: total.toFixed(2),
        dueTotal: dueTotal.toFixed(2),
      })
      .where(and(eq(ktOrders.id, orderId), eq(ktOrders.organizationId, orgId)));
  }

  async updateLines(id: number, input: UpdateOrderLinesDto, orgId: number) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(ktOrders)
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)))
        .limit(1);
      if (!rows.length) throw new NotFoundException("Commande introuvable.");
      const order = rows[0];

      if (!EDITABLE_STATUSES.includes(order.orderStatus as OrderStatus)) {
        throw new BadRequestException(
          `Impossible de modifier les lignes : commande au statut "${order.orderStatus}" (autorise uniquement en draft/received).`,
        );
      }

      for (const l of input.lines) {
        if (l.remove && l.id) {
          await tx
            .update(ktOrderLines)
            .set({ status: "false" })
            .where(and(eq(ktOrderLines.id, l.id), eq(ktOrderLines.orderId, id), eq(ktOrderLines.organizationId, orgId)));
          continue;
        }

        const lineTotal = this.computeLineTotal(l.qty, l.unitPrice, l.lineDiscount ?? 0);

        if (l.id) {
          await tx
            .update(ktOrderLines)
            .set({
              productId: l.productId,
              variantId: l.variantId,
              name: l.name,
              qty: l.qty.toFixed(2),
              unitPrice: l.unitPrice.toFixed(2),
              lineDiscount: (l.lineDiscount ?? 0).toFixed(2),
              lineTotal: lineTotal.toFixed(2),
              note: l.note,
            })
            .where(and(eq(ktOrderLines.id, l.id), eq(ktOrderLines.orderId, id), eq(ktOrderLines.organizationId, orgId)));
        } else {
          await tx.insert(ktOrderLines).values({
            organizationId: orgId,
            orderId: id,
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            qty: l.qty.toFixed(2),
            unitPrice: l.unitPrice.toFixed(2),
            lineDiscount: (l.lineDiscount ?? 0).toFixed(2),
            lineTotal: lineTotal.toFixed(2),
            currencyCode: order.currencyCode,
            note: l.note,
          });
        }
      }

      await this.recomputeTotals(tx, id, orgId, order.currencyCode);
      return this.findOneInternal(tx, id, orgId);
    });
  }

  async updateStatus(id: number, nextStatus: OrderStatus, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(ktOrders)
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)))
        .limit(1);
      if (!rows.length) throw new NotFoundException("Commande introuvable.");
      const order = rows[0];
      const currentStatus = order.orderStatus as OrderStatus;

      const allowed = ORDER_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw new BadRequestException(
          `Transition invalide : "${currentStatus}" → "${nextStatus}". Autorise depuis "${currentStatus}": ${allowed.length ? allowed.join(", ") : "aucune (etat terminal)"}.`,
        );
      }

      const patch: Record<string, unknown> = { orderStatus: nextStatus };
      if (nextStatus === "completed" || nextStatus === "cancelled") {
        patch.closedAt = new Date();
      }

      await tx
        .update(ktOrders)
        .set(patch)
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)));

      await tx.insert(ktOrderStatusHistory).values({
        organizationId: orgId,
        orderId: id,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        userId,
      });

      if (nextStatus === "completed") {
        await this.decrementStockForOrder(tx, order, orgId, userId);
      }

      return this.findOneInternal(tx, id, orgId);
    });
  }

  /**
   * Decrement atomique du stock a la finalisation d'une commande (SCRUM-288).
   *
   * Choix critique : UPDATE ... SET qty = qty - :n WHERE id = :id AND qty >= :n
   * (comparaison ET decrement dans la meme requete conditionnelle), jamais un
   * read-modify-write (SELECT qty puis UPDATE qty = valeur calculee) qui casse
   * sous concurrence — deux caisses vendant le dernier article en meme temps
   * liraient la meme qty de depart et l'une des deux ventes decrementerait a
   * partir d'une valeur perimee (stock qui devient incorrect, voire negatif).
   *
   * Si le decrement echoue (aucune ligne affectee : stock insuffisant, ou
   * aucun kt_stock_items pour ce produit/succursale), on NE bloque PAS la
   * vente : le paiement est deja acte cote caisse a ce stade (order_status
   * passe a completed apres encaissement), donc empecher la transition ferait
   * perdre une vente reelle a cause d'un desaccord de stock. C'est un probleme
   * de gestion de stock (a corriger via /kodatill/stock/:id/adjust), pas un
   * probleme de vente : on logge l'anomalie et on continue.
   */
  private async decrementStockForOrder(
    tx: Database,
    order: typeof ktOrders.$inferSelect,
    orgId: number,
    userId: number,
  ): Promise<void> {
    const lines = await tx
      .select({
        productId: ktOrderLines.productId,
        qty: ktOrderLines.qty,
      })
      .from(ktOrderLines)
      .where(
        and(
          eq(ktOrderLines.orderId, order.id),
          eq(ktOrderLines.organizationId, orgId),
          eq(ktOrderLines.status, "true"),
        ),
      );

    for (const line of lines) {
      if (!line.productId) continue;

      const [product] = await tx
        .select({ trackStock: ktProducts.trackStock })
        .from(ktProducts)
        .where(and(eq(ktProducts.id, line.productId), eq(ktProducts.organizationId, orgId)))
        .limit(1);

      if (!product?.trackStock) continue;

      const [stockItem] = await tx
        .select({ id: ktStockItems.id, qty: ktStockItems.qty })
        .from(ktStockItems)
        .where(
          and(
            eq(ktStockItems.organizationId, orgId),
            eq(ktStockItems.branchId, order.branchId),
            eq(ktStockItems.productId, line.productId),
            eq(ktStockItems.status, "true"),
          ),
        )
        .limit(1);

      if (!stockItem) {
        this.logger.warn(
          `Vente completed sans article de stock (order=${order.id}, productId=${line.productId}, branchId=${order.branchId}) : decrement ignore.`,
        );
        continue;
      }

      const qtySold = Number(line.qty);

      // Decrement atomique : condition et ecriture dans la meme requete SQL,
      // pas de read-modify-write (voir commentaire methode).
      const [result]: any = await tx.execute(sql`
        UPDATE kt_stock_items
        SET qty = qty - ${qtySold}
        WHERE id = ${stockItem.id} AND qty >= ${qtySold}
      `);
      const affectedRows = Number(result?.affectedRows ?? 0);

      if (affectedRows === 0) {
        this.logger.warn(
          `Stock insuffisant lors de la vente (order=${order.id}, stockItemId=${stockItem.id}, productId=${line.productId}) : decrement ignore, vente non bloquee.`,
        );
        continue;
      }

      const newQty = Number(stockItem.qty) - qtySold;
      await tx.insert(ktStockMovements).values({
        organizationId: orgId,
        stockItemId: stockItem.id,
        type: "sale",
        qty: qtySold.toFixed(3),
        qtyAfter: newQty.toFixed(3),
        refType: "order",
        refId: order.id,
        userId,
        createdAt: new Date(),
      });
    }
  }

  async addPayment(id: number, input: CreateOrderPaymentDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(ktOrders)
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)))
        .limit(1);
      if (!rows.length) throw new NotFoundException("Commande introuvable.");
      const order = rows[0];

      const currencyCode = input.currencyCode ?? order.currencyCode;

      await tx.insert(ktPayments).values({
        organizationId: orgId,
        orderId: id,
        methodId: input.methodId,
        amount: input.amount.toFixed(2),
        currencyCode,
        reference: input.reference,
        gatewayStatus: input.gatewayStatus,
        receivedAt: new Date(),
        userId,
      });

      const paidTotal = this.round2(Number(order.paidTotal) + input.amount);
      const dueTotal = this.round2(Number(order.total) - paidTotal);

      await tx
        .update(ktOrders)
        .set({ paidTotal: paidTotal.toFixed(2), dueTotal: dueTotal.toFixed(2) })
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)));

      return this.findOneInternal(tx, id, orgId);
    });
  }
}
