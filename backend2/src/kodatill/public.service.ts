import { createHash } from "crypto";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  ktBranches,
  ktCategories,
  ktModifierGroups,
  ktModifiers,
  ktOrderLines,
  ktOrders,
  ktProductModifierGroups,
  ktProducts,
  ktProductVariants,
  ktQrCodes,
  ktQrScans,
  organizations,
} from "../database/schema";
import type { Database } from "../database/types";
import { CreatePublicOrderDto } from "./dto/public.dto";
import { OrdersService } from "./orders.service";

// SCRUM-296 (KodaTill Phase 3) : surface publique consultee sans JWT par le
// client final apres scan d'un QR code de table. L'autorisation vient
// entierement de la resolution orgSlug + publicToken (jamais de CurrentOrg
// derive du JWT, qui n'existe pas ici). Voir aussi qr-codes.service.ts pour
// la generation du token et middleware/src/whitelist.js pour l'exposition
// publique de /kodatill/public.
@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly orders: OrdersService,
  ) {}

  /**
   * Resout organisation (par slug) + QR code (par publicToken) en une seule
   * paire coherente. 404 volontairement generique dans les deux cas (org
   * inconnue OU token invalide OU token n'appartenant pas a cette org) pour
   * ne jamais reveler lequel des deux identifiants est en cause (evite
   * l'enumeration de slugs d'organisation ou de tokens partiels).
   */
  private async resolveOrgAndQrCode(orgSlug: string, qrToken: string) {
    const orgRows = await this.db
      .select({ id: organizations.id, name: organizations.name, status: organizations.status })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    const genericError = new NotFoundException("Lien invalide ou expire.");
    if (!orgRows.length || orgRows[0].status !== "active") throw genericError;
    const org = orgRows[0];

    const qrRows = await this.db
      .select()
      .from(ktQrCodes)
      .where(
        and(
          eq(ktQrCodes.publicToken, qrToken),
          eq(ktQrCodes.organizationId, org.id),
          eq(ktQrCodes.status, "true"),
        ),
      )
      .limit(1);
    if (!qrRows.length) throw genericError;

    return { org, qrCode: qrRows[0] };
  }

  /**
   * GET /kodatill/public/menu/:orgSlug/:qrToken — menu consultable sans compte.
   * Trace le scan (compteur denormalise + ligne kt_qr_scans, sans IP ni UA en
   * clair — seulement un hash pour deduplication eventuelle).
   */
  async getMenu(orgSlug: string, qrToken: string, userAgent: string | undefined) {
    const { org, qrCode } = await this.resolveOrgAndQrCode(orgSlug, qrToken);

    const branchRows = await this.db
      .select()
      .from(ktBranches)
      .where(and(eq(ktBranches.id, qrCode.branchId), eq(ktBranches.status, "true")))
      .limit(1);
    if (!branchRows.length) throw new NotFoundException("Lien invalide ou expire.");

    await this.recordScan(qrCode.id, org.id, userAgent);

    const categories = await this.db
      .select()
      .from(ktCategories)
      .where(and(eq(ktCategories.organizationId, org.id), eq(ktCategories.status, "true")))
      .orderBy(asc(ktCategories.sortOrder), asc(ktCategories.id));

    const products = await this.db
      .select()
      .from(ktProducts)
      .where(
        and(
          eq(ktProducts.organizationId, org.id),
          eq(ktProducts.status, "true"),
          eq(ktProducts.isAvailable, 1),
        ),
      )
      .orderBy(asc(ktProducts.id));

    return {
      branch: { id: branchRows[0].id, name: branchRows[0].name, address: branchRows[0].address },
      qrCode: { id: qrCode.id, label: qrCode.label, type: qrCode.type },
      organizationName: org.name,
      categories,
      products,
    };
  }

  /**
   * Compteur denormalise (kt_qr_codes.scanCount/lastScanAt) + ligne d'audit
   * kt_qr_scans. Best-effort : une erreur ici ne doit jamais empecher
   * l'affichage du menu, donc on logge et on avale l'exception.
   */
  private async recordScan(qrCodeId: number, orgId: number, userAgent: string | undefined) {
    try {
      const userAgentHash = userAgent
        ? createHash("sha256").update(userAgent).digest("hex")
        : null;
      const now = new Date();

      // Increment atomique (scan_count = scan_count + 1) : SQL brut requis,
      // Drizzle .set() n'accepte pas d'expression referant la colonne elle-meme
      // via un objet litteral (meme pattern que le decrement stock d'OrdersService).
      await this.db.execute(sql`
        UPDATE kt_qr_codes
        SET scan_count = scan_count + 1, last_scan_at = ${now}
        WHERE id = ${qrCodeId}
      `);

      await this.db.insert(ktQrScans).values({
        organizationId: orgId,
        qrCodeId,
        scannedAt: now,
        userAgentHash,
      });
    } catch (err) {
      this.logger.warn(`Echec enregistrement du scan QR ${qrCodeId} : ${(err as Error).message}`);
    }
  }

  /**
   * Resout le prix serveur d'une ligne (jamais confiance dans un prix fourni
   * par le client) : salePrice du produit + priceDelta de la variante +
   * somme des priceDelta des modificateurs choisis. Meme formule que
   * screens.jsx (client CaisseScreen), gardee ici cote serveur comme source
   * de verite pour le canal public.
   *
   * SCRUM-296 (durcissement) : sur ce canal anonyme, chaque identifiant reçu
   * est traite comme hostile. Trois garde-fous :
   *  1. Un modifierId n'est accepte que s'il appartient a un groupe
   *     effectivement associe a CE produit via kt_product_modifier_groups
   *     (meme chainage que VariantsService.getSaleOptions). Sans cela, un
   *     modificateur "remise" d'un autre produit de la meme organisation
   *     pouvait etre applique a n'importe quel article.
   *  2. Les regles minSelect/maxSelect de chaque groupe associe sont
   *     verifiees (un groupe obligatoire ne peut etre esquive, un groupe
   *     mono-choix ne peut etre cumule).
   *  3. Le prix unitaire final ne peut pas etre negatif. On rejette au lieu
   *     de plafonner a 0 : un total negatif comme un article offert non voulu
   *     traduisent soit une attaque, soit une erreur de configuration du
   *     catalogue — les deux meritent d'etre signales, pas absorbes en
   *     silence.
   */
  private async resolveLinePrice(
    productId: number,
    variantId: number | undefined,
    modifierIds: number[] | undefined,
    orgId: number,
  ): Promise<{ name: string; unitPrice: number; currencyCode: string }> {
    const productRows = await this.db
      .select()
      .from(ktProducts)
      .where(
        and(
          eq(ktProducts.id, productId),
          eq(ktProducts.organizationId, orgId),
          eq(ktProducts.status, "true"),
          eq(ktProducts.isAvailable, 1),
        ),
      )
      .limit(1);
    if (!productRows.length) throw new NotFoundException(`Produit ${productId} indisponible.`);
    const product = productRows[0];

    let unitPrice = Number(product.salePrice);
    let namePart = product.name;

    if (variantId !== undefined) {
      const variantRows = await this.db
        .select()
        .from(ktProductVariants)
        .where(
          and(
            eq(ktProductVariants.id, variantId),
            eq(ktProductVariants.productId, productId),
            eq(ktProductVariants.organizationId, orgId),
            eq(ktProductVariants.status, "true"),
          ),
        )
        .limit(1);
      if (!variantRows.length) throw new NotFoundException(`Variante ${variantId} introuvable.`);
      unitPrice += Number(variantRows[0].priceDelta);
      namePart += ` — ${variantRows[0].name}`;
    }

    // Groupes de modificateurs REELLEMENT associes a ce produit : c'est le
    // seul perimetre dans lequel un modifierId envoye par le client est
    // recevable. Charge meme si aucun modifierId n'est fourni, car il faut
    // pouvoir detecter un groupe obligatoire (minSelect > 0) laisse vide.
    const groupLinks = await this.db
      .select({ groupId: ktProductModifierGroups.groupId })
      .from(ktProductModifierGroups)
      .where(eq(ktProductModifierGroups.productId, productId));

    const allowedGroups = groupLinks.length
      ? await this.db
          .select()
          .from(ktModifierGroups)
          .where(
            and(
              inArray(
                ktModifierGroups.id,
                groupLinks.map((g) => g.groupId),
              ),
              eq(ktModifierGroups.organizationId, orgId),
              eq(ktModifierGroups.status, "true"),
            ),
          )
      : [];

    // Modificateurs actifs de ces groupes uniquement : tout id hors de cet
    // ensemble est rejete, jamais ignore silencieusement.
    const allowedModifiers = allowedGroups.length
      ? await this.db
          .select()
          .from(ktModifiers)
          .where(
            and(
              inArray(
                ktModifiers.groupId,
                allowedGroups.map((g) => g.id),
              ),
              eq(ktModifiers.organizationId, orgId),
              eq(ktModifiers.status, "true"),
            ),
          )
      : [];

    const requestedIds = [...new Set(modifierIds ?? [])];
    const selected = requestedIds.map((id) => {
      const modifier = allowedModifiers.find((m) => m.id === id);
      if (!modifier) {
        throw new BadRequestException(
          `Le modificateur ${id} n'est pas propose pour le produit ${productId}.`,
        );
      }
      return modifier;
    });

    // Cardinalite par groupe (minSelect/maxSelect) sur l'ensemble des groupes
    // associes au produit, y compris ceux dont aucun modificateur n'a ete
    // envoye (cas du groupe obligatoire esquive).
    for (const group of allowedGroups) {
      const count = selected.filter((m) => m.groupId === group.id).length;
      if (count < group.minSelect) {
        throw new BadRequestException(
          `Le groupe "${group.name}" exige au moins ${group.minSelect} choix (${count} recu(s)).`,
        );
      }
      if (count > group.maxSelect) {
        throw new BadRequestException(
          `Le groupe "${group.name}" autorise au plus ${group.maxSelect} choix (${count} recu(s)).`,
        );
      }
    }

    if (selected.length) {
      unitPrice += selected.reduce((sum, m) => sum + Number(m.priceDelta), 0);
      namePart += ` (${selected.map((m) => m.name).join(", ")})`;
    }

    // Plancher de securite : un prix unitaire negatif ferait baisser le total
    // de la commande. On refuse plutot que de plafonner a 0 (cf. doc ci-dessus).
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new BadRequestException(
        `Prix unitaire invalide pour le produit ${productId}.`,
      );
    }

    return { name: namePart, unitPrice, currencyCode: product.currencyCode };
  }

  /**
   * POST /kodatill/public/orders — resout le QR, calcule les prix cote
   * serveur, puis delegue la creation a OrdersService.create (memes regles
   * d'idempotence clientUuid, meme machine a etats) pour ne pas dupliquer la
   * logique de calcul de total. channel='qr' force, orderStatus force a
   * 'received' (une commande QR est directement transmise, pas un brouillon).
   */
  async createOrder(input: CreatePublicOrderDto, userAgent: string | undefined) {
    // qrToken seul suffit a resoudre l'organisation (token unique globalement),
    // pas besoin d'orgSlug ici — coherent avec generateImage() qui encode
    // orgSlug dans l'URL mais dont l'unicite d'autorisation repose sur le token.
    const qrRows = await this.db
      .select()
      .from(ktQrCodes)
      .where(and(eq(ktQrCodes.publicToken, input.qrToken), eq(ktQrCodes.status, "true")))
      .limit(1);
    if (!qrRows.length) throw new NotFoundException("Lien invalide ou expire.");
    const qrCode = qrRows[0];
    const orgId = qrCode.organizationId;

    const resolvedLines = await Promise.all(
      input.lines.map(async (l) => {
        const { name, unitPrice, currencyCode } = await this.resolveLinePrice(
          l.productId,
          l.variantId,
          l.modifierIds,
          orgId,
        );
        return {
          productId: l.productId,
          variantId: l.variantId,
          name,
          qty: l.qty,
          unitPrice,
          currencyCode,
        };
      }),
    );

    const currencyCode = resolvedLines[0]?.currencyCode ?? "USD";

    const order = await this.orders.create(
      {
        branchId: qrCode.branchId,
        channel: "qr",
        tableId: qrCode.id,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        currencyCode,
        clientUuid: input.clientUuid,
        lines: resolvedLines,
      },
      orgId,
      // Pas d'utilisateur authentifie sur ce canal (scan client, sans compte) :
      // openedByUserId reste null. "received" force (pas "draft") car une
      // commande QR est directement transmise a la cuisine/caisse.
      null,
      "received",
    );

    return {
      orderId: order.id,
      publicRef: order.publicRef,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * GET /kodatill/public/orders/:publicRef — suivi client, sans exposer les
   * commandes d'autrui (recherche par publicRef opaque, jamais par id
   * sequentiel). Pas de payments/statusHistory ici (donnees internes).
   */
  async getOrderByPublicRef(publicRef: string) {
    const rows = await this.db
      .select()
      .from(ktOrders)
      .where(and(eq(ktOrders.publicRef, publicRef), eq(ktOrders.status, "true")))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Commande introuvable.");
    const order = rows[0];

    const lines = await this.db
      .select({
        id: ktOrderLines.id,
        name: ktOrderLines.name,
        qty: ktOrderLines.qty,
        unitPrice: ktOrderLines.unitPrice,
        lineTotal: ktOrderLines.lineTotal,
        currencyCode: ktOrderLines.currencyCode,
      })
      .from(ktOrderLines)
      .where(and(eq(ktOrderLines.orderId, order.id), eq(ktOrderLines.status, "true")))
      .orderBy(asc(ktOrderLines.id));

    return {
      publicRef: order.publicRef,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      total: order.total,
      currencyCode: order.currencyCode,
      createdAt: order.createdAt,
      lines,
    };
  }
}
