import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray, sql } from "drizzle-orm";
import type { BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import { normalizePhoneE164 } from "../common/phone.util";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  batiproDocumentLines,
  batiproDocuments,
  batiproPhases,
  batiproProjects,
  batiproShareLinks,
  batiproSitePhotos,
  batiproSubcontractors,
  currencies,
} from "../database/schema";
import type { Database } from "../database/types";
import { ObjectStorageService } from "../property-management/object-storage.service";
import { BatiproOwnerNotifier } from "./batipro-owner-notifier.service";
import { BatiproService } from "./batipro.service";
import type { CreateBatiproShareLinkDto, EngineerPhaseUpdateDto, ReceiveBatiproDocumentDto } from "./dto/batipro.dto";

const INVALID_LINK = "Ce lien n'est plus valide.";
const DEFAULT_EXPIRY_DAYS = 90;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// Liens publics de suivi financier d'un chantier (Lot 1 : destinataire = proprietaire).
// Jeton aleatoire stocke HACHE (jamais en clair). Revocation = revoked_at, pas de DELETE.
// La vue publique est une liste blanche de champs : jamais notes, marges, ecritures
// comptables, telephones ni donnees d'autres chantiers / de l'organisation.
@Injectable()
export class BatiproShareService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly batipro: BatiproService,
    private readonly objectStorage: ObjectStorageService,
    private readonly ownerNotifier: BatiproOwnerNotifier,
  ) {}

  // ── Cote gestionnaire (authentifie) ─────────────────────────────────────

  private async assertProject(projectId: number, orgId: number, scope: BatiproProjectScope) {
    if (scope !== "all" && !scope.includes(projectId)) throw new NotFoundException("Chantier introuvable.");
    return this.batipro.getProject(projectId, orgId);
  }

  private statusOf(row: { revokedAt: Date | null; expiresAt: Date | null }): "active" | "revoked" | "expired" {
    if (row.revokedAt) return "revoked";
    if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) return "expired";
    return "active";
  }

  async listLinks(projectId: number, orgId: number, scope: BatiproProjectScope) {
    await this.assertProject(projectId, orgId, scope);
    const rows = await this.db
      .select({
        id: batiproShareLinks.id,
        recipientType: batiproShareLinks.recipientType,
        recipientName: batiproShareLinks.recipientName,
        recipientPhone: batiproShareLinks.recipientPhone,
        expiresAt: batiproShareLinks.expiresAt,
        revokedAt: batiproShareLinks.revokedAt,
        lastViewedAt: batiproShareLinks.lastViewedAt,
        createdBy: batiproShareLinks.createdBy,
        createdAt: batiproShareLinks.createdAt,
      })
      .from(batiproShareLinks)
      .where(and(eq(batiproShareLinks.projectId, projectId), eq(batiproShareLinks.organizationId, orgId)))
      .orderBy(desc(batiproShareLinks.id));
    return rows.map((r) => ({ ...r, status: this.statusOf(r) }));
  }

  async createLink(
    projectId: number,
    input: CreateBatiproShareLinkDto,
    orgId: number,
    userId: number | undefined,
    scope: BatiproProjectScope,
  ) {
    const project = await this.assertProject(projectId, orgId, scope);
    const recipientType = input.recipient_type === "engineer" ? "engineer" : "owner";
    const isEngineer = recipientType === "engineer";
    // Proprietaire : defaut 90 j ; "sans expiration" = 365 j maximum.
    // Ingenieur : actif jusqu'a revocation (expires_at NULL).
    const days = input.expires_in_days ?? DEFAULT_EXPIRY_DAYS;
    const token = randomBytes(16).toString("base64url");
    // Ingenieur : jamais de repli sur le nom/telephone du proprietaire.
    const recipientName = (isEngineer ? input.recipient_name ?? "" : input.recipient_name ?? project.ownerName ?? "").trim() || null;
    if (isEngineer && !recipientName) throw new BadRequestException("Nom de l'ingenieur / responsable obligatoire.");
    const rawPhone = (isEngineer ? input.recipient_phone ?? "" : input.recipient_phone ?? project.ownerPhone ?? "").trim();
    const phone = rawPhone ? normalizePhoneE164(rawPhone, { defaultCountry: "CD" }) : null;
    if (rawPhone && isEngineer && !phone) throw new BadRequestException("Numero de telephone invalide.");
    if (input.send_sms && !phone) {
      throw new BadRequestException("Aucun numero de telephone valide pour l'envoi du SMS.");
    }
    const expiresAt = isEngineer ? null : new Date(Date.now() + days * 86_400_000);
    const [result] = await this.db.insert(batiproShareLinks).values({
      organizationId: orgId,
      projectId,
      recipientType,
      recipientName,
      recipientPhone: phone,
      tokenHash: hashShareToken(token),
      expiresAt,
      createdBy: userId ?? null,
    }).$returningId();
    const url = `${env.appUrl.replace(/\/$/, "")}/batipro/${isEngineer ? "chantier" : "suivi"}/${token}`;
    let smsSent: boolean | null = null;
    if (input.send_sms && phone) {
      smsSent = await this.ownerNotifier.sendShareLink(orgId, projectId, phone, url, recipientType);
    }
    // Le jeton en clair n'est renvoye QU'ici (impossible a retrouver ensuite).
    return { id: Number(result.id), token, url, expires_at: expiresAt, sms_sent: smsSent };
  }

  async revokeLink(projectId: number, linkId: number, orgId: number, scope: BatiproProjectScope) {
    await this.assertProject(projectId, orgId, scope);
    const [row] = await this.db
      .select({ id: batiproShareLinks.id, revokedAt: batiproShareLinks.revokedAt })
      .from(batiproShareLinks)
      .where(and(eq(batiproShareLinks.id, linkId), eq(batiproShareLinks.projectId, projectId), eq(batiproShareLinks.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException("Lien introuvable.");
    if (!row.revokedAt) {
      await this.db
        .update(batiproShareLinks)
        .set({ revokedAt: sql`CURRENT_TIMESTAMP` as any })
        .where(and(eq(batiproShareLinks.id, linkId), isNull(batiproShareLinks.revokedAt)));
    }
    return { id: linkId, message: "Lien revoque." };
  }

  // ── Cote public (jeton opaque, lecture seule) ───────────────────────────

  // Meme message pour jeton inconnu / revoque / expire (anti-enumeration).
  private async resolve(token: string, recipientType: "owner" | "engineer" = "owner") {
    if (!token?.trim()) throw new NotFoundException(INVALID_LINK);
    const [link] = await this.db
      .select({
        id: batiproShareLinks.id,
        organizationId: batiproShareLinks.organizationId,
        projectId: batiproShareLinks.projectId,
        recipientType: batiproShareLinks.recipientType,
        recipientName: batiproShareLinks.recipientName,
        expiresAt: batiproShareLinks.expiresAt,
        revokedAt: batiproShareLinks.revokedAt,
      })
      .from(batiproShareLinks)
      .where(eq(batiproShareLinks.tokenHash, hashShareToken(token.trim())))
      .limit(1);
    // Un jeton ne sert que les routes de SON type (proprietaire != ingenieur).
    if (!link || link.recipientType !== recipientType || this.statusOf(link) !== "active") {
      throw new NotFoundException(INVALID_LINK);
    }
    // Chantier desactive/supprime : le lien ne sert plus rien (suivi, photos, pieces jointes).
    const [project] = await this.db
      .select({ id: batiproProjects.id })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, link.projectId), eq(batiproProjects.organizationId, link.organizationId), eq(batiproProjects.isActive, 1)))
      .limit(1);
    if (!project) throw new NotFoundException(INVALID_LINK);
    return link;
  }

  async getPublicTracking(token: string) {
    return this.buildTracking(await this.resolve(token));
  }

  private async buildTracking(link: { id: number; organizationId: number; projectId: number }) {
    const orgId = link.organizationId;
    const projectId = link.projectId;

    // Liste blanche explicite : pas de notes, client, proprietaire, telephone, etc.
    const [project] = await this.db
      .select({
        name: batiproProjects.name,
        status: batiproProjects.status,
        progress: batiproProjects.progress,
        startDate: batiproProjects.startDate,
        dueDate: batiproProjects.dueDate,
        budget: batiproProjects.budget,
        currencyId: batiproProjects.currencyId,
      })
      .from(batiproProjects)
      .where(and(eq(batiproProjects.id, projectId), eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)))
      .limit(1);
    if (!project) throw new NotFoundException(INVALID_LINK);

    const summary = await this.batipro.projectBudgetSummary(projectId, orgId);
    const curRows = await this.db
      .select({ id: currencies.id, code: currencies.currencyCode, symbol: currencies.currencySymbol })
      .from(currencies);
    const curById = new Map(curRows.map((c) => [c.id, c] as const));
    const projectCurrencyId = project.currencyId ?? null;
    const curOut = (id: number | null | undefined) => {
      const c = curById.get(id ?? projectCurrencyId ?? -1);
      return { currency_code: c?.code ?? null, currency_symbol: c?.symbol ?? null };
    };
    const effCur = (id: number | null | undefined) => id ?? projectCurrencyId;

    // Bons de commande ET depenses directes (type=expense), hors annules.
    const poRows = await this.db
      .select({
        id: batiproDocuments.id,
        number: batiproDocuments.number,
        type: batiproDocuments.type,
        issueDate: batiproDocuments.issueDate,
        createdAt: batiproDocuments.createdAt,
        currencyId: batiproDocuments.currencyId,
        totalTtc: batiproDocuments.totalTtc,
        paidAmount: batiproDocuments.paidAmount,
        subcontractorId: batiproDocuments.subcontractorId,
      })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        inArray(batiproDocuments.type, ["purchase_order", "expense"]),
        ne(batiproDocuments.status, "cancelled"),
      ))
      .orderBy(desc(batiproDocuments.id));

    const firstLine = new Map<number, string>();
    if (poRows.length) {
      const lines = await this.db
        .select({ documentId: batiproDocumentLines.documentId, designation: batiproDocumentLines.designation })
        .from(batiproDocumentLines)
        .where(and(inArray(batiproDocumentLines.documentId, poRows.map((p) => p.id)), eq(batiproDocumentLines.organizationId, orgId)))
        .orderBy(asc(batiproDocumentLines.position), asc(batiproDocumentLines.id));
      for (const l of lines) if (!firstLine.has(l.documentId)) firstLine.set(l.documentId, l.designation);
    }

    const remainingByCur = new Map<string, { currency_code: string | null; currency_symbol: string | null; remaining: number }>();
    const engagedRows = poRows.map((p) => {
      const total = Number(p.totalTtc ?? 0);
      const paid = Number(p.paidAmount ?? 0);
      const remaining = round2(Math.max(total - paid, 0));
      const cur = curOut(p.currencyId);
      const key = cur.currency_code ?? "";
      const acc = remainingByCur.get(key) ?? { ...cur, remaining: 0 };
      acc.remaining = round2(acc.remaining + remaining);
      remainingByCur.set(key, acc);
      return {
        _isExpense: p.type === "expense",
        id: p.id,
        number: p.number ?? null,
        label: firstLine.get(p.id) ?? null,
        date: p.issueDate ?? (p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : null),
        engaged: round2(total),
        paid: round2(paid),
        remaining,
        ...cur,
      };
    });
    const stripType = ({ _isExpense, ...rest }: (typeof engagedRows)[number]) => rest;
    const purchaseOrders = engagedRows.filter((r) => !r._isExpense).map(stripType);
    // Depenses directes de chantier (type=expense) : meme gabarit, listees a part.
    const directExpenses = engagedRows.filter((r) => r._isExpense).map(stripType);

    // Factures fournisseur (inbound) + photos rattachees.
    const invRows = await this.db
      .select({
        id: batiproDocuments.id,
        number: batiproDocuments.number,
        issueDate: batiproDocuments.issueDate,
        createdAt: batiproDocuments.createdAt,
        currencyId: batiproDocuments.currencyId,
        totalTtc: batiproDocuments.totalTtc,
        paidAmount: batiproDocuments.paidAmount,
        attachedFileKey: batiproDocuments.attachedFileKey,
      })
      .from(batiproDocuments)
      .where(this.supplierInvoiceFilter(projectId, orgId))
      .orderBy(desc(batiproDocuments.id));
    const invIds = invRows.map((i) => i.id);
    const linkedPhotos = invIds.length
      ? await this.db
        .select({ id: batiproSitePhotos.id, linkedDocumentId: batiproSitePhotos.linkedDocumentId })
        .from(batiproSitePhotos)
        .where(and(
          eq(batiproSitePhotos.projectId, projectId),
          eq(batiproSitePhotos.organizationId, orgId),
          eq(batiproSitePhotos.isActive, 1),
          inArray(batiproSitePhotos.linkedDocumentId, invIds),
        ))
        .orderBy(asc(batiproSitePhotos.id))
      : [];
    const supplierInvoices = invRows.map((i) => {
      const total = Number(i.totalTtc ?? 0);
      const paid = Number(i.paidAmount ?? 0);
      return {
        id: i.id,
        number: i.number ?? null,
        date: i.issueDate ?? (i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : null),
        total: round2(total),
        paid: round2(paid),
        remaining: round2(Math.max(total - paid, 0)),
        ...curOut(i.currencyId),
        has_attachment: !!i.attachedFileKey,
        photo_ids: linkedPhotos.filter((p) => p.linkedDocumentId === i.id).map((p) => p.id),
      };
    });

    // Sous-traitants : nom, metier, contrat, paye (somme des paiements de ses BC), reste.
    const subRows = await this.db
      .select({
        id: batiproSubcontractors.id,
        name: batiproSubcontractors.name,
        trade: batiproSubcontractors.trade,
        contractAmount: batiproSubcontractors.contractAmount,
        currencyId: batiproSubcontractors.currencyId,
      })
      .from(batiproSubcontractors)
      .where(and(
        eq(batiproSubcontractors.projectId, projectId),
        eq(batiproSubcontractors.organizationId, orgId),
        eq(batiproSubcontractors.isActive, 1),
      ))
      .orderBy(asc(batiproSubcontractors.name));
    const subcontractors = subRows.map((s) => {
      const contract = Number(s.contractAmount ?? 0);
      const paid = poRows
        .filter((p) => p.subcontractorId === s.id && effCur(p.currencyId) === effCur(s.currencyId))
        .reduce((sum, p) => sum + Number(p.paidAmount ?? 0), 0);
      return {
        name: s.name,
        trade: s.trade ?? null,
        contract: round2(contract),
        paid: round2(paid),
        remaining: round2(Math.max(contract - paid, 0)),
        ...curOut(s.currencyId),
      };
    });

    const sitePhotos = await this.db
      .select({ id: batiproSitePhotos.id, caption: batiproSitePhotos.caption, takenAt: batiproSitePhotos.takenAt })
      .from(batiproSitePhotos)
      .where(and(
        eq(batiproSitePhotos.projectId, projectId),
        eq(batiproSitePhotos.organizationId, orgId),
        eq(batiproSitePhotos.isActive, 1),
        eq(batiproSitePhotos.kind, "site"),
      ))
      .orderBy(desc(batiproSitePhotos.takenAt))
      .limit(60);

    await this.db
      .update(batiproShareLinks)
      .set({ lastViewedAt: sql`CURRENT_TIMESTAMP` as any })
      .where(eq(batiproShareLinks.id, link.id));

    return {
      project: {
        name: project.name,
        status: project.status,
        progress: project.progress,
        start_date: project.startDate ?? null,
        due_date: project.dueDate ?? null,
        ...curOut(project.currencyId),
      },
      budget: {
        project_budget: round2(Number(project.budget ?? 0)),
        accepted_quote: round2(Number(summary.quote_accepted ?? 0)),
        ...curOut(project.currencyId),
      },
      // Depense par nature (meme util que projectBudgetSummary, deja filtre org+chantier du lien).
      spent_by_nature: (((summary as any).spent_by_nature ?? []) as Array<{ nature: string; label: string; amount: number }>).map((r) => ({
        nature: r.nature, label: r.label, amount: r.amount,
      })),
      spent_by_nature_total: round2(((summary as any).spent_by_nature ?? []).reduce((t: number, r: any) => t + Number(r.amount || 0), 0)),
      purchase_orders: purchaseOrders,
      direct_expenses: directExpenses,
      supplier_invoices: supplierInvoices,
      subcontractors,
      // Reste a payer par devise (BC non annules) ; jamais additionne entre devises.
      remaining_by_currency: Array.from(remainingByCur.values()).map((r) => ({
        currency_code: r.currency_code,
        currency_symbol: r.currency_symbol,
        remaining: r.remaining,
      })),
      site_photos: sitePhotos.map((p) => ({ id: p.id, caption: p.caption ?? null, taken_at: p.takenAt ?? null })),
    };
  }

  // ── Lien ingenieur / responsable de chantier (jeton opaque, ecritures limitees) ──
  // Voit tout le suivi (montants compris) + phases + BC a receptionner. Ecritures
  // autorisees UNIQUEMENT : avancement/statut de phase, photo de chantier,
  // reception de BC. Chaque objet est reverifie comme appartenant au chantier du lien.

  async getEngineerSite(token: string) {
    const link = await this.resolve(token, "engineer");
    const { projectId, organizationId: orgId } = link;
    const tracking = await this.buildTracking(link);
    const phases = await this.db
      .select({
        id: batiproPhases.id,
        label: batiproPhases.label,
        status: batiproPhases.status,
        progress: batiproPhases.progress,
        startDate: batiproPhases.startDate,
        endDate: batiproPhases.endDate,
      })
      .from(batiproPhases)
      .where(and(eq(batiproPhases.projectId, projectId), eq(batiproPhases.organizationId, orgId), eq(batiproPhases.isActive, 1)))
      .orderBy(asc(batiproPhases.position), asc(batiproPhases.id));

    // BC emis, pas encore entierement recus : lignes Materiau seulement.
    const orders = await this.db
      .select({ id: batiproDocuments.id, number: batiproDocuments.number, status: batiproDocuments.status, issueDate: batiproDocuments.issueDate })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.type, "purchase_order"),
        notInArray(batiproDocuments.status, ["draft", "cancelled", "received"]),
      ))
      .orderBy(desc(batiproDocuments.id));
    const lines = orders.length
      ? await this.db
        .select({
          id: batiproDocumentLines.id,
          documentId: batiproDocumentLines.documentId,
          designation: batiproDocumentLines.designation,
          quantity: batiproDocumentLines.quantity,
          receivedQuantity: batiproDocumentLines.receivedQuantity,
        })
        .from(batiproDocumentLines)
        .where(and(
          inArray(batiproDocumentLines.documentId, orders.map((o) => o.id)),
          eq(batiproDocumentLines.organizationId, orgId),
          eq(batiproDocumentLines.isActive, 1),
          isNotNull(batiproDocumentLines.materialId),
        ))
        .orderBy(asc(batiproDocumentLines.position), asc(batiproDocumentLines.id))
      : [];

    // Devis (non annules) et BC (emis, non annules) avec leurs lignes : l'ingenieur
    // voit le detail prevu/commande, y compris par phase (line.phase_id).
    const docs = await this.db
      .select({
        id: batiproDocuments.id,
        type: batiproDocuments.type,
        number: batiproDocuments.number,
        status: batiproDocuments.status,
        issueDate: batiproDocuments.issueDate,
        createdAt: batiproDocuments.createdAt,
        currencyId: batiproDocuments.currencyId,
        totalTtc: batiproDocuments.totalTtc,
        paidAmount: batiproDocuments.paidAmount,
      })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.projectId, projectId),
        eq(batiproDocuments.organizationId, orgId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.direction, "outbound"),
        inArray(batiproDocuments.type, ["quote", "purchase_order"]),
        ne(batiproDocuments.status, "cancelled"),
      ))
      .orderBy(desc(batiproDocuments.id));
    const visibleDocs = docs.filter((d) => !(d.type === "purchase_order" && d.status === "draft"));
    const docLines = visibleDocs.length
      ? await this.db
        .select({
          id: batiproDocumentLines.id,
          documentId: batiproDocumentLines.documentId,
          designation: batiproDocumentLines.designation,
          quantity: batiproDocumentLines.quantity,
          unitPrice: batiproDocumentLines.unitPrice,
          lineTtc: batiproDocumentLines.lineTtc,
          receivedQuantity: batiproDocumentLines.receivedQuantity,
          phaseId: batiproDocumentLines.phaseId,
          lineType: batiproDocumentLines.lineType,
          currencyId: batiproDocumentLines.currencyId,
        })
        .from(batiproDocumentLines)
        .where(and(
          inArray(batiproDocumentLines.documentId, visibleDocs.map((d) => d.id)),
          eq(batiproDocumentLines.organizationId, orgId),
          eq(batiproDocumentLines.isActive, 1),
        ))
        .orderBy(asc(batiproDocumentLines.position), asc(batiproDocumentLines.id))
      : [];
    const curRows = await this.db.select({ id: currencies.id, code: currencies.currencyCode }).from(currencies);
    const codeOf = (id: number | null | undefined) => curRows.find((c) => c.id === id)?.code ?? null;
    const projectCur = tracking.project.currency_code;
    const documents = visibleDocs.map((d) => {
      const docCode = codeOf(d.currencyId) ?? projectCur;
      const total = Number(d.totalTtc ?? 0);
      const paid = Number(d.paidAmount ?? 0);
      return {
        id: d.id,
        type: d.type as "quote" | "purchase_order",
        number: d.number ?? null,
        status: d.status,
        date: d.issueDate ?? (d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : null),
        currency_code: docCode,
        total: round2(total),
        paid: round2(paid),
        remaining: round2(Math.max(total - paid, 0)),
        lines: docLines.filter((l) => l.documentId === d.id).map((l) => ({
          id: l.id,
          designation: l.designation,
          line_type: l.lineType,
          quantity: Number(l.quantity ?? 0),
          received: Number(l.receivedQuantity ?? 0),
          unit_price: round2(Number(l.unitPrice ?? 0)),
          total: round2(Number(l.lineTtc ?? 0)),
          currency_code: codeOf(l.currencyId) ?? docCode,
          phase_id: l.phaseId ?? null,
        })),
      };
    });

    return {
      ...tracking,
      recipient_name: link.recipientName ?? null,
      documents,
      phases: phases.map((p) => ({ id: p.id, label: p.label, status: p.status, progress: p.progress, start_date: p.startDate ?? null, end_date: p.endDate ?? null })),
      orders_to_receive: orders.map((o) => ({
        id: o.id,
        number: o.number ?? null,
        status: o.status,
        date: o.issueDate ?? null,
        lines: lines.filter((l) => l.documentId === o.id).map((l) => {
          const ordered = Number(l.quantity ?? 0);
          const received = Number(l.receivedQuantity ?? 0);
          return { id: l.id, designation: l.designation, ordered, received, remaining: Math.max(Math.round((ordered - received) * 1000) / 1000, 0) };
        }),
      })),
    };
  }

  async updatePhaseFromLink(token: string, phaseId: number, input: EngineerPhaseUpdateDto) {
    const link = await this.resolve(token, "engineer");
    const [phase] = await this.db
      .select({ id: batiproPhases.id })
      .from(batiproPhases)
      .where(and(eq(batiproPhases.id, phaseId), eq(batiproPhases.projectId, link.projectId), eq(batiproPhases.organizationId, link.organizationId), eq(batiproPhases.isActive, 1)))
      .limit(1);
    if (!phase) throw new NotFoundException("Phase introuvable.");
    if (input.progress === undefined && input.status === undefined) throw new BadRequestException("Rien a mettre a jour.");
    // Liste blanche : jamais budget, dates, devise ni chantier depuis un lien public.
    const p = await this.batipro.updatePhase(phaseId, { progress: input.progress, status: input.status } as any, link.organizationId);
    return { id: p.id, label: p.label, status: p.status, progress: p.progress };
  }

  async uploadPhotoFromLink(token: string, file: any, caption?: string) {
    const link = await this.resolve(token, "engineer");
    const photo: any = await this.batipro.uploadSitePhoto(link.projectId, file, link.organizationId, undefined, "all", { kind: "site" });
    // Trace l'auteur dans la legende (pas de compte utilisateur derriere le lien).
    const author = link.recipientName ? ` (${link.recipientName})` : "";
    const text = `${(caption ?? "").trim() || "Photo chantier"}${author}`.slice(0, 255);
    await this.batipro.updateSitePhoto(Number(photo.id), { caption: text }, link.organizationId);
    return { id: Number(photo.id), caption: text };
  }

  async receiveFromLink(token: string, documentId: number, input: ReceiveBatiproDocumentDto) {
    const link = await this.resolve(token, "engineer");
    const [doc] = await this.db
      .select({ id: batiproDocuments.id })
      .from(batiproDocuments)
      .where(and(
        eq(batiproDocuments.id, documentId),
        eq(batiproDocuments.projectId, link.projectId),
        eq(batiproDocuments.organizationId, link.organizationId),
        eq(batiproDocuments.isActive, 1),
        eq(batiproDocuments.type, "purchase_order"),
      ))
      .limit(1);
    if (!doc) throw new NotFoundException("Bon de commande introuvable.");
    const who = `[Lien chantier${link.recipientName ? ` - ${link.recipientName}` : ""}]`;
    const note = `${who} ${(input.note ?? "").trim()}`.trim().slice(0, 2000);
    const res: any = await this.batipro.receivePurchaseOrder(documentId, { ...input, note }, link.organizationId, undefined);
    return { id: documentId, status: res?.status ?? null };
  }

  private supplierInvoiceFilter(projectId: number, orgId: number, documentId?: number) {
    return and(
      documentId != null ? eq(batiproDocuments.id, documentId) : undefined,
      eq(batiproDocuments.projectId, projectId),
      eq(batiproDocuments.organizationId, orgId),
      eq(batiproDocuments.isActive, 1),
      eq(batiproDocuments.direction, "inbound"),
      eq(batiproDocuments.type, "invoice"),
      ne(batiproDocuments.status, "cancelled"),
    );
  }

  // Photo servie seulement si elle appartient au chantier du lien ET est soit une
  // photo de chantier (kind=site), soit rattachee a une facture fournisseur visible.
  async getPublicPhoto(token: string, photoId: number, recipientType: "owner" | "engineer" = "owner") {
    const link = await this.resolve(token, recipientType);
    const [photo] = await this.db
      .select({
        fileKey: batiproSitePhotos.fileKey,
        kind: batiproSitePhotos.kind,
        linkedDocumentId: batiproSitePhotos.linkedDocumentId,
      })
      .from(batiproSitePhotos)
      .where(and(
        eq(batiproSitePhotos.id, photoId),
        eq(batiproSitePhotos.projectId, link.projectId),
        eq(batiproSitePhotos.organizationId, link.organizationId),
        eq(batiproSitePhotos.isActive, 1),
      ))
      .limit(1);
    if (!photo) throw new NotFoundException("Photo introuvable.");
    if (photo.kind !== "site") {
      if (photo.linkedDocumentId == null) throw new NotFoundException("Photo introuvable.");
      const [inv] = await this.db
        .select({ id: batiproDocuments.id })
        .from(batiproDocuments)
        .where(this.supplierInvoiceFilter(link.projectId, link.organizationId, photo.linkedDocumentId))
        .limit(1);
      if (!inv) throw new NotFoundException("Photo introuvable.");
    }
    return this.streamObject(photo.fileKey);
  }

  async getPublicInvoiceAttachment(token: string, documentId: number, recipientType: "owner" | "engineer" = "owner") {
    const link = await this.resolve(token, recipientType);
    const [doc] = await this.db
      .select({ attachedFileKey: batiproDocuments.attachedFileKey })
      .from(batiproDocuments)
      .where(this.supplierInvoiceFilter(link.projectId, link.organizationId, documentId))
      .limit(1);
    if (!doc?.attachedFileKey) throw new NotFoundException("Fichier introuvable.");
    return this.streamObject(doc.attachedFileKey);
  }

  private async streamObject(fileKey: string) {
    const object = await this.objectStorage.getObject(fileKey);
    // Seuls images et PDF sont servis tels quels ; le reste est force en binaire.
    const ct = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/i.test(object.contentType) ? object.contentType : "application/octet-stream";
    return { body: object.body, contentType: ct, contentLength: object.contentLength };
  }
}
