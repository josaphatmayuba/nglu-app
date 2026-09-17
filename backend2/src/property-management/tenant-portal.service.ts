// SCRUM — Lien portail locataire (accès public sans login, token opaque).
// Même pattern que TenantOnboarding : token en clair uniquement renvoyé à la
// génération, seul le hash SHA-256 est stocké. Scope strict au tenant_id
// rattaché au token — jamais de fuite inter-locataire ni inter-org.
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  currencies,
  customers,
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

    const token = randomBytes(32).toString("hex");
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
      return `${message} Vous pouvez vérifier vos informations et vos paiements ici : ${url}`;
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
        ne(realEstateLeases.status, "cancelled"),
      ))
      .orderBy(desc(realEstateLeases.id));

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
      payments,
    };
  }
}
