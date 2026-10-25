import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { CompatService } from "../compat/compat.service";
import { DRIZZLE } from "../database/database.constants";
import { batiproProjects, currencies } from "../database/schema";
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
    await this.run("payment", orgId, projectId, async (project) => {
      const effCur = p.currencyId ?? project.currencyId ?? null;
      const cur = await this.currencyCode(effCur);
      const sameCurrency = effCur === (project.currencyId ?? null);
      const amount = `${this.fmt(p.amount)}${cur ? ` ${cur}` : ""}`;
      let tail = "";
      if (sameCurrency) {
        const s = await p.loadBudgetSummary();
        tail = ` Depense: ${this.fmt(s.spent)} / budget ${this.fmt(s.budget)}${cur ? ` ${cur}` : ""}.`;
      }
      const build = (nameMax: number, supMax: number) => {
        const sup = p.supplierName ? ` a ${this.cut(p.supplierName, supMax)}` : "";
        return `Chantier ${project.code} ${this.cut(project.name, nameMax)}: paiement fournisseur ${amount}${sup}.${tail}`;
      };
      return this.fit(build, project.ownerName);
    });
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
  // d'envoyer). Ne throw jamais ; renvoie true si la passerelle a accepte.
  async sendShareLink(orgId: number, projectId: number, phone: string, url: string): Promise<boolean> {
    try {
      const [project] = await this.db
        .select({ code: batiproProjects.code, name: batiproProjects.name, ownerName: batiproProjects.ownerName })
        .from(batiproProjects)
        .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
        .limit(1);
      if (!project || !phone.trim()) return false;
      const message = this.fit((nameMax) => `Chantier ${this.cut(project.code, 12)} ${this.cut(project.name, nameMax)}: suivi financier ${url}`, project.ownerName);
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
      return res?.success !== false;
    } catch (err) {
      this.logger.warn(`SMS lien de suivi chantier ${projectId} echoue: ${err instanceof Error ? err.message : String(err)}`);
      return false;
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
  private fit(build: (nameMax: number, supMax: number) => string, ownerName?: string | null): string {
    // Nom libre non fiable : lettres/espaces/.-' uniquement.
    const owner = String(ownerName ?? "").replace(/[^\p{L} .'-]/gu, "").replace(/\s+/g, " ").trim();
    const greet = (max: number) => (owner ? `Bonjour ${this.cut(owner, max)}, ` : "");
    const steps: Array<[number, number, number]> = owner
      ? [[40, 30, 30], [40, 30, 20], [40, 30, 12], [40, 30, 6], [25, 20, 6], [15, 12, 6], [8, 8, 6]]
      : [[40, 30, 0], [25, 20, 0], [15, 12, 0], [8, 8, 0]];
    for (const [n, s, o] of steps) {
      const msg = this.ascii(greet(o) + build(n, s));
      if (msg.length <= SMS_MAX) return msg;
    }
    return this.ascii(greet(6) + build(8, 8)).slice(0, SMS_MAX);
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
