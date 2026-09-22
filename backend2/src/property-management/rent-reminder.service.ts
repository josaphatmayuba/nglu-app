import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
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
import { OwnerNotificationsService } from "./owner-notifications.service";

@Injectable()
export class RentReminderService {
  private readonly logger = new Logger(RentReminderService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly sms: CompatService,
    private readonly emails: SystemEmailService,
    private readonly tenantPortal: TenantPortalService,
    private readonly ownerNotifications: OwnerNotificationsService,
  ) {}

  @Cron(env.rentReminders.cron)
  async scheduledRun() {
    if (!env.rentReminders.enabled) return;
    try {
      const result = await this.runOverdueReminders();
      this.logger.log(`Scheduled overdue reminders: ${JSON.stringify(result)}`);
      const expiry = await this.runExpiryReminders();
      this.logger.log(`Scheduled expiry reminders: ${JSON.stringify(expiry)}`);
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
        propertyId: realEstateLeases.propertyId,
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

      // Texte pilote depuis Reglages > Messages (evenement "payment_reminder").
      const vars = {
        tenantName,
        firstName: lease.tenantFirstName || tenantName,
        reference: lease.reference || "",
        amount,
        address: place,
        daysLate: String(daysLate),
        companyName,
        contactPhone: contactLine,
        url: await this.tenantPortal.portalUrlForTenant(lease.tenantId, lease.organizationId),
      };
      const tenantMsg = await this.ownerNotifications.renderMessage(
        "payment_reminder",
        "Bonjour {tenantName}, nous constatons que le loyer de {address} (bail {reference}), " +
          "d'un montant de {amount}, est en retard de {daysLate} jours. Nous vous invitons gentiment a " +
          "regulariser ce paiement des que possible afin d'eviter l'annulation de votre contrat de location. " +
          "Pour tout reglement ou question, contactez {companyName}{contactPhone}. Merci de votre comprehension. — {companyName}",
        vars,
      );

      if (lease.tenantPhone) {
        // Footer seulement si le modele n'a pas deja place {url} lui-meme.
        const smsWithFooter = this.ownerNotifications.fitOneSms(
          vars.url && tenantMsg.includes(vars.url)
            ? tenantMsg
            : await this.tenantPortal.appendPortalFooterToSms(tenantMsg, lease.tenantId, lease.organizationId),
        );
        await this.safeSms(lease.tenantPhone, smsWithFooter, lease.leaseId, lease.organizationId);
      }

      if (lease.tenantEmail) {
        // Meme contenu que le SMS (un seul texte configurable pour les deux canaux).
        const html = `<p>${tenantMsg}</p>`;
        const htmlWithFooter = await this.tenantPortal.appendPortalFooterToEmail(html, lease.tenantId, lease.organizationId);
        await this.safeEmail(lease.tenantEmail, `Rappel: loyer en retard — bail ${lease.reference}`, htmlWithFooter, lease.leaseId);
      }

      if (lease.emergencyPhone) {
        // Message distinct : il s'adresse au CONTACT D'URGENCE, pas au locataire
        // (aucun lien portail ne doit y figurer). Evenement dedie
        // "payment_reminder_contact" dans les Reglages.
        const emergencyMsg = await this.ownerNotifications.renderMessage(
          "payment_reminder_contact",
          "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que son loyer pour " +
            "{address} ({amount}) est en retard de {daysLate} jours. Merci de bien vouloir l'inviter a regulariser " +
            "ce paiement aupres de {companyName}{contactPhone}, afin d'eviter l'annulation de son contrat de location. " +
            "Merci de votre comprehension. — {companyName}",
          vars,
        );
        await this.safeSms(lease.emergencyPhone, emergencyMsg, lease.leaseId, lease.organizationId);
      }

      // Le PROPRIETAIRE du bien est prevenu du retard au meme rythme que le
      // locataire (une fois par periode impayee) : c'est son loyer qui manque.
      // Best-effort, comme les autres envois de cette boucle.
      await this.ownerNotifications.notifyPaymentOverdue(
        lease.leaseId,
        Number(lease.propertyId),
        daysLate,
        lease.organizationId,
      );

      await this.db
        .update(realEstateLeases)
        .set({ lastOverdueReminderDate: lease.nextInvoiceDate, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateLeases.id, lease.leaseId));
      sent += 1;
    }

    return { candidates: rows.length, sent, enabled: send };
  }

  /**
   * Rappel de FIN DE BAIL : previent le locataire que son bail arrive a
   * echeance et l'invite a se manifester s'il souhaite renouveler, et previent
   * le proprietaire pour qu'il anticipe la relocation. Envoye une seule fois
   * par echeance (last_expiry_reminder_date porte la end_date couverte) ; si le
   * bail est prolonge, la nouvelle end_date reouvre l'envoi.
   * Best-effort : un echec n'interrompt jamais la boucle.
   */
  async runExpiryReminders() {
    const noticeDays = env.rentReminders.expiryNoticeDays;
    const horizon = new Date();
    horizon.setHours(0, 0, 0, 0);
    horizon.setDate(horizon.getDate() + noticeDays);
    const horizonStr = horizon.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const company = await readOrgAppSetting(this.db, 1, {
      name: appSettings.companyName,
      phone: appSettings.phone,
    });
    const companyName = (company?.name as string | null) || "votre gestionnaire";
    const companyPhone = ((company?.phone as string | null) || "").trim();

    // Baux actifs dont la fin tombe dans la fenetre [aujourd'hui, +noticeDays].
    // Les baux sans date de fin (duree indeterminee) sont exclus par isNotNull.
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        organizationId: realEstateLeases.organizationId,
        tenantId: realEstateLeases.tenantId,
        propertyId: realEstateLeases.propertyId,
        reference: realEstateLeases.reference,
        endDate: realEstateLeases.endDate,
        lastExpiryReminder: realEstateLeases.lastExpiryReminderDate,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantPhone: customers.phone,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
      })
      .from(realEstateLeases)
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .where(
        and(
          eq(realEstateLeases.status, "active"),
          isNotNull(realEstateLeases.endDate),
          lte(realEstateLeases.endDate, horizonStr),
          gte(realEstateLeases.endDate, todayStr),
        ),
      );

    const send = env.rentReminders.enabled;
    let sent = 0;

    for (const lease of rows) {
      // Deja annonce pour CETTE echeance : on ne renvoie pas chaque jour.
      if (lease.lastExpiryReminder && lease.lastExpiryReminder === lease.endDate) continue;
      if (!send) continue;

      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      const place = lease.propertyAddress || lease.propertyName || "votre logement";
      const endLabel = this.ownerNotifications.shortDate(lease.endDate);
      const vars = {
        tenantName,
        firstName: lease.tenantFirstName || tenantName,
        reference: lease.reference || "",
        address: place,
        endDate: endLabel,
        companyName,
        contactPhone: companyPhone ? ` au ${companyPhone}` : "",
        url: "",
      };

      if (lease.tenantPhone) {
        const msg = await this.ownerNotifications.renderMessage(
          "lease_expiring",
          "Bonjour {firstName}, votre bail {address} se termine le {endDate}. " +
            "Pour le renouveler ou nous informer de votre depart, contactez {companyName}{contactPhone}.",
          vars,
        );
        await this.safeSms(lease.tenantPhone, msg, lease.leaseId, lease.organizationId);
      }

      await this.ownerNotifications.notifyLeaseExpiring(
        lease.leaseId,
        Number(lease.propertyId),
        lease.organizationId,
      );

      await this.db
        .update(realEstateLeases)
        .set({ lastExpiryReminderDate: lease.endDate, updatedAt: sql`CURRENT_TIMESTAMP` })
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
