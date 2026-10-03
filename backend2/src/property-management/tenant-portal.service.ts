// SCRUM — Lien portail locataire (accès public sans login, token opaque).
// Même pattern que TenantOnboarding : token en clair uniquement renvoyé à la
// génération, seul le hash SHA-256 est stocké. Scope strict au tenant_id
// rattaché au token — jamais de fuite inter-locataire ni inter-org.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { IMAGE_OR_PDF_MIME_TYPES } from "../common/upload-security";
import { readStoredDocument } from "../common/stored-document";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  realEstateContracts,
  realEstateTenantChangeRequests,
  realEstateLeaseDocuments,
  realEstateLeases,
  realEstateOwners,
  realEstateProperties,
  realEstateRentPayments,
  realEstateTenantPortalLinks,
  realEstateUnits,
  tenantDetails,
  roles,
} from "../database/schema";
import type { Database } from "../database/types";
import { ObjectStorageService } from "./object-storage.service";

@Injectable()
export class TenantPortalService {
  private readonly logger = new Logger(TenantPortalService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly objectStorage: ObjectStorageService,
  ) {}

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

  private portalUrl(token: string, leaseId?: number) {
    const base = `${env.appUrl.replace(/\/$/, "")}/domus/mon-espace?token=${token}`;
    // leaseId optionnel : simple parametre de query (pas de colonne DB), pour
    // pre-selectionner le bon onglet quand un locataire a plusieurs baux actifs
    // (ex: QR code du carnet de quittances genere pour un bail precis).
    return leaseId ? `${base}&lease=${leaseId}` : base;
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
  async generateTenantPortalLink(tenantId: number, orgId: number, leaseId?: number) {
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
      return { token: existing.token, url: this.portalUrl(existing.token, leaseId) };
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

    return { token, url: this.portalUrl(token, leaseId) };
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
  async portalUrlForTenant(tenantId: number, orgId: number, leaseId?: number): Promise<string> {
    try {
      return (await this.generateTenantPortalLink(tenantId, orgId, leaseId)).url;
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
   * Preuve de paiement envoyee par le locataire lui-meme, depuis le portail
   * public (token opaque, pas de JWT). Stockee sur MinIO (objectKey), seul
   * stockage persistant entre deploiements : le disque local du conteneur
   * backend2 n'a pas de volume et est recree a chaque deploiement.
   * Scope strict : le paiement doit appartenir a un bail du locataire porteur
   * du token, sinon un id change dans la requete permettrait d'ecraser le
   * justificatif de n'importe quel paiement de l'organisation.
   * N'ecrase jamais un justificatif deja present — un justificatif valide par
   * le gestionnaire ne doit pas pouvoir etre remplace silencieusement par un
   * nouvel envoi du locataire.
   */
  async submitPaymentProof(token: string, paymentId: number, file: any) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    if (!file?.buffer) throw new BadRequestException("Fichier requis.");
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const [payment] = await this.db
      .select({
        id: realEstateRentPayments.id,
        proofUrl: realEstateRentPayments.proofUrl,
        status: realEstateRentPayments.status,
        proofUploadCount: realEstateRentPayments.proofUploadCount,
      })
      .from(realEstateRentPayments)
      .innerJoin(realEstateLeases, eq(realEstateLeases.id, realEstateRentPayments.leaseId))
      .where(and(
        eq(realEstateRentPayments.id, paymentId),
        eq(realEstateRentPayments.organizationId, organizationId),
        eq(realEstateLeases.tenantId, tenantId),
      ))
      .limit(1);
    if (!payment) throw new NotFoundException("Paiement introuvable.");
    // Le QR individuel est imprime sur la quittance papier : n'importe qui en
    // possession du papier peut scanner et envoyer la photo, pas seulement le
    // locataire. Plafond a 2 envois (droit a l'erreur : mauvais angle, flou) —
    // le 2e REMPLACE le 1er (meme fichier ecrase), un 3e est refuse.
    if ((payment.proofUploadCount ?? 0) >= 2) {
      throw new BadRequestException("Nombre maximum d'envois atteint pour cette quittance.");
    }

    const { objectKey } = await this.objectStorage.putDocument(file, `domus/payments/${organizationId}/proofs`);
    // Ne stocke plus de nom de fichier local (perdu a chaque redeploiement,
    // voir upload-security.ts) : la cle objet MinIO est resolue derriere
    // getPublicPaymentProof apres verification d'appartenance au token.
    const proofUrl = objectKey;

    await this.db
      .update(realEstateRentPayments)
      .set({ proofUrl, proofUploadCount: (payment.proofUploadCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(realEstateRentPayments.id, paymentId));

    return { submitted: true, paymentId };
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
    return readStoredDocument(this.objectStorage, row.proofUrl);
  }

  /**
   * Resume minimal d'UN paiement (mois, montant, statut, preuve deja envoyee
   * ou non) pour la page dediee /domus/quittance (QR individuel par quittance
   * du carnet) : contrairement a getPublicTenantPortal, n'expose jamais le
   * dossier complet du locataire ni ses autres echeances, uniquement CE
   * paiement precis. Meme controle d'appartenance que submitPaymentProof.
   */
  async getPublicPaymentSummary(token: string, paymentId: number) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const [row] = await this.db
      .select({
        id: realEstateRentPayments.id,
        paymentDate: realEstateRentPayments.paymentDate,
        amount: realEstateRentPayments.amount,
        status: realEstateRentPayments.status,
        hasProof: sql<number>`(${realEstateRentPayments.proofUrl} is not null)`,
        proofUploadCount: realEstateRentPayments.proofUploadCount,
        currencySymbol: currencies.currencySymbol,
        propertyName: realEstateProperties.name,
        unitName: realEstateUnits.name,
      })
      .from(realEstateRentPayments)
      .innerJoin(realEstateLeases, eq(realEstateLeases.id, realEstateRentPayments.leaseId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(and(
        eq(realEstateRentPayments.id, paymentId),
        eq(realEstateRentPayments.organizationId, organizationId),
        eq(realEstateLeases.tenantId, tenantId),
      ))
      .limit(1);

    if (!row) throw new NotFoundException("Quittance introuvable.");
    // canResend : la page /domus/quittance autorise un 2e envoi (droit a
    // l'erreur, le QR etant sur papier accessible a quiconque le detient) tant
    // que le plafond de submitPaymentProof (2) n'est pas atteint.
    return { ...row, hasProof: Boolean(row.hasProof), canResend: (row.proofUploadCount ?? 0) < 2 };
  }

  // ── Copie du bail exposee au locataire ──
  // Une seule copie est servie, par ordre de priorite : le scan du bail papier
  // s'il existe, sinon le bail signe electroniquement (contract_content rendu
  // en HTML imprimable). Le front n'affiche donc qu'un seul bouton.
  // Scope strict : innerJoin sur le bail + tenant_id du token, pour qu'un
  // locataire ne puisse jamais lire le bail d'un autre en changeant l'id.
  private async findPublicContract(token: string, contractId: number) {
    const { tenantId, organizationId } = await this.resolveTenantIdByToken(token);

    const [row] = await this.db
      .select({
        id: realEstateContracts.id,
        status: realEstateContracts.status,
        signedAt: realEstateContracts.signedAt,
        contractContent: realEstateContracts.contractContent,
        signedDocumentId: realEstateContracts.signedDocumentId,
        tenantName: realEstateContracts.tenantName,
        leaseReference: realEstateLeases.reference,
        propertyName: realEstateProperties.name,
        unitName: realEstateUnits.name,
      })
      .from(realEstateContracts)
      .innerJoin(realEstateLeases, eq(realEstateLeases.id, realEstateContracts.leaseId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .where(and(
        eq(realEstateContracts.id, contractId),
        eq(realEstateContracts.organizationId, organizationId),
        eq(realEstateLeases.tenantId, tenantId),
        // Meme perimetre que getPublicTenantPortal, qui n'expose que le bail en
        // cours : sans ce filtre l'endpoint servirait aussi les contrats d'un
        // bail termine, que le portail n'affiche pourtant pas.
        eq(realEstateLeases.status, "active"),
        // Un brouillon en cours de redaction par le gestionnaire n'est jamais
        // telechargeable : meme liste blanche que getPublicTenantPortal.
        inArray(realEstateContracts.status, ["signed", "active", "completed"]),
      ))
      .limit(1);

    if (!row) throw new NotFoundException("Bail introuvable.");
    return { ...row, organizationId };
  }

  // Scan du bail papier : streame le fichier depuis le stockage objet. L'objectKey
  // n'est jamais expose au public, seul le flux passe par cet endpoint token.
  async getPublicContractScan(token: string, contractId: number) {
    const contract = await this.findPublicContract(token, contractId);
    if (!contract.signedDocumentId) throw new NotFoundException("Aucun scan disponible pour ce bail.");

    const [doc] = await this.db
      .select({
        id: realEstateLeaseDocuments.id,
        objectKey: realEstateLeaseDocuments.objectKey,
        originalName: realEstateLeaseDocuments.originalName,
        mimeType: realEstateLeaseDocuments.mimeType,
      })
      .from(realEstateLeaseDocuments)
      .where(and(
        eq(realEstateLeaseDocuments.id, contract.signedDocumentId),
        eq(realEstateLeaseDocuments.organizationId, contract.organizationId),
        eq(realEstateLeaseDocuments.isActive, 1),
      ))
      .limit(1);
    if (!doc) throw new NotFoundException("Aucun scan disponible pour ce bail.");

    const object = await this.objectStorage.getObject(doc.objectKey);
    return {
      ...object,
      mimeType: doc.mimeType,
      originalName: doc.originalName || `bail-${contract.id}`,
    };
  }

  // Bail signe electroniquement : pas de PDF serveur (meme choix que HR/FarmOS,
  // pas de Puppeteer a deployer). On renvoie le contenu en HTML imprimable et le
  // navigateur produit le PDF via Imprimer / Enregistrer en PDF.
  async getPublicContractPrintable(token: string, contractId: number) {
    const contract = await this.findPublicContract(token, contractId);
    if (!contract.contractContent?.trim()) {
      throw new NotFoundException("Aucune copie electronique disponible pour ce bail.");
    }
    return this.contractPrintableHtml(contract);
  }

  private esc(v: any): string {
    return String(v ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));
  }

  private contractPrintableHtml(contract: {
    id: number;
    signedAt: Date | null;
    contractContent: string | null;
    tenantName: string | null;
    leaseReference: string | null;
    propertyName: string | null;
    unitName: string | null;
  }) {
    const fmtDate = (d: Date | null) => (d
      ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
      : null);
    const signedLabel = fmtDate(contract.signedAt);
    const location = [contract.propertyName, contract.unitName].filter(Boolean).join(" · ");
    const title = `Bail ${contract.leaseReference || `#${contract.id}`}`;

    // contractContent est du HTML produit par nos templates (cote gestionnaire,
    // authentifie). On le rend tel quel mais sans jamais laisser passer de
    // script/iframe/handler inline, pour qu'un template mal saisi ne devienne
    // pas une execution de code dans le navigateur du locataire.
    const safeContent = String(contract.contractContent ?? "")
      .replace(/<\s*(script|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
      .replace(/<\s*(script|iframe|object|embed)\b[^>]*>/gi, "")
      .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "");

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px;max-width:820px;margin:0 auto}
@media print{body{padding:20px 24px}@page{margin:1cm}.no-print{display:none}}
.header{border-bottom:2px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
.header h1{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.header .meta{font-size:11px;color:#666;margin-top:4px}
.badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:#10b981;margin-top:6px}
.content{line-height:1.6}
.content h1,.content h2,.content h3{margin:16px 0 8px;font-size:14px}
.content p{margin:8px 0}
.content table{width:100%;border-collapse:collapse;margin:12px 0}
.content td,.content th{border:1px solid #ddd;padding:6px 8px;text-align:left}
.content img{max-width:220px;height:auto}
.no-print{margin-bottom:20px}
.no-print button{padding:9px 16px;font-size:13px;font-weight:600;color:#fff;background:#6366f1;border:0;border-radius:8px;cursor:pointer}
</style></head><body>
<div class="no-print"><button onclick="window.print()">Telecharger / Imprimer en PDF</button></div>
<div class="header">
  <h1>${this.esc(title)}</h1>
  <div class="meta">${this.esc([contract.tenantName, location].filter(Boolean).join(" · "))}</div>
  ${signedLabel ? `<div class="badge">Signe electroniquement le ${this.esc(signedLabel)}</div>` : ""}
</div>
<div class="content">${safeContent}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`;
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
        // Nom du bailleur affiche au locataire sur sa page publique. leftJoin :
        // un bien sans proprietaire renseigne reste affichable (landlordName null).
        landlordName: realEstateOwners.displayName,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateLeases)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(realEstateOwners, and(
        eq(realEstateOwners.id, realEstateProperties.ownerId),
        eq(realEstateOwners.organizationId, organizationId),
      ))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(and(
        eq(realEstateLeases.tenantId, tenantId),
        eq(realEstateLeases.organizationId, organizationId),
        eq(realEstateLeases.status, "active"),
      ))
      .orderBy(desc(realEstateLeases.id));
      // Pas de .limit(1) : un locataire peut avoir plusieurs baux actifs
      // simultanement (ex: 2 logements loues en parallele). Le front affiche
      // un selecteur si leases.length > 1, sinon comportement inchange.

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
            // Copie telechargeable : le scan du bail papier est prioritaire, le
            // bail signe electroniquement sert de repli. Le front n'affiche
            // qu'un seul bouton, pilote par `copySource` calcule ici.
            hasScan: sql<boolean>`${realEstateContracts.signedDocumentId} IS NOT NULL`,
            hasContent: sql<boolean>`${realEstateContracts.contractContent} IS NOT NULL AND ${realEstateContracts.contractContent} <> ''`,
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
      // copySource : 'scan' si le bail papier est numerise, sinon 'electronic'
      // si le bail a ete signe en ligne, sinon null (rien a telecharger).
      contracts: contracts.map((c) => ({
        ...c,
        copySource: c.hasScan ? "scan" : c.hasContent ? "electronic" : null,
      })),
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
