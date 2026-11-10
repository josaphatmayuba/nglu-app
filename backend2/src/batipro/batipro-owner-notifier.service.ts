import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { CompatService } from "../compat/compat.service";
import { DRIZZLE } from "../database/database.constants";
import { env } from "../config/env";
import { batiproProjects, batiproShareLinks, currencies } from "../database/schema";
import type { Database } from "../database/types";

type BudgetSummaryLite = { spent: number; budget: number };

const SMS_MAX = 160;

// SMS automatiques au proprietaire d'un chantier. Toutes les methodes catchent
// leurs erreurs en interne et ne throw jamais : a appeler APRES commit via
// `void this.ownerNotifier.notifyX(...)`.
@Injectable()
export class BatiproOwnerNotifier {
  private readonly logger = new Logger(BatiproOwnerNotifier.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly compat: CompatService,
  ) {}

  async notifyPayment(
    orgId: number,
    projectId: number,
    p: {
      amount: number;
      currencyId: number | null;
      supplierName?: string | null;
      // Fourni par l'appelant (evite une dependance circulaire avec BatiproService).
      loadBudgetSummary: () => Promise<BudgetSummaryLite>;
    },
  ) {
    const compose = async (project: { code: string; name: string; currencyId: number | null }) => {
      const effCur = p.currencyId ?? project.currencyId ?? null;
      const cur = await this.currencyCode(effCur);
      const amount = `${this.fmt(p.amount)}${cur ? ` ${cur}` : ""}`;
      let tail = "";
      if (effCur === (project.currencyId ?? null)) {
        const s = await p.loadBudgetSummary();
        tail = ` Depense: ${this.fmt(s.spent)} / budget ${this.fmt(s.budget)}${cur ? ` ${cur}` : ""}.`;
      }
      return (nameMax: number, supMax: number) => {
        const sup = p.supplierName ? ` a ${this.cut(p.supplierName, supMax)}` : "";
        return `Chantier ${project.code} ${this.cut(project.name, nameMax)}: paiement fournisseur ${amount}${sup}.${tail}`;
      };
    };
    await this.run("payment", orgId, projectId, async (project) => this.fit(await compose(project), project.ownerName, await this.ownerShortUrl(orgId, projectId)));
    try {
      const ownerPhone = await this.ownerPhoneIfEnabled(orgId, projectId);
      const [pr] = await this.db
        .select({ code: batiproProjects.code, name: batiproProjects.name, currencyId: batiproProjects.currencyId })
        .from(batiproProjects)
        .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
        .limit(1);
      if (!pr) return;
      const build = await compose({ code: pr.code, name: pr.name, currencyId: pr.currencyId ?? null });
      await this.sendToEngineers(orgId, projectId, ownerPhone, "batipro_engineer_payment", () => build);
    } catch (err) {
      this.logger.warn(`SMS ingenieurs (payment) chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async notifyQuoteReceived(
    orgId: number,
    projectId: number,
    q: { tiers?: string | null; totalTtc: number; currencyId: number | null },
  ) {
    // Cooldown 30 min (anti-spam lien public) : claim atomique avant envoi.
    const claim = async () => {
      const res = await this.db.update(batiproProjects).set({ ownerSmsLastQuoteAt: sql`NOW()` as any }).where(and(
        eq(batiproProjects.id, projectId),
        eq(batiproProjects.organizationId, orgId),
        eq(batiproProjects.ownerSmsEnabled, 1),
        or(isNull(batiproProjects.ownerSmsLastQuoteAt), lt(batiproProjects.ownerSmsLastQuoteAt, sql`NOW() - INTERVAL 30 MINUTE`)),
      ));
      const header = (Array.isArray(res) ? res[0] : res) as { affectedRows?: number } | undefined;
      return Number(header?.affectedRows ?? 0) > 0;
    };
    await this.run("quote", orgId, projectId, async (project) => {
      const cur = await this.currencyCode(q.currencyId ?? project.currencyId ?? null);
      const amount = `${this.fmt(q.totalTtc)}${cur ? ` ${cur}` : ""}`;
      // Nom libre non fiable : lettres/espaces/.-' uniquement ; vide -> generique.
      const tiers = String(q.tiers ?? "").replace(/[^\p{L} .'-]/gu, "").replace(/\s+/g, " ").trim() || "un sous-traitant";
      const build = (_n: number, supMax: number) =>
        `Chantier ${project.code}: nouveau devis recu de ${this.cut(tiers, supMax)} - ${amount}.`;
      return this.fit(build, project.ownerName);
    }, claim);
  }

  // Nouvelle depense de chantier : SMS au proprietaire (si SMS proprietaire actives
  // sur le chantier) ET a chaque ingenieur / responsable ayant un lien actif avec
  // telephone. Un numero ne recoit qu'un SMS meme s'il a plusieurs liens.
  async notifyExpense(
    orgId: number,
    projectId: number,
    e: { designation: string; amount: number; currencyId: number | null; loadBudgetSummary: () => Promise<BudgetSummaryLite> },
  ) {
    try {
      const [project] = await this.db
        .select({ currencyId: batiproProjects.currencyId })
        .from(batiproProjects)
        .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
        .limit(1);
      if (!project) return;
      const effCur = e.currencyId ?? project.currencyId ?? null;
      const cur = await this.currencyCode(effCur);
      const amount = `${this.fmt(e.amount)}${cur ? ` ${cur}` : ""}`;
      let tail = "";
      if (effCur === (project.currencyId ?? null)) {
        const s = await e.loadBudgetSummary();
        tail = ` Total: ${this.fmt(s.spent)} / budget ${this.fmt(s.budget)}${cur ? ` ${cur}` : ""}.`;
      }
      const build = (p: { code: string; name: string }) => (nameMax: number, supMax: number) =>
        `Chantier ${p.code} ${this.cut(p.name, nameMax)}: depense ${amount} - ${this.cut(e.designation, supMax)}.${tail}`;

      const ownerPhone = await this.ownerPhoneIfEnabled(orgId, projectId);
      await this.run("expense", orgId, projectId, async (p) => this.fit(build(p), p.ownerName, await this.ownerShortUrl(orgId, projectId)));

      await this.sendToEngineers(orgId, projectId, ownerPhone, "batipro_engineer_expense", build);
    } catch (err) {
      this.logger.warn(`SMS depense chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Ingenieurs / responsables avec lien actif + telephone ; un numero = 1 SMS
  // (proprietaire deja notifie exclu). Ne throw jamais.
  private async sendToEngineers(
    orgId: number,
    projectId: number,
    ownerPhone: string | null,
    smsType: string,
    build: (p: { code: string; name: string }) => (nameMax: number, supMax: number) => string,
  ) {
    try {
      const links = await this.db
        .select({ phone: batiproShareLinks.recipientPhone, name: batiproShareLinks.recipientName, shortCode: batiproShareLinks.shortCode })
        .from(batiproShareLinks)
        .where(and(
          eq(batiproShareLinks.projectId, projectId),
          eq(batiproShareLinks.organizationId, orgId),
          eq(batiproShareLinks.recipientType, "engineer"),
          isNull(batiproShareLinks.revokedAt),
          or(isNull(batiproShareLinks.expiresAt), gt(batiproShareLinks.expiresAt, sql`NOW()`)),
          isNotNull(batiproShareLinks.recipientPhone),
        ));
      const [proj] = await this.db
        .select({ code: batiproProjects.code, name: batiproProjects.name })
        .from(batiproProjects)
        .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId)))
        .limit(1);
      const seen = new Set<string>(ownerPhone ? [ownerPhone] : []);
      for (const l of links) {
        const phone = (l.phone ?? "").trim();
        if (!phone || seen.has(phone) || !proj) continue;
        seen.add(phone);
        try {
          const message = this.fit(build(proj), l.name, this.shortUrl(l.shortCode));
          await this.compat.sendSms({
            phone,
            message,
            logMessage: this.maskLink(message),
            smsType,
            organizationId: orgId,
            relatedType: "batipro_project",
            relatedId: projectId,
          });
        } catch (err) {
          this.logger.warn(`SMS ingenieur (${smsType}) chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      this.logger.warn(`SMS ingenieurs (${smsType}) chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Telephone du proprietaire si les SMS proprietaire sont actives (pour dedoublonner).
  private async ownerPhoneIfEnabled(orgId: number, projectId: number): Promise<string | null> {
    const [p] = await this.db
      .select({ phone: batiproProjects.ownerPhone })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.ownerSmsEnabled, 1)))
      .limit(1);
    return (p?.phone ?? "").trim() || null;
  }

  async notifyProgress(orgId: number, projectId: number, step: number) {
    await this.run("progress", orgId, projectId, async (project) =>
      this.fit((nameMax) => `Chantier ${project.code} ${this.cut(project.name, nameMax)}: avancement ${step}% atteint.`, project.ownerName));
  }

  async notifyStatusChange(orgId: number, projectId: number, oldStatus: string | null, newStatus: string | null) {
    await this.run("status", orgId, projectId, async (project) =>
      this.fit((nameMax) =>
        `Chantier ${project.code} ${this.cut(project.name, nameMax)}: statut passe de ${this.statusLabel(oldStatus)} a ${this.statusLabel(newStatus)}.`, project.ownerName));
  }

  // Envoi explicite (action du gestionnaire) du lien de suivi : 1 seul SMS, lien en
  // fin de message. Ne depend pas du flag ownerSmsEnabled (l'utilisateur a choisi
  // d'envoyer). Ne throw jamais. Comme Domus : on lit success/skipped/message du
  // service SMS partage (CompatService.sendSms) et on renvoie une raison lisible.
  async sendShareLink(orgId: number, projectId: number, phone: string, url: string, kind: "owner" | "engineer" = "owner"): Promise<{ ok: boolean; reason?: string }> {
    try {
      const [project] = await this.db
        .select({ code: batiproProjects.code, name: batiproProjects.name, ownerName: batiproProjects.ownerName })
        .from(batiproProjects)
        .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
        .limit(1);
      if (!project) return { ok: false, reason: "Chantier introuvable." };
      if (!phone.trim()) return { ok: false, reason: "Numero de telephone requis pour envoyer le SMS." };
      const message = this.fit((nameMax) => `Chantier ${this.cut(project.code, 12)} ${this.cut(project.name, nameMax)}: ${kind === "engineer" ? "acces chantier" : "suivi financier"} ${url}`, project.ownerName);
      const res: any = await this.compat.sendSms({
        phone,
        message,
        // Le jeton ne doit pas finir en clair dans sms_logs.
        logMessage: message.split(url).join("[lien]"),
        smsType: "batipro_owner_share_link",
        organizationId: orgId,
        relatedType: "batipro_project",
        relatedId: projectId,
      });
      if (res?.success !== false) return { ok: true };
      this.logger.warn(`SMS lien de suivi chantier ${projectId} non envoye: ${res?.message ?? "inconnu"}`);
      return { ok: false, reason: shareSmsFailureReason(res) };
    } catch (err) {
      this.logger.warn(`SMS lien de suivi chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
      return { ok: false, reason: "Echec de la passerelle SMS : reessayez plus tard." };
    }
  }

  // Garde commune + envoi ; jamais de throw.
  private async run(
    evt: string,
    orgId: number,
    projectId: number,
    buildMessage: (project: { code: string; name: string; currencyId: number | null; ownerName: string | null }) => Promise<string>,
    claim?: () => Promise<boolean>,
  ) {
    try {
      const [project] = await this.db
        .select({
          code: batiproProjects.code,
          name: batiproProjects.name,
          currencyId: batiproProjects.currencyId,
          ownerName: batiproProjects.ownerName,
          ownerPhone: batiproProjects.ownerPhone,
          ownerSmsEnabled: batiproProjects.ownerSmsEnabled,
        })
        .from(batiproProjects)
        .where(and(
          eq(batiproProjects.id, projectId),
          eq(batiproProjects.organizationId, orgId),
          eq(batiproProjects.isActive, 1),
          eq(batiproProjects.ownerSmsEnabled, 1),
        ))
        .limit(1);
      const phone = (project?.ownerPhone ?? "").trim();
      if (!project || !phone) return;
      if (claim && !(await claim())) return;
      const message = await buildMessage({ code: project.code, name: project.name, currencyId: project.currencyId ?? null, ownerName: project.ownerName ?? null });
      await this.compat.sendSms({
        phone,
        message,
        logMessage: this.maskLink(message),
        smsType: `batipro_owner_${evt}`,
        organizationId: orgId,
        relatedType: "batipro_project",
        relatedId: projectId,
      });
    } catch (err) {
      this.logger.warn(`SMS proprietaire (${evt}) chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async currencyCode(currencyId: number | null | undefined): Promise<string> {
    if (currencyId == null) return "";
    const [row] = await this.db
      .select({ code: currencies.currencyCode })
      .from(currencies)
      .where(eq(currencies.id, currencyId))
      .limit(1);
    return row?.code ?? "";
  }

  private fmt(value: number): string {
    const n = Number(value || 0);
    const isInt = Math.abs(n - Math.round(n)) < 0.005;
    const fixed = isInt ? String(Math.round(Math.abs(n))) : Math.abs(n).toFixed(2);
    const [int, dec] = fixed.split(".");
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${n < 0 ? "-" : ""}${grouped}${dec ? `.${dec}` : ""}`;
  }

  private cut(text: string, max: number): string {
    const t = String(text ?? "").trim();
    return t.length > max ? `${t.slice(0, Math.max(1, max - 1)).trimEnd()}.` : t;
  }

  // Construit le message en reduisant progressivement les noms jusqu'a <= 160 car.
  // Si le proprietaire est nomme : prefixe "Bonjour {nom}, " ; son nom est raccourci en premier.
  // `link` (URL courte) est toujours conserve en fin de message, jamais tronque.
  private fit(build: (nameMax: number, supMax: number) => string, ownerName?: string | null, link?: string | null): string {
    // Nom libre non fiable : lettres/espaces/.-' uniquement.
    const owner = String(ownerName ?? "").replace(/[^\p{L} .'-]/gu, "").replace(/\s+/g, " ").trim();
    const greet = (max: number) => (owner ? `Bonjour ${this.cut(owner, max)}, ` : "");
    const steps: Array<[number, number, number]> = owner
      ? [[40, 30, 30], [40, 30, 20], [40, 30, 12], [40, 30, 6], [25, 20, 6], [15, 12, 6], [8, 8, 6]]
      : [[40, 30, 0], [25, 20, 0], [15, 12, 0], [8, 8, 0]];
    const tail = link ? ` ${link}` : "";
    for (const [n, s, o] of steps) {
      const msg = this.ascii(greet(o) + build(n, s));
      if (msg.length + tail.length <= SMS_MAX) return msg + tail;
    }
    return this.ascii(greet(6) + build(8, 8)).slice(0, SMS_MAX - tail.length) + tail;
  }

  private shortUrl(code?: string | null): string | null {
    const c = String(code ?? "").trim();
    return c ? `${env.appUrl.replace(/\/$/, "")}/batipro/c/${c}` : null;
  }

  // Lien court du proprietaire : lien actif le plus recent avec code ; null sinon (SMS sans lien).
  private async ownerShortUrl(orgId: number, projectId: number): Promise<string | null> {
    try {
      const [l] = await this.db
        .select({ code: batiproShareLinks.shortCode })
        .from(batiproShareLinks)
        .where(and(
          eq(batiproShareLinks.projectId, projectId),
          eq(batiproShareLinks.organizationId, orgId),
          eq(batiproShareLinks.recipientType, "owner"),
          isNull(batiproShareLinks.revokedAt),
          isNotNull(batiproShareLinks.shortCode),
          or(isNull(batiproShareLinks.expiresAt), gt(batiproShareLinks.expiresAt, sql`NOW()`)),
        ))
        .orderBy(desc(batiproShareLinks.id))
        .limit(1);
      return this.shortUrl(l?.code);
    } catch (err) {
      this.logger.warn(`Lien court proprietaire chantier ${projectId} indisponible: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Le code ne finit pas en clair dans sms_logs.
  private maskLink(message: string): string {
    return message.replace(/https?:\/\/\S+\/batipro\/c\/\S+/g, "[lien]");
  }

  private ascii(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  private statusLabel(status: string | null): string {
    const raw = String(status ?? "").trim();
    if (!raw) return "-";
    return raw.replace(/_/g, " ");
  }
}

// Raison lisible d un envoi non abouti. Le detail fournisseur reste dans les logs
// (il peut contenir un identifiant de compte Twilio).
export function shareSmsFailureReason(res: any): string {
  if (res?.skipped) return "SMS desactives pour cette organisation (Reglages).";
  if (/not configured/i.test(String(res?.message ?? ""))) return "Service SMS non configure.";
  return "Echec de la passerelle SMS : reessayez plus tard.";
}
