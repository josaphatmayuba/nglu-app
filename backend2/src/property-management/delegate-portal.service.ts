// Domus — Portail DELEGUE (acces public sans login, token opaque).
//
// Pendant des portails locataire et proprietaire, cote mandataire : quand un
// loyer est en retard sur un bien qu il suit, le delegue recoit un SMS avec un
// lien et repond a une question simple — le locataire a-t-il paye ?
//   * Non  -> la reponse est tracee (avec un commentaire libre : « promet de
//             payer vendredi »), pour que le gestionnaire sache ou en est le
//             recouvrement au lieu de relancer a l aveugle.
//   * Oui  -> le delegue saisit le montant et peut joindre une photo de preuve
//             (recu, capture mobile money).
//
// POINT DE SECURITE CENTRAL : une reponse « Oui » cree une ligne
// real_estate_rent_payments en statut 'pending', JAMAIS 'paid', et ne genere
// AUCUNE ecriture comptable. Le lien n est protege par aucun mot de passe :
// laisser un lien SMS ecrire directement dans la comptabilite ouvrirait la
// caisse a quiconque le detient (ou l intercepte). Le gestionnaire valide
// ensuite la ligne depuis le CRM via confirmPendingPayment, et c est cette
// validation qui passe la transaction. Meme principe que les demandes de
// modification du portail locataire, qui restent 'pending' jusqu a approbation.
//
// Le lien ne donne acces qu a UNE relance : un bail, un mois. Il n ouvre ni le
// portefeuille du proprietaire, ni un autre bail, ni une autre organisation.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { UploadedBufferFile } from "../common/upload-security";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  realEstateDelegateRentChecks,
  realEstateDelegates,
  realEstateLeases,
  realEstateProperties,
  realEstateRentPayments,
  realEstateUnits,
} from "../database/schema";
import type { Database } from "../database/types";
import { ObjectStorageService } from "./object-storage.service";

@Injectable()
export class DelegatePortalService {
  private readonly logger = new Logger(DelegatePortalService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Token court (12 car. base62, ~71 bits) : l URL tient dans un seul SMS. */
  private newPortalToken() {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = randomBytes(12);
    let token = "";
    for (let i = 0; i < 12; i += 1) token += alphabet[bytes[i] % alphabet.length];
    return token;
  }

  private portalUrl(token: string) {
    return `${env.appUrl.replace(/\/$/, "")}/domus/delegue?token=${token}`;
  }

  /** Premier jour du mois, cle de deduplication des relances. */
  private monthKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }

  /**
   * Cree (ou reutilise) le lien de confirmation pour un couple
   * (delegue, bail) sur le mois courant.
   *
   * Reutiliser le lien actif du mois est indispensable : le cron de retard
   * tourne tous les jours et emettrait sinon un token different a chaque
   * passage, rendant caducs les SMS deja partis. Une nouvelle periode (mois
   * suivant) ouvre en revanche une nouvelle relance, donc un nouveau lien.
   */
  async generateRentCheckLink(
    delegateId: number,
    leaseId: number,
    orgId: number,
    propertyId?: number | null,
    periodMonth?: string,
  ) {
    const period = periodMonth ?? this.monthKey();

    const [existing] = await this.db
      .select({ token: realEstateDelegateRentChecks.token })
      .from(realEstateDelegateRentChecks)
      .where(and(
        eq(realEstateDelegateRentChecks.delegateId, delegateId),
        eq(realEstateDelegateRentChecks.leaseId, leaseId),
        eq(realEstateDelegateRentChecks.organizationId, orgId),
        eq(realEstateDelegateRentChecks.periodMonth, period),
        isNull(realEstateDelegateRentChecks.revokedAt),
      ))
      .orderBy(desc(realEstateDelegateRentChecks.id))
      .limit(1);

    if (existing?.token) return { token: existing.token, url: this.portalUrl(existing.token) };

    const token = this.newPortalToken();
    await this.db.insert(realEstateDelegateRentChecks).values({
      organizationId: orgId,
      delegateId,
      leaseId,
      propertyId: propertyId ?? null,
      token,
      tokenHash: this.hashToken(token),
      periodMonth: period,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { token, url: this.portalUrl(token) };
  }

  /**
   * Resout la relance depuis le token. Un token inconnu renvoie 404 avec le
   * meme message qu un lien expire : on ne distingue pas les deux cas, pour ne
   * pas confirmer a un tiers qu un token devine existe.
   */
  private async resolveCheckByToken(token: string) {
    const [row] = await this.db
      .select()
      .from(realEstateDelegateRentChecks)
      .where(eq(realEstateDelegateRentChecks.tokenHash, this.hashToken(token)))
      .limit(1);

    if (!row) throw new NotFoundException("Lien invalide ou expire.");
    if (row.revokedAt) throw new NotFoundException("Lien invalide ou expire.");
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      throw new NotFoundException("Lien invalide ou expire.");
    }
    return row;
  }

  /**
   * Nom du delegue, seulement s il est toujours actif.
   * Un delegue retire (soft delete) ne doit ni consulter ni repondre : son lien
   * cesse de fonctionner, sinon revoquer un mandataire n aurait aucun effet
   * tant qu il conserve un vieux SMS.
   */
  private async activeDelegateName(delegateId: number, orgId: number): Promise<string> {
    const [delegate] = await this.db
      .select({ displayName: realEstateDelegates.displayName })
      .from(realEstateDelegates)
      .where(and(
        eq(realEstateDelegates.id, delegateId),
        eq(realEstateDelegates.organizationId, orgId),
        eq(realEstateDelegates.isActive, 1),
      ))
      .limit(1);
    if (!delegate) throw new NotFoundException("Lien invalide ou expire.");
    return delegate.displayName;
  }

  /**
   * Donnees affichees au delegue : strictement ce qu il faut pour repondre —
   * qui doit payer, combien, pour quel bien. Aucune autre donnee du dossier
   * locataire, aucun autre bail.
   */
  async getPublicRentCheck(token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const check = await this.resolveCheckByToken(token);

    const delegateName = await this.activeDelegateName(
      Number(check.delegateId),
      Number(check.organizationId),
    );

    const [lease] = await this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        rentAmount: realEstateLeases.rentAmount,
        currencyId: realEstateLeases.currencyId,
        currencySymbol: currencies.currencySymbol,
        currencyCode: currencies.currencyCode,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        propertyCity: realEstateProperties.city,
        unitName: realEstateUnits.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
      })
      .from(realEstateLeases)
      .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .where(and(
        eq(realEstateLeases.id, Number(check.leaseId)),
        eq(realEstateLeases.organizationId, Number(check.organizationId)),
      ))
      .limit(1);
    if (!lease) throw new NotFoundException("Lien invalide ou expire.");

    return {
      delegateName,
      periodMonth: check.periodMonth,
      // Deja repondu : l ecran affiche le recapitulatif au lieu du formulaire,
      // pour qu un second clic sur le meme SMS ne cree pas un doublon.
      answer: check.answer ?? null,
      answeredAt: check.answeredAt ?? null,
      amount: check.amount ?? null,
      comment: check.comment ?? null,
      lease: {
        reference: lease.reference || String(lease.id),
        rentAmount: lease.rentAmount,
        currencySymbol: lease.currencySymbol ?? null,
        currencyCode: lease.currencyCode ?? null,
        tenantName: [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ").trim(),
        address: [lease.propertyName, lease.unitName, lease.propertyAddress, lease.propertyCity]
          .filter(Boolean)
          .join(", "),
        unit: lease.unitName || null,
      },
    };
  }

  /**
   * Enregistre la reponse du delegue.
   *
   * 'unpaid' : rien d autre n est ecrit, seul le suivi est trace.
   * 'paid'   : cree une ligne real_estate_rent_payments en statut 'pending'
   *            — voir le bloc de tete pour la raison. Le montant declare est
   *            borne (positif, <= 10x le loyer) : une faute de frappe ne doit
   *            pas remonter un encaissement absurde dans la file du
   *            gestionnaire.
   *
   * Idempotent : un lien deja repondu renvoie la reponse existante sans rien
   * recreer, pour qu un double clic ou un SMS rouvert ne produise pas deux
   * lignes de paiement.
   */
  async submitRentCheck(
    token: string,
    body: { answer?: string; amount?: unknown; comment?: string },
    proofFile?: UploadedBufferFile | null,
  ) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const check = await this.resolveCheckByToken(token);

    if (check.answer) {
      return {
        submitted: true,
        alreadyAnswered: true,
        answer: check.answer,
        rentPaymentId: check.rentPaymentId ?? null,
      };
    }

    const answer = String(body?.answer || "").trim();
    if (answer !== "paid" && answer !== "unpaid") {
      throw new BadRequestException("Reponse invalide.");
    }

    const orgId = Number(check.organizationId);
    // Meme controle qu a la lecture : revoquer un delegue doit fermer son lien,
    // y compris pour une soumission.
    await this.activeDelegateName(Number(check.delegateId), orgId);
    const comment = body?.comment ? String(body.comment).trim().slice(0, 500) : null;

    if (answer === "unpaid") {
      await this.db
        .update(realEstateDelegateRentChecks)
        .set({
          answer: "unpaid",
          comment,
          answeredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(realEstateDelegateRentChecks.id, Number(check.id)));
      return { submitted: true, answer: "unpaid", rentPaymentId: null };
    }

    const [lease] = await this.db
      .select({
        id: realEstateLeases.id,
        rentAmount: realEstateLeases.rentAmount,
        currencyId: realEstateLeases.currencyId,
      })
      .from(realEstateLeases)
      .where(and(
        eq(realEstateLeases.id, Number(check.leaseId)),
        eq(realEstateLeases.organizationId, orgId),
      ))
      .limit(1);
    if (!lease) throw new NotFoundException("Lien invalide ou expire.");

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Montant invalide.");
    }
    // Garde-fou de saisie : un zero de trop sur un telephone est vite arrive,
    // et la ligne part dans la file de validation du gestionnaire.
    const rent = Number(lease.rentAmount) || 0;
    if (rent > 0 && amount > rent * 10) {
      throw new BadRequestException("Montant anormalement eleve : verifiez la saisie.");
    }

    // Upload fait ICI, APRES resolution du token et tous les controles
    // ci-dessus (lien actif, delegue actif, montant valide) — jamais avant,
    // sinon un token invalide permettrait quand meme de deposer un fichier.
    let proofUrl: string | null = null;
    if (proofFile?.buffer) {
      const { objectKey } = await this.objectStorage.putDocument(proofFile, `domus/payments/${orgId}/delegate-proofs`);
      proofUrl = objectKey;
    }

    const paymentDate = new Date().toISOString().slice(0, 10);
    const [inserted] = await this.db.insert(realEstateRentPayments).values({
      organizationId: orgId,
      leaseId: Number(check.leaseId),
      currencyId: lease.currencyId ?? null,
      paymentDate,
      amount: amount.toFixed(2),
      method: "cash",
      // 'pending' est le coeur du dispositif : aucune ecriture comptable n est
      // generee ici, le gestionnaire confirme depuis le CRM.
      status: "pending",
      notes: comment
        ? `Declare par le delegue : ${comment}`
        : "Declare par le delegue (a valider)",
      proofUrl,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const rentPaymentId = Number((inserted as any).insertId);

    await this.db
      .update(realEstateDelegateRentChecks)
      .set({
        answer: "paid",
        amount: amount.toFixed(2),
        currencyId: lease.currencyId ?? null,
        comment,
        proofUrl: proofUrl ?? null,
        rentPaymentId,
        answeredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(realEstateDelegateRentChecks.id, Number(check.id)));

    return { submitted: true, answer: "paid", rentPaymentId };
  }

  /**
   * File de suivi cote gestionnaire : les relances envoyees aux delegues et
   * leurs reponses. Permet de voir d un coup d oeil qui a confirme un
   * paiement (a valider) et qui a signale un impaye.
   */
  async listRentChecks(orgId: number, answer?: string) {
    const conditions = [eq(realEstateDelegateRentChecks.organizationId, orgId)];
    if (answer === "pending") {
      conditions.push(isNull(realEstateDelegateRentChecks.answer));
    } else if (answer === "paid" || answer === "unpaid") {
      conditions.push(eq(realEstateDelegateRentChecks.answer, answer));
    }

    return this.db
      .select({
        id: realEstateDelegateRentChecks.id,
        delegateId: realEstateDelegateRentChecks.delegateId,
        delegateName: realEstateDelegates.displayName,
        leaseId: realEstateDelegateRentChecks.leaseId,
        leaseReference: realEstateLeases.reference,
        propertyName: realEstateProperties.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        periodMonth: realEstateDelegateRentChecks.periodMonth,
        answer: realEstateDelegateRentChecks.answer,
        amount: realEstateDelegateRentChecks.amount,
        comment: realEstateDelegateRentChecks.comment,
        proofUrl: realEstateDelegateRentChecks.proofUrl,
        rentPaymentId: realEstateDelegateRentChecks.rentPaymentId,
        answeredAt: realEstateDelegateRentChecks.answeredAt,
        createdAt: realEstateDelegateRentChecks.createdAt,
      })
      .from(realEstateDelegateRentChecks)
      .leftJoin(realEstateDelegates, eq(realEstateDelegates.id, realEstateDelegateRentChecks.delegateId))
      .leftJoin(realEstateLeases, eq(realEstateLeases.id, realEstateDelegateRentChecks.leaseId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .where(and(...conditions))
      .orderBy(desc(realEstateDelegateRentChecks.id))
      .limit(200);
  }
}
