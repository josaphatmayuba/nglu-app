import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { and, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
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
import { joinRecipientNames, LeaseRecipient, OwnerNotificationsService } from "./owner-notifications.service";
import { loadFlaggedDueStates, loadLeaseOverdueAmount, readOverdueGraceDays, resolveCurrencySymbol, type LeaseDueState } from "./lease-overdue";
import { isLeaseFlagged } from "./lease-allocation";
import { loadEndedLeaseBalances, loadLastReminders, FORMER_DEBT_STATUS } from "./former-debt";
import { formatDateOnly, parseDateOnly } from "./lease-schedule";
import { escapeHtmlText } from "./notification-utils";
import { isPreviewing, notePreviewMissing } from "../compat/sms-preview";

/** Relance d'un ancien bail : au plus une par 24 h. */
const ENDED_REMINDER_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Marqueur interne : SMS non envoye car desactive (pas un echec). */
const SMS_SKIPPED = "__sms_skipped__";

// graceDays = delai de grace avant retard (Reglages « Retards de loyer ») : le
// rappel automatique part overdueDays jours APRES la fin de ce delai.
type ReminderConfig = { enabled: boolean; overdueDays: number; graceDays: number; expiryDays: number; hour: number };
export type ReminderTargets = { tenant: boolean; emergency: boolean; owner: boolean; delegates: boolean };

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

  /**
   * Config des rappels, lue dans Reglages (appSetting) par organisation.
   * NULL en base = valeur par defaut du code (env.rentReminders).
   */
  private async reminderConfig(orgId: number, cache: Map<number, ReminderConfig>): Promise<ReminderConfig> {
    const hit = cache.get(orgId);
    if (hit) return hit;
    const row = await readOrgAppSetting(this.db, orgId, {
      enabled: appSettings.rentReminderEnabled,
      overdueDays: appSettings.rentReminderOverdueDays,
      expiryDays: appSettings.leaseExpiryNoticeDays,
      hour: appSettings.rentReminderHour,
    });
    const cfg: ReminderConfig = {
      enabled: row?.enabled == null ? env.rentReminders.enabled : Number(row.enabled) === 1,
      overdueDays: Number(row?.overdueDays) > 0 ? Number(row?.overdueDays) : env.rentReminders.overdueDays,
      graceDays: await readOverdueGraceDays(this.db, orgId),
      expiryDays: Number(row?.expiryDays) > 0 ? Number(row?.expiryDays) : env.rentReminders.expiryNoticeDays,
      hour: row?.hour == null ? 9 : Number(row.hour),
    };
    cache.set(orgId, cfg);
    return cfg;
  }

  // Passe chaque heure ; chaque organisation n'est traitee qu'a l'heure choisie dans Reglages.
  @Cron("0 * * * *")
  async scheduledRun() {
    try {
      const hour = new Date().getHours();
      const result = await this.runOverdueReminders(undefined, { hour });
      this.logger.log(`Scheduled overdue reminders: ${JSON.stringify(result)}`);
      const expiry = await this.runExpiryReminders({ hour });
      this.logger.log(`Scheduled expiry reminders: ${JSON.stringify(expiry)}`);
    } catch (error) {
      this.logger.error(`Scheduled overdue reminders failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Relance MANUELLE d'un seul bail (bouton « Relancer » d'une carte en retard) :
   * renvoie meme si une relance a deja ete envoyee pour cette periode.
   */
  async runLeaseReminder(leaseId: number, orgId: number, targets?: Partial<ReminderTargets>) {
    // Bail termine : relance de la dette de l'ancien locataire (jamais dans la passe automatique).
    const [head] = await this.db
      .select({ status: realEstateLeases.status })
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)));
    if (head?.status === FORMER_DEBT_STATUS) return this.remindEndedLease(leaseId, orgId);
    return this.runOverdueReminders({
      leaseId,
      orgId,
      targets: { tenant: true, emergency: true, owner: false, delegates: false, ...targets },
    });
  }

  /**
   * Relance MANUELLE d'un bail TERMINE : montant = solde de l'ancien bail (plafonne a la sortie),
   * SMS unique (1 segment) a chaque ancien locataire, au plus une relance par 24 h et par bail.
   * Aucun marquage de periode (lastOverdueReminderDate) : le suivi se fait via sms_logs.
   */
  private async remindEndedLease(leaseId: number, orgId: number) {
    const bal = (await loadEndedLeaseBalances(this.db, orgId, [leaseId])).get(leaseId);
    if (!bal || bal.balanceMinor <= 0) throw new BadRequestException("Aucune dette sur cet ancien bail.");
    const recipients = (await this.recipientsByLease([{ leaseId, organizationId: orgId, tenantId: bal.tenantId }])).get(leaseId) ?? [];
    const last = (await loadLastReminders(this.db, orgId, [{ leaseId, tenantIds: recipients.map((r) => r.customerId) }])).get(leaseId);
    if (last && Date.now() - new Date(last).getTime() < ENDED_REMINDER_MIN_INTERVAL_MS) {
      throw new HttpException(
        { statusCode: 429, code: "FORMER_DEBT_REMINDER_TOO_RECENT", message: "Une relance a deja ete envoyee il y a moins de 24 h.", lastReminderAt: last },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const symbol = await resolveCurrencySymbol(this.db, orgId, bal.currency.symbol || bal.currency.code);
    const amount = `${Number(bal.balance).toLocaleString("fr-FR", { minimumFractionDigits: bal.decimals, maximumFractionDigits: bal.decimals })}${symbol ? ` ${symbol}` : ""}`;
    const [prop] = await this.db
      .select({ name: realEstateProperties.name })
      .from(realEstateProperties)
      .where(and(eq(realEstateProperties.id, bal.propertyId), eq(realEstateProperties.organizationId, orgId)));
    const company = await readOrgAppSetting(this.db, 1, { name: appSettings.companyName });
    const companyName = (company?.name as string | null) || "votre gestionnaire";
    let sentCount = 0;
    let failures = 0;
    let skipped = 0;
    let smsError: string | null = null;
    const multi = recipients.length > 1;
    for (const r of recipients) {
      const first = (r.firstName || r.name || "").trim().split(/\s+/)[0] || "Locataire";
      const msg = await this.ownerNotifications.renderMessage(
        "payment_reminder_former",
        "Bonjour {firstName}, il reste {amount} sur votre ancien bail {address}. Merci de regulariser. {companyName}",
        { firstName: first.slice(0, 20), amount, address: prop?.name || "", companyName },
      );
      if (!r.phone) {
        notePreviewMissing(`Ancien locataire · ${r.name} · bail ${bal.reference || leaseId}`);
        continue;
      }
      const err = await this.safeSms(
        r.phone, this.ownerNotifications.fitOneSms(msg), leaseId, orgId, this.related(multi, r.customerId, leaseId),
        `Ancien locataire · ${r.name} · bail ${bal.reference || leaseId}`,
      );
      if (err === SMS_SKIPPED) skipped += 1;
      else if (err) { failures += 1; smsError = smsError ?? err; }
      else sentCount += 1;
    }
    const smsStatus = sentCount > 0 ? "sent" : failures > 0 ? "failed" : skipped > 0 ? "skipped" : "no_phone";
    return { candidates: 1, sent: 1, smsStatus, smsError, hasEmail: false };
  }

  async runOverdueReminders(
    only?: { leaseId: number; orgId: number; targets?: ReminderTargets },
    schedule?: { hour: number },
    // Bouton « Relancer les impayes » : limite a l'organisation de l'utilisateur
    // (la passe automatique, sans scope, couvre toujours toutes les organisations).
    scope?: { orgId: number },
  ) {
    const configs = new Map<number, ReminderConfig>();
    // Passe automatique : tout le monde. Relance manuelle : destinataires choisis.
    const targets: ReminderTargets = only?.targets ?? { tenant: true, emergency: true, owner: true, delegates: true };
    // Pre-filtre large (retard >= 1 jour) : le seuil exact est propre a chaque organisation.
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 1);
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
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        billingCycle: realEstateLeases.billingCycle,
        rentProrationEnabled: realEstateLeases.rentProrationEnabled,
        currencyDecimals: currencies.decimalPlaces,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        currencyId: realEstateLeases.currencyId,
        allocationLedgerAt: realEstateLeases.allocationLedgerAt,
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
          // Baux flagges (registre d'imputations) : retard lu sur l'etat impute, pas sur nextInvoiceDate.
          or(isNotNull(realEstateLeases.nextInvoiceDate), isNotNull(realEstateLeases.allocationLedgerAt)),
          only
            ? and(eq(realEstateLeases.id, only.leaseId), eq(realEstateLeases.organizationId, only.orgId))
            : or(lte(realEstateLeases.nextInvoiceDate, cutoffStr), isNotNull(realEstateLeases.allocationLedgerAt)),
          scope ? eq(realEstateLeases.organizationId, scope.orgId) : undefined,
        ),
      );

    const recipientsMap = await this.recipientsByLease(rows);
    // Baux flagges : etat impute charge par organisation (aucune requete si aucun bail flagge).
    const ledgerByLease = new Map<number, LeaseDueState>();
    const flaggedRows = rows.filter((l) => isLeaseFlagged(l));
    if (flaggedRows.length) {
      const todayStr = formatDateOnly(new Date());
      const today = parseDateOnly(todayStr);
      for (const orgId of [...new Set(flaggedRows.map((l) => Number(l.organizationId)))]) {
        const orgRows = flaggedRows.filter((l) => Number(l.organizationId) === orgId).map((l) => ({ id: Number(l.leaseId), currencyId: l.currencyId, currencyDecimals: l.currencyDecimals }));
        const states = await loadFlaggedDueStates(this.db, orgId, orgRows, today, await readOverdueGraceDays(this.db, orgId));
        for (const [id, st] of states) ledgerByLease.set(id, st);
      }
      for (const l of flaggedRows) {
        const st = ledgerByLease.get(Number(l.leaseId));
        const oldest = st?.dues.find((d) => d.dueDate <= todayStr && d.remaining > 0);
        // « Echeance en retard » = plus ancienne echeance echue non soldee.
        if (oldest) l.nextInvoiceDate = oldest.dueDate;
        else if (!only) l.nextInvoiceDate = null;
        else if (!l.nextInvoiceDate) l.nextInvoiceDate = todayStr;
      }
    }
    let sent = 0;
    let lastSms: { smsStatus: string; smsError: string | null; hasEmail: boolean } | null = null;
    for (const lease of rows) {
      if (!lease.nextInvoiceDate && !only) continue;
      // Send once per overdue period (next_invoice_date advances when the tenant pays).
      if (!only && lease.lastReminder && lease.lastReminder === lease.nextInvoiceDate) continue;
      // Reglages de l'organisation : relance manuelle = toujours envoyee ; automatique = si active,
      // a l'heure choisie et au-dela de (delai de grace + jours de rappel) apres l'echeance.
      if (!only) {
        const cfg = await this.reminderConfig(Number(lease.organizationId), configs);
        const late = Math.floor((Date.now() - new Date(`${lease.nextInvoiceDate}T00:00:00`).getTime()) / 86_400_000);
        if (!cfg.enabled || late < cfg.graceDays + cfg.overdueDays) continue;
        if (schedule && schedule.hour !== cfg.hour) continue;
      }

      // Etat du SMS au locataire (remonte a l'UI pour la relance manuelle).
      let smsStatus: "sent" | "failed" | "no_phone" | "skipped" = targets.tenant ? "no_phone" : "skipped";
      let smsError: string | null = null;
      let smsFailures = 0;
      let smsSkipped = 0;

      const daysLate = Math.floor(
        (Date.now() - new Date(`${lease.nextInvoiceDate}T00:00:00`).getTime()) / 86_400_000,
      );
      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      // {amount} = montant EN RETARD (= « Retard » de la carte Loyers : echeances dont la
      // grace est depassee), identique dans les SMS locataire / contact / proprietaire /
      // delegue. {totalDue} = « Reste a payer » (inclut le mois encore dans sa grace).
      // Bail sans devise : devise par defaut de l'organisation (jamais un montant nu).
      lease.currencySymbol = await resolveCurrencySymbol(this.db, Number(lease.organizationId), lease.currencySymbol);
      const overdue = await loadLeaseOverdueAmount(
        this.db,
        Number(lease.organizationId),
        { ...lease, id: Number(lease.leaseId) },
        lease.currencySymbol,
      );
      const amount = overdue.text;
      const place = lease.propertyAddress || lease.propertyName || "votre logement";

      // Texte pilote depuis Reglages > Messages (evenement "payment_reminder").
      // Le locataire est renvoye vers les personnes en charge de SON immeuble
      // (proprietaire + gestionnaire assigne), pas vers un numero d'entreprise
      // generique ; on retombe sur le contact de la societe s'il n'y en a aucun.
      const propertyContacts = await this.ownerNotifications.propertyContactVars(
        lease.propertyId ? Number(lease.propertyId) : null,
        lease.organizationId,
      );
      // Bailleur cite dans la relance : proprietaire du bien (nom + telephone), sinon la societe.
      const landlord = await this.ownerNotifications.landlordForProperty(
        lease.propertyId ? Number(lease.propertyId) : null,
        Number(lease.organizationId),
      );
      const recipients = recipientsMap.get(Number(lease.leaseId)) ?? [];
      const multi = recipients.length > 1;
      // Nom(s) affiche(s) a la personne de contact : "A & B" si plusieurs locataires.
      const groupName = multi ? joinRecipientNames(recipients) : tenantName;
      const baseVars = {
        tenantName,
        firstName: lease.tenantFirstName || tenantName,
        reference: lease.reference || "",
        amount,
        totalDue: overdue.totalDue.text,
        monthlyRent: amount,
        address: place,
        daysLate: String(daysLate),
        companyName,
        contactPhone: contactLine,
        ownerContact: propertyContacts.ownerContact,
        managerContact: propertyContacts.managerContact,
        contacts: propertyContacts.contacts || `${companyName}${contactLine}`,
        ownerName: landlord.name || companyName,
        ownerPhone: landlord.phone || companyPhone,
        url: "",
      };
      let anyEmail = false;
      let sentCount = 0;

      // Chaque locataire du bail recoit SON rappel (nom + lien portail propres).
      // Un echec pour l'un ne bloque pas les autres.
      for (const r of targets.tenant ? recipients : []) {
        try {
          const vars = {
            ...baseVars,
            tenantName: r.name || tenantName,
            firstName: r.firstName || r.name || tenantName,
            url: await this.tenantPortal.portalUrlForTenant(r.customerId, lease.organizationId),
          };
          const tenantMsg = await this.ownerNotifications.renderMessage(
            "payment_reminder",
            "Bonjour {tenantName}, loyer en retard de {lateLabel} ({amount}). Merci de régulariser. Bailleur : {ownerName}, {ownerPhone}.",
            vars,
            { tenantId: r.customerId },
          );
          const rel = this.related(multi, r.customerId, lease.leaseId);

          if (r.phone) {
            // Pas de lien portail ajoute au SMS : il coupait le message (1 SMS max). Il reste
            // dans l'email, et dans le SMS seulement si le modele contient {url}.
            const smsWithFooter = this.ownerNotifications.fitOneSms(tenantMsg);
            const err = await this.safeSms(
              r.phone, smsWithFooter, lease.leaseId, lease.organizationId, rel,
              `Locataire · ${r.name || tenantName} · bail ${lease.reference || lease.leaseId}`,
            );
            if (err === SMS_SKIPPED) {
              smsSkipped += 1;
            } else if (err) {
              smsFailures += 1;
              smsError = smsError ?? err;
            } else {
              sentCount += 1;
            }
          } else {
            notePreviewMissing(`Locataire · ${r.name || tenantName} · bail ${lease.reference || lease.leaseId}`);
          }

          if (r.email) {
            anyEmail = true;
            // Meme contenu que le SMS (un seul texte configurable pour les deux canaux).
            const html = `<p>${escapeHtmlText(tenantMsg)}</p>`;
            const htmlWithFooter = await this.tenantPortal.appendPortalFooterToEmail(html, r.customerId, lease.organizationId);
            await this.safeEmail(r.email, `Rappel: loyer en retard — bail ${lease.reference}`, htmlWithFooter, lease.leaseId, rel);
          }
        } catch (error) {
          this.logger.warn(
            `Overdue reminder failed (lease ${lease.leaseId}, tenant ${r.customerId}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      if (targets.tenant) {
        if (sentCount > 0) smsStatus = "sent";
        else if (smsFailures > 0) smsStatus = "failed";
        else if (smsSkipped > 0) smsStatus = "skipped";
      }

      if (targets.emergency && lease.emergencyPhone) {
        // Message distinct : il s'adresse au CONTACT D'URGENCE, pas au locataire
        // (aucun lien portail ne doit y figurer). Evenement dedie
        // "payment_reminder_contact" dans les Reglages.
        const emergencyMsg = await this.ownerNotifications.renderMessage(
          "payment_reminder_contact",
          "Bonjour, {tenantName} a {lateLabel} de retard de loyer. Montant du : {amount}. " +
            "Merci de l'inviter a regulariser : {contacts}",
          {
            ...baseVars,
            ...(multi ? { tenantName: groupName } : {}),
            // Le SMS est ramene a 160 caracteres en gardant le DERNIER numero : avec
            // « proprietaire X au ..., gestionnaire Y au ... », le nom du proprietaire
            // restait accole au numero du gestionnaire. On cite le bailleur seul, comme
            // le SMS du locataire (meme nom, meme numero).
            contacts: landlord.phone
              ? `proprietaire ${landlord.name || companyName} au ${landlord.phone}`
              : baseVars.contacts,
          },
          multi ? undefined : { tenantId: lease.tenantId },
        );
        await this.safeSms(
          lease.emergencyPhone, emergencyMsg, lease.leaseId, lease.organizationId, undefined,
          `Contact d'urgence · bail ${lease.reference || lease.leaseId}`,
        );
      } else if (targets.emergency) {
        notePreviewMissing(`Contact d'urgence · bail ${lease.reference || lease.leaseId}`);
      }

      // Le PROPRIETAIRE du bien est prevenu du retard au meme rythme que le
      // locataire (une fois par periode impayee) : c'est son loyer qui manque.
      // Best-effort, comme les autres envois de cette boucle.
      if (targets.owner || targets.delegates) {
        await this.ownerNotifications.notifyPaymentOverdue(
          lease.leaseId,
          Number(lease.propertyId),
          daysLate,
          lease.organizationId,
          { owner: targets.owner, delegates: targets.delegates },
        );
      }

      // Throttle par BAIL, pose UNE seule fois apres la boucle. Tous les SMS ont
      // echoue : on ne marque PAS la periode comme relancee, pour que la
      // prochaine passe automatique (ou un nouveau clic) puisse le renvoyer.
      if (targets.tenant && smsStatus !== "failed" && !isPreviewing()) {
        await this.db
          .update(realEstateLeases)
          .set({ lastOverdueReminderDate: lease.nextInvoiceDate, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(realEstateLeases.id, lease.leaseId));
      }
      sent += 1;
      lastSms = { smsStatus, smsError, hasEmail: anyEmail };
    }

    return { candidates: rows.length, sent, ...(only ? lastSms : {}) };
  }

  /**
   * Rappel de FIN DE BAIL : previent le locataire que son bail arrive a
   * echeance et l'invite a se manifester s'il souhaite renouveler, et previent
   * le proprietaire pour qu'il anticipe la relocation. Envoye une seule fois
   * par echeance (last_expiry_reminder_date porte la end_date couverte) ; si le
   * bail est prolonge, la nouvelle end_date reouvre l'envoi.
   * Best-effort : un echec n'interrompt jamais la boucle.
   */
  async runExpiryReminders(schedule?: { hour: number }) {
    const configs = new Map<number, ReminderConfig>();
    // Pre-filtre large (1 an) : la fenetre exacte est propre a chaque organisation.
    const horizon = new Date();
    horizon.setHours(0, 0, 0, 0);
    horizon.setDate(horizon.getDate() + 365);
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
          // Resiliation programmee active : pas de rappel de fin de bail.
          sql`NOT EXISTS (SELECT 1 FROM real_estate_lease_scheduled_terminations st WHERE st.lease_id = ${realEstateLeases.id} AND st.status = 'scheduled')`,
        ),
      );

    const recipientsMap = await this.recipientsByLease(rows);
    let sent = 0;

    for (const lease of rows) {
      // Deja annonce pour CETTE echeance : on ne renvoie pas chaque jour.
      if (lease.lastExpiryReminder && lease.lastExpiryReminder === lease.endDate) continue;
      const cfg = await this.reminderConfig(Number(lease.organizationId), configs);
      if (!cfg.enabled) continue;
      if (schedule && schedule.hour !== cfg.hour) continue;
      const daysLeft = Math.ceil((new Date(`${lease.endDate}T00:00:00`).getTime() - Date.now()) / 86_400_000);
      if (daysLeft > cfg.expiryDays) continue;

      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      const place = lease.propertyAddress || lease.propertyName || "votre logement";
      const endLabel = this.ownerNotifications.shortDate(lease.endDate);
      const contactLine = companyPhone ? ` au ${companyPhone}` : "";
      const propertyContacts = await this.ownerNotifications.propertyContactVars(
        lease.propertyId ? Number(lease.propertyId) : null,
        lease.organizationId,
      );
      const baseVars = {
        tenantName,
        firstName: lease.tenantFirstName || tenantName,
        reference: lease.reference || "",
        address: place,
        endDate: endLabel,
        companyName,
        contactPhone: contactLine,
        ownerContact: propertyContacts.ownerContact,
        managerContact: propertyContacts.managerContact,
        contacts: propertyContacts.contacts || `${companyName}${contactLine}`,
        url: "",
      };

      // Chaque locataire du bail est prevenu de la fin de bail (son nom, son
      // numero ; un numero partage = un seul SMS). Un echec ne bloque personne.
      const recipients = recipientsMap.get(Number(lease.leaseId)) ?? [];
      const multi = recipients.length > 1;
      for (const r of recipients) {
        if (!r.phone) continue;
        try {
          const msg = await this.ownerNotifications.renderMessage(
            "lease_expiring",
            "Bonjour {firstName}, votre bail {address} se termine le {endDate}. " +
              "Pour le renouveler ou nous informer de votre depart, contactez {contacts}.",
            {
              ...baseVars,
              tenantName: r.name || tenantName,
              firstName: r.firstName || r.name || tenantName,
            },
            { tenantId: r.customerId },
          );
          await this.safeSms(r.phone, msg, lease.leaseId, lease.organizationId, this.related(multi, r.customerId, lease.leaseId));
        } catch (error) {
          this.logger.warn(
            `Expiry reminder failed (lease ${lease.leaseId}, tenant ${r.customerId}): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
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

    return { candidates: rows.length, sent };
  }

  /** Locataires (principal + colocataires actifs) de chaque bail, 1 requete par organisation. */
  private async recipientsByLease(
    rows: Array<{
      leaseId: number;
      organizationId: number;
      tenantId?: number | null;
      tenantFirstName?: string | null;
      tenantLastName?: string | null;
      tenantEmail?: string | null;
      tenantPhone?: string | null;
    }>,
  ) {
    const byOrg = new Map<number, number[]>();
    for (const r of rows) {
      const org = Number(r.organizationId);
      byOrg.set(org, [...(byOrg.get(org) ?? []), Number(r.leaseId)]);
    }
    const out = new Map<number, LeaseRecipient[]>();
    for (const [org, ids] of byOrg) {
      try {
        for (const [k, v] of await this.ownerNotifications.leaseRecipients(ids, org)) out.set(k, v);
      } catch (error) {
        // Ne pas avaler : erreur loggee, repli ci-dessous sur le principal du bail.
        this.logger.error(`Lease recipients lookup failed (org ${org}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Repli : bail sans le principal (fiche client inactive, ou echec de la requete)
    // -> le principal du bail (telephone/email du bail) comme avant les colocataires.
    for (const r of rows) {
      const key = Number(r.leaseId);
      const list = out.get(key) ?? [];
      if (list.some((x) => x.isPrincipal) || !r.tenantId) continue;
      if (list.length > 0) continue; // colocataires actifs seuls : pas d'invention
      const name = [r.tenantFirstName, r.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      out.set(key, [
        {
          customerId: Number(r.tenantId),
          name,
          firstName: r.tenantFirstName || "",
          civilName: name,
          phone: r.tenantPhone || null,
          email: r.tenantEmail || null,
          isPrincipal: true,
        },
      ]);
    }
    return out;
  }

  /** Log d'un envoi : bail a 1 locataire = rattachement au bail (historique), sinon au locataire concerne. */
  private related(multi: boolean, customerId: number, leaseId: number) {
    return multi
      ? { relatedType: "tenant", relatedId: customerId }
      : { relatedType: "real-estate-lease", relatedId: leaseId };
  }

  private async safeSms(
    phone: string,
    message: string,
    leaseId: number,
    organizationId: number,
    related: { relatedType: string; relatedId: number } = { relatedType: "real-estate-lease", relatedId: leaseId },
    previewLabel?: string,
  ): Promise<string | null> {
    try {
      const res = await this.sms.sendSms({
        phone,
        message,
        organizationId,
        smsType: "payment_reminder",
        ...related,
        previewLabel,
      });
      if (!res?.success) {
        if ((res as any)?.skipped) return SMS_SKIPPED;
        this.logger.warn(`Reminder SMS not sent (lease ${leaseId}, ${phone}): ${res?.message}`);
        return res?.message || "SMS non envoye";
      }
      return null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Reminder SMS error (lease ${leaseId}, ${phone}): ${msg}`);
      return msg;
    }
  }

  private async safeEmail(
    to: string,
    subject: string,
    html: string,
    leaseId: number,
    related: { relatedType: string; relatedId: number } = { relatedType: "real-estate-lease", relatedId: leaseId },
  ) {
    try {
      await this.emails.send({
        to,
        subject,
        html,
        type: "payment_reminder",
        ...related,
      });
    } catch (error) {
      this.logger.warn(`Reminder email error (lease ${leaseId}, ${to}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
