// SCRUM — Lien portail locataire (accès public sans login, token opaque).
// Même pattern que TenantOnboarding : token en clair uniquement renvoyé à la
// génération, seul le hash SHA-256 est stocké. Scope strict au tenant_id
// rattaché au token — jamais de fuite inter-locataire ni inter-org.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  realEstateContracts,
  realEstateTenantChangeRequests,
  realEstateLeases,
  realEstateProperties,
  realEstateRentPayments,
  realEstateTenantPortalLinks,
  realEstateUnits,
  tenantDetails,
  roles,
} from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class TenantPortalService {
  private readonly logger = new Logger(TenantPortalService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Token court (12 caracteres base62, ~71 bits d'entropie) : l'URL complete
   * tient dans un SMS au lieu des 64 caracteres hex precedents. La resolution
   * publique se fait par hash SHA-256, donc les anciens tokens longs deja
   * envoyes aux locataires restent valides sans migration.
   */
  private newPortalToken() {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = randomBytes(12);
    let token = "";
    for (let i = 0; i < 12; i += 1) {
      token += alphabet[bytes[i] % alphabet.length];
    }
    return token;
  }

  private portalUrl(token: string) {
    return `${env.appUrl.replace(/\/$/, "")}/domus/mon-espace?token=${token}`;
  }

  private async findTenant(tenantId: number, orgId: number) {
    const rows = await this.db
      .select({
        id: customers.id,
        organizationId: customers.organizationId,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        status: customers.status,
      })
      .from(customers)
      .leftJoin(roles, eq(roles.id, customers.roleId))
      .where(and(
        eq(customers.id, tenantId),
        eq(customers.organizationId, orgId),
        eq(customers.status, "true"),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Tenant not found.");
    return rows[0];
  }

  /**
   * Crée (ou réutilise) le lien portail du locataire. Le token en clair est
   * stocké (en plus de son hash SHA-256, seul utilisé pour la résolution
   * publique) précisément pour pouvoir le retourner à l'identique tant qu'il
   * n'est pas révoqué : sans ça, chaque appel (génération manuelle, envoi de
   * bienvenue, rappel de retard automatique) invaliderait le lien précédemment
   * envoyé au locataire, cassant tout message déjà reçu.
   */
  async generateTenantPortalLink(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);

    const [existing] = await this.db
      .select({ token: realEstateTenantPortalLinks.token })
      .from(realEstateTenantPortalLinks)
      .where(and(
        eq(realEstateTenantPortalLinks.tenantId, tenantId),
        eq(realEstateTenantPortalLinks.organizationId, orgId),
        isNull(realEstateTenantPortalLinks.revokedAt),
      ))
      .orderBy(desc(realEstateTenantPortalLinks.id))
      .limit(1);

    if (existing?.token) {
      return { token: existing.token, url: this.portalUrl(existing.token) };
    }

    const token = this.newPortalToken();
    const tokenHash = this.hashToken(token);
    await this.db.insert(realEstateTenantPortalLinks).values({
      organizationId: orgId,
      tenantId,
      token,
      tokenHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { token, url: this.portalUrl(token) };
  }

  /**
   * Retourne le lien portail du locataire pour affichage permanent sur la
   * fiche : avant, seul le POST revelait l'URL, obligeant a cliquer sur
   * "Generer" pour simplement la relire. Les dossiers crees depuis ce
   * changement ont deja un lien, affiche directement. Les locataires anterieurs
   * (ou dont le lien a ete revoque) renvoient null : la fiche propose alors le
   * bouton "Generer le lien portail", qui passe par le POST.
   */
  async getTenantPortalLink(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);

    const [existing] = await this.db
      .select({ token: realEstateTenantPortalLinks.token })
      .from(realEstateTenantPortalLinks)
      .where(and(
        eq(realEstateTenantPortalLinks.tenantId, tenantId),
        eq(realEstateTenantPortalLinks.organizationId, orgId),
        isNull(realEstateTenantPortalLinks.revokedAt),
      ))
      .orderBy(desc(realEstateTenantPortalLinks.id))
      .limit(1);

    if (existing?.token) {
      return { token: existing.token, url: this.portalUrl(existing.token) };
    }
    // Aucun lien actif : la fiche affiche le bouton "Generer le lien portail",
    // qui cree le lien ET previent le locataire par SMS.
    return { token: null, url: null };
  }

  /**
   * URL du portail locataire pour alimenter le placeholder {url} d'un message
   * configurable, ou "" si le lien ne peut pas etre genere. Contrairement a
   * appendPortalFooterToSms, ne touche pas au texte : c'est le template qui
   * decide ou placer le lien.
   */
  async portalUrlForTenant(tenantId: number, orgId: number): Promise<string> {
    try {
      return (await this.generateTenantPortalLink(tenantId, orgId)).url;
    } catch (error) {
      this.logger.warn(
        `Portal url unavailable for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return "";
    }
  }

  /**
   * Ajoute une ligne finale avec le lien portail du locataire à un message SMS
   * (texte brut). Helper centralisé : à appeler depuis chaque point d'envoi qui
   * s'adresse au LOCATAIRE lui-même (jamais un contact d'urgence/signataire
   * externe). Best-effort : si la génération du lien échoue pour une raison
   * quelconque, retourne le message original inchangé plutôt que de bloquer
   * l'envoi d'une communication existante.
   */
  async appendPortalFooterToSms(message: string, tenantId: number, orgId: number): Promise<string> {
    try {
      const { url } = await this.generateTenantPortalLink(tenantId, orgId);
      return `${message} Cliquez ici pour voir votre dossier : ${url}`;
    } catch (error) {
      this.logger.warn(
        `Portal footer (SMS) skipped for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return message;
    }
  }

  /**
   * Même principe que appendPortalFooterToSms, mais ajoute un bloc HTML simple
   * avant la fermeture du message email (cohérent avec le style `<p>` déjà
   * utilisé dans rent-reminder.service.ts).
   */
  async appendPortalFooterToEmail(html: string, tenantId: number, orgId: number): Promise<string> {
    try {
      const { url } = await this.generateTenantPortalLink(tenantId, orgId);
      return `${html}<p>Vous pouvez vérifier vos informations et vos paiements ici : <a href="${url}">${url}</a></p>`;
    } catch (error) {
      this.logger.warn(
        `Portal footer (email) skipped for tenant ${tenantId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return html;
    }
  }

  // ── Cote gestionnaire : revue des demandes de modification ───────────────

  /** Demandes de modification, filtrables par statut (defaut : en attente). */
  async listChangeRequests(orgId: number, status = "pending") {
    const rows = await this.db
      .select({
        id: realEstateTenantChangeRequests.id,
        tenantId: realEstateTenantChangeRequests.tenantId,
        changes: realEstateTenantChangeRequests.changes,
        status: realEstateTenantChangeRequests.status,
        reviewNote: realEstateTenantChangeRequests.reviewNote,
        createdAt: realEstateTenantChangeRequests.createdAt,
        reviewedAt: realEstateTenantChangeRequests.reviewedAt,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
      })
      .from(realEstateTenantChangeRequests)
      .leftJoin(customers, eq(customers.id, realEstateTenantChangeRequests.tenantId))
      .where(and(
        eq(realEstateTenantChangeRequests.organizationId, orgId),
        ...(status && status !== "all" ? [eq(realEstateTenantChangeRequests.status, status)] : []),
      ))
      .orderBy(desc(realEstateTenantChangeRequests.id))
      .limit(200);

    return rows.map((r) => ({ ...r, changes: this.parseChanges(r.changes) }));
  }

  /**
   * Approuve une demande : c'est SEULEMENT ici que les donnees du locataire
   * sont reellement modifiees, une fois qu'un gestionnaire a valide. Les champs
   * sont re-filtres par la liste blanche au moment d'appliquer, pour qu'une
   * ligne alteree en base ne puisse pas ecrire une colonne arbitraire.
   */
  async approveChangeRequest(id: number, orgId: number, reviewerId?: number, note?: string) {
    const request = await this.findChangeRequest(id, orgId);
    if (request.status !== "pending") {
      throw new BadRequestException("Cette demande a deja ete traitee.");
    }

    const changes = this.parseChanges(request.changes);
    const customerSet: Record<string, unknown> = {};
    const detailSet: Record<string, unknown> = {};
    const CUSTOMER_FIELDS = ["firstName", "lastName", "email", "phone", "address"];

    for (const field of TenantPortalService.EDITABLE_FIELDS) {
      if (!(field in changes)) continue;
      const value = changes[field];
      if (CUSTOMER_FIELDS.includes(field)) customerSet[field] = value;
      else detailSet[field] = value;
    }

    if (Object.keys(customerSet).length) {
      await this.db
        .update(customers)
        .set({ ...customerSet, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(customers.id, request.tenantId), eq(customers.organizationId, orgId)));
    }
    if (Object.keys(detailSet).length) {
      await this.db
        .update(tenantDetails)
        .set({ ...detailSet, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(tenantDetails.customerId, request.tenantId));
    }

    await this.db
      .update(realEstateTenantChangeRequests)
      .set({
        status: "approved",
        reviewedBy: reviewerId ?? null,
        reviewedAt: new Date(),
        reviewNote: note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(realEstateTenantChangeRequests.id, id));

    return { approved: true, applied: { ...customerSet, ...detailSet } };
  }

  /** Refuse une demande : aucune donnee du dossier n'est modifiee. */
  async rejectChangeRequest(id: number, orgId: number, reviewerId?: number, note?: string) {
    const request = await this.findChangeRequest(id, orgId);
    if (request.status !== "pending") {
      throw new BadRequestException("Cette demande a deja ete traitee.");
    }
    await this.db
      .update(realEstateTenantChangeRequests)
      .set({
        status: "rejected",
        reviewedBy: reviewerId ?? null,
        reviewedAt: new Date(),
        reviewNote: note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(realEstateTenantChangeRequests.id, id));
    return { rejected: true };
  }

  private async findChangeRequest(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(realEstateTenantChangeRequests)
      .where(and(
        eq(realEstateTenantChangeRequests.id, id),
        eq(realEstateTenantChangeRequests.organizationId, orgId),
      ))
      .limit(1);
    if (!row) throw new NotFoundException("Demande introuvable.");
    return row;
  }

  /**
   * Retourne l'URL du justificatif d'UN paiement, apres avoir verifie que ce
   * paiement appartient bien a un bail du locataire porteur du token. Sans ce
   * controle, un token valide permettrait de lire le justificatif de n'importe
   * quel paiement de l'organisation en changeant l'id dans l'URL.
   */
  async getPublicPaymentProof(token: string, paymentId: number) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const [row] = await this.db
      .select({ proofUrl: realEstateRentPayments.proofUrl })
      .from(realEstateRentPayments)
      .innerJoin(realEstateLeases, eq(realEstateLeases.id, realEstateRentPayments.leaseId))
      .where(and(
        eq(realEstateRentPayments.id, paymentId),
        eq(realEstateRentPayments.organizationId, organizationId),
        eq(realEstateLeases.tenantId, tenantId),
      ))
      .limit(1);

    if (!row?.proofUrl) throw new NotFoundException("Justificatif introuvable.");
    return { url: row.proofUrl };
  }

  async revokeTenantPortalLink(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);
    await this.db
      .update(realEstateTenantPortalLinks)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(realEstateTenantPortalLinks.tenantId, tenantId),
        eq(realEstateTenantPortalLinks.organizationId, orgId),
        isNull(realEstateTenantPortalLinks.revokedAt),
      ));
    return { revoked: true };
  }

  /**
   * Résout le tenant à partir du token public. Ne distingue jamais "token
   * invalide" de "tenant introuvable" côté message d'erreur (anti-énumération).
   */
  private async resolveTenantIdByToken(token: string): Promise<{ tenantId: number; organizationId: number }> {
    const [link] = await this.db
      .select({
        tenantId: realEstateTenantPortalLinks.tenantId,
        organizationId: realEstateTenantPortalLinks.organizationId,
        expiresAt: realEstateTenantPortalLinks.expiresAt,
        revokedAt: realEstateTenantPortalLinks.revokedAt,
      })
      .from(realEstateTenantPortalLinks)
      .where(eq(realEstateTenantPortalLinks.tokenHash, this.hashToken(token)))
      .limit(1);

    if (!link || link.revokedAt) {
      throw new NotFoundException("Lien invalide ou expiré.");
    }
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      throw new NotFoundException("Lien invalide ou expiré.");
    }
    return { tenantId: link.tenantId, organizationId: link.organizationId };
  }

  async getPublicTenantPortal(token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const [tenant] = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        entityName: tenantDetails.entityName,
      })
      .from(customers)
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
      .where(and(
        eq(customers.id, tenantId),
        eq(customers.organizationId, organizationId),
        eq(customers.status, "true"),
      ))
      .limit(1);
    if (!tenant) throw new NotFoundException("Lien invalide ou expiré.");

    // Strictement scopé à ce tenant_id : jamais les baux/paiements d'un autre
    // locataire, même de la même organisation.
    // Seul le bail EN COURS est exposé (status 'active') : un locataire dont le
    // bail est terminé/annulé ne voit ni loyers ni paiements, juste ses
    // informations personnelles. Sans bail actif, `leases` et `payments` sont
    // vides et le portail n'affiche que le formulaire de mise à jour.
    const leases = await this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        propertyId: realEstateLeases.propertyId,
        unitId: realEstateLeases.unitId,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        billingCycle: realEstateLeases.billingCycle,
        rentAmount: realEstateLeases.rentAmount,
        currencyId: realEstateLeases.currencyId,
        status: realEstateLeases.status,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        unitName: realEstateUnits.name,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateLeases)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(and(
        eq(realEstateLeases.tenantId, tenantId),
        eq(realEstateLeases.organizationId, organizationId),
        eq(realEstateLeases.status, "active"),
      ))
      .orderBy(desc(realEstateLeases.id))
      .limit(1);

    const leaseIds = leases.map((l) => l.id);
    const payments = leaseIds.length
      ? await this.db
          .select({
            id: realEstateRentPayments.id,
            leaseId: realEstateRentPayments.leaseId,
            paymentDate: realEstateRentPayments.paymentDate,
            amount: realEstateRentPayments.amount,
            method: realEstateRentPayments.method,
            reference: realEstateRentPayments.reference,
            currencyId: realEstateRentPayments.currencyId,
            // status distingue un paiement reellement encaisse ('paid') d'une
            // echeance a venir generee mais non reglee ('pending').
            status: realEstateRentPayments.status,
            // Presence d'un justificatif : l'URL brute n'est jamais exposee au
            // public, le telechargement passe par l'endpoint token (voir
            // getPublicPaymentProof).
            hasProof: sql<boolean>`${realEstateRentPayments.proofUrl} IS NOT NULL AND ${realEstateRentPayments.proofUrl} <> ''`,
            currencyCode: currencies.currencyCode,
            currencySymbol: currencies.currencySymbol,
          })
          .from(realEstateRentPayments)
          .leftJoin(currencies, eq(currencies.id, realEstateRentPayments.currencyId))
          .where(and(
            eq(realEstateRentPayments.organizationId, organizationId),
            inArray(realEstateRentPayments.leaseId, leaseIds),
          ))
          .orderBy(desc(realEstateRentPayments.paymentDate))
      : [];

    // Contrats consultables par le locataire : uniquement ceux rattaches a SES
    // baux, et seulement une fois signes (un brouillon en cours de redaction
    // par le gestionnaire n'a pas a etre visible).
    const contracts = leaseIds.length
      ? await this.db
          .select({
            id: realEstateContracts.id,
            leaseId: realEstateContracts.leaseId,
            status: realEstateContracts.status,
            signedAt: realEstateContracts.signedAt,
          })
          .from(realEstateContracts)
          .where(and(
            inArray(realEstateContracts.leaseId, leaseIds),
            inArray(realEstateContracts.status, ["signed", "active", "completed"]),
          ))
          .orderBy(desc(realEstateContracts.id))
      : [];

    // Demandes de modification deja soumises, pour que le locataire voie l'etat
    // de sa demande (en attente / acceptee / refusee) au lieu de la resoumettre.
    const changeRequests = await this.db
      .select({
        id: realEstateTenantChangeRequests.id,
        changes: realEstateTenantChangeRequests.changes,
        status: realEstateTenantChangeRequests.status,
        reviewNote: realEstateTenantChangeRequests.reviewNote,
        createdAt: realEstateTenantChangeRequests.createdAt,
        reviewedAt: realEstateTenantChangeRequests.reviewedAt,
      })
      .from(realEstateTenantChangeRequests)
      .where(and(
        eq(realEstateTenantChangeRequests.tenantId, tenantId),
        eq(realEstateTenantChangeRequests.organizationId, organizationId),
      ))
      .orderBy(desc(realEstateTenantChangeRequests.id))
      .limit(10);

    return {
      tenant: {
        id: tenant.id,
        firstName: tenant.firstName,
        lastName: tenant.lastName,
        email: tenant.email,
        phone: tenant.phone,
        address: tenant.address,
        entityName: tenant.entityName,
      },
      leases,
      // payments contient a la fois les loyers regles (status 'paid') et les
      // echeances a venir / en retard (status 'pending'), que le front separe.
      // La caution n'y figure pas : elle vit dans real_estate_security_deposits
      // et n'est pas un loyer.
      payments,
      contracts,
      changeRequests: changeRequests.map((r) => ({
        ...r,
        changes: this.parseChanges(r.changes),
      })),
    };
  }

  // Champs que le locataire est autorise a demander en modification. Liste
  // blanche stricte : tout autre champ envoye par le client est ignore, pour
  // qu'une demande ne puisse jamais toucher au loyer, au statut ou au role.
  private static readonly EDITABLE_FIELDS = [
    "firstName", "lastName", "email", "phone", "address",
    "phone2", "maritalStatus", "contactedPerson", "contactedPersonPhoneNumber",
    "professionalStatus", "mainActivity", "entityName", "entityAddress",
  ] as const;

  private parseChanges(raw: string | null): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  /**
   * Enregistre une demande de modification des donnees personnelles soumise
   * depuis le portail public. N'ecrit RIEN sur le dossier : la demande reste
   * 'pending' jusqu'a l'approbation d'un gestionnaire (approveChangeRequest).
   * Le lien portail n'etant protege par aucun mot de passe, appliquer la
   * modification directement permettrait a quiconque le detient de detourner
   * le telephone ou l'email du dossier.
   */
  async submitChangeRequest(token: string, body: Record<string, unknown>) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const changes: Record<string, string> = {};
    for (const field of TenantPortalService.EDITABLE_FIELDS) {
      const value = body?.[field];
      if (value === undefined || value === null) continue;
      const str = String(value).trim();
      if (str.length > 255) {
        throw new BadRequestException(`Valeur trop longue pour le champ ${field}.`);
      }
      changes[field] = str;
    }
    if (!Object.keys(changes).length) {
      throw new BadRequestException("Aucune modification a soumettre.");
    }

    // Une seule demande en attente a la fois : evite qu'un formulaire renvoye
    // plusieurs fois noie le gestionnaire sous des doublons.
    const [pending] = await this.db
      .select({ id: realEstateTenantChangeRequests.id })
      .from(realEstateTenantChangeRequests)
      .where(and(
        eq(realEstateTenantChangeRequests.tenantId, tenantId),
        eq(realEstateTenantChangeRequests.organizationId, organizationId),
        eq(realEstateTenantChangeRequests.status, "pending"),
      ))
      .limit(1);

    if (pending) {
      await this.db
        .update(realEstateTenantChangeRequests)
        .set({ changes: JSON.stringify(changes), updatedAt: new Date() })
        .where(eq(realEstateTenantChangeRequests.id, pending.id));
      return { submitted: true, requestId: pending.id, updated: true };
    }

    const [result] = await this.db.insert(realEstateTenantChangeRequests).values({
      organizationId,
      tenantId,
      changes: JSON.stringify(changes),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { submitted: true, requestId: Number(result.insertId), updated: false };
  }
}
