// Domus — Portail PROPRIETAIRE (acces public sans login, token opaque).
// Pendant de TenantPortalService, cote bailleur : quand un dossier locataire
// est ouvert sur son bien (ou qu'un bail y est signe), le proprietaire recoit
// un SMS court + un lien. Le lien n'ouvre QUE la fiche du locataire concerne
// et ses baux sur les biens de CE proprietaire — jamais le portefeuille entier,
// jamais un autre locataire, jamais une autre organisation.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { readStoredDocument } from "../common/stored-document";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
  realEstateLeases,
  realEstateOwnerPortalLinks,
  realEstateOwners,
  realEstateProperties,
  realEstateRentPayments,
  realEstateSecurityDeposits,
  realEstateUnits,
  tenantDetails,
} from "../database/schema";
import type { Database } from "../database/types";
import { ObjectStorageService } from "./object-storage.service";

@Injectable()
export class OwnerPortalService {
  private readonly logger = new Logger(OwnerPortalService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  /** Token court (12 car. base62, ~71 bits) : l'URL tient dans un seul SMS. */
  private newPortalToken() {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = randomBytes(12);
    let token = "";
    for (let i = 0; i < 12; i += 1) token += alphabet[bytes[i] % alphabet.length];
    return token;
  }

  private portalUrl(token: string) {
    return `${env.appUrl.replace(/\/$/, "")}/domus/proprietaire?token=${token}`;
  }

  /**
   * Cree (ou reutilise) le lien portail d'un couple (proprietaire, locataire).
   * Reutiliser le token actif est indispensable : sinon le SMS "dossier cree"
   * deja recu serait casse par le SMS "bail cree" envoye plus tard.
   */
  async generateOwnerPortalLink(ownerId: number, tenantId: number, orgId: number, propertyId?: number | null) {
    const [existing] = await this.db
      .select({ token: realEstateOwnerPortalLinks.token })
      .from(realEstateOwnerPortalLinks)
      .where(and(
        eq(realEstateOwnerPortalLinks.ownerId, ownerId),
        eq(realEstateOwnerPortalLinks.tenantId, tenantId),
        eq(realEstateOwnerPortalLinks.organizationId, orgId),
        isNull(realEstateOwnerPortalLinks.revokedAt),
      ))
      .orderBy(desc(realEstateOwnerPortalLinks.id))
      .limit(1);

    if (existing?.token) return { token: existing.token, url: this.portalUrl(existing.token) };

    const token = this.newPortalToken();
    await this.db.insert(realEstateOwnerPortalLinks).values({
      organizationId: orgId,
      ownerId,
      tenantId,
      propertyId: propertyId ?? null,
      token,
      tokenHash: this.hashToken(token),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { token, url: this.portalUrl(token) };
  }

  /**
   * Resout le lien public. Ne distingue jamais "token inconnu" de "lien revoque"
   * dans le message d'erreur (anti-enumeration), comme le portail locataire.
   */
  private async resolveLinkByToken(token: string) {
    const [link] = await this.db
      .select({
        ownerId: realEstateOwnerPortalLinks.ownerId,
        tenantId: realEstateOwnerPortalLinks.tenantId,
        propertyId: realEstateOwnerPortalLinks.propertyId,
        organizationId: realEstateOwnerPortalLinks.organizationId,
        expiresAt: realEstateOwnerPortalLinks.expiresAt,
        revokedAt: realEstateOwnerPortalLinks.revokedAt,
      })
      .from(realEstateOwnerPortalLinks)
      .where(eq(realEstateOwnerPortalLinks.tokenHash, this.hashToken(token)))
      .limit(1);

    if (!link || link.revokedAt) throw new NotFoundException("Lien invalide ou expiré.");
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      throw new NotFoundException("Lien invalide ou expiré.");
    }
    return link;
  }

  /**
   * Donnees vues par le proprietaire : fiche complete du locataire annonce +
   * les baux de ce locataire situes sur SES biens uniquement. En lecture seule :
   * aucune route d'ecriture n'est exposee sur ce portail.
   */
  async getPublicOwnerPortal(token: string) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { ownerId, tenantId, organizationId, propertyId } = await this.resolveLinkByToken(token);

    const [owner] = await this.db
      .select({ id: realEstateOwners.id, displayName: realEstateOwners.displayName })
      .from(realEstateOwners)
      .where(and(eq(realEstateOwners.id, ownerId), eq(realEstateOwners.organizationId, organizationId)))
      .limit(1);
    if (!owner) throw new NotFoundException("Lien invalide ou expiré.");

    const [tenant] = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        birthDate: tenantDetails.birthDate,
        sex: tenantDetails.sex,
        nationality: tenantDetails.nationality,
        maritalStatus: tenantDetails.maritalStatus,
        originProvince: tenantDetails.originProvince,
        idDocumentType: tenantDetails.idDocumentType,
        idNumber: tenantDetails.idNumber,
        phone2: tenantDetails.phone2,
        contactedPerson: tenantDetails.contactedPerson,
        contactedPersonPhoneNumber: tenantDetails.contactedPersonPhoneNumber,
        professionalStatus: tenantDetails.professionalStatus,
        mainActivity: tenantDetails.mainActivity,
        entityName: tenantDetails.entityName,
        entityAddress: tenantDetails.entityAddress,
        contractType: tenantDetails.contractType,
        monthlyPay: tenantDetails.monthlyPay,
        salaryCurrencyId: tenantDetails.salaryCurrencyId,
        otherMonthlyIncome: tenantDetails.otherMonthlyIncome,
        oldAddress: tenantDetails.oldAddress,
        oldLessor: tenantDetails.oldLessor,
        movingReason: tenantDetails.movingReason,
        occupantNumber: tenantDetails.occupantNumber,
        partenairName: tenantDetails.partenairName,
        partenairNumber: tenantDetails.partenairNumber,
        childNumber: tenantDetails.childNumber,
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

    // Baux du locataire sur les biens de CE proprietaire seulement.
    const leases = await this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        billingCycle: realEstateLeases.billingCycle,
        rentAmount: realEstateLeases.rentAmount,
        securityDeposit: realEstateLeases.securityDeposit,
        status: realEstateLeases.status,
        taxName: realEstateLeases.taxName,
        taxType: realEstateLeases.taxType,
        taxValue: realEstateLeases.taxValue,
        currencySymbol: currencies.currencySymbol,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        propertyCity: realEstateProperties.city,
        unitName: realEstateUnits.name,
        unitType: realEstateUnits.unitType,
        unitFloor: realEstateUnits.floor,
      })
      .from(realEstateLeases)
      .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(and(
        eq(realEstateLeases.tenantId, tenantId),
        eq(realEstateLeases.organizationId, organizationId),
        eq(realEstateProperties.ownerId, ownerId),
        // Si le lien portail est restreint a UN bien precis (propertyId renseigne),
        // ne jamais exposer les baux des autres biens du meme proprietaire.
        propertyId != null ? eq(realEstateLeases.propertyId, propertyId) : undefined,
      ))
      .orderBy(desc(realEstateLeases.id));

    // Cautions effectivement encaissees, par bail : le montant porte par le bail
    // n'est que le montant contractuel, le proprietaire veut savoir ce qui est paye.
    const leaseIds = leases.map((l) => Number(l.id));
    const deposits = leaseIds.length
      ? await this.db
          .select({
            leaseId: realEstateSecurityDeposits.leaseId,
            amount: realEstateSecurityDeposits.amount,
            paymentDate: realEstateSecurityDeposits.paymentDate,
            status: realEstateSecurityDeposits.status,
            currencySymbol: currencies.currencySymbol,
          })
          .from(realEstateSecurityDeposits)
          .leftJoin(currencies, eq(currencies.id, realEstateSecurityDeposits.currencyId))
          .where(and(
            inArray(realEstateSecurityDeposits.leaseId, leaseIds),
            eq(realEstateSecurityDeposits.organizationId, organizationId),
            eq(realEstateSecurityDeposits.isActive, 1),
          ))
      : [];

    // Paiements recents par bail : uniquement les champs necessaires a
    // l'affichage (jamais proofUrl brut, jamais method/notes internes). Les
    // 12 derniers par bail suffisent au proprietaire pour verifier le carnet.
    const payments = leaseIds.length
      ? await this.db
          .select({
            id: realEstateRentPayments.id,
            leaseId: realEstateRentPayments.leaseId,
            paymentDate: realEstateRentPayments.paymentDate,
            amount: realEstateRentPayments.amount,
            status: realEstateRentPayments.status,
            currencySymbol: currencies.currencySymbol,
            hasProof: sql<boolean>`${realEstateRentPayments.proofUrl} IS NOT NULL AND ${realEstateRentPayments.proofUrl} <> ''`,
          })
          .from(realEstateRentPayments)
          .leftJoin(currencies, eq(currencies.id, realEstateRentPayments.currencyId))
          .where(and(
            eq(realEstateRentPayments.organizationId, organizationId),
            inArray(realEstateRentPayments.leaseId, leaseIds),
            ne(realEstateRentPayments.status, "voided"),
          ))
          .orderBy(desc(realEstateRentPayments.paymentDate))
      : [];

    const PAYMENTS_PER_LEASE = 12;
    const paymentsByLease = new Map<number, typeof payments>();
    for (const p of payments) {
      const key = Number(p.leaseId);
      const list = paymentsByLease.get(key) ?? [];
      if (list.length < PAYMENTS_PER_LEASE) list.push(p);
      paymentsByLease.set(key, list);
    }

    return {
      owner: { name: owner.displayName },
      tenant,
      leases: leases.map((lease) => ({
        ...lease,
        depositsPaid: deposits.filter((d) => Number(d.leaseId) === Number(lease.id)),
        payments: (paymentsByLease.get(Number(lease.id)) ?? []).map((p) => ({
          id: p.id,
          paymentDate: p.paymentDate,
          amount: p.amount,
          currencySymbol: p.currencySymbol,
          status: p.status,
          hasProof: p.hasProof,
        })),
      })),
    };
  }

  /**
   * Retourne l'URL du justificatif d'UN paiement pour le proprietaire. Verifie
   * en une seule requete, via jointures, que le paiement appartient a un bail
   * dont le bien a pour ownerId celui resolu depuis le token, ET (si le lien
   * est restreint a un bien precis) que ce bail est bien sur CE bien. Jamais
   * de distinction "n'existe pas" / "pas a toi" dans l'erreur (anti-enumeration).
   */
  async getPublicOwnerPaymentProof(token: string, paymentId: number) {
    if (!token?.trim()) throw new BadRequestException("Token requis.");
    const { ownerId, organizationId, propertyId } = await this.resolveLinkByToken(token);

    const [row] = await this.db
      .select({ proofUrl: realEstateRentPayments.proofUrl })
      .from(realEstateRentPayments)
      .innerJoin(realEstateLeases, eq(realEstateLeases.id, realEstateRentPayments.leaseId))
      .innerJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .where(and(
        eq(realEstateRentPayments.id, paymentId),
        eq(realEstateRentPayments.organizationId, organizationId),
        eq(realEstateProperties.ownerId, ownerId),
        propertyId != null ? eq(realEstateLeases.propertyId, propertyId) : undefined,
      ))
      .limit(1);

    if (!row?.proofUrl) throw new NotFoundException("Justificatif introuvable.");
    return readStoredDocument(this.objectStorage, row.proofUrl);
  }

  /** Invalidation douce du lien (jamais de DELETE physique). */
  async revokeOwnerPortalLink(ownerId: number, tenantId: number, orgId: number) {
    await this.db
      .update(realEstateOwnerPortalLinks)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(realEstateOwnerPortalLinks.ownerId, ownerId),
        eq(realEstateOwnerPortalLinks.tenantId, tenantId),
        eq(realEstateOwnerPortalLinks.organizationId, orgId),
        isNull(realEstateOwnerPortalLinks.revokedAt),
      ));
    return { revoked: true };
  }
}
