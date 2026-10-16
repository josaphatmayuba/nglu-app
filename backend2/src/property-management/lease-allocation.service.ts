import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gt, inArray, like, ne, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { currencies, realEstateLeases, realEstatePaymentAllocations, realEstateRentPayments } from "../database/schema";
import type { Database } from "../database/types";
import {

  computeRebuild,
  dueStatusOf,
  isLeaseFlagged,
  planBackfill,
  type AllocationWarning,
  type BackfillPlan,
  type RebuildRow,
} from "./lease-allocation";
import { isPastGrace, loadOverdueByLease, readOverdueGraceDays } from "./lease-overdue";
import { computeLeaseTotalDue, scheduleForLease } from "./lease-proration";
import { applyCoverage, formatDateOnly, parseDateOnly, roundMoney, type SchedulePeriod } from "./lease-schedule";

type Tx = any;

export interface ExplicitAllocation {
  dueId: number;
  amount?: number;
}

export interface LeaseDueEntry {
  id: number;
  periodStart: string;
  periodEnd: string | null;
  dueDate: string;
  amount: number;
  amountPaid: number;
  remaining: number;
  dueStatus: string;
  /** Statut legacy de la ligne (pending | settled | paid | overdue). */
  status: string;
  allocations: Array<{ id: number; paymentId: number; paymentDate: string | null; amount: number; source: string }>;
}

export interface LeaseDueState {
  flagged: boolean;
  dues: LeaseDueEntry[];
  credit: number;
  totalDue: number;
  overdueCount: number;
  payments?: Array<{ id: number; paymentDate: string; amount: number; allocated: number; unallocated: number }>;
}

export interface BackfillOptions {
  leaseIds?: number[];
  dryRun?: boolean;
  force?: boolean;
  revert?: boolean;
  /** Curseur de pagination (apercu sans leaseIds) : baux d'id > afterLeaseId. */
  afterLeaseId?: number;
}

/** Taille de page de l'apercu sans leaseIds. */
export const BACKFILL_PAGE_SIZE = 50;

/** Traces posees dans notes par le registre (permettent le revert de la reprise). */
const TRACE_BACKFILL_CREATED = "Echeance generee par la reprise";
const TRACE_GENERATED = "Echeance generee automatiquement (registre";
const TRACE_SPLIT = "[CONFIRME:#";
const TRACE_RESTORE_RE = / ?\[REPRISE:(\{[^\]]*\})\]/;

export interface BackfillLeaseReport {
  leaseId: number;
  reference?: string | null;
  mode: "preview" | "applied" | "refused" | "skipped" | "reverted" | "would_revert";
  reason?: string;
  plan?: BackfillPlan | Omit<BackfillPlan, "dues">;
}

@Injectable()
export class LeaseAllocationService {
  private readonly logger = new Logger(LeaseAllocationService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  isFlagged(lease: { allocationLedgerAt?: unknown } | null | undefined) {
    return isLeaseFlagged(lease);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private money(v: number) {
    return String(v);
  }

  private async decimalsFor(db: Tx, currencyId: number | null | undefined): Promise<number> {
    if (!currencyId) return 2;
    const [row] = await db.select({ d: currencies.decimalPlaces }).from(currencies).where(eq(currencies.id, Number(currencyId))).limit(1);
    const d = row?.d == null ? NaN : Number(row.d);
    return Number.isInteger(d) && d >= 0 ? Math.min(d, 2) : 2;
  }

  /** Echeancier du bail ; sans prorata actif, montants pleins (comportement legacy : N mois x loyer). */
  buildSchedule(lease: any, decimals: number, todayStr: string): SchedulePeriod[] {
    const full = scheduleForLease(lease, decimals, 0, todayStr, 24);
    const sch = lease.rentProrationEnabled ? full : full.map((p) => ({ ...p, amount: p.fullAmount, prorated: false, ratio: 1 }));
    const term = lease.status === "ended" && lease.terminationDate ? String(lease.terminationDate).slice(0, 10) : null;
    return sch.filter((p) => !term || p.periodStart <= term);
  }

  private async loadLease(db: Tx, leaseId: number, orgId: number, forUpdate = false) {
    const q = db
      .select()
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);
    const rows = await (forUpdate ? q.for("update") : q);
    if (!rows.length) throw new NotFoundException("Lease not found.");
    return rows[0] as typeof realEstateLeases.$inferSelect;
  }

  private async loadRows(db: Tx, leaseId: number, orgId: number, forUpdate = false) {
    const q = db
      .select({
        id: realEstateRentPayments.id,
        status: realEstateRentPayments.status,
        rowKind: realEstateRentPayments.rowKind,
        paymentDate: realEstateRentPayments.paymentDate,
        amount: realEstateRentPayments.amount,
        currencyId: realEstateRentPayments.currencyId,
        periodStart: realEstateRentPayments.periodStart,
        periodEnd: realEstateRentPayments.periodEnd,
        amountPaid: realEstateRentPayments.amountPaid,
        dueStatus: realEstateRentPayments.dueStatus,
        transactionId: realEstateRentPayments.transactionId,
        proofUrl: realEstateRentPayments.proofUrl,
        notes: realEstateRentPayments.notes,
      })
      .from(realEstateRentPayments)
      .where(and(
        eq(realEstateRentPayments.organizationId, orgId),
        eq(realEstateRentPayments.leaseId, leaseId),
        ne(realEstateRentPayments.status, "voided"),
      ))
      .orderBy(asc(realEstateRentPayments.paymentDate), asc(realEstateRentPayments.id));
    const rows = await (forUpdate ? q.for("update") : q);
    return rows as Array<{
      id: number; status: string; rowKind: string | null; paymentDate: string; amount: string; currencyId: number | null;
      periodStart: string | null; periodEnd: string | null; amountPaid: string; dueStatus: string | null;
      transactionId: number | null; proofUrl: string | null; notes: string | null;
    }>;
  }

  private async loadActiveAllocs(db: Tx, leaseId: number, orgId: number) {
    const rows = await db
      .select()
      .from(realEstatePaymentAllocations)
      .where(and(
        eq(realEstatePaymentAllocations.organizationId, orgId),
        eq(realEstatePaymentAllocations.leaseId, leaseId),
        eq(realEstatePaymentAllocations.status, "true"),
      ))
      .orderBy(asc(realEstatePaymentAllocations.id));
    return rows as Array<typeof realEstatePaymentAllocations.$inferSelect>;
  }

  /** Transaction + verrou du bail ; null si le bail n'est (plus) pas flagge. */
  async withLeaseLock<T>(leaseId: number, orgId: number, fn: (tx: Tx, lease: typeof realEstateLeases.$inferSelect) => Promise<T>): Promise<T | null> {
    return this.db.transaction(async (tx) => {
      const lease = await this.loadLease(tx, leaseId, orgId, true);
      if (!isLeaseFlagged(lease)) return null;
      return fn(tx, lease);
    });
  }

  // ─── Etat d'un bail ──────────────────────────────────────────────────────

  async getLeaseDueState(leaseId: number, orgId: number, now: Date = new Date()): Promise<LeaseDueState> {
    const lease = await this.loadLease(this.db, leaseId, orgId);
    const decimals = await this.decimalsFor(this.db, lease.currencyId);
    const todayStr = formatDateOnly(now);
    const rows = await this.loadRows(this.db, leaseId, orgId);
    const graceDays = await readOverdueGraceDays(this.db, orgId);
    const today = parseDateOnly(todayStr);

    if (!isLeaseFlagged(lease)) {
      const paidTotal = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
      const totalDue = computeLeaseTotalDue(lease as any, paidTotal, decimals, now);
      const entry = (await loadOverdueByLease(this.db, orgId, graceDays, [lease as any], today)).get(leaseId);
      const cov = applyCoverage(this.buildSchedule(lease, decimals, todayStr), [paidTotal], todayStr, decimals);
      return { flagged: false, dues: [], credit: cov.credit, totalDue, overdueCount: entry?.stats.unpaidCount ?? 0 };
    }

    const allocs = await this.loadActiveAllocs(this.db, leaseId, orgId);
    const dateById = new Map(rows.map((r) => [r.id, String(r.paymentDate).slice(0, 10)]));
    const allocsByDue = new Map<number, typeof allocs>();
    const allocByPay = new Map<number, number>();
    for (const a of allocs) {
      const l = allocsByDue.get(Number(a.dueId)) ?? [];
      l.push(a);
      allocsByDue.set(Number(a.dueId), l);
      allocByPay.set(Number(a.paymentId), roundMoney((allocByPay.get(Number(a.paymentId)) ?? 0) + Number(a.amount), decimals));
    }
    const dues: LeaseDueEntry[] = rows
      .filter((r) => r.rowKind === "due")
      .map((r) => {
        const list = allocsByDue.get(r.id) ?? [];
        const amount = roundMoney(Number(r.amount), decimals);
        const paid = roundMoney(list.reduce((s, a) => s + Number(a.amount), 0), decimals);
        const dueDate = String(r.paymentDate).slice(0, 10);
        return {
          id: r.id,
          periodStart: r.periodStart ? String(r.periodStart).slice(0, 10) : dueDate,
          periodEnd: r.periodEnd ? String(r.periodEnd).slice(0, 10) : null,
          dueDate,
          amount,
          amountPaid: paid,
          remaining: Math.max(0, roundMoney(amount - paid, decimals)),
          dueStatus: dueStatusOf(amount, paid, decimals),
          status: r.status,
          allocations: list.map((a) => ({
            id: Number(a.id), paymentId: Number(a.paymentId), paymentDate: dateById.get(Number(a.paymentId)) ?? null,
            amount: Number(a.amount), source: a.source,
          })),
        };
      })
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.id - b.id);

    const payments = rows
      .filter((r) => r.status === "paid" && r.rowKind !== "due")
      .map((r) => {
        const amount = roundMoney(Number(r.amount), decimals);
        const allocated = allocByPay.get(r.id) ?? 0;
        return { id: r.id, paymentDate: String(r.paymentDate).slice(0, 10), amount, allocated, unallocated: Math.max(0, roundMoney(amount - allocated, decimals)) };
      });
    const credit = roundMoney(payments.reduce((s, p) => s + p.unallocated, 0), decimals);
    const due = dues.filter((d) => d.dueDate <= todayStr);
    return {
      flagged: true,
      dues,
      credit,
      totalDue: roundMoney(due.reduce((s, d) => s + d.remaining, 0), decimals),
      overdueCount: due.filter((d) => d.remaining > 0 && isPastGrace(d.dueDate, today, graceDays)).length,
      payments,
    };
  }

  // ─── Apercu d'imputation (aucune ecriture) ───────────────────────────────

  async previewAllocation(
    leaseId: number,
    orgId: number,
    input: { amount: number; paymentDate: string; currencyId?: number | null; allocations?: ExplicitAllocation[] },
  ) {
    const lease = await this.loadLease(this.db, leaseId, orgId);
    if (!isLeaseFlagged(lease)) {
      return { flagged: false, allocations: [], credit: 0, warnings: [] as AllocationWarning[], dues: [] };
    }
    const decimals = await this.decimalsFor(this.db, lease.currencyId);
    const rows = await this.loadRows(this.db, leaseId, orgId);
    const allocs = await this.loadActiveAllocs(this.db, leaseId, orgId);
    const res = computeRebuild({
      rows: this.toRebuildRows(rows),
      allocs: allocs.map((a) => ({ id: Number(a.id), paymentId: Number(a.paymentId), dueId: Number(a.dueId), amount: Number(a.amount), source: a.source })),
      leaseCurrencyId: lease.currencyId,
      decimals,
      terminationDate: lease.status === "ended" && lease.terminationDate ? String(lease.terminationDate) : null,
      virtual: {
        id: -1,
        paymentDate: input.paymentDate,
        amount: Number(input.amount) || 0,
        currencyId: input.currencyId ?? lease.currencyId ?? null,
        explicit: input.allocations?.length ? input.allocations : undefined,
      },
    });
    const warnings: AllocationWarning[] = [...res.warnings];
    const byId = new Map(res.dues.map((d) => [d.id, d]));
    const payCur = input.currencyId ?? null;
    if (payCur != null && lease.currencyId != null && Number(payCur) !== Number(lease.currencyId)) {
      warnings.push({ code: "CURRENCY_MISMATCH", message: "Devise du paiement differente de celle du bail : aucune imputation." });
    }
    for (const e of input.allocations ?? []) {
      const d = byId.get(Number(e.dueId));
      if (!d) {
        warnings.push({ code: "DUE_NOT_ELIGIBLE", message: "Echeance introuvable ou hors duree du bail.", dueId: e.dueId });
        continue;
      }
      const older = res.dues.find((x) => x.periodStart < d.periodStart && x.remaining > 0);
      if (older) {
        warnings.push({
          code: "OLDER_DUE_UNSETTLED",
          message: `L'echeance du ${older.periodStart} n'est pas soldee alors qu'une echeance plus recente est payee.`,
          dueId: older.id,
        });
      }
    }
    return {
      flagged: true,
      allocations: res.virtualAllocations.map((a) => ({ ...a, periodStart: byId.get(a.dueId)?.periodStart ?? null })),
      credit: res.virtualCredit,
      warnings,
      dues: res.dues,
    };
  }

  private toRebuildRows(rows: Array<{ id: number; status: string; rowKind: string | null; paymentDate: string; amount: string; currencyId: number | null; periodStart: string | null }>): RebuildRow[] {
    return rows.map((r) => ({
      id: r.id, rowKind: r.rowKind, status: r.status, paymentDate: String(r.paymentDate).slice(0, 10),
      amount: Number(r.amount) || 0, currencyId: r.currencyId, periodStart: r.periodStart,
    }));
  }

  // ─── Rebuild ─────────────────────────────────────────────────────────────

  /**
   * Recalcule les imputations d'un bail flagge (dans la transaction `tx` fournie) :
   * verrou du bail + de ses lignes, soft-void des imputations auto/backfill obsoletes,
   * FIFO par paymentDate en conservant les manuelles, MAJ des caches (amountPaid/dueStatus)
   * et du statut legacy (settled / pending). Aucune ecriture comptable.
   */
  async rebuildLeaseAllocations(
    leaseId: number,
    orgId: number,
    tx: Tx,
    opts: { source?: "auto" | "backfill"; userId?: number | null; now?: Date } = {},
  ) {
    const lease = await this.loadLease(tx, leaseId, orgId, true);
    if (!isLeaseFlagged(lease)) return { skipped: true as const };
    const decimals = await this.decimalsFor(tx, lease.currencyId);
    const rows = await this.loadRows(tx, leaseId, orgId, true);

    // Lignes paid non classees (creees par un autre chemin) => paiements.
    const unclassified = rows.filter((r) => r.status === "paid" && !r.rowKind).map((r) => r.id);
    if (unclassified.length) {
      await tx.update(realEstateRentPayments).set({ rowKind: "payment" }).where(inArray(realEstateRentPayments.id, unclassified));
      for (const r of rows) if (unclassified.includes(r.id)) r.rowKind = "payment";
    }

    const allocs = await this.loadActiveAllocs(tx, leaseId, orgId);
    const res = computeRebuild({
      rows: this.toRebuildRows(rows),
      allocs: allocs.map((a) => ({ id: Number(a.id), paymentId: Number(a.paymentId), dueId: Number(a.dueId), amount: Number(a.amount), source: a.source })),
      leaseCurrencyId: lease.currencyId,
      decimals,
      terminationDate: lease.status === "ended" && lease.terminationDate ? String(lease.terminationDate) : null,
    });

    const byReason = new Map<string, number[]>();
    for (const v of res.voids) byReason.set(v.reason, [...(byReason.get(v.reason) ?? []), v.id]);
    for (const [reason, ids] of byReason) {
      await tx
        .update(realEstatePaymentAllocations)
        .set({ status: "false", voidReason: reason, voidedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(inArray(realEstatePaymentAllocations.id, ids), eq(realEstatePaymentAllocations.status, "true")));
    }
    const curOf = new Map(rows.map((r) => [r.id, r.currencyId]));
    for (const ins of res.inserts) {
      await tx.insert(realEstatePaymentAllocations).values({
        organizationId: orgId,
        leaseId,
        paymentId: ins.paymentId,
        dueId: ins.dueId,
        amount: this.money(ins.amount),
        currencyId: curOf.get(ins.paymentId) ?? lease.currencyId ?? null,
        source: opts.source ?? "auto",
        status: "true",
        createdBy: opts.userId ?? null,
      });
    }

    // Caches + statut legacy des echeances.
    const rowById = new Map(rows.map((r) => [r.id, r]));
    for (const d of res.dues) {
      const row = rowById.get(d.id)!;
      const set: Record<string, unknown> = {};
      if (roundMoney(Number(row.amountPaid || 0), decimals) !== d.amountPaid) set.amountPaid = this.money(d.amountPaid);
      if (row.dueStatus !== d.dueStatus) set.dueStatus = d.dueStatus;
      if (!d.fused) {
        if (d.remaining <= 0 && row.status !== "settled") set.status = "settled";
        else if (d.remaining > 0 && row.status === "settled") set.status = "pending";
      }
      if (Object.keys(set).length) {
        set.updatedAt = sql`CURRENT_TIMESTAMP`;
        await tx.update(realEstateRentPayments).set(set).where(eq(realEstateRentPayments.id, d.id));
      }
    }

    const todayStr = formatDateOnly(opts.now ?? new Date());
    const dueDateOf = new Map(rows.map((r) => [r.id, String(r.paymentDate).slice(0, 10)]));
    const totalDue = roundMoney(
      res.dues.filter((d) => (dueDateOf.get(d.id) ?? "") <= todayStr).reduce((s, d) => s + d.remaining, 0),
      decimals,
    );
    return {
      skipped: false as const,
      inserted: res.inserts.length,
      voided: res.voids.length,
      credit: res.credit,
      totalDue,
      warnings: res.warnings,
      dues: res.dues,
    };
  }

  /** Rebuild dans sa propre transaction (no-op si le bail n'est pas flagge). */
  async rebuildForLease(leaseId: number, orgId: number, userId?: number | null) {
    return this.withLeaseLock(leaseId, orgId, (tx) => this.rebuildLeaseAllocations(leaseId, orgId, tx, { userId }));
  }

  // ─── Hooks d'ecriture ────────────────────────────────────────────────────

  /**
   * Valide AVANT l'encaissement les imputations explicites d'un nouveau paiement
   * (evite d'echouer apres ecriture comptable). Lecture seule.
   */
  async validateExplicit(leaseId: number, orgId: number, explicit: ExplicitAllocation[] | undefined, amount: number) {
    if (!explicit?.length) return;
    const lease = await this.loadLease(this.db, leaseId, orgId);
    const decimals = await this.decimalsFor(this.db, lease.currencyId);
    const rows = await this.loadRows(this.db, leaseId, orgId);
    const dueRows = new Map(rows.filter((r) => r.rowKind === "due").map((r) => [r.id, r]));
    const seen = new Set<number>();
    let sum = 0;
    for (const e of explicit) {
      const due = dueRows.get(Number(e.dueId));
      if (!due) throw new BadRequestException(`Echeance #${e.dueId} introuvable pour ce bail.`);
      if (seen.has(due.id)) throw new BadRequestException("Echeance en double dans l'imputation.");
      seen.add(due.id);
      if (due.status === "paid") throw new BadRequestException(`Echeance #${due.id} deja payee.`);
      if (e.amount != null) {
        if (!(Number(e.amount) > 0)) throw new BadRequestException("Montant d'imputation invalide.");
        sum = roundMoney(sum + Number(e.amount), decimals);
      }
    }
    if (sum > roundMoney(Number(amount) || 0, decimals) + 1e-9) {
      throw new BadRequestException("Le total des imputations depasse le montant du paiement.");
    }
  }

  /**
   * Apres creation d'une ligne paiement sur un bail flagge : classe la ligne (rowKind=payment),
   * enregistre les imputations explicites (source manual) puis recalcule (FIFO pour le reste).
   * mode 'none' : classe seulement, pas d'imputation immediate (credit jusqu'au prochain rebuild).
   * Retourne null si le bail n'est pas flagge (aucune ecriture).
   */
  async onPaymentCreated(input: {
    leaseId: number; orgId: number; paymentId: number;
    mode?: "auto" | "manual" | "none"; explicit?: ExplicitAllocation[]; userId?: number | null;
  }) {
    return this.withLeaseLock(input.leaseId, input.orgId, async (tx, lease) => {
      await tx
        .update(realEstateRentPayments)
        .set({ rowKind: "payment", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateRentPayments.id, input.paymentId), eq(realEstateRentPayments.organizationId, input.orgId)));
      if (input.mode === "none") return { classified: true, rebuilt: false };

      if (input.explicit?.length) {
        const decimals = await this.decimalsFor(tx, lease.currencyId);
        const rows = await this.loadRows(tx, input.leaseId, input.orgId, true);
        const pay = rows.find((r) => r.id === input.paymentId);
        const dues = new Map(rows.filter((r) => r.rowKind === "due" && r.status !== "paid").map((r) => [r.id, r]));
        const allocs = await this.loadActiveAllocs(tx, input.leaseId, input.orgId);
        let left = roundMoney(Number(pay?.amount) || 0, decimals);
        for (const e of input.explicit) {
          const due = dues.get(Number(e.dueId));
          if (!due) continue;
          // Reste de l'echeance hors imputations auto/backfill (qui seront recalculees).
          const kept = allocs.filter((a) => Number(a.dueId) === due.id && a.source === "manual").reduce((s, a) => s + Number(a.amount), 0);
          const cap = roundMoney(Number(due.amount) - kept, decimals);
          const amt = Math.min(left, cap, e.amount != null ? roundMoney(Number(e.amount), decimals) : Infinity);
          if (!(amt > 0)) continue;
          await tx.insert(realEstatePaymentAllocations).values({
            organizationId: input.orgId, leaseId: input.leaseId, paymentId: input.paymentId, dueId: due.id,
            amount: this.money(amt), currencyId: pay?.currencyId ?? lease.currencyId ?? null,
            source: "manual", status: "true", createdBy: input.userId ?? null,
          });
          allocs.push({ dueId: due.id, source: "manual", amount: String(amt) } as any);
          left = roundMoney(left - amt, decimals);
        }
      }
      const r = await this.rebuildLeaseAllocations(input.leaseId, input.orgId, tx, { userId: input.userId ?? null });
      return { classified: true, rebuilt: true, rebuild: r };
    });
  }

  /**
   * Remplace les imputations d'un paiement par un jeu MANUEL (motif obligatoire, ancien jeu
   * soft-void avec le motif), puis recalcule le reste. Refuse ligne fusionnee / devise differente.
   */
  async setPaymentAllocations(
    paymentId: number,
    orgId: number,
    allocations: Array<{ dueId: number; amount: number }>,
    reason: string,
    userId?: number | null,
  ) {
    const why = String(reason ?? "").trim();
    if (why.length < 3) throw new BadRequestException("Un motif est obligatoire pour modifier l'imputation.");
    const [pay] = await this.db
      .select({ id: realEstateRentPayments.id, leaseId: realEstateRentPayments.leaseId })
      .from(realEstateRentPayments)
      .where(and(eq(realEstateRentPayments.id, paymentId), eq(realEstateRentPayments.organizationId, orgId)))
      .limit(1);
    if (!pay) throw new NotFoundException("Payment not found.");
    const leaseId = Number(pay.leaseId);

    const out = await this.withLeaseLock(leaseId, orgId, async (tx, lease) => {
      const decimals = await this.decimalsFor(tx, lease.currencyId);
      const rows = await this.loadRows(tx, leaseId, orgId, true);
      const row = rows.find((r) => r.id === paymentId);
      if (!row || row.status !== "paid") throw new BadRequestException("Seul un paiement encaisse peut etre imputee.");
      if (row.rowKind === "due") throw new BadRequestException("Cette ligne est a la fois echeance et paiement : imputation non modifiable.");
      if (row.currencyId != null && lease.currencyId != null && Number(row.currencyId) !== Number(lease.currencyId)) {
        throw new BadRequestException("Devise du paiement differente de celle du bail : imputation impossible.");
      }
      const term = lease.status === "ended" && lease.terminationDate ? String(lease.terminationDate).slice(0, 10) : null;
      const dues = new Map(rows.filter((r) => r.rowKind === "due" && r.status !== "paid").map((r) => [r.id, r]));
      const active = await this.loadActiveAllocs(tx, leaseId, orgId);
      const seen = new Set<number>();
      let sum = 0;
      for (const a of allocations ?? []) {
        const due = dues.get(Number(a.dueId));
        if (!due) throw new BadRequestException(`Echeance #${a.dueId} introuvable pour ce bail.`);
        if (seen.has(due.id)) throw new BadRequestException("Echeance en double dans l'imputation.");
        seen.add(due.id);
        const amt = roundMoney(Number(a.amount) || 0, decimals);
        if (!(amt > 0)) throw new BadRequestException("Montant d'imputation invalide.");
        const ps = due.periodStart ? String(due.periodStart).slice(0, 10) : String(due.paymentDate).slice(0, 10);
        if (term && ps > term) throw new BadRequestException("Imputation impossible apres la date de resiliation.");
        const others = active
          .filter((x) => Number(x.dueId) === due.id && Number(x.paymentId) !== paymentId && (x.source === "manual" || Number(x.paymentId) === due.id))
          .reduce((s, x) => s + Number(x.amount), 0);
        if (amt > roundMoney(Number(due.amount) - others, decimals) + 1e-9) {
          throw new BadRequestException(`Montant superieur au reste de l'echeance #${due.id}.`);
        }
        sum = roundMoney(sum + amt, decimals);
      }
      if (sum > roundMoney(Number(row.amount), decimals) + 1e-9) {
        throw new BadRequestException("Le total des imputations depasse le montant du paiement.");
      }
      const mine = active.filter((a) => Number(a.paymentId) === paymentId).map((a) => Number(a.id));
      if (mine.length) {
        await tx
          .update(realEstatePaymentAllocations)
          .set({ status: "false", voidReason: `Reimputation manuelle : ${why}`.slice(0, 500), voidedAt: sql`CURRENT_TIMESTAMP` })
          .where(inArray(realEstatePaymentAllocations.id, mine));
      }
      for (const a of allocations ?? []) {
        await tx.insert(realEstatePaymentAllocations).values({
          organizationId: orgId, leaseId, paymentId, dueId: Number(a.dueId),
          amount: this.money(roundMoney(Number(a.amount), decimals)), currencyId: row.currencyId ?? lease.currencyId ?? null,
          source: "manual", status: "true", createdBy: userId ?? null,
        });
      }
      await this.rebuildLeaseAllocations(leaseId, orgId, tx, { userId });
      return true;
    });
    if (out == null) throw new BadRequestException("Le registre d'imputations n'est pas active sur ce bail.");
    return this.getLeaseDueState(leaseId, orgId);
  }

  /** Echeances manquantes d'un bail flagge (rowKind=due) puis imputation du credit. null si non flagge. */
  async generateMissingDues(leaseId: number, orgId: number, upToEnd = false) {
    return this.withLeaseLock(leaseId, orgId, async (tx, lease) => {
      const decimals = await this.decimalsFor(tx, lease.currencyId);
      const rows = await this.loadRows(tx, leaseId, orgId, true);
      const todayStr = formatDateOnly(new Date());
      const today = parseDateOnly(todayStr);
      const schedule = this.buildSchedule(lease, decimals, todayStr);
      const horizonEnd = upToEnd
        ? (lease.endDate ? null : formatDateOnly(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 12, 0))))
        : todayStr;
      const existing = new Set(
        rows.filter((r) => r.rowKind === "due").map((r) => (r.periodStart ? String(r.periodStart).slice(0, 10) : String(r.paymentDate).slice(0, 10))),
      );
      const created: number[] = [];
      for (const p of horizonEnd ? schedule.filter((x) => x.dueDate <= horizonEnd) : schedule) {
        if (existing.has(p.periodStart)) continue;
        const [res] = await tx.insert(realEstateRentPayments).values({
          organizationId: orgId, leaseId, currencyId: lease.currencyId ?? null, transactionId: null,
          paymentDate: p.dueDate, amount: this.money(p.amount), method: "pending", status: "pending",
          notes: "Echeance generee automatiquement (registre d'imputations) — a confirmer.",
          periodStart: p.periodStart, periodEnd: p.periodEnd, rowKind: "due", dueStatus: "pending", amountPaid: "0",
          createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP`,
        } as any);
        created.push(Number((res as any).insertId));
      }
      await this.rebuildLeaseAllocations(leaseId, orgId, tx);
      const payments = created.length
        ? await tx.select().from(realEstateRentPayments).where(inArray(realEstateRentPayments.id, created))
        : [];
      return { createdCount: created.length, payments };
    });
  }

  // ─── Reprise (backfill) ──────────────────────────────────────────────────

  private makePlan(lease: typeof realEstateLeases.$inferSelect, rows: Awaited<ReturnType<LeaseAllocationService["loadRows"]>>, decimals: number, now: Date): BackfillPlan {
    const todayStr = formatDateOnly(now);
    const schedule = this.buildSchedule(lease, decimals, todayStr);
    const paidTotal = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount || 0), 0);
    const legacy = computeLeaseTotalDue(lease as any, paidTotal, decimals, now);
    return planBackfill(
      {
        id: lease.id,
        startDate: String(lease.startDate).slice(0, 10),
        endDate: lease.endDate ? String(lease.endDate).slice(0, 10) : null,
        terminationDate: lease.status === "ended" && lease.terminationDate ? String(lease.terminationDate).slice(0, 10) : null,
        currencyId: lease.currencyId ?? null,
      },
      schedule,
      rows.map((r) => ({
        id: r.id, status: r.status, paymentDate: String(r.paymentDate).slice(0, 10), amount: Number(r.amount) || 0,
        currencyId: r.currencyId, periodStart: r.periodStart, periodEnd: r.periodEnd, transactionId: r.transactionId,
        proofUrl: r.proofUrl, notes: r.notes,
      })),
      { decimals, today: todayStr, legacyTotalDue: legacy },
    );
  }

  /**
   * Reprise des baux existants. dryRun (defaut) : plan par bail, AUCUNE ecriture.
   * Apply : refuse si ecart avec le legacy sauf force ; cree les echeances manquantes (pending, sans
   * transaction), classe les lignes, imputations source=backfill, flag allocationLedgerAt.
   * Revert : flag NULL + imputations status 'false' (aucune ligne supprimee).
   */
  async backfill(orgId: number, opts: BackfillOptions = {}, userId?: number | null, now: Date = new Date()): Promise<{ dryRun: boolean; leases: BackfillLeaseReport[]; nextCursor?: number | null }> {
    const dryRun = opts.dryRun !== false;
    const ids = opts.leaseIds?.length ? [...new Set(opts.leaseIds.map(Number))] : null;
    if ((!dryRun || opts.revert) && !ids) {
      throw new BadRequestException("leaseIds est obligatoire pour appliquer ou annuler une reprise (validation par bail).");
    }
    const leaseRows = ids
      ? await this.db.select({ id: realEstateLeases.id, reference: realEstateLeases.reference }).from(realEstateLeases)
          .where(and(eq(realEstateLeases.organizationId, orgId), inArray(realEstateLeases.id, ids)))
      : await this.db.select({ id: realEstateLeases.id, reference: realEstateLeases.reference }).from(realEstateLeases)
          .where(and(
            eq(realEstateLeases.organizationId, orgId),
            ne(realEstateLeases.status, "cancelled"),
            sql`${realEstateLeases.allocationLedgerAt} IS NULL`,
            gt(realEstateLeases.id, Math.max(0, Number(opts.afterLeaseId) || 0)),
          ))
          .orderBy(asc(realEstateLeases.id))
          .limit(BACKFILL_PAGE_SIZE);
    const reports: BackfillLeaseReport[] = [];
    for (const l of leaseRows) {
      try {
        reports.push(
          opts.revert
            ? await this.revertOne(l.id, l.reference, orgId, dryRun)
            : dryRun
              ? await this.previewOne(l.id, l.reference, orgId, !ids, now)
              : await this.applyOne(l.id, l.reference, orgId, !!opts.force, userId ?? null, now),
        );
      } catch (e: any) {
        this.logger.error(`backfill bail ${l.id}: ${e?.message ?? e}`);
        // Refus metier explicite (400) : message conserve ; erreur technique : message generique (detail en log).
        if (e instanceof BadRequestException && opts.revert && ids?.length === 1) throw e;
        reports.push({
          leaseId: l.id, reference: l.reference, mode: "refused",
          reason: e instanceof BadRequestException ? String(e.message) : "Echec technique de la reprise sur ce bail (voir les logs serveur).",
        });
      }
    }
    for (const id of ids ?? []) {
      if (!leaseRows.some((l) => l.id === id)) reports.push({ leaseId: id, mode: "skipped", reason: "Bail introuvable." });
    }
    const nextCursor = !ids && leaseRows.length === BACKFILL_PAGE_SIZE ? leaseRows[leaseRows.length - 1].id : null;
    return { dryRun, leases: reports, ...(ids ? {} : { nextCursor }) };
  }

  private async previewOne(leaseId: number, reference: string | null, orgId: number, summary: boolean, now: Date): Promise<BackfillLeaseReport> {
    const lease = await this.loadLease(this.db, leaseId, orgId);
    if (isLeaseFlagged(lease)) return { leaseId, reference, mode: "skipped", reason: "Registre deja actif sur ce bail." };
    const decimals = await this.decimalsFor(this.db, lease.currencyId);
    const rows = await this.loadRows(this.db, leaseId, orgId);
    const plan = this.makePlan(lease, rows, decimals, now);
    if (summary) {
      const { dues: _dues, ...rest } = plan;
      return { leaseId, reference, mode: "preview", plan: rest };
    }
    return { leaseId, reference, mode: "preview", plan };
  }

  private async applyOne(leaseId: number, reference: string | null, orgId: number, force: boolean, userId: number | null, now: Date): Promise<BackfillLeaseReport> {
    const out = await this.db.transaction(async (tx): Promise<BackfillLeaseReport> => {
      const lease = await this.loadLease(tx, leaseId, orgId, true);
      if (isLeaseFlagged(lease)) return { leaseId, reference, mode: "skipped", reason: "Registre deja actif sur ce bail." };
      const decimals = await this.decimalsFor(tx, lease.currencyId);
      const rows = await this.loadRows(tx, leaseId, orgId, true);
      const plan = this.makePlan(lease, rows, decimals, now);
      if (!plan.canApply) return { leaseId, reference, mode: "refused", reason: "Bail sans echeancier exploitable.", plan };
      if (plan.requiresForce && !force) {
        return { leaseId, reference, mode: "refused", reason: "Ecart avec le calcul legacy : revoir l'apercu puis relancer avec force.", plan };
      }

      for (const c of plan.create) {
        await tx.insert(realEstateRentPayments).values({
          organizationId: orgId, leaseId, currencyId: lease.currencyId ?? null, transactionId: null,
          paymentDate: c.dueDate, amount: this.money(c.amount), method: "pending", status: "pending",
          notes: `${TRACE_BACKFILL_CREATED} du registre d'imputations.`,
          periodStart: c.periodStart, periodEnd: c.periodEnd, rowKind: "due", dueStatus: "pending", amountPaid: "0",
          createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP`,
        } as any);
      }
      const rowById = new Map(rows.map((r) => [r.id, r]));
      // Trace (notes) des valeurs d'origine pour que le revert restaure periode/montant legacy.
      const trace = (rowId: number, withAmount: boolean) => {
        const o = rowById.get(rowId);
        if (!o) return {};
        const snap = JSON.stringify({
          ps: o.periodStart ? String(o.periodStart).slice(0, 10) : null,
          pe: o.periodEnd ? String(o.periodEnd).slice(0, 10) : null,
          ...(withAmount ? { amt: String(o.amount) } : {}),
        });
        return { notes: `${o.notes ?? ""} [REPRISE:${snap}]`.trim() };
      };
      for (const r of plan.reuse) {
        await tx.update(realEstateRentPayments).set({
          rowKind: "due", periodStart: r.periodStart, periodEnd: r.periodEnd,
          ...(r.setAmount ? { amount: this.money(r.amount) } : {}),
          ...trace(r.rowId, r.setAmount),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(realEstateRentPayments.id, r.rowId));
      }
      for (const f of plan.fused) {
        await tx.update(realEstateRentPayments).set({
          rowKind: "due", periodStart: f.periodStart, periodEnd: f.periodEnd, ...trace(f.rowId, false),
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(realEstateRentPayments.id, f.rowId));
      }
      if (plan.payments.length) {
        await tx.update(realEstateRentPayments).set({ rowKind: "payment", updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(inArray(realEstateRentPayments.id, plan.payments.map((p) => p.rowId)));
      }
      await tx.update(realEstateLeases).set({ allocationLedgerAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)));

      const res = await this.rebuildLeaseAllocations(leaseId, orgId, tx, { source: "backfill", userId, now });
      if (res.skipped) throw new Error("Flag non applique.");
      const unit = Math.pow(10, -decimals);
      if (Math.abs(res.totalDue - plan.totals.totalDueNew) > Math.max(unit, 0.01) || Math.abs(res.credit - plan.credit) > Math.max(unit, 0.01)) {
        throw new Error(`Divergence apercu/application (du ${res.totalDue} vs ${plan.totals.totalDueNew}, credit ${res.credit} vs ${plan.credit}) : annule.`);
      }
      return { leaseId, reference, mode: "applied", plan };
    });
    return out;
  }

  /** Echeances confirmees par scission (paiement distinct) : un revert ferait reposter un 2e encaissement. */
  private async splitPaymentsCount(db: Tx, leaseId: number, orgId: number): Promise<number> {
    const rows = await db
      .select({ id: realEstateRentPayments.id })
      .from(realEstateRentPayments)
      .where(and(
        eq(realEstateRentPayments.organizationId, orgId),
        eq(realEstateRentPayments.leaseId, leaseId),
        ne(realEstateRentPayments.status, "voided"),
        like(realEstateRentPayments.notes, `%${TRACE_SPLIT}%`),
      ))
      .limit(1);
    return rows.length;
  }

  private async revertOne(leaseId: number, reference: string | null, orgId: number, dryRun: boolean): Promise<BackfillLeaseReport> {
    const SPLIT_MSG = "Revert refuse : des echeances ont ete confirmees via le registre (paiements scindes) ; annuler la reprise ferait reposter un 2e encaissement. Annulez d'abord ces paiements.";
    if (dryRun) {
      const lease = await this.loadLease(this.db, leaseId, orgId);
      if (!isLeaseFlagged(lease)) return { leaseId, reference, mode: "skipped", reason: "Registre non actif sur ce bail." };
      if (await this.splitPaymentsCount(this.db, leaseId, orgId)) return { leaseId, reference, mode: "refused", reason: SPLIT_MSG };
      return { leaseId, reference, mode: "would_revert" };
    }
    return this.db.transaction(async (tx): Promise<BackfillLeaseReport> => {
      const lease = await this.loadLease(tx, leaseId, orgId, true);
      if (!isLeaseFlagged(lease)) return { leaseId, reference, mode: "skipped", reason: "Registre non actif sur ce bail." };
      if (await this.splitPaymentsCount(tx, leaseId, orgId)) throw new BadRequestException(SPLIT_MSG);
      const rows = await this.loadRows(tx, leaseId, orgId, true);
      // Echeances creees par la reprise / la generation du registre : inexistantes avant le flag => annulees (soft).
      const generated = rows
        .filter((r) => r.rowKind === "due" && r.status !== "paid" && r.notes && (r.notes.startsWith(TRACE_BACKFILL_CREATED) || r.notes.startsWith(TRACE_GENERATED)))
        .map((r) => r.id);
      if (generated.length) {
        await tx.update(realEstateRentPayments)
          .set({ status: "voided", notes: sql`TRIM(CONCAT(COALESCE(${realEstateRentPayments.notes}, ''), ' [ANNULE: reprise annulee]'))`, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(inArray(realEstateRentPayments.id, generated));
      }
      // Lignes legacy reutilisees/fusionnees : periode (et montant) d'origine restaures depuis la trace.
      for (const r of rows) {
        const m = r.notes ? TRACE_RESTORE_RE.exec(r.notes) : null;
        if (!m) continue;
        let snap: { ps?: string | null; pe?: string | null; amt?: string };
        try { snap = JSON.parse(m[1]); } catch { continue; }
        await tx.update(realEstateRentPayments).set({
          periodStart: snap.ps ?? null, periodEnd: snap.pe ?? null,
          ...(snap.amt != null ? { amount: snap.amt } : {}),
          notes: (r.notes ?? "").replace(TRACE_RESTORE_RE, "").trim() || null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }).where(eq(realEstateRentPayments.id, r.id));
      }
      await tx.update(realEstatePaymentAllocations)
        .set({ status: "false", voidReason: "Reprise annulee (revert)", voidedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstatePaymentAllocations.leaseId, leaseId), eq(realEstatePaymentAllocations.organizationId, orgId), eq(realEstatePaymentAllocations.status, "true")));
      // Statut legacy : une echeance 'settled' redevient 'pending' ; caches remis a zero (aucune ligne supprimee).
      await tx.update(realEstateRentPayments).set({ status: "pending", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateRentPayments.leaseId, leaseId), eq(realEstateRentPayments.organizationId, orgId), eq(realEstateRentPayments.status, "settled")));
      await tx.update(realEstateRentPayments).set({ rowKind: null, amountPaid: "0", dueStatus: null })
        .where(and(eq(realEstateRentPayments.leaseId, leaseId), eq(realEstateRentPayments.organizationId, orgId)));
      await tx.update(realEstateLeases).set({ allocationLedgerAt: null, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)));
      return { leaseId, reference, mode: "reverted" };
    });
  }
}
