import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { and, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import { CompatService } from "../compat/compat.service";
import { normalizePhoneE164 } from "../common/phone.util";
import { DRIZZLE } from "../database/database.constants";
import { appSettings, customers, realEstateAnnouncements, realEstateLeases, smsLogs } from "../database/schema";
import type { Database } from "../database/types";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { PropertyManagementService } from "./property-management.service";

export const ANNOUNCEMENT_RELATED_TYPE = "real-estate-announcement";
export const ANNOUNCEMENT_MAX_LENGTH = 480;
export const ANNOUNCEMENT_MAX_SELECTION = 300;
export const ANNOUNCEMENT_DAILY_QUOTA = 1000; // destinataires max / organisation / jour
export const ANNOUNCEMENT_MAX_ATTEMPTS = 3; // tentatives max par numero et par annonce
const STALE_MS = 10 * 60 * 1000; // annonce "en cours" sans activite depuis > 10 min = bloquee
const PAUSE_MS = 300;

type Scope = "all" | number[];
type Recipient = { tenantId: number; name: string; phone: string };
type Excluded = { tenantId: number; name: string; reason: "no_phone" | "invalid_phone" };
type Target = { propertyId?: number | null; tenantIds?: number[] | null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly sms: CompatService,
    private readonly ownerNotifications: OwnerNotificationsService,
    private readonly propertyManagement: PropertyManagementService,
  ) {}

  /** Debloque les annonces restees queued/sending apres un redemarrage (non bloquant). */
  async onModuleInit() {
    try {
      const stale = await this.db
        .select({ id: realEstateAnnouncements.id, organizationId: realEstateAnnouncements.organizationId })
        .from(realEstateAnnouncements)
        .where(
          and(
            inArray(realEstateAnnouncements.status, ["queued", "sending"]),
            lt(realEstateAnnouncements.updatedAt, new Date(Date.now() - STALE_MS)),
          ),
        );
      for (const a of stale) await this.finalizeFromLogs(Number(a.id), Number(a.organizationId));
      if (stale.length) this.logger.warn(`${stale.length} communique(s) bloque(s) finalise(s) au demarrage.`);
    } catch (e) {
      this.logger.warn(`Announcements recovery failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Recalcule sent/failed depuis sms_logs (par numero) et passe l'annonce en "done". */
  private async finalizeFromLogs(id: number, orgId: number) {
    try {
      const logs = await this.db
        .select({ recipient: smsLogs.recipient, status: smsLogs.status })
        .from(smsLogs)
        .where(this.logsWhere(id, orgId));
      const sent = new Set(logs.filter((l) => l.status === "sent").map((l) => l.recipient));
      const failed = new Set(logs.filter((l) => l.status === "failed" && !sent.has(l.recipient)).map((l) => l.recipient));
      await this.setState(id, orgId, { sentCount: sent.size, failedCount: failed.size, status: "done" });
    } catch {
      await this.setState(id, orgId, { status: "done" });
    }
  }

  private inScope(propertyId: number, scope: Scope) {
    if (scope !== "all" && !scope.includes(propertyId)) throw new NotFoundException("Property not found.");
  }

  private async smsEnabled(orgId: number): Promise<boolean> {
    const s = await readOrgAppSetting(this.db, orgId, { smsEnabled: appSettings.smsEnabled });
    return !(s && s.smsEnabled != null && Number(s.smsEnabled) === 0);
  }

  private validateTarget(t: Target) {
    const hasProperty = t.propertyId != null;
    const hasTenants = Array.isArray(t.tenantIds) && t.tenantIds.length > 0;
    if (hasProperty === hasTenants) {
      throw new BadRequestException("Indiquez soit un immeuble, soit une liste de locataires.");
    }
    if (hasTenants && t.tenantIds!.length > ANNOUNCEMENT_MAX_SELECTION) {
      throw new BadRequestException(`Maximum ${ANNOUNCEMENT_MAX_SELECTION} locataires par communique.`);
    }
  }

  private cleanMessage(raw: unknown): string {
    const message =
      typeof raw === "string"
        ? raw.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim()
        : "";
    if (!message) throw new BadRequestException("Le message est obligatoire.");
    if (message.length > ANNOUNCEMENT_MAX_LENGTH) {
      throw new BadRequestException(`Le message ne doit pas depasser ${ANNOUNCEMENT_MAX_LENGTH} caracteres.`);
    }
    return message;
  }

  /** Calcule destinataires (dedoublonnes par numero E.164) et exclus. */
  async resolveRecipients(target: Target, orgId: number, scope: Scope) {
    this.validateTarget(target);
    const conditions: any[] = [eq(realEstateLeases.organizationId, orgId), eq(realEstateLeases.status, "active")];
    if (target.propertyId != null) {
      this.inScope(Number(target.propertyId), scope);
      conditions.push(eq(realEstateLeases.propertyId, Number(target.propertyId)));
    } else if (scope !== "all") {
      conditions.push(scope.length ? inArray(realEstateLeases.propertyId, scope) : sql`1 = 0`);
    }
    const leases = await this.db.select({ id: realEstateLeases.id }).from(realEstateLeases).where(and(...conditions));
    const leaseIds = leases.map((l) => Number(l.id));
    const byLease = leaseIds.length ? await this.ownerNotifications.leaseRecipients(leaseIds, orgId) : new Map();

    // customerId -> {name, phone}. Pour une selection, le telephone vient de la fiche client
    // (leaseRecipients masque un numero deja vu dans le bail).
    const pool = new Map<number, { name: string; phone: string | null }>();
    for (const list of byLease.values()) {
      for (const r of list) {
        const prev = pool.get(r.customerId);
        if (!prev) pool.set(r.customerId, { name: r.name, phone: r.phone });
        else if (!prev.phone && r.phone) prev.phone = r.phone;
      }
    }

    let ids: number[];
    if (target.propertyId != null) {
      ids = [...pool.keys()];
    } else {
      ids = [...new Set((target.tenantIds ?? []).map(Number))];
      if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new BadRequestException("Identifiant locataire invalide.");
      const unknown = ids.filter((i) => !pool.has(i));
      if (unknown.length) {
        throw new BadRequestException("Locataire sans bail actif dans votre perimetre ou hors organisation.");
      }
      const rows = await this.db
        .select({ id: customers.id, phone: customers.phone })
        .from(customers)
        .where(and(inArray(customers.id, ids), eq(customers.organizationId, orgId)));
      for (const row of rows) {
        const p = pool.get(Number(row.id));
        if (p && row.phone) p.phone = row.phone;
      }
    }

    const recipients: Recipient[] = [];
    const excluded: Excluded[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    for (const id of ids) {
      const p = pool.get(id)!;
      const raw = (p.phone ?? "").trim();
      if (!raw) {
        excluded.push({ tenantId: id, name: p.name, reason: "no_phone" });
        continue;
      }
      const e164 = normalizePhoneE164(raw);
      if (!e164) {
        excluded.push({ tenantId: id, name: p.name, reason: "invalid_phone" });
        continue;
      }
      if (seen.has(e164)) {
        duplicates++;
        continue;
      }
      seen.add(e164);
      recipients.push({ tenantId: id, name: p.name, phone: e164 });
    }
    return { recipients, excluded, duplicates, count: recipients.length };
  }

  async preview(target: Target, orgId: number, scope: Scope) {
    return this.resolveRecipients(target, orgId, scope);
  }

  async create(input: Target & { message: string }, orgId: number, userId: number | undefined, scope: Scope) {
    const message = this.cleanMessage(input.message);
    this.validateTarget(input);
    if (!(await this.smsEnabled(orgId))) {
      throw new BadRequestException("Envoi de SMS désactivé dans les réglages");
    }
    const { recipients, excluded } = await this.resolveRecipients(input, orgId, scope);
    if (!recipients.length) throw new BadRequestException("Aucun destinataire avec un numero valide.");

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [usage] = await this.db
      .select({ total: sql<string>`coalesce(sum(${realEstateAnnouncements.recipientsCount}), 0)` })
      .from(realEstateAnnouncements)
      .where(and(eq(realEstateAnnouncements.organizationId, orgId), gte(realEstateAnnouncements.createdAt, since)));
    const used = Number(usage?.total ?? 0);
    if (used + recipients.length > ANNOUNCEMENT_DAILY_QUOTA) {
      throw new BadRequestException(
        `Quota quotidien depasse : ${ANNOUNCEMENT_DAILY_QUOTA} destinataires par jour (deja ${used} aujourd'hui, ${recipients.length} demandes).`,
      );
    }

    const [row] = await this.db.insert(realEstateAnnouncements).values({
      organizationId: orgId,
      propertyId: input.propertyId ?? null,
      message,
      audience: input.propertyId != null ? "property" : "selection",
      recipientsCount: recipients.length,
      skippedCount: excluded.length,
      status: "queued",
      createdBy: userId ?? null,
    }).$returningId();
    const id = Number(row.id);

    // Envoi hors requete et hors transaction.
    setImmediate(() => {
      this.dispatch(id, orgId, message, recipients.map((r) => r.phone), excluded.length).catch((e) =>
        this.logger.error(`Announcement ${id} dispatch crashed: ${e instanceof Error ? e.message : String(e)}`),
      );
    });
    return { id, recipientsCount: recipients.length };
  }

  private async setState(id: number, orgId: number, patch: Record<string, unknown>) {
    try {
      await this.db
        .update(realEstateAnnouncements)
        .set(patch)
        .where(and(eq(realEstateAnnouncements.id, id), eq(realEstateAnnouncements.organizationId, orgId)));
    } catch (e) {
      this.logger.warn(`Announcement ${id} state update failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async dispatch(id: number, orgId: number, message: string, phones: string[], excludedCount: number) {
    let sent = 0;
    let failed = 0;
    let skipped = excludedCount;
    await this.setState(id, orgId, { status: "sending" });
    try {
      for (let i = 0; i < phones.length; i++) {
        try {
          const res: any = await this.sms.sendSms({
            phone: phones[i],
            message,
            smsType: "announcement",
            organizationId: orgId,
            relatedType: ANNOUNCEMENT_RELATED_TYPE,
            relatedId: id,
          });
          if (res?.success) sent++;
          else if (res?.skipped) skipped++;
          else failed++;
        } catch (e) {
          failed++;
          this.logger.warn(`Announcement ${id} SMS error: ${e instanceof Error ? e.message : String(e)}`);
        }
        if ((i + 1) % 5 === 0 || i === phones.length - 1) {
          await this.setState(id, orgId, { sentCount: sent, failedCount: failed, skippedCount: skipped });
        }
        if (i < phones.length - 1) await sleep(PAUSE_MS);
      }
    } finally {
      await this.setState(id, orgId, { sentCount: sent, failedCount: failed, skippedCount: skipped, status: "done" });
    }
  }

  private scopeFilter(scope: Scope, userId?: number) {
    if (scope === "all") return undefined;
    // Communiques "selection" (property_id NULL) : visibles par leur createur ou les roles sans restriction de bien.
    const byProperty = scope.length ? inArray(realEstateAnnouncements.propertyId, scope) : sql`1 = 0`;
    return userId != null ? or(eq(realEstateAnnouncements.createdBy, userId), byProperty) : byProperty;
  }

  async list(orgId: number, scope: Scope, propertyId?: number, userId?: number) {
    if (propertyId != null) this.inScope(propertyId, scope);
    return this.db
      .select()
      .from(realEstateAnnouncements)
      .where(
        and(
          eq(realEstateAnnouncements.organizationId, orgId),
          eq(realEstateAnnouncements.isActive, 1),
          propertyId != null ? eq(realEstateAnnouncements.propertyId, propertyId) : undefined,
          this.scopeFilter(scope, userId),
        ),
      )
      .orderBy(desc(realEstateAnnouncements.id))
      .limit(200);
  }

  private async getOrThrow(id: number, orgId: number, scope: Scope, userId?: number) {
    const [row] = await this.db
      .select()
      .from(realEstateAnnouncements)
      .where(
        and(
          eq(realEstateAnnouncements.id, id),
          eq(realEstateAnnouncements.organizationId, orgId),
          eq(realEstateAnnouncements.isActive, 1),
          this.scopeFilter(scope, userId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Communique introuvable.");
    return row;
  }

  private logsWhere(id: number, orgId: number) {
    return and(
      eq(smsLogs.organizationId, orgId),
      eq(smsLogs.relatedType, ANNOUNCEMENT_RELATED_TYPE),
      eq(smsLogs.relatedId, String(id)),
    );
  }

  async detail(id: number, orgId: number, scope: Scope, userId?: number) {
    const announcement = await this.getOrThrow(id, orgId, scope, userId);
    const logs = await this.db
      .select({
        id: smsLogs.id,
        recipient: smsLogs.recipient,
        status: smsLogs.status,
        errorMessage: smsLogs.errorMessage,
        createdAt: smsLogs.createdAt,
      })
      .from(smsLogs)
      .where(this.logsWhere(id, orgId))
      .orderBy(desc(smsLogs.id));
    return { ...announcement, logs };
  }

  /** Renvoie les SMS en echec (hors numeros deja livres, max 3 tentatives par numero), en arriere-plan. */
  async resendFailed(id: number, orgId: number, scope: Scope, userId?: number) {
    await this.getOrThrow(id, orgId, scope, userId);
    if (!(await this.smsEnabled(orgId))) throw new BadRequestException("Envoi de SMS désactivé dans les réglages");
    const logs = await this.db
      .select({ id: smsLogs.id, recipient: smsLogs.recipient, status: smsLogs.status })
      .from(smsLogs)
      .where(this.logsWhere(id, orgId))
      .orderBy(smsLogs.id);
    const delivered = new Set(logs.filter((l) => l.status === "sent").map((l) => l.recipient));
    const attempts = new Map<string, number>();
    for (const l of logs) attempts.set(l.recipient, (attempts.get(l.recipient) ?? 0) + 1);
    const todo = new Map<string, number>();
    for (const l of logs) {
      if (l.status === "failed" && !delivered.has(l.recipient) && (attempts.get(l.recipient) ?? 0) < ANNOUNCEMENT_MAX_ATTEMPTS) {
        todo.set(l.recipient, l.id);
      }
    }
    const logIds = [...todo.values()];
    if (!logIds.length) return { id, retrying: 0 };

    // Prise atomique : seule une requete peut passer done -> sending (ou reprendre une annonce bloquee > 10 min).
    const res: any = await this.db
      .update(realEstateAnnouncements)
      .set({ status: "sending" })
      .where(
        and(
          eq(realEstateAnnouncements.id, id),
          eq(realEstateAnnouncements.organizationId, orgId),
          or(
            eq(realEstateAnnouncements.status, "done"),
            and(
              inArray(realEstateAnnouncements.status, ["queued", "sending"]),
              lt(realEstateAnnouncements.updatedAt, new Date(Date.now() - STALE_MS)),
            ),
          ),
        ),
      );
    const affected = Number((Array.isArray(res) ? res[0] : res)?.affectedRows ?? 0);
    if (!affected) throw new ConflictException("Envoi en cours, reessayez dans un instant.");

    setImmediate(() => {
      this.runResend(id, orgId, logIds).catch((e) =>
        this.logger.error(`Announcement ${id} resend crashed: ${e instanceof Error ? e.message : String(e)}`),
      );
    });
    return { id, retrying: logIds.length };
  }

  private async runResend(id: number, orgId: number, logIds: number[]) {
    try {
      for (let i = 0; i < logIds.length; i++) {
        try {
          await this.propertyManagement.resendSmsLog(logIds[i], orgId);
        } catch (e) {
          this.logger.warn(`Announcement ${id} resend ${logIds[i]}: ${e instanceof Error ? e.message : String(e)}`);
        }
        if (i < logIds.length - 1) await sleep(PAUSE_MS);
      }
    } finally {
      await this.finalizeFromLogs(id, orgId);
    }
  }
}
