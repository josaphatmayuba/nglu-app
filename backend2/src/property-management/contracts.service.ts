import * as crypto from "crypto";
import { BadRequestException, GoneException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  customers,
  currencies,
  emailTemplates,
  realEstateContractAuditLogs,
  realEstateContracts,
  realEstateLeaseDocuments,
  realEstateLeases,
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

type LeaseDetails = {
  leaseId: number;
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
  signingCity: string | null;
  moveInMeterReading: string | null;
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
    await this.log(id, orgId, "created", null, null, `Contract created for lease #${dto.leaseId}`);
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

    return {
      "NOM COMPLET DU BAILLEUR": company.landlordName || company.companyName || "",
      "ADRESSE DU BAILLEUR": company.address ?? "",
      "TÉLÉPHONE DU BAILLEUR": company.landlordPhone || company.phone || "",
      "EMAIL DU BAILLEUR": company.email ?? "",
      "NOM COMPLET DU PRENEUR": lease.tenantName ?? "",
      "ADRESSE DU PRENEUR": lease.tenantAddress ?? "",
      "TÉLÉPHONE DU PRENEUR": lease.tenantPhone ?? "",
      "EMAIL DU PRENEUR": lease.tenantEmail ?? "",
      "NUMÉRO DE PIÈCE D'IDENTITÉ": lease.tenantIdNumber ?? "",
      "TYPE DE PIÈCE D'IDENTITÉ": lease.tenantIdDocumentType ?? "",
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

    return { ...rows[0], auditLogs, companyInfo, landlordName: companyInfo.landlordName || companyInfo.companyName, createdByName };
  }

  async sendContract(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");
    const contract = rows[0];

    const token = crypto.randomUUID();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    await this.db
      .update(realEstateContracts)
      .set({
        status: "sent",
        signerToken: token,
        signerTokenExpiry: expiry,
        sentAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)));

    const signingUrl = `${env.appUrl}/sign/${token}`;

    if (contract.tenantEmail) {
      await this.sendEmail(
        contract.tenantEmail,
        "Votre contrat de bail est prêt à être signé",
        this.signingEmailHtml(contract.tenantName ?? "", signingUrl),
        "contract_signature",
      );
    }

    // Also send the signing link by SMS to the tenant (best-effort).
    let tenantPhone: string | null = null;
    try {
      const lease = await this.getLeaseDetails(contract.leaseId, orgId);
      tenantPhone = lease.tenantPhone ?? null;
    } catch {
      tenantPhone = null;
    }
    if (tenantPhone) {
      const company = await this.getCompanyInfo(orgId);
      const companyName = company?.companyName || "votre gestionnaire";
      const greeting = contract.tenantName ? `Bonjour ${contract.tenantName}` : "Bonjour";
      const message =
        `${greeting}, votre contrat de bail est prêt à être signé. ` +
        `Signez-le ici : ${signingUrl} (lien valable 7 jours). — ${companyName}`;
      try {
        const res = await this.sms.sendSms({ phone: tenantPhone, message });
        if (!res?.success) this.logger.warn(`Contract signing SMS not sent (contract ${id}): ${res?.message}`);
      } catch (error) {
        this.logger.warn(`Contract signing SMS error (contract ${id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await this.log(id, orgId, "sent", null, null, `Sent to ${contract.tenantEmail ?? "no email"}${tenantPhone ? ` / SMS ${tenantPhone}` : ""}`);
    await this.publishContractUpdate("status_changed", id, contract.leaseId);
    return { message: "Contract sent.", id, signingUrl, token };
  }

  // Le locataire a signé le bail à la main sur papier : on importe le scan/photo
  // et on marque le contrat "signed" comme pour une signature électronique.
  async markSignedManually(id: number, file: unknown, orgId: number, createdByName?: string | null) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");
    const contract = rows[0];
    // Contrat déjà signé : on refuse seulement s'il a encore sa preuve attachée.
    // Si le scan a été supprimé (signedDocumentId détaché), on autorise le ré-import.
    if (contract.status === "signed" && contract.signedDocumentId) {
      throw new GoneException("This contract has already been signed.");
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

    await this.db
      .update(realEstateContracts)
      .set({
        status: "signed",
        signedAt: sql`CURRENT_TIMESTAMP`,
        signerToken: null,
        signedDocumentId: documentId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateContracts.id, id));

    await this.log(
      id,
      orgId,
      "signed",
      null,
      null,
      `Signature papier importee${createdByName ? ` par ${createdByName}` : ""}`,
    );
    await this.publishContractUpdate("status_changed", id, contract.leaseId);

    // Message de bienvenue (email + SMS) : envoyé une seule fois, best-effort.
    if (!contract.welcomeMessageSentAt) {
      try {
        await this.deliverWelcomeMessage(contract, orgId);
      } catch (error) {
        this.logger.warn(`Contract ${id} marked signed, but welcome message failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.getContract(id, orgId);
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

    const tenantName = lease.tenantName || contract.tenantName || "Locataire";
    const reference = lease.reference ?? "";
    const startDate = this.formatDate(lease.startDate);
    const endDate = this.formatDate(lease.endDate);
    const months = this.monthsBetween(lease.startDate, lease.endDate);
    const duration = months > 0 ? `${months} mois` : "";
    const address =
      [lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ") || lease.propertyName || "votre logement";
    const unitPart = lease.unitName ? ` (${lease.unitName})` : "";
    const rentDisplay = this.formatMoneyWithCurrency(lease.rentAmount, lease);

    let subject = `Bienvenue ! Votre bail ${reference} est signé et confirmé`.replace(/\s+/g, " ").trim();
    let text =
      `Bonjour ${tenantName}, félicitations ! Votre contrat de bail ${reference} est bien signé et confirmé. ` +
      `Bienvenue dans votre nouveau logement : ${address}${unitPart}. ` +
      `Votre location court du ${startDate} au ${endDate}${duration ? ` (${duration})` : ""}. ` +
      `Merci de votre confiance. ` +
      `${contactPhone ? `Pour toute question, contactez-nous au ${contactPhone}. ` : ""}` +
      `— ${companyName}`;

    // Message configurable (Réglages → Messages) : si un template "contract_signed"
    // actif existe, on l'utilise avec substitution des placeholders.
    const tpl = await this.db
      .select({ subject: emailTemplates.subject, body: emailTemplates.body })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.eventType, "contract_signed"), eq(emailTemplates.status, "true")))
      .limit(1);
    if (tpl.length) {
      const fill = (s: string | null) =>
        String(s || "")
          .replace(/\{tenantName\}/g, tenantName)
          .replace(/\{firstName\}/g, lease.tenantFirstName || tenantName)
          .replace(/\{reference\}/g, reference)
          .replace(/\{amount\}/g, rentDisplay)
          .replace(/\{address\}/g, `${address}${unitPart}`)
          .replace(/\{startDate\}/g, startDate)
          .replace(/\{endDate\}/g, endDate)
          .replace(/\{duration\}/g, duration)
          .replace(/\{contactPhone\}/g, contactPhone);
      if (tpl[0].subject) subject = fill(tpl[0].subject);
      if (tpl[0].body) text = fill(tpl[0].body);
    }

    const tenantEmail = lease.tenantEmail || contract.tenantEmail;
    if (!tenantEmail && !lease.tenantPhone) {
      throw new BadRequestException("Aucun email ni téléphone connu pour ce locataire.");
    }

    let emailSent = false;
    if (tenantEmail) {
      try {
        await this.sendEmail(tenantEmail, subject, `<p>${this.escapeHtml(text).replace(/\n/g, "<br>")}</p>`, "contract_signed");
        emailSent = true;
      } catch (error) {
        this.logger.warn(`Welcome email failed (contract ${contract.id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let smsSent = false;
    if (lease.tenantPhone) {
      try {
        const res = await this.sms.sendSms({ phone: lease.tenantPhone, message: text });
        smsSent = Boolean(res?.success);
        if (!smsSent) this.logger.warn(`Welcome SMS not sent (contract ${contract.id}): ${res?.message}`);
      } catch (error) {
        this.logger.warn(`Welcome SMS error (contract ${contract.id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!emailSent && !smsSent) {
      throw new BadRequestException("Le message de bienvenue n'a pas pu être envoyé (email et SMS en échec).");
    }

    await this.db
      .update(realEstateContracts)
      .set({ welcomeMessageSentAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateContracts.id, contract.id));

    await this.log(
      contract.id,
      orgId,
      "welcome_sent",
      null,
      null,
      `Message de bienvenue envoye : ${[emailSent ? tenantEmail : null, smsSent ? `SMS ${lease.tenantPhone}` : null].filter(Boolean).join(" / ")}`,
    );
    await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);

    return { message: "Message de bienvenue envoyé.", emailSent, smsSent };
  }

  async getContractByToken(token: string, ip: string, ua: string) {
    const contract = await this.findByToken(token);

    if (contract.status !== "signed") {
      await this.db
        .update(realEstateContracts)
        .set({ status: "viewed", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateContracts.id, contract.id));
      await this.publishContractUpdate("status_changed", contract.id, contract.leaseId);
    }

    await this.log(contract.id, contract.organizationId, "viewed", ip, ua, null);

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
    };
  }

  async signContract(token: string, dto: SignContractDto, ip: string, ua: string) {
    const contract = await this.findByToken(token);

    if (contract.status === "signed") {
      throw new GoneException("This contract has already been signed.");
    }

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
    const signedContract = await this.getContract(contract.id, contract.organizationId);

    // Message de bienvenue (email + SMS) : best-effort, la signature reste valide même si l'envoi échoue.
    try {
      await this.deliverWelcomeMessage(contract, contract.organizationId);
    } catch (error) {
      this.logger.warn(`Contract ${contract.id} signed, but welcome message failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { message: "Contract signed successfully.", contract: signedContract };
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

    const newContract = await this.createContract({ leaseId: newLeaseId, templateId: dto.templateId }, orgId, createdBy);

    return { lease: { id: newLeaseId, reference }, contract: newContract };
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
      .set({ status: "deleted", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateContracts.id, id), eq(realEstateContracts.organizationId, orgId)));
    await this.publishContractUpdate("deleted", id, rows[0].leaseId);
    return { message: "Contract deleted." };
  }

  private async publishContractUpdate(action: DataUpdateAction, contractId: number, leaseId?: number | null) {
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

  private async findByToken(token: string) {
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

    return contract;
  }

  private async getLeaseDetails(leaseId: number, orgId: number): Promise<LeaseDetails> {
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
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
        signingCity: realEstateLeases.signingCity,
        moveInMeterReading: realEstateLeases.moveInMeterReading,
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
      })
      .from(realEstateLeases)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const r = rows[0];
    return {
      ...r,
      tenantName: [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire",
    };
  }

  private generateContent(lease: LeaseDetails, company: CompanyInfo): string {
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
    const landlordName = company.landlordName || company.companyName || "[NOM DU BAILLEUR]";
    const landlordAddress = company.address || "[ADRESSE DU BAILLEUR]";
    const landlordPhone = company.landlordPhone || company.phone || "N/A";
    const landlordEmail = company.email || "N/A";

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
    <div style="font-size:20px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:2px;">${e(landlordName)}</div>
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
    </div>
    <hr style="border:none;border-top:1px dashed #c5cae9;margin:12px 0;">
    <div>
      <div style="font-size:11.5px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Le Preneur (Locataire)</div>
      <strong>${e(lease.tenantName)}</strong> &mdash; ${e(lease.tenantIdDocumentType || "Pièce d'identité")} n°&nbsp;<em>${e(lease.tenantIdNumber || "N/A")}</em><br>
      Adresse&nbsp;: ${e(lease.tenantAddress ?? "[ADRESSE DU PRENEUR]")}<br>
      Téléphone&nbsp;: ${e(lease.tenantPhone ?? "N/A")} &nbsp;&nbsp; Courriel&nbsp;: ${e(lease.tenantEmail ?? "N/A")}
    </div>
  `)}

  ${art("2", "Objet et Destination des Lieux", `
    <p style="margin:0 0 12px;">Le Bailleur donne en location au Preneur le bien immobilier désigné ci-dessous&nbsp;:</p>
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
      <strong>4.2. Garantie Locative&nbsp;:</strong> Le Preneur verse ce jour une garantie de
      <strong style="color:#1a237e;">${securityDeposit} ${e(currency)}</strong> correspondant à ${guaranteeMonths}.
      Cette somme est restituée en fin de bail après déduction des éventuels arriérés, charges impayées
      ou réparations locatives. La garantie ne peut pas excéder <strong>trois (3) mois</strong> de loyer
      pour un usage résidentiel.
    </p>
  `)}

  ${art("5", "État des Lieux", `
    Un état des lieux contradictoire est obligatoirement annexé au présent contrat lors de la remise des clés.
    À défaut d&rsquo;état des lieux, le locataire est présumé avoir reçu le bien en bon état de réparations locatives.<br><br>
    <strong>Relevé de compteur à l&rsquo;entrée&nbsp;:</strong> ${e(String(lease.moveInMeterReading ?? "N/A"))}.
  `)}

  ${art("6", "Charges et Entretien", `
    Le Preneur prend à sa charge les consommations d&rsquo;eau (REGIDESO), d&rsquo;électricité (SNEL)
    et l&rsquo;entretien courant des équipements.
    Le Bailleur reste responsable des grosses réparations (toiture, murs, structure, étanchéité)
    ainsi que de l&rsquo;Impôt sur le Revenu Locatif (IRL), sauf disposition légale ou convention écrite contraire.
  `)}

  ${art("7", "Remise en État", `
    À l&rsquo;expiration du bail, le Preneur rendra le bien dans l&rsquo;état exact où il se trouvait
    lors de la remise des clés, tel que décrit dans l&rsquo;état des lieux initial,
    à l&rsquo;exception de l&rsquo;usure normale due au temps.
  `)}

  ${art("8", "Réparation et Facturation", `
    Toute destruction, dégradation ou modification non autorisée constatée lors de la sortie sera
    intégralement facturée au Preneur. Les frais de remise en état seront déduits de la garantie locative.
    Si le montant des dégâts excède la garantie, le Preneur s&rsquo;engage à payer le reliquat
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
      <div style="flex:1;text-align:center;">
        <div style="font-size:11px;font-weight:bold;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:64px;">Le Preneur (Locataire)</div>
        <div style="border-top:1.5px solid #1a1a2e;padding-top:6px;">
          <div style="font-size:12px;color:#333;">${e(lease.tenantName)}</div>
          <div style="font-size:11px;color:#888;font-style:italic;">Lu et approuvé</div>
        </div>
      </div>
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

  private async log(contractId: number, orgId: number, event: string, ip: string | null, ua: string | null, details: string | null) {
    await this.db.insert(realEstateContractAuditLogs).values({
      organizationId: orgId,
      contractId,
      event,
      ip: ip ?? null,
      userAgent: ua ?? null,
      details: details ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
    });
  }

  private async sendEmail(to: string, subject: string, html: string, type: SystemEmailType = "notification") {
    await this.emails.send({
      to,
      subject,
      html,
      type,
      relatedType: "real-estate-contract",
    });
  }

  private signingEmailHtml(tenantName: string, url: string): string {
    return `<p>Bonjour ${tenantName},</p>
<p>Votre contrat de bail est prêt à être signé électroniquement.</p>
<p><a href="${url}" style="background:#1677ff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Signer mon contrat</a></p>
<p>Ce lien est valide pendant <strong>7 jours</strong>.</p>`;
  }
}
