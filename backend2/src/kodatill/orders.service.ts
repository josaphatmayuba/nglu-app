import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  ktBranches,
  ktBusinessProfiles,
  ktOrderCounters,
  ktOrderLines,
  ktOrderStatusHistory,
  ktOrders,
  ktPaymentMethods,
  ktPayments,
  ktProducts,
  ktStockItems,
  ktStockMovements,
  organizations,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateOrderDto,
  CreateOrderPaymentDto,
  OrderStatus,
  SyncOrderDto,
  UpdateOrderLinesDto,
} from "./dto/orders.dto";

/**
 * Machine a etats explicite. Transitions autorisees dans l'ordre normal,
 * plus *→cancelled depuis n'importe quel etat non terminal.
 *
 * draft→completed direct (bug SCRUM-304, corrige en QA dev) : PaymentPanel
 * (caisse en ligne, screens.jsx#confirm) appelle systematiquement
 * setOrderStatus(..., "completed") juste apres le paiement, sur une commande
 * qui vient d'etre creee et donc encore en draft — jamais passee par
 * received/preparing/ready/served au prealable. Sans cette transition,
 * AUCUNE vente en caisse en ligne ne pouvait etre finalisee (400 systematique),
 * bloquant le decrement de stock et la comptabilisation. Coherent avec
 * orders.service.ts#sync (resync offline) qui traite deja implicitement une
 * commande entierement payee comme terminee sans exiger le flux de
 * preparation restaurant — c'est la meme regle metier (vente boutique/
 * comptoir), desormais vraie aussi pour le flux en ligne. Le flux restaurant
 * complet (received→preparing→ready→served) reste possible et utilise par
 * l'ecran cuisine pour qui en a besoin.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["received", "completed", "cancelled"],
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

  /**
   * initialStatus : "draft" par defaut (caisse authentifiee, POST /orders).
   * Le canal public (SCRUM-296, PublicService.createOrder) passe "received"
   * car une commande QR est directement transmise, jamais un brouillon
   * caisse. userId est nullable pour ce meme canal (pas d'utilisateur
   * authentifie derriere un scan client).
   */
  async create(
    input: CreateOrderDto,
    orgId: number,
    userId: number | null,
    initialStatus: OrderStatus = "draft",
  ) {
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
        orderStatus: initialStatus,
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
            // kitchenStatus initialise a "pending" (bug QA dev, KitchenService#getBoard
            // ne filtre que pending/preparing/ready) : sans ca, aucune ligne n'est
            // jamais eligible au board cuisine, quel que soit le canal (caisse, QR,
            // resync offline via sync() qui reutilise create()). Aucun flag produit
            // "necessite preparation" n'existe : toute ligne est eligible.
            kitchenStatus: "pending" as const,
          })),
        );
      }

      await tx.insert(ktOrderStatusHistory).values({
        organizationId: orgId,
        orderId,
        fromStatus: null,
        toStatus: initialStatus,
        userId: userId ?? undefined,
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

  /**
   * GET /orders/:id/receipt (SCRUM-306) : donnees structurees dediees a
   * l'impression du ticket client, separees de findOne() (qui sert l'ecran
   * detail back-office). Rendu (HTML/ESC-POS) explicitement hors backend —
   * uniquement des donnees ; le client (kodatill-app) construit la mise en
   * page @media print. receiptFooter vient de kt_business_profiles si
   * configure (peut etre null : pas d'auto-seed, meme regle que
   * BusinessProfileService.get()).
   */
  async getReceipt(id: number, orgId: number) {
    const order = await this.findOneInternal(this.db, id, orgId);

    const payments = await this.db
      .select({
        methodName: ktPaymentMethods.name,
        amount: ktPayments.amount,
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

    const [branch] = await this.db
      .select({ name: ktBranches.name, address: ktBranches.address })
      .from(ktBranches)
      .where(and(eq(ktBranches.id, order.branchId), eq(ktBranches.organizationId, orgId)))
      .limit(1);

    const [org] = await this.db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const [profile] = await this.db
      .select({ receiptFooter: ktBusinessProfiles.receiptFooter })
      .from(ktBusinessProfiles)
      .where(eq(ktBusinessProfiles.organizationId, orgId))
      .limit(1);

    return {
      orderNumber: order.orderNumber,
      publicRef: order.publicRef,
      createdAt: order.createdAt,
      branch: branch ? { name: branch.name, address: branch.address ?? undefined } : undefined,
      organization: { name: org?.name ?? "" },
      lines: order.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        note: l.note ?? undefined,
      })),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      serviceTotal: order.serviceTotal,
      total: order.total,
      currencyCode: order.currencyCode,
      payments: payments.map((p) => ({ methodName: p.methodName ?? "Paiement", amount: p.amount })),
      receiptFooter: profile?.receiptFooter ?? null,
    };
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
            // Voir commentaire equivalent dans create() : ligne ajoutee apres
            // la creation de la commande (updateLines), meme regle.
            kitchenStatus: "pending",
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

      // Garde metier (deja implicitement necessaire avant l'ouverture de
      // draft→completed, mais absente aussi sur served→completed) : une
      // commande ne peut etre marquee terminee que si elle est entierement
      // payee. Sans ce controle, draft→completed permettrait de cloturer une
      // vente jamais encaissee (le decrement de stock et l'ecriture
      // comptable partiraient sur une vente fictive).
      if (nextStatus === "completed" && Number(order.dueTotal) > 0.001) {
        throw new BadRequestException(
          `Impossible de terminer la commande : solde du de ${Number(order.dueTotal).toFixed(2)} ${order.currencyCode}.`,
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

  /**
   * Resynchronisation d'un batch de commandes creees hors-ligne (SCRUM-304).
   * Reutilise EXACTEMENT create/addPayment/updateStatus (aucune logique
   * dupliquee : meme idempotence via clientUuid, meme validation, meme calcul
   * de total, meme decrement de stock). Chaque commande a sa propre
   * transaction (via create/addPayment/updateStatus, qui ouvrent chacune la
   * leur) : une commande en erreur n'annule pas les autres du batch, seul son
   * resultat porte error.
   *
   * Stock : comportement optimiste deja en place depuis la Phase 2
   * (decrementStockForOrder n'echoue jamais la vente, voir son commentaire) —
   * s'applique de la meme facon ici aux ventes resynchronisees : le
   * decrement peut echouer silencieusement (stock insuffisant/perime pendant
   * la periode hors-ligne) sans jamais bloquer ni faire echouer la
   * resynchronisation de la vente elle-meme.
   *
   * Idempotence des paiements (fix SCRUM-304 bug 1) : `create` est deja
   * idempotent via clientUuid (contrainte unique en DB), mais addPayment ne
   * porte aucune cle d'idempotence — si un replay du meme lot se produit
   * (reponse HTTP perdue apres un sync reussi cote serveur, client qui remet
   * tout le lot pending), rejouer addPayment dupliquerait le paiement. On
   * choisit ici une idempotence "au niveau montant" plutot qu'un identifiant
   * dedie sur kt_payments (pas de migration necessaire) : avant d'ajouter les
   * paiements d'une commande, on verifie si son paidTotal courant couvre deja
   * le montant du lot envoye pour ce clientUuid — si oui, la commande est
   * consideree deja payee par un sync precedent et on saute l'ajout. Ce choix
   * est acceptable ici car le flux offline de KodaTill n'envoie qu'un seul
   * paiement especes par commande (voir PaymentPanel#confirm, mode offline) :
   * il n'y a pas de scenario legitime ou un meme clientUuid arriverait deux
   * fois avec des paiements differents mais un total identique par coincidence
   * suivi d'un vrai paiement complementaire attendu.
   */
  async sync(input: { orders: SyncOrderDto[] }, orgId: number, userId: number) {
    const results: Array<{
      clientUuid: string;
      orderId?: number;
      orderNumber?: number;
      publicRef?: string;
      error?: string;
    }> = [];

    for (const orderInput of input.orders) {
      try {
        const { payments, ...createInput } = orderInput;
        const order = await this.create(createInput, orgId, userId, "draft");

        const batchPaymentsTotal = this.round2(
          (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
        );
        const alreadyPaid = Number(order.paidTotal ?? 0);

        // Deja couvert par un sync precedent (replay du meme lot) : on ne
        // rejoue pas addPayment pour cette commande.
        const paymentsAlreadyApplied = batchPaymentsTotal > 0 && alreadyPaid >= batchPaymentsTotal - 0.001;

        if (!paymentsAlreadyApplied) {
          for (const payment of payments ?? []) {
            await this.addPayment(
              order.id,
              {
                methodId: payment.methodId,
                amount: payment.amount,
                currencyCode: payment.currencyCode,
              } as CreateOrderPaymentDto,
              orgId,
              userId,
            );
          }
        }

        // Meme comportement que la caisse en ligne (PaymentPanel) : une fois
        // entierement encaissee, la commande passe directement a "completed"
        // (vente boutique, pas de flux preparation restaurant).
        let finalOrder = order;
        if ((payments ?? []).length) {
          const currentStatus = (await this.findOneInternal(this.db, order.id, orgId)).orderStatus as OrderStatus;
          if (currentStatus === "completed") {
            // Deja au statut cible (replay apres un sync precedent reussi
            // cote serveur mais dont la reponse s'est perdue) : succes, pas
            // une erreur — ne PAS appeler updateStatus qui rejetterait cette
            // transition depuis un etat terminal. Comportement reserve a ce
            // contexte de resync ; POST /orders/:id/status (caisse en ligne)
            // continue de rejeter normalement les transitions invalides.
            finalOrder = await this.findOneInternal(this.db, order.id, orgId);
          } else {
            finalOrder = await this.updateStatus(order.id, "completed", orgId, userId);
          }
        }

        results.push({
          clientUuid: orderInput.clientUuid,
          orderId: finalOrder.id,
          orderNumber: finalOrder.orderNumber,
          publicRef: finalOrder.publicRef,
        });
      } catch (err: any) {
        this.logger.warn(
          `Echec resync commande offline (clientUuid=${orderInput.clientUuid}, org=${orgId}) : ${err?.message || err}`,
        );
        results.push({
          clientUuid: orderInput.clientUuid,
          error: err?.message || String(err),
        });
      }
    }

    return { results };
  }

  async addPayment(id: number, input: CreateOrderPaymentDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      // Verrou ligne (FOR UPDATE) : sans lui, deux paiements concurrents
      // (double-clic caissier, renvoi reseau/carte) liraient le meme
      // paidTotal et pourraient tous les deux passer la verification du
      // solde du ci-dessous, faisant depasser paidTotal au-dela du total.
      const rows = await tx
        .select()
        .from(ktOrders)
        .where(and(eq(ktOrders.id, id), eq(ktOrders.organizationId, orgId)))
        .for("update")
        .limit(1);
      if (!rows.length) throw new NotFoundException("Commande introuvable.");
      const order = rows[0];

      const dueBefore = this.round2(Number(order.total) - Number(order.paidTotal));
      if (input.amount > dueBefore + 0.001) {
        throw new BadRequestException(
          `Montant superieur au solde du : reste ${dueBefore.toFixed(2)} ${order.currencyCode}, recu ${input.amount.toFixed(2)} ${order.currencyCode}.`,
        );
      }

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
