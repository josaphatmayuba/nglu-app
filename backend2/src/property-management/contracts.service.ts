import * as crypto from "crypto";
import { BadRequestException, ConflictException, GoneException, HttpException, HttpStatus, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";
import { normalizePhoneKey } from "./notification-utils";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  customers,
  currencies,
  emailTemplates,
  realEstateContractAuditLogs,
  realEstateContractSigners,
  realEstateContracts,
  realEstateLeaseCotenants,
  realEstateLeaseDocuments,
  realEstateLeases,
  realEstateOwners,
  realEstateProperties,
  realEstateUnits,
  tenantDetails,
  users,
} from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import { CompatService } from "../compat/compat.service";
import type { DataUpdateAction, DataUpdateScope } from "../realtime/data-update-event";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import { SystemEmailService } from "../system-email/system-email.service";
import type { SystemEmailType } from "../system-email/system-email.service";
import { ContractTemplatesService } from "./contract-templates.service";
import type { ContractTemplateType } from "./dto/contract-template.dto";
import { CreateContractDto, SignContractDto } from "./dto/property-management.dto";
import { ObjectStorageService } from "./object-storage.service";
import { TenantPortalService } from "./tenant-portal.service";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { isPreviewing } from "../compat/sms-preview";

type ContractRow = typeof realEstateContracts.$inferSelect;
type SignerRow = typeof realEstateContractSigners.$inferSelect;
type SigningCandidate = {
  customerId: number | null;
  role: "principal" | "cotenant";
  name: string;
  email: string | null;
  phone: string | null;
};

type CoTenantInfo = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  idDocumentType: string | null;
  idNumber: string | null;
};

type LeaseDetails = {
  leaseId: number;
  tenantId: number | null;
  reference: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  rentAmount: string | null;
  currencyId: number | null;
  currencyCode: string | null;
  currencyName: string | null;
  currencySymbol: string | null;
  securityDeposit: string | null;
  billingCycle: string | null;
  terms: string | null;
  moveInNotes: string | null;
  signingCity: string | null;
  moveInMeterReading: string | null;
  propertyId: number | null;
  propertyName: string | null;
  propertyType: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitName: string | null;
  unitType: string | null;
  tenantFirstName: string | null;
  tenantLastName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantAddress: string | null;
  tenantIdDocumentType: string | null;
  tenantIdNumber: string | null;
  tenantName: string;
  // Locataire entreprise (migration 0318) : mentions legales + representant signataire.
  tenantType: string | null;
  tenantLegalForm: string | null;
  tenantRccm: string | null;
  tenantCompanyNationalId: string | null;
  tenantTaxId: string | null;
  tenantCompanyAddress: string | null;
  tenantRepresentativeName: string | null;
  tenantRepresentativeTitle: string | null;
  // Co-locataires actifs (hors locataire principal), ordre position.
  coTenants: CoTenantInfo[];
  // Proprietaire legal du bien (real_estate_owners), si assigne sur la propriete.
  ownerId: number | null;
  ownerName: string | null;
  ownerAddress: string | null;
  ownerCity: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  ownerSignature: string | null;
  ownerIdDocumentType: string | null;
  ownerIdNumber: string | null;
};

type CompanyInfo = {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  landlordSignature: string | null;
  // Identité du bailleur (réglages) — prioritaire sur le nom/téléphone de l'entreprise.
  landlordName: string | null;
  landlordPhone: string | null;
};

// Bailleur resolu pour un bail donne : soit le proprietaire legal (real_estate_owners)
// rattache au bien, soit (fallback) le bailleur/gestionnaire des reglages (CompanyInfo).
// CompanyInfo reste inchange et continue de representer le GESTIONNAIRE mandate.
type LandlordInfo = {
  name: string;
  address: string;
  city?: string;
  phone: string;
  email: string;
  signature: string | null;
  idDocumentType?: string | null;
  idNumber?: string | null;
  source: "owner" | "settings";
};

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly templates: ContractTemplatesService,
    private readonly emails: SystemEmailService,
    private readonly realtimeData: RealtimeDataPublisher,
    private readonly sms: CompatService,
    private readonly objectStorage: ObjectStorageService,
    private readonly tenantPortal: TenantPortalService,
    private readonly ownerNotifications: OwnerNotificationsService,
  ) {}

  async createContract(dto: CreateContractDto, orgId: number, createdBy?: number) {
    const lease = await this.getLeaseDetails(dto.leaseId, orgId);
    const company = await this.getCompanyInfo(orgId);
    const content = dto.contractContent ?? (await this.renderContent(lease, company, orgId, dto.templateId));

    const [result] = await this.db.insert(realEstateContracts).values({
      organizationId: orgId,
      leaseId: dto.leaseId,
      status: "draft",
      contractContent: content,
      tenantEmail: lease.tenantEmail ?? null,
      tenantName: lease.tenantName,
      createdBy: createdBy ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const id = Number(result.insertId);
    await this.log(id, orgId, "created", null, null, `Contrat généré pour le bail n°${dto.leaseId}`);
    await this.publishContractUpdate("created", id, dto.leaseId);
    return this.getContract(id, orgId);
  }

  /**
   * Pick the active template (or one explicitly chosen) and render it.
   * If no template is found, fall back to the legacy hardcoded HTML so existing flows keep working.
   */
  private async renderContent(lease: LeaseDetails, company: CompanyInfo, orgId: number, templateId?: number): Promise<string> {
    let template = templateId ? await this.templates.getById(templateId, orgId).catch(() => null) : null;

    if (!template) {
      const type = this.resolveTemplateType(lease.unitType, lease.propertyType);
      template = await this.templates.getActiveByType(type, orgId);
    }

    if (!template) {
      // Fallback: legacy hardcoded HTML so a missing template never breaks generation.
      return this.generateContent(lease, company);
    }

    const vars = this.buildVariables(lease, company);
    return ContractTemplatesService.applyVariables(template.body, vars);
  }

  private resolveTemplateType(unitType: string | null, propertyType: string | null): ContractTemplateType {
    const haystack = `${unitType ?? ""} ${propertyType ?? ""}`.toLowerCase();
    if (/(office|bureau|commercial|commerce|shop|magasin|store)/.test(haystack)) return "commercial";
    if (/(short|saison|courte|court|temporary)/.test(haystack)) return "short_term";
    return "residential";
  }

  /**
   * Build the [PLACEHOLDER] map used when rendering a template.
   * Keys mirror the placeholders used in the seeded templates.
   * When a value is empty, the placeholder is preserved verbatim so the gestionnaire sees what's missing.
   */
  private buildVariables(lease: LeaseDetails, company: CompanyInfo): Record<string, string> {
    const landlord = this.resolveLandlord(lease, company);
    const today = this.formatDate(new Date());
    const startDate = this.formatDate(lease.startDate);
    const endDate = this.formatDate(lease.endDate);
    const rawMonths = this.monthsBetween(lease.startDate, lease.endDate);
    const numberOfMonths = rawMonths > 0 ? String(rawMonths) : "";
    const rentAmount = this.formatMoney(lease.rentAmount);
    const securityDeposit = this.formatMoney(lease.securityDeposit);
    const currency = this.currencyLabel(lease);
    const guaranteeMonths = this.guaranteeMonthsRaw(lease.rentAmount, lease.securityDeposit);
    const rentalAddress = [lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ");
    const destination = this.humanizeType(lease.unitType || lease.propertyType || "habitation");
    const allTenants = this.allTenants(lease);
    // Valeurs de tous les preneurs separees par « ; » (sans les vides).
    const agg = (pick: (t: ReturnType<ContractsService["allTenants"]>[number]) => string | null | undefined) =>
      allTenants.map((t) => String(pick(t) ?? "").trim()).filter(Boolean).join(" ; ");

    return {
      "NOM COMPLET DU BAILLEUR": (landlord.name ?? "").toLocaleUpperCase("fr"),
      "ADRESSE DU BAILLEUR": landlord.address,
      "TÉLÉPHONE DU BAILLEUR": landlord.phone,
      "EMAIL DU BAILLEUR": landlord.email,
      "NOM DU GESTIONNAIRE": company.landlordName || company.companyName || "",
      "TÉLÉPHONE DU GESTIONNAIRE": company.landlordPhone || company.phone || "",
      "EMAIL DU GESTIONNAIRE": company.email ?? "",
      "NOM COMPLET DU PRENEUR": this.joinNames(allTenants.map((t) => (t.name ?? "").toLocaleUpperCase("fr"))),
      "NOMS DES PRENEURS": this.joinNames(allTenants.map((t) => (t.name ?? "").toLocaleUpperCase("fr"))),
      "TYPE DE PRENEUR": lease.tenantType === "company" ? "société" : "personne physique",
      "DÉSIGNATION COMPLÈTE DU PRENEUR": this.tenantDesignation(lease, allTenants),
      "FORME JURIDIQUE DU PRENEUR": lease.tenantLegalForm ?? "",
      "RCCM DU PRENEUR": lease.tenantRccm ?? "",
      "ID NAT DU PRENEUR": lease.tenantCompanyNationalId ?? "",
      "NIF DU PRENEUR": lease.tenantTaxId ?? "",
      "SIÈGE DU PRENEUR": lease.tenantCompanyAddress ?? "",
      "REPRÉSENTANT DU PRENEUR": lease.tenantRepresentativeName ?? "",
      "FONCTION DU REPRÉSENTANT": lease.tenantRepresentativeTitle ?? "",
      "ADRESSE DU PRENEUR": lease.tenantAddress ?? "",
      "TÉLÉPHONE DU PRENEUR": lease.tenantPhone ?? "",
      "EMAIL DU PRENEUR": lease.tenantEmail ?? "",
      "NUMÉRO DE PIÈCE D'IDENTITÉ": lease.tenantIdNumber ?? "",
      "TYPE DE PIÈCE D'IDENTITÉ": lease.tenantIdDocumentType ?? "",
      "ADRESSES DES PRENEURS": agg((t) => t.address),
      "TÉLÉPHONES DES PRENEURS": agg((t) => t.phone),
      "EMAILS DES PRENEURS": agg((t) => t.email),
      "PIÈCES D'IDENTITÉ DES PRENEURS": agg((t) => [t.idDocumentType, t.idNumber].filter(Boolean).join(" ")),
      "ADRESSE COMPLÈTE DU LOGEMENT DE LOCATION": rentalAddress,
      "TYPE DE LOGEMENT": destination,
      "PROPRIÉTÉ": lease.propertyName ?? "",
      "UNITÉ": lease.unitName ?? "",
      "RÉFÉRENCE BAIL": lease.reference ?? "",
      "NUMÉRO DE MOIS": numberOfMonths,
      "DURÉE DE BAIL EN MOIS": numberOfMonths,
      "DATE DE DÉBUT DE BAIL": startDate,
      "DATE DE DÉBUT DE BAIL JJ/MM/AAAA": startDate,
      "DATE DE FIN DE BAIL": endDate,
      "DATE DE FIN DE BAIL JJ/MM/AAAA": endDate,
      "MONTANT DU LOYER": rentAmount,
      "MONTANT DU LOYER AVEC DEVISE": this.formatMoneyWithCurrency(lease.rentAmount, lease),
      "MONTANT GARANTIE": securityDeposit,
      "MONTANT GARANTIE AVEC DEVISE": this.formatMoneyWithCurrency(lease.securityDeposit, lease),
      "NUMÉRO DE MOIS DE GARANTIE": guaranteeMonths,
      "DEVISE": currency,
      "SYMBOLE DE DEVISE": lease.currencySymbol ?? "",
      "CODE DE DEVISE": lease.currencyCode ?? "",
      "VILLE": lease.signingCity || lease.propertyCity || "",
      "DATE DE SIGNATURE DE BAIL": today,
      "DATE DE SIGNATURE DE BAIL JJ/MM/AAAA": today,
      "DATE DU JOUR": today,
      "CONDITIONS PARTICULIÈRES": lease.terms ?? "",
      "NOTES ÉTAT DES LIEUX": lease.moveInNotes ?? "",
    };
  }

  /**
   * Resout le bailleur reel d'un bail : le PROPRIETAIRE legal du bien
   * (real_estate_owners, signataire du bail) s'il est assigne sur la
   * propriete, sinon (fallback total, comportement historique inchange) le
   * bailleur/gestionnaire des reglages (appSettings.landlordName/... ou, a
   * defaut, l'entreprise). company (CompanyInfo) reste toujours le
   * GESTIONNAIRE mandate, independamment de la source retenue ici.
   */
  private resolveLandlord(lease: LeaseDetails, company: CompanyInfo): LandlordInfo {
    if (lease.ownerId != null) {
      return {
        name: lease.ownerName ?? "",
        address: lease.ownerAddress ?? "",
        city: lease.ownerCity ?? undefined,
        phone: lease.ownerPhone ?? "",
        email: lease.ownerEmail ?? "",
        signature: lease.ownerSignature ?? null,
        idDocumentType: lease.ownerIdDocumentType ?? null,
        idNumber: lease.ownerIdNumber ?? null,
        source: "owner",
      };
    }
    return {
      name: company.landlordName || company.companyName || "",
      address: company.address ?? "",
      phone: company.landlordPhone || company.phone || "",
      email: company.email ?? "",
      signature: company.landlordSignature ?? null,
      source: "settings",
    };
  }

  async listContracts(orgId: number) {
    return this.db
      .select({
        id: realEstateContracts.id,
        leaseId: realEstateContracts.leaseId,
        status: realEstateContracts.status,
        tenantEmail: realEstateContracts.tenantEmail,
        tenantName: realEstateContracts.tenantName,
        sentAt: realEstateContracts.sentAt,
        signedAt: realEstateContracts.signedAt,
        welcomeMessageSentAt: realEstateContracts.welcomeMessageSentAt,
        createdAt: realEstateContracts.createdAt,
        signerToken: realEstateContracts.signerToken,
        signedDocumentId: realEstateContracts.signedDocumentId,
      })
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.organizationId, orgId), ne(realEstateContracts.status, "deleted")))
      .orderBy(desc(realEstateContracts.id));
  }

  async getContract(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");

    const auditLogs = await this.db
      .select()
      .from(realEstateContractAuditLogs)
      .where(eq(realEstateContractAuditLogs.contractId, id))
      .orderBy(desc(realEstateContractAuditLogs.id));

    const companyInfo = await this.getCompanyInfo(orgId);

    // landlordInfo = bailleur reel (proprietaire ou reglages). On tente de charger
    // le bail pour resoudre un eventuel proprietaire assigne ; si le bail a ete
    // supprime entre temps, on retombe sur companyInfo seul (source "settings")
    // plutot que de faire planter l'endpoint (rétrocompatibilité).
    let landlordInfo: LandlordInfo;
    // Preneur entreprise : champs a plat pour le bloc de signature du PDF (domus-app contractUtils).
    let tenantCompany: Record<string, string | null> | null = null;
    try {
      const lease = await this.getLeaseDetails(rows[0].leaseId, orgId);
      landlordInfo = this.resolveLandlord(lease, companyInfo);
      if (lease.tenantType === "company") {
        tenantCompany = {
          tenantType: "company",
          companyName: lease.tenantName ?? null,
          legalForm: lease.tenantLegalForm ?? null,
          rccm: lease.tenantRccm ?? null,
          companyNationalId: lease.tenantCompanyNationalId ?? null,
          taxId: lease.tenantTaxId ?? null,
          companyAddress: lease.tenantCompanyAddress ?? null,
          representativeName: lease.tenantRepresentativeName ?? null,
          representativeTitle: lease.tenantRepresentativeTitle ?? null,
        };
      }
    } catch {
      landlordInfo = {
        name: companyInfo.landlordName || companyInfo.companyName || "",
        address: companyInfo.address ?? "",
        phone: companyInfo.landlordPhone || companyInfo.phone || "",
        email: companyInfo.email ?? "",
        signature: companyInfo.landlordSignature ?? null,
        source: "settings",
      };
    }

    let createdByName: string | null = null;
    if (rows[0].createdBy) {
      const [creator] = await this.db
        .select({ firstName: users.firstName, lastName: users.lastName, username: users.username })
        .from(users)
        .where(eq(users.id, rows[0].createdBy))
        .limit(1);
      if (creator) {
        const full = `${creator.firstName ?? ""} ${creator.lastName ?? ""}`.trim();
        createdByName = full || creator.username || null;
      }
    }

    // Detail admin : la signature de chaque locataire sert a l'impression du contrat (un bloc par signataire).
    const signers = (await this.activeSigners(id)).map((x) => ({ ...this.signerView(x), signatureData: x.signatureData }));
    // Les signataires n'existent qu'a l'envoi : avant (brouillon), l'impression se base sur les locataires du bail.
    const printTenants = signers.length
      ? signers.map((s) => ({ name: s.name, signatureData: s.signatureData, signedAt: s.signedAt }))
      : (await this.loadSigningCandidates(rows[0].leaseId, orgId)).map((c) => ({ name: c.name, signatureData: null, signedAt: null }));

    // Metadonnees du scan signe (nom, type, taille) pour la visionneuse ; null si absent ou archive.
    let signedDocument: { id: number; originalName: string | null; mimeType: string | null; sizeBytes: number | null } | null = null;
    if (rows[0].signedDocumentId) {
      const [doc] = await this.db
        .select({
          id: realEstateLeaseDocuments.id,
          originalName: realEstateLeaseDocuments.originalName,
          mimeType: realEstateLeaseDocuments.mimeType,
          sizeBytes: realEstateLeaseDocuments.sizeBytes,
        })
        .from(realEstateLeaseDocuments)
        .where(and(eq(realEstateLeaseDocuments.id, rows[0].signedDocumentId), eq(realEstateLeaseDocuments.isActive, 1)))
        .limit(1);
      if (doc) signedDocument = { ...doc, sizeBytes: doc.sizeBytes == null ? null : Number(doc.sizeBytes) };
    }

    return {
      ...rows[0],
      ...(tenantCompany ?? {}),
      signedDocument,
      printTenants,
      signers,
      signersSigned: signers.filter((x) => x.status === "signed").length,
      signersTotal: signers.length,
      auditLogs,
      companyInfo,
      landlordInfo,
      landlordName: companyInfo.landlordName || companyInfo.companyName,
      createdByName,
    };
  }

  async sendContract(id: number, orgId: number) {
    let contract = await this.requireContract(id, orgId);
    // Jamais d'envoi sur un contrat signe/supprime : les preuves de signature restent intactes.
    if (contract.status !== "draft" && contract.status !== "sent" && contract.status !== "viewed") {
      throw new BadRequestException("Ce contrat ne peut plus etre envoye pour signature.");
    }

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    // Contrat remis en brouillon apres un changement de locataires (signataires
    // desactives) : on regenere contenu + nom/email depuis le bail ACTUEL avant l'envoi.
    if (contract.status === "draft") {
      const previous = await this.db
        .select({ id: realEstateContractSigners.id })
        .from(realEstateContractSigners)
        .where(and(eq(realEstateContractSigners.contractId, id), eq(realEstateContractSigners.organizationId, orgId)))
        .limit(1);
      // Apercu SMS : aucune ecriture (le contenu regenere ne change pas le SMS).
      if (previous.length && !isPreviewing()) {
        const lease = await this.getLeaseDetails(contract.leaseId, orgId);
        const company = await this.getCompanyInfo(orgId);
        const content = await this.renderContent(lease, company, orgId);
        const fresh = { contractContent: content, tenantName: lease.tenantName, tenantEmail: lease.tenantEmail ?? null };
        await this.db
          .update(realEstateContracts)
          .set({ ...fresh, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId), eq(realEstateContracts.status, "draft")));
        contract = { ...contract, ...fresh } as ContractRow;
      }
    }

    // Signataires attendus : principal + colocataires actifs. Si le bail est
    // introuvable / sans locataire actif, repli historique sur l'email du contrat.
    let candidates: SigningCandidate[] = [];
    try {
      candidates = await this.loadSigningCandidates(contract.leaseId, orgId);
    } catch {
      candidates = [];
    }
    const legacyOnly = candidates.length === 0;
    const targets: Array<SigningCandidate & { signerId: number | null; token: string; skip: boolean }> = [];

    if (legacyOnly) {
      targets.push({
        customerId: null,
        role: "principal",
        name: contract.tenantName ?? "",
        email: contract.tenantEmail ?? null,
        phone: null,
        signerId: null,
        token: crypto.randomUUID(),
        skip: false,
      });
    } else {
      const existing = await this.db
        .select()
        .from(realEstateContractSigners)
        .where(and(eq(realEstateContractSigners.contractId, id), eq(realEstateContractSigners.organizationId, orgId)));
      const wanted = new Set(candidates.map((c) => c.customerId));
      // Retire (soft) les signataires qui ne sont plus locataires du bail.
      for (const row of existing) {
        if (row.isActive === 1 && !wanted.has(row.customerId) && !isPreviewing()) {
          await this.db
            .update(realEstateContractSigners)
            .set({ isActive: 0, signerToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(realEstateContractSigners.id, row.id));
        }
      }
      let position = 0;
      for (const c of candidates) {
        position += 1;
        // Le principal garde l'email fige sur le contrat (comportement historique).
        const email = c.role === "principal" ? contract.tenantEmail ?? null : c.email;
        const row = existing.find((r) => r.customerId === c.customerId);
        // Signataire deja signe d'un envoi partiel : conserve, pas de renvoi.
        const keepSigned = !!row && row.status === "signed" && contract.status !== "signed" && row.isActive === 1;
        const token = crypto.randomUUID();
        const common = {
          role: c.role,
          position,
          signerName: c.name,
          signerEmail: email,
          signerPhone: c.phone,
          isActive: 1,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        };
        let signerId: number;
        if (isPreviewing()) {
          // Apercu : rien n'est ecrit, les liens deja envoyes restent valides.
          signerId = row?.id ?? 0;
        } else if (row) {
          signerId = row.id;
          if (keepSigned) {
            await this.db.update(realEstateContractSigners).set(common).where(eq(realEstateContractSigners.id, row.id));
          } else {
            await this.db
              .update(realEstateContractSigners)
              .set({
                ...common,
                status: "sent",
                method: null,
                signerToken: token,
                signerTokenExpiry: expiry,
                sentAt: sql`CURRENT_TIMESTAMP`,
                viewedAt: null,
                signedAt: null,
                signatureData: null,
                signerIp: null,
                signerUserAgent: null,
              })
              .where(eq(realEstateContractSigners.id, row.id));
          }
        } else {
          const [ins] = await this.db.insert(realEstateContractSigners).values({
            organizationId: orgId,
            contractId: id,
            customerId: c.customerId as number,
            ...common,
            status: "sent",
            signerToken: token,
            signerTokenExpiry: expiry,
            sentAt: sql`CURRENT_TIMESTAMP`,
            createdAt: sql`CURRENT_TIMESTAMP`,
          });
          signerId = Number(ins.insertId);
        }
        targets.push({ ...c, email, signerId, token, skip: keepSigned });
      }
    }

    // Principal (sinon 1er non signe) : sert au lien renvoye au gestionnaire. Le jeton n'est
    // recopie sur le contrat QUE pour un contrat ancien sans lignes signataires (repli) :
    // sinon un colocataire pourrait signer a la place du principal avec ce jeton.
    const main = targets.find((t) => t.role === "principal" && !t.skip) ?? targets.find((t) => !t.skip);
    const resetRes = isPreviewing() ? null : await this.db
      .update(realEstateContracts)
      .set({
        status: "sent",
        signerToken: legacyOnly && main ? main.token : null,
        signerTokenExpiry: legacyOnly && main ? expiry : null,
        sentAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId), ne(realEstateContracts.status, "signed")));
    if (resetRes && this.affected(resetRes) < 1) {
      throw new GoneException("This contract has already been signed.");
    }

    const errors: unknown[] = [];
    const unreachable: Array<{ id: number | null; name: string; role: string }> = [];
    const multi = targets.length > 1;
    for (const t of targets) {
      if (t.skip) continue;
      // PAS de dedoublonnage : chaque signataire a SON lien et doit le recevoir,
      // meme si deux locataires partagent un numero ou un email.
      const out = await this.deliverSigningLink(id, orgId, t, t.token, { phones: new Set(), emails: new Set() });
      if (!out.emailTo && !out.smsTo) unreachable.push({ id: t.signerId, name: t.name, role: t.role });
      if (out.error) {
        errors.push(out.error);
        this.logger.warn(`Contract ${id} signing email failed for ${t.name}: ${out.error instanceof Error ? out.error.message : String(out.error)}`);
      }
      await this.log(
        id,
        orgId,
        "sent",
        null,
        null,
        `Sent to ${out.emailTo ?? t.email ?? "no email"}${out.smsTo ? ` / SMS ${out.smsTo}` : ""}${multi ? ` - ${t.name}` : ""}${out.skipped.length ? ` (${out.skipped.join(", ")})` : ""}${out.error ? " (email en echec)" : ""}`,
        t.signerId,
      );
    }
    // Un seul locataire : comportement historique (l'echec d'email remonte).
    if (!multi && errors.length) throw errors[0];

    await this.publishContractUpdate("status_changed", id, contract.leaseId);
    const signingUrl = main ? `${env.appUrl}/sign/${main.token}` : "";
    return {
      message: "Contract sent.",
      id,
      signingUrl,
      token: main?.token ?? null,
      signers: targets.map((t) => ({ id: t.signerId, name: t.name, role: t.role, status: t.skip ? "signed" : "sent" })),
      unreachable,
    };
  }

  // Le locataire a signé le bail à la main sur papier : on importe le scan/photo
  // et on marque le contrat "signed" comme pour une signature électronique.
  async markSignedManually(id: number, file: unknown, orgId: number, userId?: number | null, replace = false) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");
    const contract = rows[0];
    // Signé électroniquement (signature manuscrite numérique, pas de scan) : jamais d'import papier par-dessus.
    if (contract.status === "signed" && contract.signatureData && !contract.signedDocumentId) {
      throw new GoneException("Contrat déjà signé électroniquement.");
    }
    // Contrat déjà signé : on refuse seulement s'il a encore sa preuve attachée.
    // Si le scan a été supprimé (signedDocumentId détaché), on autorise le ré-import.
    if (contract.status === "signed" && contract.signedDocumentId) {
      // Idempotence (retry apres coupure reseau) : meme nom + meme taille que le scan deja importe => 200.
      const [existing] = await this.db
        .select({ originalName: realEstateLeaseDocuments.originalName, sizeBytes: realEstateLeaseDocuments.sizeBytes })
        .from(realEstateLeaseDocuments)
        .where(eq(realEstateLeaseDocuments.id, contract.signedDocumentId))
        .limit(1);
      const f = file as { originalname?: string; size?: number } | undefined;
      const sameName = (existing?.originalName ?? null) === (f?.originalname ? String(f.originalname).slice(0, 255) : null);
      if (existing && sameName && Number(existing.sizeBytes) === Number(f?.size)) {
        const current = await this.getContract(id, orgId);
        // Remplacement demandé avec le meme fichier : rien n'a change (replaced:false).
        return replace ? { ...current, replaced: false } : current;
      }
      if (!replace) throw new GoneException("This contract has already been signed.");
    } else if (replace) {
      // Remplacement : uniquement pour un contrat signé qui a encore un scan actif.
      throw new BadRequestException("Remplacement impossible : le contrat n'a pas de scan signé.");
    }

    const stored = await this.objectStorage.putDocument(
      file as Parameters<ObjectStorageService["putDocument"]>[0],
      `domus/leases/${orgId}/${contract.leaseId}/documents`,
    );
    const originalName = (file as { originalname?: string })?.originalname;
    const [docResult] = await this.db.insert(realEstateLeaseDocuments).values({
      organizationId: orgId,
      leaseId: contract.leaseId,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: originalName ? String(originalName).slice(0, 255) : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      notes: "Bail signe a la main (papier)",
      isActive: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const documentId = Number(docResult.insertId);

    // Repli : le remplacement perd la course parce que le scan a ete detache entre-temps => chemin d'import.
    let fellBack = false;
    if (replace) {
      // Condition anti-course : seul le premier remplacement concurrent gagne (le scan courant doit etre inchange).
      const swapped = await this.db
        .update(realEstateContracts)
        .set({ signedDocumentId: documentId, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(
          and(
            eq(realEstateContracts.id, id),
            eq(realEstateContracts.status, "signed"),
            eq(realEstateContracts.signedDocumentId, contract.signedDocumentId as number),
          ),
        );
      if (this.affected(swapped) < 1) {
        const [cur] = await this.db
          .select({ signedDocumentId: realEstateContracts.signedDocumentId })
          .from(realEstateContracts)
          .where(eq(realEstateContracts.id, id))
          .limit(1);
        if (!cur || cur.signedDocumentId != null) {
          // Un autre remplacement a gagne : le nouveau document est archive.
          await this.db
            .update(realEstateLeaseDocuments)
            .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(eq(realEstateLeaseDocuments.id, documentId));
          throw new ConflictException("Le scan du bail a été modifié entre-temps. Rechargez puis réessayez.");
        }
        fellBack = true;
      } else {
        // Ancien scan archive (soft delete) : l'objet de stockage est conserve.
        await this.db
          .update(realEstateLeaseDocuments)
          .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(realEstateLeaseDocuments.id, contract.signedDocumentId as number));
        await this.log(
          id,
          orgId,
          "scan_replaced",
          null,
          null,
          `Scan du bail remplacé par ${originalName ? String(originalName).slice(0, 255) : "un nouveau fichier"}`,
        );
        await this.publishContractUpdate("status_changed", id, contract.leaseId);
        return { ...(await this.getContract(id, orgId)), replaced: true };
      }
    }

    // Condition anti-course : seul le premier import concurrent gagne (statut pas encore signe, ou scan detache).
    const claimed = await this.db
      .update(realEstateContracts)
      .set({
        status: "signed",
        signedAt: sql`CURRENT_TIMESTAMP`,
        signerToken: null,
        signedDocumentId: documentId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(realEstateContracts.id, id),
          or(ne(realEstateContracts.status, "signed"), isNull(realEstateContracts.signedDocumentId)),
        ),
      );
    if (this.affected(claimed) < 1) {
      // Perdu la course : soft delete du document insere, pas de second log ni de bienvenue.
      await this.db
        .update(realEstateLeaseDocuments)
        .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateLeaseDocuments.id, documentId));
      if (fellBack) throw new ConflictException("Le scan du bail a été modifié entre-temps. Rechargez puis réessayez.");
      return this.getContract(id, orgId);
    }

    // Scan papier = tous les signataires actifs ont signe (methode papier) ; liens invalides.
    await this.db
      .update(realEstateContractSigners)
      .set({
        status: "signed",
        method: "paper",
        signedAt: sql`COALESCE(signed_at, CURRENT_TIMESTAMP)`,
        signerToken: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(realEstateContractSigners.contractId, id),
          eq(realEstateContractSigners.organizationId, orgId),
          eq(realEstateContractSigners.isActive, 1),
          ne(realEstateContractSigners.status, "signed"),
        ),
      );

    let importerName: string | null = null;
    if (userId) {
      const [u] = await this.db
        .select({ firstName: users.firstName, lastName: users.lastName, username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (u) importerName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username || null;
    }
    await this.log(
      id,
      orgId,
      "signed_paper",
      null,
      null,
      `Signature papier importée${importerName ? ` par ${importerName}` : ""}`,
    );
    await this.publishContractUpdate("status_changed", id, contract.leaseId);

    // Message de bienvenue (email + SMS) : envoyé une seule fois, best-effort, sans bloquer la réponse.
    void this.claimAndDeliverWelcome(contract, orgId)
      .then(() => this.publishContractUpdate("status_changed", id, contract.leaseId))
      .catch((err) =>
      this.logger.warn(`Contract ${id}: welcome delivery failed: ${err instanceof Error ? err.message : String(err)}`),
    );

    return this.getContract(id, orgId);
  }

  /**
   * Bienvenue automatique : claim atomique (UPDATE ... WHERE welcome_message_sent_at IS NULL),
   * n'envoie que si 1 ligne touchee ; en cas d'echec, le claim est libere (renvoi manuel possible).
   */
  private async claimAndDeliverWelcome(
    contract: { id: number; leaseId: number; tenantEmail: string | null; tenantName: string | null },
    orgId: number,
  ) {
    const claim = await this.db
      .update(realEstateContracts)
      .set({ welcomeMessageSentAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(realEstateContracts.id, contract.id),
          eq(realEstateContracts.organizationId, orgId),
          isNull(realEstateContracts.welcomeMessageSentAt),
        ),
      );
    if (this.affected(claim) < 1) return;
    try {
      await this.deliverWelcomeMessage(contract, orgId);
    } catch (error) {
      await this.db
        .update(realEstateContracts)
        .set({ welcomeMessageSentAt: null })
        .where(and(eq(realEstateContracts.id, contract.id), eq(realEstateContracts.organizationId, orgId)));
      this.logger.warn(`Contract ${contract.id} signed, but welcome message failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Envoi manuel du message de bienvenue (bouton UI) : uniquement si le contrat
  // est signé et que le message n'est jamais parti (échec de l'envoi automatique).
  async sendWelcomeMessage(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");
    const contract = rows[0];
    if (contract.status !== "signed") {
      throw new BadRequestException("Le contrat doit d'abord être signé pour envoyer le message de bienvenue.");
    }
    if (contract.welcomeMessageSentAt) {
      throw new BadRequestException("Le message de bienvenue a déjà été envoyé à ce locataire.");
    }

    return this.deliverWelcomeMessage(contract, orgId);
  }

  /**
   * Message de bienvenue au locataire après signature du bail : salutation avec le nom
   * complet, confirmation que le contrat est signé, remerciement pour la confiance,
   * adresse complète du logement et période de location. Envoyé par email ET SMS
   * (même texte court, comme les autres messages Domus). Un template configurable
   * "contract_signed" (Réglages → Messages) est prioritaire sur le texte par défaut.
   */
  private async deliverWelcomeMessage(
    contract: { id: number; leaseId: number; tenantEmail: string | null; tenantName: string | null },
    orgId: number,
  ) {
    const lease = await this.getLeaseDetails(contract.leaseId, orgId);
    const company = await this.getCompanyInfo(orgId);
    const companyName = company.companyName || company.landlordName || "Votre gestionnaire";
    // Téléphone de contact : bailleur en priorité, sinon entreprise (même logique que les contrats).
    const contactPhone = company.landlordPhone || company.phone || "";

    const tenantName =
      (lease.tenantType === "company" ? lease.tenantRepresentativeName ?? "" : "") ||
      (lease.tenantId ? await this.ownerNotifications.civilNameForTenant(lease.tenantId, orgId) : "") ||
      lease.tenantName ||
      contract.tenantName ||
      "Locataire";
    const reference = lease.reference ?? "";
    const startDate = this.formatDate(lease.startDate);
    const endDate = this.formatDate(lease.endDate);
    const months = this.monthsBetween(lease.startDate, lease.endDate);
    const duration = months > 0 ? `${months} mois` : "";
    const address =
      [lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ") || lease.propertyName || "votre logement";
    const unitPart = lease.unitName ? ` (${lease.unitName})` : "";
    const rentDisplay = this.formatMoneyWithCurrency(lease.rentAmount, lease);
    // Le locataire doit savoir A QUI il loue et QUEL logement exactement : on
    // expose le bailleur reel (proprietaire du bien, sinon reglages) et le
    // numero d'appartement/unite comme placeholders dedies, en plus de
    // {address} qui ne portait jusqu'ici que la rue et la ville.
    const landlord = this.resolveLandlord(lease, company);
    const landlordName = landlord.name || companyName;
    const unitLabel = lease.unitName ?? "";
    // Le locataire doit joindre les personnes en charge de SON immeuble : le
    // proprietaire du bien et le gestionnaire qui lui est assigne, pas un
    // numero d'entreprise generique. Repli sur le contact societe si aucun des
    // deux n'est joignable.
    const propertyContacts = await this.ownerNotifications.propertyContactVars(
      lease.propertyId ? Number(lease.propertyId) : null,
      orgId,
    );
    const contacts =
      propertyContacts.contacts || `${companyName}${contactPhone ? ` au ${contactPhone}` : ""}`;

    const tpl = await this.db
      .select({ subject: emailTemplates.subject, body: emailTemplates.body })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.eventType, "contract_signed"), eq(emailTemplates.status, "true")))
      .limit(1);

    // Message propre a UN destinataire (salutation a son nom). Un template
    // configurable "contract_signed" (Reglages > Messages) est prioritaire.
    const buildMessage = (name: string) => {
      let subject = `Bienvenue ! Votre bail ${reference} est signé et confirmé`.replace(/\s+/g, " ").trim();
      let text =
        `Bonjour ${name}, félicitations ! Votre contrat de bail est bien signé et confirmé. ` +
        `Bienvenue dans votre nouveau logement : ${address}${unitPart}. ` +
        `Votre bailleur est ${landlordName}. ` +
        `Votre location court du ${startDate} au ${endDate}${duration ? ` (${duration})` : ""}. ` +
        `Merci de votre confiance. ` +
        `Pour toute question, contactez ${contacts}. ` +
        `— ${companyName}`;
      if (tpl.length) {
        const fill = (s: string | null) =>
          String(s || "")
            .replace(/\{tenantName\}/g, name)
            .replace(/\{firstName\}/g, name)
            .replace(/\{reference\}/g, reference)
            .replace(/\{amount\}/g, rentDisplay)
            .replace(/\{address\}/g, `${address}${unitPart}`)
            .replace(/\{startDate\}/g, startDate)
            .replace(/\{endDate\}/g, endDate)
            .replace(/\{duration\}/g, duration)
            .replace(/\{contactPhone\}/g, contactPhone)
            .replace(/\{ownerContact\}/g, propertyContacts.ownerContact)
            .replace(/\{managerContact\}/g, propertyContacts.managerContact)
            .replace(/\{contacts\}/g, contacts)
            .replace(/\{landlordName\}/g, landlordName)
            .replace(/\{unit\}/g, unitLabel)
            // Un bail sans unite laisserait "appartement ," : on nettoie le mot
            // d'introduction devenu orphelin plutot que d'envoyer le texte casse.
            .replace(/,?\s*\b(appartement|appt|unite)\b\s*:?\s*(?=[.,;]|$)/gi, "")
            .replace(/\s+([.,;!?])/g, "$1")
            .replace(/,\s*\./g, ".")
            .replace(/\s+/g, " ")
            .trim();
        if (tpl[0].subject) subject = fill(tpl[0].subject);
        if (tpl[0].body) text = fill(tpl[0].body);
      }
      return { subject, text };
    };

    // Destinataires : locataire principal puis colocataires actifs.
    const recipients: Array<{ tenantId: number | null; name: string; email: string | null; phone: string | null }> = [
      {
        tenantId: lease.tenantId ?? null,
        name: tenantName,
        email: lease.tenantEmail || contract.tenantEmail || null,
        phone: lease.tenantPhone || null,
      },
    ];
    for (const co of lease.coTenants ?? []) {
      const civil = co.id ? await this.ownerNotifications.civilNameForTenant(co.id, orgId) : "";
      recipients.push({ tenantId: co.id ?? null, name: civil || co.name || "Locataire", email: co.email || null, phone: co.phone || null });
    }
    if (!recipients.some((r) => r.email || r.phone)) {
      throw new BadRequestException("Aucun email ni téléphone connu pour ce locataire.");
    }

    // Dedoublonnage par telephone normalise / email minuscule (comme l'envoi des liens de signature).
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    let emailSent = false;
    let smsSent = false;
    const sentTo: string[] = [];

    for (const r of recipients) {
      const { subject, text } = buildMessage(r.name);
      const emailKey = (r.email ?? "").trim().toLowerCase();
      if (r.email && emailKey && !seenEmails.has(emailKey)) {
        seenEmails.add(emailKey);
        try {
          const emailHtml = `<p>${this.escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
          const htmlWithFooter = r.tenantId
            ? await this.tenantPortal.appendPortalFooterToEmail(emailHtml, r.tenantId, orgId)
            : emailHtml;
          await this.sendEmail(r.email, subject, htmlWithFooter, "contract_signed", contract.id);
          emailSent = true;
          sentTo.push(r.email);
        } catch (error) {
          this.logger.warn(`Welcome email failed (contract ${contract.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const phoneKey = this.normPhone(r.phone);
      if (r.phone && phoneKey && !seenPhones.has(phoneKey)) {
        seenPhones.add(phoneKey);
        try {
          const messageWithFooter = this.ownerNotifications.fitOneSms(
            r.tenantId ? await this.tenantPortal.appendPortalFooterToSms(text, r.tenantId, orgId) : text,
          );
          const res = await this.sms.sendSms({
            phone: r.phone,
            message: messageWithFooter,
            organizationId: orgId,
            smsType: "lease_welcome",
            relatedType: "real-estate-lease",
            relatedId: contract.leaseId,
            previewLabel: `Locataire · ${r.name}`,
          });
          if (res?.success) {
            smsSent = true;
            sentTo.push(`SMS ${r.phone}`);
          } else {
            this.logger.warn(`Welcome SMS not sent (contract ${contract.id}): ${res?.message}`);
          }
        } catch (error) {
          this.logger.warn(`Welcome SMS error (contract ${contract.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (!emailSent && !smsSent) {
      throw new BadRequestException("Le message de bienvenue n'a pas pu être envoyé (email et SMS en échec).");
    }

    if (!isPreviewing()) {
      await this.db
        .update(realEstateContracts)
        .set({ welcomeMessageSentAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateContracts.id, contract.id));
    }

    await this.log(contract.id, orgId, "welcome_sent", null, null, `Message de bienvenue envoye : ${sentTo.join(" / ")}`);
    await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);

    return { message: "Message de bienvenue envoyé.", emailSent, smsSent };
  }

  async getContractByToken(token: string, ip: string, ua: string) {
    const { contract, signer } = await this.findByToken(token);

    if (signer && signer.status !== "signed") {
      await this.db
        .update(realEstateContractSigners)
        .set({ status: "viewed", viewedAt: sql`COALESCE(viewed_at, CURRENT_TIMESTAMP)`, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateContractSigners.id, signer.id), ne(realEstateContractSigners.status, "signed")));
    }

    if (contract.status !== "signed") {
      await this.db
        .update(realEstateContracts)
        .set({ status: "viewed", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateContracts.id, contract.id));
      await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);
    }

    await this.log(contract.id, contract.organizationId, "viewed", ip, ua, null, signer?.id ?? null);

    const signers = signer ? (await this.activeSigners(contract.id)).map((x) => this.signerView(x)) : [];

    return {
      id: contract.id,
      status: contract.status,
      contractContent: contract.contractContent,
      tenantName: contract.tenantName,
      tenantEmail: contract.tenantEmail,
      signatureData: contract.signatureData,
      sentAt: contract.sentAt,
      signedAt: contract.signedAt,
      createdAt: contract.createdAt,
      companyInfo: await this.getCompanyInfo(contract.organizationId),
      // Qui signe avec ce lien + avancement des autres (sans jetons).
      signer: signer
        ? { id: signer.id, name: signer.signerName, role: signer.role, status: signer.status === "sent" ? "viewed" : signer.status }
        : null,
      signers: signers.map((x) => ({ id: x.id, name: x.name, role: x.role, status: x.status })),
    };
  }

  async signContract(token: string, dto: SignContractDto, ip: string, ua: string) {
    const { contract, signer } = await this.findByToken(token);

    if (contract.status === "signed") {
      throw new GoneException("This contract has already been signed.");
    }

    if (!signer) {
      // Contrat ancien sans lignes signataires : comportement historique inchange.
      await this.db
        .update(realEstateContracts)
        .set({
          status: "signed",
          signatureData: dto.signatureData,
          signedAt: sql`CURRENT_TIMESTAMP`,
          signerIp: ip,
          signerUserAgent: ua,
          signerToken: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(realEstateContracts.id, contract.id));

      await this.log(contract.id, contract.organizationId, "signed", ip, ua, `Signed by ${contract.tenantName ?? "tenant"}`);
      await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);

      // Message de bienvenue (email + SMS) : best-effort, la signature reste valide même si l'envoi échoue.
      await this.claimAndDeliverWelcome(contract, contract.organizationId);

      // Reponse PUBLIQUE reduite (pas de vue gestionnaire).
      const legacySigner = { id: 0, name: contract.tenantName ?? null, role: "principal", status: "signed" };
      return {
        message: "Contract signed successfully.",
        status: "signed",
        signer: legacySigner,
        signers: [legacySigner],
        signersSigned: 1,
        signersTotal: 1,
      };
    }

    const orgId = contract.organizationId;
    if (signer.status === "signed") {
      throw new GoneException("This contract has already been signed.");
    }

    // 1) Signataire : UPDATE conditionnel (anti double-signature simultanee).
    const signerRes = await this.db
      .update(realEstateContractSigners)
      .set({
        status: "signed",
        method: "electronic",
        signatureData: dto.signatureData,
        signedAt: sql`CURRENT_TIMESTAMP`,
        signerIp: ip,
        signerUserAgent: ua,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateContractSigners.id, signer.id), ne(realEstateContractSigners.status, "signed")));
    if (this.affected(signerRes) < 1) {
      throw new GoneException("This contract has already been signed.");
    }
    await this.log(contract.id, orgId, "signed", ip, ua, `Signed by ${signer.signerName ?? contract.tenantName ?? "tenant"}`, signer.id);

    // 2) Contrat -> signed SEULEMENT si plus aucun signataire actif non signe.
    const remaining = await this.db
      .select({ id: realEstateContractSigners.id })
      .from(realEstateContractSigners)
      .where(
        and(
          eq(realEstateContractSigners.contractId, contract.id),
          eq(realEstateContractSigners.isActive, 1),
          ne(realEstateContractSigners.status, "signed"),
        ),
      );

    let finalised = false;
    if (remaining.length === 0) {
      const principal = (await this.activeSigners(contract.id)).find((x) => x.role === "principal");
      const main = principal ?? signer;
      const contractRes = await this.db
        .update(realEstateContracts)
        .set({
          status: "signed",
          signatureData: principal?.signatureData ?? dto.signatureData,
          signedAt: sql`CURRENT_TIMESTAMP`,
          signerIp: main.id === signer.id ? ip : main.signerIp,
          signerUserAgent: main.id === signer.id ? ua : main.signerUserAgent,
          signerToken: null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(realEstateContracts.id, contract.id), ne(realEstateContracts.status, "signed")));
      finalised = this.affected(contractRes) >= 1;
      if (finalised) {
        // Les liens ne servent plus : on invalide les jetons des signataires.
        await this.db
          .update(realEstateContractSigners)
          .set({ signerToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(realEstateContractSigners.contractId, contract.id));
        await this.log(contract.id, orgId, "all_signed", ip, ua, "Tous les signataires ont signe");
      }
    }

    await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);
    const publicSigners = (await this.activeSigners(contract.id)).map((x) => ({
      id: x.id,
      name: x.signerName,
      role: x.role,
      status: x.id === signer.id ? "signed" : x.status,
    }));
    const signersSigned = publicSigners.filter((x) => x.status === "signed").length;
    const allSigned = finalised || (publicSigners.length > 0 && signersSigned === publicSigners.length);

    // Bienvenue UNE seule fois, quand le contrat devient signe (best-effort, claim atomique).
    if (finalised) await this.claimAndDeliverWelcome(contract, orgId);

    // Reponse PUBLIQUE reduite : jamais la vue gestionnaire (jetons, contacts, audit).
    return {
      message: "Contract signed successfully.",
      status: allSigned ? "signed" : contract.status,
      signer: { id: signer.id, name: signer.signerName, role: signer.role, status: "signed" },
      signers: publicSigners,
      signersSigned,
      signersTotal: publicSigners.length,
    };
  }

  /** Liste des signataires d'un contrat + avancement (sans jetons). */
  async listSigners(id: number, orgId: number, scope: "all" | number[] = "all") {
    await this.requireContractInScope(id, orgId, scope);
    const signers = (await this.activeSigners(id)).map((x) => this.signerView(x));
    return {
      contractId: id,
      signers,
      signersSigned: signers.filter((x) => x.status === "signed").length,
      signersTotal: signers.length,
    };
  }

  /** Renvoie le lien a UN signataire : nouveau jeton, throttle 10 min par signataire. */
  async resendSigner(id: number, signerId: number, orgId: number, scope: "all" | number[] = "all") {
    const contract = await this.requireContractInScope(id, orgId, scope);
    if (contract.status !== "sent" && contract.status !== "viewed") {
      throw new BadRequestException("Le contrat n'est pas en attente de signature.");
    }
    const [signer] = await this.db
      .select()
      .from(realEstateContractSigners)
      .where(
        and(
          eq(realEstateContractSigners.id, signerId),
          eq(realEstateContractSigners.contractId, id),
          eq(realEstateContractSigners.organizationId, orgId),
          eq(realEstateContractSigners.isActive, 1),
        ),
      )
      .limit(1);
    if (!signer) throw new NotFoundException("Signataire introuvable.");
    if (signer.status === "signed") throw new BadRequestException("Ce signataire a deja signe.");

    const token = crypto.randomUUID();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    // Apercu : meme refus que l'envoi si un lien est parti il y a moins de 10 min, sans rien ecrire.
    if (isPreviewing()) {
      if (signer.lastResentAt && Date.now() - new Date(signer.lastResentAt as any).getTime() < 10 * 60_000) {
        throw new HttpException("Un lien a deja ete renvoye a ce signataire il y a moins de 10 minutes.", HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    // Throttle atomique : la pose de lastResentAt ne passe que si > 10 min.
    const res = isPreviewing() ? null : await this.db
      .update(realEstateContractSigners)
      .set({
        signerToken: token,
        signerTokenExpiry: expiry,
        status: signer.status === "viewed" ? "viewed" : "sent",
        sentAt: sql`CURRENT_TIMESTAMP`,
        lastResentAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(realEstateContractSigners.id, signerId),
          ne(realEstateContractSigners.status, "signed"),
          sql`(${realEstateContractSigners.lastResentAt} IS NULL OR ${realEstateContractSigners.lastResentAt} < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))`,
        ),
      );
    if (res && this.affected(res) < 1) {
      throw new HttpException("Un lien a deja ete renvoye a ce signataire il y a moins de 10 minutes.", HttpStatus.TOO_MANY_REQUESTS);
    }

    // Le jeton reste sur la ligne signataire UNIQUEMENT (jamais recopie sur le contrat).
    // Les anciens jetons globaux du contrat sont neutralises : ils ne servent plus.
    if (!isPreviewing()) await this.db
      .update(realEstateContracts)
      .set({ signerToken: null, signerTokenExpiry: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)));

    const out = await this.deliverSigningLink(
      id,
      orgId,
      { customerId: signer.customerId, name: signer.signerName ?? "", email: signer.signerEmail, phone: signer.signerPhone },
      token,
      { phones: new Set(), emails: new Set() },
    );
    await this.log(
      id,
      orgId,
      "resent",
      null,
      null,
      `Resent to ${out.emailTo ?? "no email"}${out.smsTo ? ` / SMS ${out.smsTo}` : ""} - ${signer.signerName ?? ""}`,
      signer.id,
    );
    if (out.error) throw out.error;
    return { message: "Link resent.", id, signerId, signingUrl: `${env.appUrl}/sign/${token}` };
  }

  /**
   * Le bail change de locataires : les liens deja envoyes ne correspondent plus.
   * Contrat sent/viewed -> signataires desactives (soft), contrat remis en draft
   * (a regenerer/renvoyer). Contrat signe ou brouillon : rien.
   */
  async resetSignersForLease(leaseId: number, orgId: number): Promise<{ reset: boolean; contractId: number | null }> {
    const [contract] = await this.db
      .select()
      .from(realEstateContracts)
      .where(
        and(
          eq(realEstateContracts.leaseId, leaseId),
          eq(realEstateContracts.organizationId, orgId),
          ne(realEstateContracts.status, "deleted"),
        ),
      )
      .orderBy(desc(realEstateContracts.id))
      .limit(1);
    if (!contract || (contract.status !== "sent" && contract.status !== "viewed")) {
      return { reset: false, contractId: contract?.id ?? null };
    }

    await this.db
      .update(realEstateContractSigners)
      .set({ isActive: 0, signerToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContractSigners.contractId, contract.id), eq(realEstateContractSigners.organizationId, orgId)));
    await this.db
      .update(realEstateContracts)
      .set({ status: "draft", signerToken: null, signerTokenExpiry: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContracts.id, contract.id), eq(realEstateContracts.organizationId, orgId)));
    await this.log(contract.id, orgId, "signers_reset", null, null, "Locataires du bail modifies : contrat remis en brouillon, a regenerer et renvoyer.");
    await this.publishContractUpdate("status_changed", contract.id, leaseId);
    return { reset: true, contractId: contract.id };
  }

  /** RBAC par bien : le bail du contrat doit etre dans le perimetre (sinon 404, comme les autres routes Domus). */
  private async requireContractInScope(id: number, orgId: number, scope: "all" | number[]): Promise<ContractRow> {
    const contract = await this.requireContract(id, orgId);
    if (scope !== "all") {
      const [lease] = await this.db
        .select({ propertyId: realEstateLeases.propertyId })
        .from(realEstateLeases)
        .where(and(eq(realEstateLeases.id, contract.leaseId), eq(realEstateLeases.organizationId, orgId)))
        .limit(1);
      if (!lease || !scope.includes(Number(lease.propertyId))) throw new NotFoundException("Contract not found.");
    }
    return contract;
  }

  private async requireContract(id: number, orgId: number): Promise<ContractRow> {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Contract not found.");
    return rows[0];
  }

  async renewLease(leaseId: number, dto: { startDate?: string; endDate?: string; rentAmount?: number; templateId?: number; endCurrentLease?: boolean }, orgId: number, createdBy?: number) {
    const rows = await this.db
      .select()
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");
    const current = rows[0];

    const baseStart = current.endDate ? new Date(current.endDate as unknown as string) : new Date();
    if (current.endDate) {
      // start = day after current lease end
      baseStart.setDate(baseStart.getDate() + 1);
    }
    const newStart = dto.startDate ? new Date(dto.startDate) : baseStart;

    let newEnd: Date;
    if (dto.endDate) {
      newEnd = new Date(dto.endDate);
    } else if (current.startDate && current.endDate) {
      const months = this.monthsBetween(current.startDate as unknown as string, current.endDate as unknown as string) || 12;
      newEnd = new Date(newStart);
      newEnd.setMonth(newEnd.getMonth() + months);
    } else {
      newEnd = new Date(newStart);
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }

    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const reference = `${current.reference ?? `BAIL-${current.id}`}-R${Date.now().toString().slice(-4)}`;
    const rentAmount = dto.rentAmount != null ? String(dto.rentAmount) : current.rentAmount;

    const [insertResult] = await this.db.insert(realEstateLeases).values({
      organizationId: orgId,
      reference,
      propertyId: current.propertyId,
      unitId: current.unitId,
      tenantId: current.tenantId,
      startDate: formatDate(newStart),
      endDate: formatDate(newEnd),
      nextInvoiceDate: formatDate(newStart),
      billingCycle: current.billingCycle,
      rentAmount,
      securityDeposit: current.securityDeposit,
      moveInMeterReading: current.moveInMeterReading,
      moveInNotes: current.moveInNotes,
      terms: current.terms,
      signingCity: current.signingCity,
      status: "active",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const newLeaseId = Number(insertResult.insertId);

    if (dto.endCurrentLease) {
      await this.db
        .update(realEstateLeases)
        .set({ status: "ended", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)));
    }

    // Les colocataires actifs suivent le renouvellement (avant le contrat, pour
    // qu'il liste tous les preneurs et que chacun puisse le signer).
    const coRows = await this.db
      .select({ customerId: realEstateLeaseCotenants.customerId, position: realEstateLeaseCotenants.position })
      .from(realEstateLeaseCotenants)
      .where(
        and(
          eq(realEstateLeaseCotenants.leaseId, leaseId),
          eq(realEstateLeaseCotenants.organizationId, orgId),
          eq(realEstateLeaseCotenants.isActive, 1),
        ),
      )
      .orderBy(realEstateLeaseCotenants.position, realEstateLeaseCotenants.id);
    const copied = new Set<number>();
    for (const co of coRows) {
      if (co.customerId === current.tenantId || copied.has(co.customerId)) continue;
      copied.add(co.customerId);
      await this.db.insert(realEstateLeaseCotenants).values({
        organizationId: orgId,
        leaseId: newLeaseId,
        customerId: co.customerId,
        position: co.position,
        isActive: 1,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    const newContract = await this.createContract({ leaseId: newLeaseId, templateId: dto.templateId }, orgId, createdBy);

    return { lease: { id: newLeaseId, reference }, contract: newContract };
  }

  /** Re-genere le texte d'un contrat BROUILLON avec un autre modele (aucun effet une fois envoye/signe). */
  async changeContractTemplate(id: number, templateId: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateContracts.id, leaseId: realEstateContracts.leaseId, status: realEstateContracts.status })
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");
    if (rows[0].status !== "draft") {
      throw new BadRequestException("Le modele ne peut etre change que sur un contrat en brouillon.");
    }

    const template = await this.templates.getById(templateId, orgId).catch(() => null);
    if (!template) throw new NotFoundException("Template not found.");

    const lease = await this.getLeaseDetails(rows[0].leaseId, orgId);
    const company = await this.getCompanyInfo(orgId);
    const content = await this.renderContent(lease, company, orgId, templateId);

    await this.db
      .update(realEstateContracts)
      .set({ contractContent: content, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)));
    await this.log(id, orgId, "template_changed", null, null, `Template changed to "${template.name}"`);
    await this.publishContractUpdate("updated", id, rows[0].leaseId);
    return this.getContract(id, orgId);
  }

  async deleteContract(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateContracts.id, leaseId: realEstateContracts.leaseId })
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");

    await this.db
      .update(realEstateContracts)
      .set({ status: "deleted", signerToken: null, signerTokenExpiry: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)));
    // Les liens des signataires ne doivent plus fonctionner (soft : lignes conservees).
    await this.db
      .update(realEstateContractSigners)
      .set({ isActive: 0, signerToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContractSigners.contractId, id), eq(realEstateContractSigners.organizationId, orgId)));
    await this.publishContractUpdate("deleted", id, rows[0].leaseId);
    return { message: "Contract deleted." };
  }

  private async publishContractUpdate(action: DataUpdateAction, contractId: number, leaseId?: number | null) {
    if (isPreviewing()) return;
    return this.realtimeData.publishDataUpdated({
      entity: "contract",
      action,
      entityId: contractId,
      scope: await this.contractScope(leaseId),
    });
  }

  private async contractScope(leaseId?: number | null): Promise<Partial<DataUpdateScope>> {
    if (!leaseId) return { module: "propertyManagement" };

    const [lease] = await this.db
      .select({
        propertyId: realEstateLeases.propertyId,
        unitId: realEstateLeases.unitId,
      })
      .from(realEstateLeases)
      .where(eq(realEstateLeases.id, leaseId))
      .limit(1);

    return {
      module: "propertyManagement",
      propertyId: lease?.propertyId ?? null,
      unitId: lease?.unitId ?? null,
    };
  }

  /**
   * Resout un jeton de signature : d'abord le signataire (1 jeton par locataire),
   * sinon REPLI sur l'ancien jeton du contrat (liens deja envoyes avant les
   * signataires). signer = null => contrat ancien sans lignes signataires.
   */
  private async findByToken(token: string): Promise<{ contract: ContractRow; signer: SignerRow | null }> {
    const signerRows = await this.db
      .select()
      .from(realEstateContractSigners)
      .where(and(eq(realEstateContractSigners.signerToken, token), eq(realEstateContractSigners.isActive, 1)))
      .limit(1);

    if (signerRows.length) {
      const signer = signerRows[0];
      const cRows = await this.db
        .select()
        .from(realEstateContracts)
        .where(and(eq(realEstateContracts.id, signer.contractId), eq(realEstateContracts.organizationId, signer.organizationId)))
        .limit(1);
      if (!cRows.length) throw new NotFoundException("Lien de signature invalide.");
      // Lien valable seulement sur un contrat en cours de signature (lecture seule si signe).
      if (!["sent", "viewed", "signed"].includes(cRows[0].status as string)) {
        throw new NotFoundException("Lien de signature invalide.");
      }
      if (signer.signerTokenExpiry && new Date() > signer.signerTokenExpiry) {
        throw new GoneException("Ce lien de signature a expiré.");
      }
      return { contract: cRows[0], signer };
    }

    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(eq(realEstateContracts.signerToken, token))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Lien de signature invalide.");

    const contract = rows[0];
    if (contract.signerTokenExpiry && new Date() > contract.signerTokenExpiry) {
      throw new GoneException("Ce lien de signature a expiré.");
    }

    // Un contrat qui a des signataires actifs ne peut plus etre signe par l'ancien
    // jeton "global" (il ne correspond a aucun locataire) : lien invalide.
    const active = await this.activeSigners(contract.id);
    if (active.length) throw new NotFoundException("Lien de signature invalide.");

    return { contract, signer: null };
  }

  private async activeSigners(contractId: number): Promise<SignerRow[]> {
    return this.db
      .select()
      .from(realEstateContractSigners)
      .where(and(eq(realEstateContractSigners.contractId, contractId), eq(realEstateContractSigners.isActive, 1)))
      .orderBy(realEstateContractSigners.position, realEstateContractSigners.id);
  }

  /** Vue publique/admin d'un signataire : jamais de jeton ni de donnees de signature brutes. */
  private signerView(s: SignerRow) {
    return {
      id: s.id,
      customerId: s.customerId,
      name: s.signerName,
      email: s.signerEmail,
      phone: s.signerPhone,
      role: s.role,
      position: s.position,
      status: s.status,
      method: s.method,
      sentAt: s.sentAt,
      viewedAt: s.viewedAt,
      signedAt: s.signedAt,
      lastResentAt: s.lastResentAt,
    };
  }

  private affected(res: unknown): number {
    const header = (Array.isArray(res) ? res[0] : res) as { affectedRows?: number } | undefined;
    return Number(header?.affectedRows ?? 0);
  }

  private normPhone(p: string | null | undefined): string {
    return normalizePhoneKey(p);
  }

  /**
   * Signataires attendus d'un bail : locataire principal puis colocataires actifs
   * (customers.status = 'true'), scope organisation, sans doublon de client.
   */
  private async loadSigningCandidates(leaseId: number, orgId: number): Promise<SigningCandidate[]> {
    const [lease] = await this.db
      .select({ tenantId: realEstateLeases.tenantId })
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);
    if (!lease) return [];

    const out: SigningCandidate[] = [];
    const fullName = (c: { firstName: string | null; lastName: string | null }) =>
      [c.firstName, c.lastName].filter(Boolean).join(" ") || "Locataire";

    if (lease.tenantId) {
      const [c] = await this.db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          tenantType: tenantDetails.tenantType,
          representativeName: tenantDetails.representativeName,
        })
        .from(customers)
        .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
        .where(and(eq(customers.id, lease.tenantId), eq(customers.organizationId, orgId), eq(customers.status, "true")))
        .limit(1);
      // Societe : le signataire du bail est son representant.
      const principalName =
        c?.tenantType === "company" && c.representativeName ? c.representativeName : c ? fullName(c) : "";
      if (c) out.push({ customerId: c.id, role: "principal", name: principalName, email: c.email ?? null, phone: c.phone ?? null });
    }

    const coRows = await this.db
      .select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName, email: customers.email, phone: customers.phone })
      .from(realEstateLeaseCotenants)
      .innerJoin(customers, eq(customers.id, realEstateLeaseCotenants.customerId))
      .where(
        and(
          eq(realEstateLeaseCotenants.leaseId, leaseId),
          eq(realEstateLeaseCotenants.organizationId, orgId),
          eq(realEstateLeaseCotenants.isActive, 1),
          eq(customers.organizationId, orgId),
          eq(customers.status, "true"),
        ),
      )
      .orderBy(realEstateLeaseCotenants.position, realEstateLeaseCotenants.id);
    for (const c of coRows) {
      if (out.some((o) => o.customerId === c.id)) continue;
      out.push({ customerId: c.id, role: "cotenant", name: fullName(c), email: c.email ?? null, phone: c.phone ?? null });
    }
    return out;
  }

  /**
   * Envoie le lien de signature d'UN signataire (email + SMS, pied de page portail
   * propre). seen = dedoublonnage par telephone normalise / email minuscule.
   * Retourne le detail pour l'audit ; une erreur d'email est remontee dans error.
   */
  private async deliverSigningLink(
    contractId: number,
    orgId: number,
    s: { customerId: number | null; name: string; email: string | null; phone: string | null },
    token: string,
    seen: { phones: Set<string>; emails: Set<string> },
  ): Promise<{ emailTo: string | null; smsTo: string | null; skipped: string[]; error: unknown }> {
    const signingUrl = `${env.appUrl}/sign/${token}`;
    const tenantId = s.customerId;
    const res = { emailTo: null as string | null, smsTo: null as string | null, skipped: [] as string[], error: null as unknown };

    const emailKey = (s.email ?? "").trim().toLowerCase();
    if (emailKey) {
      if (seen.emails.has(emailKey)) {
        res.skipped.push("email deja utilise par un autre signataire");
      } else {
        seen.emails.add(emailKey);
        try {
          const civilTenant = tenantId ? await this.ownerNotifications.civilNameForTenant(tenantId, orgId) : "";
          const signingHtml = this.signingEmailHtml(civilTenant || s.name || "", signingUrl);
          const htmlWithFooter = tenantId
            ? await this.tenantPortal.appendPortalFooterToEmail(signingHtml, tenantId, orgId)
            : signingHtml;
          await this.sendEmail(
            s.email as string,
            "Votre contrat de bail est prêt à être signé",
            htmlWithFooter,
            "contract_signature",
            contractId,
          );
          res.emailTo = s.email;
        } catch (error) {
          res.error = error;
        }
      }
    }

    const phoneKey = this.normPhone(s.phone);
    if (s.phone && phoneKey) {
      if (seen.phones.has(phoneKey)) {
        res.skipped.push("telephone deja utilise par un autre signataire");
      } else {
        seen.phones.add(phoneKey);
        const company = await this.getCompanyInfo(orgId);
        const companyName = company?.companyName || "votre gestionnaire";
        // Texte pilote depuis Reglages > Messages (evenement "contract_signature").
        const message = await this.ownerNotifications.renderMessage(
          "contract_signature",
          "Bonjour {tenantName}, votre bail est pret. Signez-le ici : {url} (valable 7 j). {companyName}",
          {
            tenantName: s.name || "",
            firstName: s.name || "",
            url: signingUrl,
            companyName,
            reference: "",
            amount: "",
          },
          { tenantId },
        );
        try {
          // fitOneSms apres le footer : le lien s'ajoute hors du rendu et ne doit
          // pas faire basculer le message sur un 2e segment facture.
          const messageWithFooter = this.ownerNotifications.fitOneSms(
            tenantId ? await this.tenantPortal.appendPortalFooterToSms(message, tenantId, orgId) : message,
          );
          const smsRes = await this.sms.sendSms({
            phone: s.phone,
            message: messageWithFooter,
            organizationId: orgId,
            smsType: "contract_signature",
            relatedType: "real-estate-contract",
            relatedId: contractId,
            previewLabel: `Signataire · ${s.name}`,
          });
          if (!smsRes?.success) this.logger.warn(`Contract signing SMS not sent (contract ${contractId}): ${smsRes?.message}`);
          res.smsTo = s.phone;
        } catch (error) {
          this.logger.warn(`Contract signing SMS error (contract ${contractId}): ${error instanceof Error ? error.message : String(error)}`);
          res.smsTo = s.phone;
        }
      }
    }
    return res;
  }

  private async getLeaseDetails(leaseId: number, orgId: number): Promise<LeaseDetails> {
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        tenantId: realEstateLeases.tenantId,
        reference: realEstateLeases.reference,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        rentAmount: realEstateLeases.rentAmount,
        currencyId: realEstateLeases.currencyId,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
        securityDeposit: realEstateLeases.securityDeposit,
        billingCycle: realEstateLeases.billingCycle,
        terms: realEstateLeases.terms,
        moveInNotes: realEstateLeases.moveInNotes,
        signingCity: realEstateLeases.signingCity,
        moveInMeterReading: realEstateLeases.moveInMeterReading,
        propertyId: realEstateLeases.propertyId,
        propertyName: realEstateProperties.name,
        propertyType: realEstateProperties.propertyType,
        propertyAddress: realEstateProperties.address,
        propertyCity: realEstateProperties.city,
        unitName: realEstateUnits.name,
        unitType: realEstateUnits.unitType,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantEmail: customers.email,
        tenantPhone: customers.phone,
        tenantAddress: customers.address,
        tenantIdDocumentType: tenantDetails.idDocumentType,
        tenantIdNumber: tenantDetails.idNumber,
        tenantType: tenantDetails.tenantType,
        tenantLegalForm: tenantDetails.legalForm,
        tenantRccm: tenantDetails.rccm,
        tenantCompanyNationalId: tenantDetails.companyNationalId,
        tenantTaxId: tenantDetails.taxId,
        tenantCompanyAddress: tenantDetails.companyAddress,
        tenantRepresentativeName: tenantDetails.representativeName,
        tenantRepresentativeTitle: tenantDetails.representativeTitle,
        ownerId: realEstateOwners.id,
        ownerName: realEstateOwners.displayName,
        ownerAddress: realEstateOwners.address,
        ownerCity: realEstateOwners.city,
        ownerPhone: realEstateOwners.phone,
        ownerEmail: realEstateOwners.email,
        ownerSignature: realEstateOwners.signature,
        ownerIdDocumentType: realEstateOwners.idDocumentType,
        ownerIdNumber: realEstateOwners.idNumber,
      })
      .from(realEstateLeases)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .leftJoin(realEstateOwners, eq(realEstateOwners.id, realEstateProperties.ownerId))
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const r = rows[0];

    const coRows = await this.db
      .select({
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        idDocumentType: tenantDetails.idDocumentType,
        idNumber: tenantDetails.idNumber,
      })
      .from(realEstateLeaseCotenants)
      .innerJoin(customers, eq(customers.id, realEstateLeaseCotenants.customerId))
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
      .where(
        and(
          eq(realEstateLeaseCotenants.leaseId, leaseId),
          eq(realEstateLeaseCotenants.organizationId, orgId),
          eq(realEstateLeaseCotenants.isActive, 1),
          eq(customers.organizationId, orgId),
          eq(customers.status, "true"),
        ),
      )
      .orderBy(realEstateLeaseCotenants.position, realEstateLeaseCotenants.id);

    const coTenants: CoTenantInfo[] = coRows
      .filter((c) => c.id !== r.tenantId)
      .map((c) => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Locataire",
        address: c.address ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        idDocumentType: c.idDocumentType ?? null,
        idNumber: c.idNumber ?? null,
      }));

    return {
      ...r,
      tenantName: [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire",
      coTenants,
    };
  }

  /** Locataire principal puis colocataires actifs (tous egaux dans le contrat). */
  private allTenants(lease: LeaseDetails) {
    return [
      {
        name: lease.tenantName,
        address: lease.tenantAddress,
        phone: lease.tenantPhone,
        email: lease.tenantEmail,
        idDocumentType: lease.tenantIdDocumentType,
        idNumber: lease.tenantIdNumber,
      },
      ...(lease.coTenants ?? []),
    ] as Array<{
      name: string | null;
      address: string | null;
      phone: string | null;
      email: string | null;
      idDocumentType: string | null;
      idNumber: string | null;
    }>;
  }

  /**
   * Designation du preneur dans le contrat. Societe : « Societe X, forme, RCCM,
   * Id.Nat, NIF, siege, representee par Y, en sa qualite de Z ». Personne :
   * nom(s) des preneurs inchange.
   */
  private tenantDesignation(
    lease: LeaseDetails,
    allTenants: Array<{ name: string | null }>,
  ): string {
    if (lease.tenantType !== "company") {
      return this.joinNames(allTenants.map((t) => (t.name ?? "").toLocaleUpperCase("fr")));
    }
    const parts = [
      `Société ${(lease.tenantName ?? "").toLocaleUpperCase("fr")}`,
      lease.tenantLegalForm ? `${lease.tenantLegalForm}` : null,
      lease.tenantRccm ? `RCCM n° ${lease.tenantRccm}` : null,
      lease.tenantCompanyNationalId ? `Id.Nat n° ${lease.tenantCompanyNationalId}` : null,
      lease.tenantTaxId ? `NIF n° ${lease.tenantTaxId}` : null,
      lease.tenantCompanyAddress ? `dont le siège est situé ${lease.tenantCompanyAddress}` : null,
      lease.tenantRepresentativeName
        ? `représentée par ${lease.tenantRepresentativeName}${
            lease.tenantRepresentativeTitle ? `, en sa qualité de ${lease.tenantRepresentativeTitle}` : ""
          }`
        : null,
    ].filter(Boolean);
    return parts.join(", ");
  }

  /** « A », « A et B », « A, B et C ». */
  private joinNames(names: string[]): string {
    const n = names.filter(Boolean);
    if (n.length <= 1) return n[0] ?? "";
    return `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`;
  }

  private generateContent(lease: LeaseDetails, company: CompanyInfo): string {
    const landlordInfo = this.resolveLandlord(lease, company);
    const e = (s: string | null | undefined) => this.escapeHtml(s);
    const today = this.formatDate(new Date());
    const startDate = this.formatDate(lease.startDate);
    const endDate = this.formatDate(lease.endDate);
    const duration = this.durationInMonths(lease.startDate, lease.endDate);
    const rentAmount = this.formatMoney(lease.rentAmount);
    const securityDeposit = this.formatMoney(lease.securityDeposit);
    const currency = this.currencyLabel(lease) || "USD";
    const guaranteeMonths = this.guaranteeMonths(lease.rentAmount, lease.securityDeposit);
    const city = lease.signingCity || lease.propertyCity || "[VILLE]";
    const rentalAddress = [lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ") || "N/A";
    const destination = this.humanizeType(lease.unitType || lease.propertyType || "habitation");
    const landlordName = (landlordInfo.name || "[NOM DU BAILLEUR]").toLocaleUpperCase("fr");
    const allTenants = this.allTenants(lease);
    const multi = allTenants.length > 1;
    const tenantsLabel = multi ? "Les Preneurs (Locataires)" : "Le Preneur (Locataire)";
    const isCompanyTenant = lease.tenantType === "company";
    // Societe : bloc preneur = identite legale + representant (a la place de la piece d'identite).
    const companyBlock = `<div>
      <strong>Société ${e((lease.tenantName ?? "").toLocaleUpperCase("fr"))}</strong>${lease.tenantLegalForm ? `, ${e(lease.tenantLegalForm)}` : ""}<br>
      ${[
        lease.tenantRccm ? `RCCM n°&nbsp;${e(lease.tenantRccm)}` : "",
        lease.tenantCompanyNationalId ? `Id.Nat n°&nbsp;${e(lease.tenantCompanyNationalId)}` : "",
        lease.tenantTaxId ? `NIF n°&nbsp;${e(lease.tenantTaxId)}` : "",
      ].filter(Boolean).join(" &mdash; ") || "RCCM / Id.Nat / NIF&nbsp;: N/A"}<br>
      Siège&nbsp;: ${e(lease.tenantCompanyAddress ?? lease.tenantAddress ?? "N/A")}<br>
      Représentée par ${e(lease.tenantRepresentativeName ?? "N/A")}${lease.tenantRepresentativeTitle ? `, en sa qualité de ${e(lease.tenantRepresentativeTitle)}` : ""}<br>
      Téléphone&nbsp;: ${e(lease.tenantPhone ?? "N/A")} &nbsp;&nbsp; Courriel&nbsp;: ${e(lease.tenantEmail ?? "N/A")}
    </div>`;
    const tenantsBlock = allTenants
      .map(
        (t, i) => (isCompanyTenant && i === 0 ? companyBlock : `<div${i > 0 ? ' style="margin-top:12px;"' : ""}>
      <strong>${e((t.name ?? "").toLocaleUpperCase("fr"))}</strong> &mdash; ${e(t.idDocumentType || "Pièce d'identité")} n°&nbsp;<em>${e(t.idNumber || "N/A")}</em><br>
      Adresse&nbsp;: ${e(t.address ?? (i === 0 ? "[ADRESSE DU PRENEUR]" : "N/A"))}<br>
      Téléphone&nbsp;: ${e(t.phone ?? "N/A")} &nbsp;&nbsp; Courriel&nbsp;: ${e(t.email ?? "N/A")}
    </div>`),
      )
      .join("");
    const solidarityClause = multi
      ? '<p style="margin:14px 0 0;">Les Preneurs sont tenus solidairement et indivisiblement de toutes les obligations du présent bail.</p>'
      : "";
    const signatureTenantBlocks = allTenants
      .map(
        (t, i) => `<div style="flex:1;text-align:center;">
        <div style="font-size:11px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:64px;">Le Preneur (Locataire)</div>
        <div style="border-top:1.5px solid #1a1a2e;padding-top:6px;">
          <div style="font-size:12px;color:#333;">${
            isCompanyTenant && i === 0
              ? `${e((lease.tenantRepresentativeName ?? "").toLocaleUpperCase("fr"))}${
                  lease.tenantRepresentativeTitle ? `<br>${e(lease.tenantRepresentativeTitle)}` : ""
                }<br>pour ${e((lease.tenantName ?? "").toLocaleUpperCase("fr"))}`
              : e((t.name ?? "").toLocaleUpperCase("fr"))
          }</div>
          <div style="font-size:11px;color:#888;font-style:italic;">Lu et approuvé</div>
        </div>
      </div>`,
      )
      .join("");
    const landlordAddress = landlordInfo.address || "[ADRESSE DU BAILLEUR]";
    const landlordPhone = landlordInfo.phone || "N/A";
    const landlordEmail = landlordInfo.email || "N/A";
    const managerName = company.landlordName || company.companyName || "";
    const managerPhone = company.landlordPhone || company.phone || "";
    const managedByLine =
      landlordInfo.source === "owner" && (managerName || managerPhone)
        ? `<div style="font-size:12px;color:#555;margin-top:4px;">Représenté pour la gestion locative par ${e(managerName || "N/A")}${managerPhone ? ` — Tél : ${e(managerPhone)}` : ""}</div>`
        : "";

    const art = (num: string, title: string, body: string) =>
      `<div style="margin-bottom:22px;">
        <div style="background:#1a237e;color:#fff;padding:9px 18px;border-radius:4px 4px 0 0;font-size:12.5px;font-weight:bold;text-transform:uppercase;letter-spacing:0.8px;">
          Article ${num} &mdash; ${title}
        </div>
        <div style="border:1px solid #c5cae9;border-top:none;border-radius:0 0 4px 4px;padding:16px 20px;font-size:14px;line-height:1.8;">
          ${body}
        </div>
      </div>`;

    const tr = (label: string, value: string, shaded = false) =>
      `<tr style="${shaded ? "background:#f0f2ff;" : ""}">
        <td style="padding:7px 12px;font-weight:bold;width:36%;border:1px solid #e0e4f0;font-size:13px;">${label}</td>
        <td style="padding:7px 12px;border:1px solid #e0e4f0;font-size:13px;">${value}</td>
      </tr>`;

    const termsSection = lease.terms
      ? art("10", "Conditions Particulières", `<p style="margin:0;">${e(lease.terms).replace(/\n/g, "<br>")}</p>`)
      : "";

    return `<div style="font-family:Georgia,'Times New Roman',serif;color:#1a1a2e;line-height:1.8;font-size:14px;max-width:800px;margin:0 auto;">

  <div style="text-align:center;padding-bottom:20px;border-bottom:3px double #1a237e;margin-bottom:28px;">
    <div style="font-size:20px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:2px;">DOMUS &mdash; Système de gestion immobilière</div>
    <div style="font-size:12px;color:#666;margin-top:4px;">${e(landlordAddress)} &nbsp;|&nbsp; Tél&nbsp;: ${e(landlordPhone)} &nbsp;|&nbsp; ${e(landlordEmail)}</div>
    <div style="margin-top:18px;">
      <span style="font-size:17px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;color:#1a1a2e;border:2px solid #1a237e;padding:7px 28px;border-radius:3px;display:inline-block;">
        Contrat de Bail à Loyer
      </span>
    </div>
    <div style="margin-top:12px;font-size:13px;color:#444;">
      Réf.&nbsp;: <strong>${e(lease.reference ?? "N/A")}</strong>
      &nbsp;&nbsp;—&nbsp;&nbsp;
      Établi le <strong>${today}</strong>
    </div>
  </div>

  ${art("1", "Désignation des Parties", `
    <div style="margin-bottom:14px;">
      <div style="font-size:11.5px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Le Bailleur</div>
      <strong>${e(landlordName)}</strong><br>
      Adresse&nbsp;: ${e(landlordAddress)}<br>
      Téléphone&nbsp;: ${e(landlordPhone)} &nbsp;&nbsp; Courriel&nbsp;: ${e(landlordEmail)}
      ${managedByLine}
    </div>
    <hr style="border:none;border-top:1px dashed #c5cae9;margin:12px 0;">
    <div>
      <div style="font-size:11.5px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${tenantsLabel}</div>
      ${tenantsBlock}
      ${solidarityClause}
    </div>
  `)}

  ${art("2", "Objet et Destination des Lieux", `
    <p style="margin:0 0 12px;">Le Bailleur donne en location ${multi ? "aux Preneurs" : "au Preneur"} le bien immobilier désigné ci-dessous&nbsp;:</p>
    <table style="width:100%;border-collapse:collapse;">
      ${tr("Adresse", e(rentalAddress), false)}
      ${tr("Propriété", e(lease.propertyName ?? "N/A"), true)}
      ${tr("Unité / Local", e(lease.unitName ?? "N/A"), false)}
      ${tr("Destination", e(destination), true)}
    </table>
  `)}

  ${art("3", "Durée et Préavis", `
    Le présent bail est conclu pour une durée de <strong>${duration}</strong>,
    prenant effet le <strong>${startDate}</strong> et se terminant le <strong>${endDate}</strong>.<br><br>
    Le délai de préavis est fixé à <strong>TROIS (3) MOIS</strong> pour un usage résidentiel
    ou <strong>SIX (6) MOIS</strong> pour un usage professionnel.
    Toute notification de préavis doit être faite par écrit avec accusé de réception.
  `)}

  ${art("4", "Loyer et Garantie Locative", `
    <p style="margin:0 0 10px;">
      <strong>4.1. Loyer&nbsp;:</strong> Le loyer mensuel est fixé à
      <strong style="color:#1a237e;">${rentAmount} ${e(currency)}</strong>.
      Conformément à la réglementation en RDC, le paiement s&rsquo;effectue en Francs Congolais (CDF)
      au taux officiel de la Banque Centrale du Congo, sauf accord écrit contraire des parties.
    </p>
    <p style="margin:0;">
      <strong>4.2. Garantie Locative&nbsp;:</strong> ${multi ? "Les Preneurs versent" : "Le Preneur verse"} ce jour une garantie de
      <strong style="color:#1a237e;">${securityDeposit} ${e(currency)}</strong> correspondant à ${guaranteeMonths}.
      Cette somme est restituée en fin de bail après déduction des éventuels arriérés, charges impayées
      ou réparations locatives. La garantie ne peut pas excéder <strong>trois (3) mois</strong> de loyer
      pour un usage résidentiel.
    </p>
  `)}

  ${art("5", "État des Lieux", `
    Un état des lieux contradictoire est obligatoirement annexé au présent contrat lors de la remise des clés.
    À défaut d&rsquo;état des lieux, ${multi ? "les locataires sont présumés avoir reçu" : "le locataire est présumé avoir reçu"} le bien en bon état de réparations locatives.<br><br>
    <strong>Relevé de compteur à l&rsquo;entrée&nbsp;:</strong> ${e(String(lease.moveInMeterReading ?? "N/A"))}.
  `)}

  ${art("6", "Charges et Entretien", `
    ${multi ? "Les Preneurs prennent à leur charge" : "Le Preneur prend à sa charge"} les consommations d&rsquo;eau (REGIDESO), d&rsquo;électricité (SNEL)
    et l&rsquo;entretien courant des équipements.
    Le Bailleur reste responsable des grosses réparations (toiture, murs, structure, étanchéité)
    ainsi que de l&rsquo;Impôt sur le Revenu Locatif (IRL), sauf disposition légale ou convention écrite contraire.
  `)}

  ${art("7", "Remise en État", `
    À l&rsquo;expiration du bail, ${multi ? "les Preneurs rendront" : "le Preneur rendra"} le bien dans l&rsquo;état exact où il se trouvait
    lors de la remise des clés, tel que décrit dans l&rsquo;état des lieux initial,
    à l&rsquo;exception de l&rsquo;usure normale due au temps.
  `)}

  ${art("8", "Réparation et Facturation", `
    Toute destruction, dégradation ou modification non autorisée constatée lors de la sortie sera
    intégralement facturée ${multi ? "aux Preneurs" : "au Preneur"}. Les frais de remise en état seront déduits de la garantie locative.
    Si le montant des dégâts excède la garantie, ${multi ? "les Preneurs s&rsquo;engagent" : "le Preneur s&rsquo;engage"} à payer le reliquat
    sur présentation des factures de réparation.
  `)}

  ${art("9", "Clause Résolutoire", `
    À défaut de paiement d&rsquo;un seul terme de loyer à son échéance, le bail sera résilié de plein droit
    <strong>UN (1) MOIS</strong> après une mise en demeure restée infructueuse,
    conformément aux dispositions légales applicables.
  `)}

  ${termsSection}

  <div style="margin-top:36px;padding-top:20px;border-top:2px solid #1a237e;">
    <div style="text-align:center;margin-bottom:24px;font-style:italic;color:#555;font-size:13px;">
      Fait à <strong>${e(city)}</strong>, le <strong>${today}</strong> &mdash; en deux (2) exemplaires originaux.
    </div>
    <div style="display:flex;justify-content:space-between;gap:48px;margin-top:20px;">
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:64px;">Le Bailleur</div>
        <div style="border-top:1.5px solid #1a1a2e;padding-top:6px;">
          <div style="font-size:12px;color:#333;">${e(landlordName)}</div>
          <div style="font-size:11px;color:#888;font-style:italic;">Lu et approuvé</div>
        </div>
      </div>
      ${signatureTenantBlocks}
    </div>
  </div>

</div>`;
  }

  private escapeHtml(s: string | null | undefined): string {
    if (!s) return "";
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private async getCompanyInfo(orgId = 1): Promise<CompanyInfo> {
    const row = await readOrgAppSetting(this.db, orgId, {
      companyName: appSettings.companyName,
      address: appSettings.address,
      phone: appSettings.phone,
      email: appSettings.email,
      landlordSignature: appSettings.landlordSignature,
      landlordName: appSettings.landlordName,
      landlordPhone: appSettings.landlordPhone,
    });

    return (
      (row as CompanyInfo) ?? {
        companyName: null,
        address: null,
        phone: null,
        email: null,
        landlordSignature: null,
        landlordName: null,
        landlordPhone: null,
      }
    );
  }

  private formatDate(value: Date | string | null | undefined) {
    if (!value) return "N/A";
    if (value instanceof Date) {
      return value.toLocaleDateString("fr-FR");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    return value;
  }

  private formatMoney(value: string | number | null | undefined) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount)
      ? amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "0,00";
  }

  private formatMoneyWithCurrency(value: string | number | null | undefined, lease: LeaseDetails) {
    const amount = this.formatMoney(value);
    const currency = this.currencyLabel(lease);
    return currency ? `${amount} ${currency}` : amount;
  }

  private currencyLabel(lease: Pick<LeaseDetails, "currencySymbol" | "currencyCode">) {
    const symbol = String(lease.currencySymbol ?? "").trim();
    const code = String(lease.currencyCode ?? "").trim();
    return symbol || code;
  }

  private durationInMonths(start: Date | string | null | undefined, end: Date | string | null | undefined) {
    const months = this.monthsBetween(start, end);
    if (months <= 0) return "[NUMÉRO DE MOIS] mois";
    return `${months} mois`;
  }

  private monthsBetween(start: Date | string | null | undefined, end: Date | string | null | undefined): number {
    const startParts = this.dateParts(start);
    const endRaw = this.dateParts(end);
    if (!startParts || !endRaw) return 0;

    // La date de fin du bail est INCLUSIVE : il est créé avec
    // end = début + N mois − 1 jour (ex. 27/05/2026 → 26/05/2027 = 12 mois).
    // On compte donc jusqu'au lendemain de la date de fin pour obtenir N.
    const endDate = new Date(Date.UTC(endRaw.year, endRaw.month - 1, endRaw.day + 1));
    const endParts = {
      year: endDate.getUTCFullYear(),
      month: endDate.getUTCMonth() + 1,
      day: endDate.getUTCDate(),
    };

    const months =
      (endParts.year - startParts.year) * 12 +
      (endParts.month - startParts.month) +
      (endParts.day >= startParts.day ? 0 : -1);

    return Math.max(months, 0);
  }

  private guaranteeMonths(rent: string | null | undefined, deposit: string | null | undefined) {
    const raw = this.guaranteeMonthsRaw(rent, deposit);
    if (!raw) return "[NUMÉRO DE MOIS DE GARANTIE] mois de loyer";
    return `${raw} mois de loyer`;
  }

  private guaranteeMonthsRaw(rent: string | null | undefined, deposit: string | null | undefined): string {
    const rentAmount = Number(rent ?? 0);
    const depositAmount = Number(deposit ?? 0);
    if (!rentAmount || !depositAmount) return "";
    const months = depositAmount / rentAmount;
    return Number.isInteger(months) ? months.toString() : months.toFixed(2).replace(".", ",");
  }

  private dateParts(value: Date | string | null | undefined) {
    if (!value) return null;
    if (value instanceof Date) {
      return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;

    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }

  private humanizeType(type: string) {
    const labels: Record<string, string> = {
      apartment: "Habitation - appartement",
      house: "Habitation - maison",
      studio: "Habitation - studio",
      office: "Bureaux",
      commercial: "Commerce",
      building: "Habitation - immeuble",
    };

    return labels[type] ?? type;
  }

  private async log(
    contractId: number,
    orgId: number,
    event: string,
    ip: string | null,
    ua: string | null,
    details: string | null,
    signerId?: number | null,
  ) {
    if (isPreviewing()) return; // apercu SMS : aucune trace
    await this.db.insert(realEstateContractAuditLogs).values({
      organizationId: orgId,
      contractId,
      event,
      ip: ip ?? null,
      userAgent: ua ?? null,
      details: details ?? null,
      signerId: signerId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
    });
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    type: SystemEmailType = "notification",
    relatedId?: number,
  ) {
    await this.emails.send({
      to,
      subject,
      html,
      type,
      relatedType: "real-estate-contract",
      relatedId,
    });
  }

  private signingEmailHtml(tenantName: string, url: string): string {
    return `<p>Bonjour ${tenantName},</p>
<p>Votre contrat de bail est prêt à être signé électroniquement.</p>
<p><a href="${url}" style="background:#1677ff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Signer mon contrat</a></p>
<p>Ce lien est valide pendant <strong>7 jours</strong>.</p>`;
  }
}
