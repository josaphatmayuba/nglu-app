import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { env } from "../config/env";
import { CompatService } from "../compat/compat.service";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  realEstateLeases,
  realEstateProperties,
  tenantDetails,
} from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import { SystemEmailService } from "../system-email/system-email.service";
import { TenantPortalService } from "./tenant-portal.service";

@Injectable()
export class RentReminderService {
  private readonly logger = new Logger(RentReminderService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly sms: CompatService,
    private readonly emails: SystemEmailService,
    private readonly tenantPortal: TenantPortalService,
  ) {}

  @Cron(env.rentReminders.cron)
  async scheduledRun() {
    if (!env.rentReminders.enabled) return;
    try {
      const result = await this.runOverdueReminders();
      this.logger.log(`Scheduled overdue reminders: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Scheduled overdue reminders failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async runOverdueReminders() {
    const overdueDays = env.rentReminders.overdueDays;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - overdueDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const company = await readOrgAppSetting(this.db, 1, {
      name: appSettings.companyName,
      phone: appSettings.phone,
      address: appSettings.address,
    });

    const companyName = (company?.name as string | null) || "votre gestionnaire";
    const companyPhone = ((company?.phone as string | null) || "").trim();
    const contactLine = companyPhone ? ` au ${companyPhone}` : "";

    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        organizationId: realEstateLeases.organizationId,
        tenantId: realEstateLeases.tenantId,
        reference: realEstateLeases.reference,
        rentAmount: realEstateLeases.rentAmount,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        lastReminder: realEstateLeases.lastOverdueReminderDate,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantEmail: customers.email,
        tenantPhone: customers.phone,
        emergencyPhone: tenantDetails.contactedPersonPhoneNumber,
        currencySymbol: currencies.currencySymbol,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
      })
      .from(realEstateLeases)
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .where(
        and(
          eq(realEstateLeases.status, "active"),
          isNotNull(realEstateLeases.nextInvoiceDate),
          lte(realEstateLeases.nextInvoiceDate, cutoffStr),
        ),
      );

    // When the feature is disabled (e.g. dev), never send anything — report candidates only.
    const send = env.rentReminders.enabled;

    let sent = 0;
    for (const lease of rows) {
      // Send once per overdue period (next_invoice_date advances when the tenant pays).
      if (lease.lastReminder && lease.lastReminder === lease.nextInvoiceDate) continue;
      if (!send) continue;

      const daysLate = Math.floor(
        (Date.now() - new Date(`${lease.nextInvoiceDate}T00:00:00`).getTime()) / 86_400_000,
      );
      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      const amount = `${lease.rentAmount}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`;
      const place = lease.propertyAddress || lease.propertyName || "votre logement";

      const tenantMsg =
        `Bonjour ${tenantName}, nous constatons que le loyer de ${place} (bail ${lease.reference}), ` +
        `d'un montant de ${amount}, est en retard de ${daysLate} jours. Nous vous invitons gentiment à ` +
        `régulariser ce paiement dès que possible afin d'éviter l'annulation de votre contrat de location. ` +
        `Pour tout règlement ou question, contactez ${companyName}${contactLine}. Merci de votre compréhension. — ${companyName}`;

      if (lease.tenantPhone) {
        const smsWithFooter = await this.tenantPortal.appendPortalFooterToSms(tenantMsg, lease.tenantId, lease.organizationId);
        await this.safeSms(lease.tenantPhone, smsWithFooter, lease.leaseId, lease.organizationId);
      }

      if (lease.tenantEmail) {
        const html =
          `<p>Bonjour ${tenantName},</p>` +
          `<p>Nous constatons que le loyer de <strong>${place}</strong> (bail <strong>${lease.reference}</strong>), ` +
          `d'un montant de <strong>${amount}</strong>, est en retard de <strong>${daysLate} jours</strong>.</p>` +
          `<p>Nous vous invitons gentiment à régulariser ce paiement dès que possible afin d'éviter ` +
          `l'annulation de votre contrat de location.</p>` +
          `<p>Pour tout règlement ou question, vous pouvez contacter ${companyName}${contactLine}.</p>` +
          `<p>Merci de votre compréhension.<br>${companyName}</p>`;
        const htmlWithFooter = await this.tenantPortal.appendPortalFooterToEmail(html, lease.tenantId, lease.organizationId);
        await this.safeEmail(lease.tenantEmail, `Rappel: loyer en retard — bail ${lease.reference}`, htmlWithFooter, lease.leaseId);
      }

      if (lease.emergencyPhone) {
        const emergencyMsg =
          `Bonjour, en tant que personne de contact de ${tenantName}, nous vous informons que son loyer pour ` +
          `${place} (${amount}) est en retard de ${daysLate} jours. Merci de bien vouloir l'inviter à régulariser ` +
          `ce paiement auprès de ${companyName}${contactLine}, afin d'éviter l'annulation de son contrat de location. ` +
          `Merci de votre compréhension. — ${companyName}`;
        await this.safeSms(lease.emergencyPhone, emergencyMsg, lease.leaseId, lease.organizationId);
      }

      await this.db
        .update(realEstateLeases)
        .set({ lastOverdueReminderDate: lease.nextInvoiceDate, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateLeases.id, lease.leaseId));
      sent += 1;
    }

    return { candidates: rows.length, sent, enabled: send };
  }

  private async safeSms(phone: string, message: string, leaseId: number, organizationId: number) {
    try {
      const res = await this.sms.sendSms({
        phone,
        message,
        organizationId,
        smsType: "payment_reminder",
        relatedType: "real-estate-lease",
        relatedId: leaseId,
      });
      if (!res?.success) {
        this.logger.warn(`Reminder SMS not sent (lease ${leaseId}, ${phone}): ${res?.message}`);
      }
    } catch (error) {
      this.logger.warn(`Reminder SMS error (lease ${leaseId}, ${phone}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async safeEmail(to: string, subject: string, html: string, leaseId: number) {
    try {
      await this.emails.send({
        to,
        subject,
        html,
        type: "payment_reminder",
        relatedType: "real-estate-lease",
        relatedId: leaseId,
      });
    } catch (error) {
      this.logger.warn(`Reminder email error (lease ${leaseId}, ${to}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
