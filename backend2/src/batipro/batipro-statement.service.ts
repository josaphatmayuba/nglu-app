import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { batiproProjects, batiproShareLinks } from "../database/schema";
import type { Database } from "../database/types";
import { hashShareToken } from "./batipro-share.service";
import { BatiproService } from "./batipro.service";
import type { StatementFilter } from "./statement.util";

const INVALID_LINK = "Ce lien n'est plus valide.";
const SHORT_CODE_MAX = 16;
// Categories qui sont des entrees d'argent ou des mouvements de fonds : jamais pour l'ingenieur.
const FUNDS_CATEGORIES = new Set(["funding", "funding_cancel", "client_invoice"]);

type StmtLine = {
  date: string; label: string; category: string; category_label: string; entry: number; exit: number;
  currency_id: number | null; currency_code: string | null; converted_amount: number | null; status: string; counted: boolean; balance: number | null;
};

// Vue ingenieur / sous-traitant : SORTIES SEULEMENT. Liste blanche de champs : aucune ligne de
// fonds / facture client, ni entree, ni solde (balance, opening/closing/final), ni totals.entries.
export function toExitsOnlyStatement(full: { project_id?: number; currency_id: number | null; currency_code: string | null; lines: StmtLine[] }, filter: StatementFilter = {}) {
  const exitsOnly = full.lines.filter((l) => !FUNDS_CATEGORIES.has(l.category) && !(Number(l.entry) > 0));
  const cents = (n: number) => Math.round(Number(n || 0) * 100);
  const totalC = exitsOnly.reduce((s, l) => s + (l.counted ? cents(l.converted_amount ?? l.exit) : 0), 0);
  const { from, to, category } = filter;
  const shown = exitsOnly.filter((l) => (!from || l.date >= from) && (!to || l.date <= to) && (!category || l.category === category));
  return {
    project_id: full.project_id,
    currency_id: full.currency_id,
    currency_code: full.currency_code,
    lines: shown.map((l) => ({
      date: l.date, label: l.label, category: l.category, category_label: l.category_label, exit: l.exit,
      currency_id: l.currency_id, currency_code: l.currency_code, converted_amount: l.converted_amount, status: l.status,
    })),
    totals: { exits: totalC / 100 },
  };
}

// Releve public d'un chantier via lien de partage (jeton opaque, lecture seule).
// Resolution du jeton identique a BatiproShareService.resolve (meme message pour inconnu/revoque/expire).
@Injectable()
export class BatiproStatementService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly batipro: BatiproService,
  ) {}

  private async resolve(token: string, recipientType: "owner" | "engineer") {
    const t = (token ?? "").trim();
    if (!t) throw new NotFoundException(INVALID_LINK);
    const [link] = await this.db
      .select({
        organizationId: batiproShareLinks.organizationId,
        projectId: batiproShareLinks.projectId,
        recipientType: batiproShareLinks.recipientType,
        expiresAt: batiproShareLinks.expiresAt,
        revokedAt: batiproShareLinks.revokedAt,
      })
      .from(batiproShareLinks)
      .where(t.length <= SHORT_CODE_MAX ? eq(batiproShareLinks.shortCode, t.toLowerCase()) : eq(batiproShareLinks.tokenHash, hashShareToken(t)))
      .limit(1);
    const expired = !!link?.expiresAt && new Date(link.expiresAt).getTime() < Date.now();
    if (!link || link.recipientType !== recipientType || link.revokedAt || expired) throw new NotFoundException(INVALID_LINK);
    const [project] = await this.db
      .select({ id: batiproProjects.id })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, link.projectId), eq(batiproProjects.organizationId, link.organizationId), eq(batiproProjects.isActive, 1)))
      .limit(1);
    if (!project) throw new NotFoundException(INVALID_LINK);
    return link;
  }

  // Proprietaire : releve complet (entrees, sorties, soldes).
  async getOwnerStatement(token: string, filter: StatementFilter) {
    const link = await this.resolve(token, "owner");
    return this.batipro.buildProjectStatement(link.projectId, link.organizationId, filter, "all");
  }

  // Ingenieur / sous-traitant : sorties seulement, filtrage cote serveur.
  async getEngineerStatement(token: string, filter: StatementFilter) {
    const link = await this.resolve(token, "engineer");
    const full = await this.batipro.buildProjectStatement(link.projectId, link.organizationId, {}, "all");
    const summary: any = await this.batipro.projectBudgetSummary(link.projectId, link.organizationId);
    // Memes calculs que l'apercu simple (SimpleOverview) : fees = blocs mode != none, sommes sans arrondi.
    const feeList = ((summary?.fees ?? []) as any[]).filter((f) => f.mode && f.mode !== "none");
    const materials = ((summary?.spent_by_nature ?? []) as any[]).find((r) => r.nature === "materials")?.amount ?? 0;
    return {
      ...toExitsOnlyStatement(full as any, filter),
      // Liste blanche : aucun fonds, entree, solde ni total d'entrees.
      kpis: {
        materials_total: Number(materials),
        fees_paid: feeList.reduce((t, f) => t + Number(f.paid || 0), 0),
        fees_remaining: feeList.length ? feeList.reduce((t, f) => t + Number(f.remaining || 0), 0) : null,
        currency_code: summary?.currency_code ?? (full as any).currency_code ?? null,
      },
    };
  }
}
