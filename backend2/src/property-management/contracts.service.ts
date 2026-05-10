import * as crypto from "crypto";
import { GoneException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import * as nodemailer from "nodemailer";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  customers,
  realEstateContractAuditLogs,
  realEstateContracts,
  realEstateLeases,
  realEstateProperties,
  realEstateUnits,
} from "../database/schema";
import type { Database } from "../database/types";
import { CreateContractDto, SignContractDto } from "./dto/property-management.dto";

type LeaseDetails = {
  leaseId: number;
  reference: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  rentAmount: string | null;
  securityDeposit: string | null;
  billingCycle: string | null;
  terms: string | null;
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
  tenantName: string;
};

type CompanyInfo = {
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

@Injectable()
export class ContractsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createContract(dto: CreateContractDto) {
    const lease = await this.getLeaseDetails(dto.leaseId);
    const company = await this.getCompanyInfo();
    const content = dto.contractContent ?? this.generateContent(lease, company);

    const [result] = await this.db.insert(realEstateContracts).values({
      leaseId: dto.leaseId,
      status: "draft",
      contractContent: content,
      tenantEmail: lease.tenantEmail ?? null,
      tenantName: lease.tenantName,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const id = Number(result.insertId);
    await this.log(id, "created", null, null, `Contract created for lease #${dto.leaseId}`);
    return this.getContract(id);
  }

  async listContracts() {
    return this.db
      .select({
        id: realEstateContracts.id,
        leaseId: realEstateContracts.leaseId,
        status: realEstateContracts.status,
        tenantEmail: realEstateContracts.tenantEmail,
        tenantName: realEstateContracts.tenantName,
        sentAt: realEstateContracts.sentAt,
        signedAt: realEstateContracts.signedAt,
        createdAt: realEstateContracts.createdAt,
      })
      .from(realEstateContracts)
      .orderBy(desc(realEstateContracts.id));
  }

  async getContract(id: number) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(eq(realEstateContracts.id, id))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");

    const auditLogs = await this.db
      .select()
      .from(realEstateContractAuditLogs)
      .where(eq(realEstateContractAuditLogs.contractId, id))
      .orderBy(desc(realEstateContractAuditLogs.id));

    const companyInfo = await this.getCompanyInfo();
    return { ...rows[0], auditLogs, companyInfo, landlordName: companyInfo.companyName };
  }

  async sendContract(id: number) {
    const rows = await this.db
      .select()
      .from(realEstateContracts)
      .where(eq(realEstateContracts.id, id))
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
      .where(eq(realEstateContracts.id, id));

    const signingUrl = `${env.appUrl}/sign/${token}`;

    if (contract.tenantEmail && env.smtp.user) {
      await this.sendEmail(
        contract.tenantEmail,
        "Votre contrat de bail est prêt à être signé",
        this.signingEmailHtml(contract.tenantName ?? "", signingUrl),
      );
    }

    await this.log(id, "sent", null, null, `Sent to ${contract.tenantEmail ?? "no email"}`);
    return { message: "Contract sent.", signingUrl, token };
  }

  async getContractByToken(token: string, ip: string, ua: string) {
    const contract = await this.findByToken(token);

    if (contract.status !== "signed") {
      await this.db
        .update(realEstateContracts)
        .set({ status: "viewed", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateContracts.id, contract.id));
    }

    await this.log(contract.id, "viewed", ip, ua, null);

    return {
      id: contract.id,
      status: contract.status,
      contractContent: contract.contractContent,
      tenantName: contract.tenantName,
      signedAt: contract.signedAt,
      companyInfo: await this.getCompanyInfo(),
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

    await this.log(contract.id, "signed", ip, ua, `Signed by ${contract.tenantName ?? "tenant"}`);

    if (contract.tenantEmail && env.smtp.user) {
      await this.sendEmail(
        contract.tenantEmail,
        "Contrat signé — confirmation",
        `<p>Bonjour ${contract.tenantName ?? ""},</p><p>Votre contrat a bien été signé électroniquement. Merci.</p>`,
      );
    }

    return { message: "Contract signed successfully." };
  }

  async deleteContract(id: number) {
    const rows = await this.db
      .select({ id: realEstateContracts.id })
      .from(realEstateContracts)
      .where(eq(realEstateContracts.id, id))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Contract not found.");

    await this.db.delete(realEstateContractAuditLogs).where(eq(realEstateContractAuditLogs.contractId, id));
    await this.db.delete(realEstateContracts).where(eq(realEstateContracts.id, id));
    return { message: "Contract deleted." };
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

  private async getLeaseDetails(leaseId: number): Promise<LeaseDetails> {
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        reference: realEstateLeases.reference,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        rentAmount: realEstateLeases.rentAmount,
        securityDeposit: realEstateLeases.securityDeposit,
        billingCycle: realEstateLeases.billingCycle,
        terms: realEstateLeases.terms,
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
      })
      .from(realEstateLeases)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .where(eq(realEstateLeases.id, leaseId))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const r = rows[0];
    return {
      ...r,
      tenantName: [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire",
    };
  }

  private generateContent(lease: LeaseDetails, company: CompanyInfo): string {
    const today = this.formatDate(new Date());
    const startDate = this.formatDate(lease.startDate);
    const endDate = this.formatDate(lease.endDate);
    const duration = this.durationInMonths(lease.startDate, lease.endDate);
    const rentAmount = this.formatMoney(lease.rentAmount);
    const securityDeposit = this.formatMoney(lease.securityDeposit);
    const guaranteeMonths = this.guaranteeMonths(lease.rentAmount, lease.securityDeposit);
    const city = lease.propertyCity || "[VILLE]";
    const rentalAddress = [lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ") || "N/A";
    const destination = this.humanizeType(lease.unitType || lease.propertyType || "habitation");
    const landlordName = company.companyName || "[NOM COMPLET DU BAILLEUR]";
    const landlordAddress = company.address || "[ADRESSE DU BAILLEUR]";
    const landlordPhone = company.phone || "N/A";
    const landlordEmail = company.email || "N/A";

    return `CONTRAT DE BAIL À LOYER
Référence : ${lease.reference ?? "N/A"}

ARTICLE 1 : DÉSIGNATION DES PARTIES

LE BAILLEUR : Monsieur/Madame/Société ${landlordName}, résidant au ${landlordAddress}.
Téléphone : ${landlordPhone}
Courriel : ${landlordEmail}

LE PRENEUR (Locataire) : Monsieur/Madame/Société ${lease.tenantName}, titulaire de la pièce d'identité n° [NUMÉRO DE PIÈCE D'IDENTITÉ], résidant au ${lease.tenantAddress ?? "[ADRESSE DU PRENEUR]"}.
Téléphone : ${lease.tenantPhone ?? "N/A"}
Courriel : ${lease.tenantEmail ?? "N/A"}

ARTICLE 2 : OBJET ET DESTINATION DES LIEUX

Le Bailleur donne en location au Preneur un local situé à l'adresse suivante :
Adresse : ${rentalAddress}
Propriété : ${lease.propertyName ?? "N/A"}
Unité : ${lease.unitName ?? "N/A"}
Destination des lieux : ${destination}.

ARTICLE 3 : DURÉE ET PRÉAVIS

Le présent bail est conclu pour une durée de ${duration}, commençant le ${startDate} à ${endDate}.

Le délai de préavis est fixé à TROIS (3) MOIS pour un usage résidentiel ou SIX (6) MOIS pour un usage professionnel. Toute notification de préavis doit être faite par écrit avec accusé de réception.

ARTICLE 4 : LOYER ET GARANTIE LOCATIVE

4.1. Loyer : Le loyer mensuel est fixé à ${rentAmount} USD. Conformément à la réglementation applicable en République Démocratique du Congo, le paiement s'effectue en Francs Congolais (CDF) au taux officiel de la Banque Centrale du Congo, sauf accord écrit contraire des parties.

4.2. Garantie Locative : Le Preneur verse ce jour une garantie de ${securityDeposit} USD, correspondant à ${guaranteeMonths}. Cette somme est restituée en fin de bail après déduction des éventuels arriérés, charges impayées ou réparations locatives. Pour un usage résidentiel, la garantie ne peut pas excéder trois (3) mois de loyer.

ARTICLE 5 : ÉTAT DES LIEUX

Un état des lieux contradictoire est obligatoirement annexé au présent contrat lors de la remise des clés. À défaut d'état des lieux, le locataire est présumé avoir reçu le bien en bon état de réparations locatives.
Relevé compteur à l'entrée : ${lease.moveInMeterReading ?? "N/A"}.

ARTICLE 6 : CHARGES ET ENTRETIEN

Le Preneur prend à sa charge les consommations d'eau (REGIDESO), d'électricité (SNEL) et l'entretien courant des équipements. Le Bailleur reste responsable des grosses réparations, notamment toiture, murs, structure, étanchéité, ainsi que de l'Impôt sur le Revenu Locatif (IRL), sauf disposition légale ou convention écrite contraire.

ARTICLE 7 : REMISE EN ÉTAT

À l'expiration du bail et lors de la libération du bâtiment, le Preneur a l'obligation de rendre la maison dans l'état exact où elle se trouvait lors de la remise des clés, tel que décrit dans l'état des lieux initial, à l'exception de l'usure normale due au temps.

ARTICLE 8 : RÉPARATION ET FACTURATION

Toute destruction, dégradation ou modification non autorisée constatée lors de la sortie sera intégralement facturée au Preneur. Les frais de remise en état seront déduits de la garantie locative. Si le montant des dégâts excède la garantie locative, le Preneur s'engage à payer le reliquat sur présentation des factures de réparation.

ARTICLE 9 : CLAUSE RÉSOLUTOIRE

À défaut de paiement d'un seul terme de loyer à l'échéance, le bail sera résilié de plein droit UN (1) MOIS après une mise en demeure restée infructueuse.

CONDITIONS PARTICULIÈRES

${lease.terms ?? "Aucune condition particulière."}

Fait à ${city} le ${today}.
`;
  }

  private async getCompanyInfo(): Promise<CompanyInfo> {
    const rows = await this.db
      .select({
        companyName: appSettings.companyName,
        address: appSettings.address,
        phone: appSettings.phone,
        email: appSettings.email,
      })
      .from(appSettings)
      .where(eq(appSettings.id, 1))
      .limit(1);

    return rows[0] ?? { companyName: null, address: null, phone: null, email: null };
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

  private durationInMonths(start: Date | string | null | undefined, end: Date | string | null | undefined) {
    const startParts = this.dateParts(start);
    const endParts = this.dateParts(end);

    if (!startParts || !endParts) {
      return "[NUMÉRO DE MOIS] mois";
    }

    const months =
      (endParts.year - startParts.year) * 12 +
      (endParts.month - startParts.month) +
      (endParts.day >= startParts.day ? 0 : -1);

    return `${Math.max(months, 0)} mois`;
  }

  private guaranteeMonths(rent: string | null | undefined, deposit: string | null | undefined) {
    const rentAmount = Number(rent ?? 0);
    const depositAmount = Number(deposit ?? 0);

    if (!rentAmount || !depositAmount) {
      return "[NUMÉRO DE MOIS DE GARANTIE] mois de loyer";
    }

    const months = depositAmount / rentAmount;
    const rounded = Number.isInteger(months) ? months.toString() : months.toFixed(2).replace(".", ",");
    return `${rounded} mois de loyer`;
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

  private async log(contractId: number, event: string, ip: string | null, ua: string | null, details: string | null) {
    await this.db.insert(realEstateContractAuditLogs).values({
      contractId,
      event,
      ip: ip ?? null,
      userAgent: ua ?? null,
      details: details ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
    });
  }

  private async sendEmail(to: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
    await transporter.sendMail({ from: env.smtp.from, to, subject, html });
  }

  private signingEmailHtml(tenantName: string, url: string): string {
    return `<p>Bonjour ${tenantName},</p>
<p>Votre contrat de bail est prêt à être signé électroniquement.</p>
<p><a href="${url}" style="background:#1677ff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Signer mon contrat</a></p>
<p>Ce lien est valide pendant <strong>7 jours</strong>.</p>`;
  }
}
