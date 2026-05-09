import * as crypto from "crypto";
import { GoneException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import * as nodemailer from "nodemailer";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
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
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitName: string | null;
  tenantFirstName: string | null;
  tenantLastName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  tenantAddress: string | null;
  tenantName: string;
};

@Injectable()
export class ContractsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createContract(dto: CreateContractDto) {
    const lease = await this.getLeaseDetails(dto.leaseId);
    const content = dto.contractContent ?? this.generateContent(lease);

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

    return { ...rows[0], auditLogs };
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
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        propertyCity: realEstateProperties.city,
        unitName: realEstateUnits.name,
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

  private generateContent(lease: LeaseDetails): string {
    const today = new Date().toLocaleDateString("fr-CA");
    return `CONTRAT DE BAIL RÉSIDENTIEL
Date : ${today}
Référence : ${lease.reference ?? "N/A"}

PROPRIÉTAIRE
[Nom du propriétaire]
[Adresse du propriétaire]

LOCATAIRE
Nom : ${lease.tenantName}
Téléphone : ${lease.tenantPhone ?? "N/A"}
Adresse actuelle : ${lease.tenantAddress ?? "N/A"}
Courriel : ${lease.tenantEmail ?? "N/A"}

BIEN LOUÉ
Propriété : ${lease.propertyName ?? "N/A"}
Unité : ${lease.unitName ?? "N/A"}
Adresse : ${[lease.propertyAddress, lease.propertyCity].filter(Boolean).join(", ") || "N/A"}

CONDITIONS DU BAIL
Durée : du ${lease.startDate ?? "N/A"} au ${lease.endDate ?? "N/A"}
Cycle de facturation : ${lease.billingCycle ?? "mensuel"}
Loyer mensuel : ${lease.rentAmount ?? "0"}
Dépôt de garantie : ${lease.securityDeposit ?? "0"}

CONDITIONS PARTICULIÈRES
${lease.terms ?? "Aucune condition particulière."}

---
Les parties déclarent avoir lu et accepté les termes du présent contrat.

Signature du locataire : ________________________________
Date : ________________________________`;
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
