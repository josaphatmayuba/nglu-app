import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktOrderLines, ktOrders } from "../database/schema";
import type { Database } from "../database/types";
import { KitchenLineStatus } from "./dto/orders.dto";

/**
 * Ecran cuisine (SCRUM-298) : lecture agregee des lignes en cours de
 * preparation, et transition simple du statut individuel d'une ligne.
 *
 * Volontairement pas de machine a etats aussi stricte que
 * OrdersService.updateStatus (ORDER_TRANSITIONS) : le personnel cuisine doit
 * pouvoir corriger rapidement (ex: repasser une ligne de "ready" a
 * "preparing" si erreur), seule la valeur de l'enum est validee.
 */
@Injectable()
export class KitchenService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Lignes actives (kitchen_status pending/preparing/ready) des commandes non
   * terminees (order_status hors completed/cancelled), groupees par commande,
   * triees par anciennete (commande la plus ancienne en premier).
   */
  async getBoard(orgId: number, branchId?: string) {
    const orderConditions = [
      eq(ktOrders.organizationId, orgId),
      eq(ktOrders.status, "true"),
      ne(ktOrders.orderStatus, "completed"),
      ne(ktOrders.orderStatus, "cancelled"),
    ];
    if (branchId) {
      const id = Number(branchId);
      if (Number.isInteger(id)) orderConditions.push(eq(ktOrders.branchId, id));
    }

    const orders = await this.db
      .select({
        id: ktOrders.id,
        orderNumber: ktOrders.orderNumber,
        publicRef: ktOrders.publicRef,
        channel: ktOrders.channel,
        tableId: ktOrders.tableId,
        orderStatus: ktOrders.orderStatus,
        branchId: ktOrders.branchId,
        createdAt: ktOrders.createdAt,
      })
      .from(ktOrders)
      .where(and(...orderConditions))
      .orderBy(asc(ktOrders.createdAt), asc(ktOrders.id));

    if (!orders.length) return [];

    const orderIds = orders.map((o) => o.id);
    const lines = await this.db
      .select()
      .from(ktOrderLines)
      .where(
        and(
          eq(ktOrderLines.organizationId, orgId),
          eq(ktOrderLines.status, "true"),
          inArray(ktOrderLines.orderId, orderIds),
          inArray(ktOrderLines.kitchenStatus, ["pending", "preparing", "ready"]),
        ),
      )
      .orderBy(asc(ktOrderLines.id));

    const linesByOrder = new Map<number, typeof lines>();
    for (const line of lines) {
      const list = linesByOrder.get(line.orderId) ?? [];
      list.push(line);
      linesByOrder.set(line.orderId, list);
    }

    // Uniquement les commandes qui ont au moins une ligne encore active en cuisine.
    return orders
      .filter((o) => linesByOrder.has(o.id))
      .map((o) => ({ ...o, lines: linesByOrder.get(o.id) ?? [] }));
  }

  /**
   * Transition simple du statut d'une ligne. Refuse si la ligne n'appartient
   * pas a l'organisation courante (isolation multi-tenant, meme pattern que
   * OrdersService).
   *
   * Choix documente (SCRUM-298) : ne declenche PAS automatiquement la
   * transition de la commande elle-meme vers "served" quand toutes ses
   * lignes passent a "served". OrdersService.updateStatus applique une
   * machine a etats stricte (ORDER_TRANSITIONS) avec historisation et regles
   * metier (ex: decrement stock a "completed") ; brancher cette suggestion
   * automatiquement demanderait de rejouer cette logique ici sans dupliquer
   * ni fragiliser l'existant. Reste donc manuel : l'operateur avance la
   * commande depuis CommandesScreen une fois les plats servis.
   */
  async updateLineStatus(lineId: number, nextStatus: KitchenLineStatus, orgId: number) {
    const rows = await this.db
      .select({ id: ktOrderLines.id, orderId: ktOrderLines.orderId })
      .from(ktOrderLines)
      .where(
        and(
          eq(ktOrderLines.id, lineId),
          eq(ktOrderLines.organizationId, orgId),
          eq(ktOrderLines.status, "true"),
        ),
      )
      .limit(1);

    if (!rows.length) throw new NotFoundException("Ligne de commande introuvable.");

    if (!nextStatus) {
      throw new BadRequestException("Statut cuisine requis.");
    }

    await this.db
      .update(ktOrderLines)
      .set({ kitchenStatus: nextStatus })
      .where(and(eq(ktOrderLines.id, lineId), eq(ktOrderLines.organizationId, orgId)));

    const [updated] = await this.db
      .select()
      .from(ktOrderLines)
      .where(eq(ktOrderLines.id, lineId))
      .limit(1);

    return updated;
  }
}
