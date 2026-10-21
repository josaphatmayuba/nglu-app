/**
 * Retard de loyer : source UNIQUE de la regle "en retard" = date d'echeance +
 * delai de grace (reglage org `rentOverdueGraceDays`) strictement depassee.
 * "Echue" = date d'echeance passee (grace ou non) ; "en retard" = echue ET
 * au-dela de la grace. Partage par baux/locataires, portails et dashboard.
 */
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { appSettings, currencies, realEstatePaymentAllocations, realEstateRentPayments } from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import {
  addBillingCycle,
  formatDateOnly,
  parseDateOnly,
  roundMoney,
} from "./lease-schedule";
import { dueStatusOf, isLeaseFlagged } from "./lease-allocation";
import {
  computeLeaseNextDue,
  computeLeaseTotalDue,
  computeProratedOverdueStats,
  paymentBehaviour,
  scheduleForLease,
  type DueBehaviourRecord,
  type LeaseNextDue,
  type OverdueStats,
} from "./lease-proration";

export const DEFAULT_OVERDUE_GRACE_DAYS = 5;
const DAY_MS = 86_400_000;

export interface LeaseOverdueStats extends OverdueStats {
  /** Jours depuis la 1ere echeance en retard (0 si aucune). */
  overdueDays: number;
  graceDays: number;
}

/** Normalise une valeur de reglage (entier 0..60), sinon defaut. */
export function normalizeGraceDays(value: unknown): number {
  const v = value == null ? NaN : Number(value);
  return Number.isInteger(v) && v >= 0 && v <= 60 ? v : DEFAULT_OVERDUE_GRACE_DAYS;
}

/** En retard = today strictement apres dueDate + graceDays (dates AAAA-MM-JJ). */
export function isPastGrace(dueDate: string | Date, today: Date, graceDays: number): boolean {
  const due = typeof dueDate === "string" ? parseDateOnly(dueDate) : dueDate;
  const limit = new Date(due.getTime());
  limit.setUTCDate(limit.getUTCDate() + graceDays);
  return today.getTime() > limit.getTime();
}

/** Jours entiers ecoules depuis une date d'echeance (>= 0). */
export function daysSince(dueDate: string, today: Date): number {
  return Math.max(0, Math.round((today.getTime() - parseDateOnly(dueDate).getTime()) / DAY_MS));
}

export function computeLeaseOverdueStats(
  startDate: string,
  endDate: string | null,
  billingCycle: string | null,
  paymentRows: Array<{ date: string; amount: number }>,
  rentAmount: number,
  today: Date,
  graceDays: number,
): LeaseOverdueStats {
  const start = parseDateOnly(startDate);
  const boundary = endDate ? parseDateOnly(endDate) : null;
  // Sans loyer exploitable, chaque paiement vaut une echeance.
  const unit = rentAmount > 0 ? rentAmount : 1;
  const payments = paymentRows.map((p) => ({ date: parseDateOnly(p.date), amount: rentAmount > 0 ? p.amount : 1 }));

  let dueCount = 0;
  let lateCount = 0;
  let unpaidCount = 0;
  let isOverdue = false;
  let overdueDueDate: string | null = null;
  const records: DueBehaviourRecord[] = [];
  let overdueAmount = 0;
  let graceDueAmount = 0;
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  // Chaque echeance est ancree sur `start` + N cycles (clamp fin de mois).
  let period = 0;
  let dueDate = start;

  while (dueDate.getTime() <= today.getTime() && (!boundary || dueDate.getTime() <= boundary.getTime())) {
    dueCount += 1;
    const nextDue = addBillingCycle(start, billingCycle, period + 1);

    // Couverture par montants cumules : l'echeance N est couverte par le paiement
    // qui fait atteindre N loyers cumules (paiement groupe/avance couvre plusieurs).
    let coveringPayment: Date | null = null;
    let cumulated = 0;
    for (const p of payments) {
      cumulated += p.amount;
      if (cumulated + 0.0001 >= (period + 1) * unit) { coveringPayment = p.date; break; }
    }

    records.push({ dueDate, nextDue, settledAt: coveringPayment, open: !coveringPayment });
    if (coveringPayment) {
      if (isPastGrace(dueDate, coveringPayment, graceDays)) lateCount += 1;
    } else {
      // Reste du de cette echeance (montants reels seulement si loyer exploitable).
      const remaining = rentAmount > 0
        ? Math.max(0, Math.min(rentAmount, roundMoney((period + 1) * rentAmount - Math.max(period * rentAmount, paidTotal), 2)))
        : 0;
      if (isPastGrace(dueDate, today, graceDays)) {
        lateCount += 1;
        unpaidCount += 1;
        isOverdue = true;
        if (overdueDueDate === null) overdueDueDate = formatDateOnly(dueDate);
        overdueAmount = roundMoney(overdueAmount + remaining, 2);
      } else {
        graceDueAmount = roundMoney(graceDueAmount + remaining, 2);
      }
    }

    period += 1;
    dueDate = addBillingCycle(start, billingCycle, period);
  }

  return {
    lateCount,
    unpaidCount,
    dueCount,
    lateRatio: dueCount > 0 ? lateCount / dueCount : 0,
    isOverdue,
    overdueDueDate,
    overdueDays: overdueDueDate ? daysSince(overdueDueDate, today) : 0,
    graceDays,
    ...paymentBehaviour(records, today, graceDays),
    overdueAmount,
    graceDueAmount,
  };
}

/** Delai de grace de l'organisation (Reglages Domus) ; NULL/invalide = defaut. */
export async function readOverdueGraceDays(db: Database, orgId: number): Promise<number> {
  const row = await readOrgAppSetting(db, orgId, { days: appSettings.rentOverdueGraceDays });
  return normalizeGraceDays(row?.days);
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

/**
 * Etat impute d'un bail flagge (module pur) : SOURCE UNIQUE partagee par
 * getLeaseDueState et par tous les lecteurs (liste Loyers, relances, portails...).
 */
export function buildFlaggedDueState(
  rows: Array<{ id: number; status: string; rowKind: string | null; paymentDate: string; amount: unknown; periodStart: string | null; periodEnd: string | null }>,
  allocs: Array<{ id: number; paymentId: number; dueId: number; amount: unknown; source: string }>,
  decimals: number,
  today: Date,
  graceDays: number,
): LeaseDueState {
  const todayStr = formatDateOnly(today);
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

/** Stats de retard + prochaine echeance derivees de l'etat impute (bail flagge). */
export function flaggedStatsFromState(
  state: LeaseDueState,
  today: Date,
  graceDays: number,
  prorationEnabled: boolean,
): { stats: LeaseOverdueStats; next: LeaseNextDue | null; openDueCount: number } {
  const todayStr = formatDateOnly(today);
  const echues = state.dues.filter((d) => d.dueDate <= todayStr);
  const unpaid = echues.filter((d) => d.remaining > 0 && isPastGrace(d.dueDate, today, graceDays));
  let lateCount = unpaid.length;
  for (const d of echues) {
    if (d.remaining > 0) continue;
    const last = d.allocations.map((a) => a.paymentDate).filter((x): x is string => !!x).sort().pop();
    if (last && isPastGrace(d.dueDate, parseDateOnly(last), graceDays)) lateCount += 1;
  }
  // Retard grave : echeance soldee (dernier paiement impute) ou toujours ouverte apres
  // la grace de l'echeance SUIVANTE ; repli sur +1 mois pour la derniere echeance.
  const records: DueBehaviourRecord[] = echues.map((d) => {
    const idx = state.dues.indexOf(d);
    const next = state.dues[idx + 1]?.dueDate;
    const last = d.allocations.map((a) => a.paymentDate).filter((x): x is string => !!x).sort().pop();
    return {
      dueDate: parseDateOnly(d.dueDate),
      nextDue: next ? parseDateOnly(next) : addBillingCycle(parseDateOnly(d.dueDate), "monthly", 1),
      settledAt: d.remaining > 0 ? null : (last ? parseDateOnly(last) : null),
      open: d.remaining > 0,
    };
  });
  const sumRemaining = (xs: typeof echues) => roundMoney(xs.reduce((s, d) => s + d.remaining, 0), 2);
  const overdueDueDate = unpaid.length ? unpaid[0].dueDate : null;
  const futur = state.dues.find((d) => d.dueDate > todayStr && d.remaining > 0);
  return {
    stats: {
      lateCount,
      unpaidCount: unpaid.length,
      dueCount: echues.length,
      lateRatio: echues.length > 0 ? lateCount / echues.length : 0,
      isOverdue: unpaid.length > 0,
      overdueDueDate,
      overdueDays: overdueDueDate ? daysSince(overdueDueDate, today) : 0,
      graceDays,
      ...paymentBehaviour(records, today, graceDays),
      overdueAmount: sumRemaining(unpaid),
      graceDueAmount: sumRemaining(echues.filter((d) => d.remaining > 0 && !isPastGrace(d.dueDate, today, graceDays))),
    },
    next: futur
      ? { rentProrationEnabled: prorationEnabled, nextDueDate: futur.dueDate, nextDueAmount: futur.remaining, isProratedNext: false }
      : null,
    openDueCount: state.dues.filter((d) => d.remaining > 0).length,
  };
}

/** Etats imputes de plusieurs baux flagges en 2 requetes (lignes + imputations actives). */
export async function loadFlaggedDueStates(
  db: Database,
  orgId: number,
  leases: Array<{ id: number; currencyId?: number | null; currencyDecimals?: number | null }>,
  today: Date,
  graceDays: number,
): Promise<Map<number, LeaseDueState>> {
  const out = new Map<number, LeaseDueState>();
  if (!leases.length) return out;
  const ids = leases.map((l) => l.id);
  const rows = await db
    .select({
      id: realEstateRentPayments.id,
      leaseId: realEstateRentPayments.leaseId,
      status: realEstateRentPayments.status,
      rowKind: realEstateRentPayments.rowKind,
      paymentDate: realEstateRentPayments.paymentDate,
      amount: realEstateRentPayments.amount,
      periodStart: realEstateRentPayments.periodStart,
      periodEnd: realEstateRentPayments.periodEnd,
    })
    .from(realEstateRentPayments)
    .where(and(
      eq(realEstateRentPayments.organizationId, orgId),
      inArray(realEstateRentPayments.leaseId, ids),
      ne(realEstateRentPayments.status, "voided"),
    ))
    .orderBy(asc(realEstateRentPayments.paymentDate), asc(realEstateRentPayments.id));
  const allocs = await db
    .select()
    .from(realEstatePaymentAllocations)
    .where(and(
      eq(realEstatePaymentAllocations.organizationId, orgId),
      inArray(realEstatePaymentAllocations.leaseId, ids),
      eq(realEstatePaymentAllocations.status, "true"),
    ))
    .orderBy(asc(realEstatePaymentAllocations.id));
  const curIds = [...new Set(leases.filter((l) => l.currencyId && l.currencyDecimals == null).map((l) => Number(l.currencyId)))];
  const decByCur = new Map<number, number>();
  if (curIds.length) {
    const cur = await db.select({ id: currencies.id, d: currencies.decimalPlaces }).from(currencies).where(inArray(currencies.id, curIds));
    for (const c of cur) {
      const d = c.d == null ? NaN : Number(c.d);
      decByCur.set(Number(c.id), Number.isInteger(d) && d >= 0 ? Math.min(d, 2) : 2);
    }
  }
  const rowsByLease = new Map<number, any[]>();
  for (const r of rows as any[]) {
    const k = Number(r.leaseId);
    const list = rowsByLease.get(k);
    if (list) list.push(r); else rowsByLease.set(k, [r]);
  }
  const allocsByLease = new Map<number, any[]>();
  for (const a of allocs as any[]) {
    const k = Number(a.leaseId);
    const list = allocsByLease.get(k);
    if (list) list.push(a); else allocsByLease.set(k, [a]);
  }
  for (const l of leases) {
    const dec = l.currencyDecimals == null ? NaN : Number(l.currencyDecimals);
    const decimals = Number.isInteger(dec) && dec >= 0 ? Math.min(dec, 2) : (decByCur.get(Number(l.currencyId)) ?? 2);
    out.set(l.id, buildFlaggedDueState(
      rowsByLease.get(l.id) ?? [],
      allocsByLease.get(l.id) ?? [],
      decimals, today, graceDays,
    ));
  }
  return out;
}

/** Echeances pour les portails publics : imputations reduites a { paymentDate, amount } (ni id ni source). */
export function portalDues(dues: LeaseDueEntry[]): Array<Omit<LeaseDueEntry, "allocations"> & { allocations: Array<{ paymentDate: string | null; amount: number }> }> {
  return dues.map((d) => ({
    ...d,
    allocations: d.allocations.map((a) => ({ paymentDate: a.paymentDate, amount: a.amount })),
  }));
}

export interface LeaseForOverdue {
  id: number;
  startDate: string;
  endDate: string | null;
  billingCycle: string | null;
  rentAmount?: string | number | null;
  currencyId?: number | null;
  currencyDecimals?: number | null;
  rentProrationEnabled?: boolean | number | null;
  nextInvoiceDate?: string | null;
  /** Renseigne = bail « flagge » : lecteurs bascules sur l'etat impute. */
  allocationLedgerAt?: unknown;
}

export interface LeaseOverdueEntry {
  stats: LeaseOverdueStats;
  /** Present seulement pour les baux au prorata (ou flagges avec echeance future). */
  next: LeaseNextDue | null;
  /** Bail flagge : etat impute par echeance + nb d'echeances ouvertes. */
  ledger?: LeaseDueState & { openDueCount: number };
}

/**
 * Stats de retard de plusieurs baux en une requete paiements (pas de N+1).
 * `today` = date-only UTC (minuit).
 */
export async function loadOverdueByLease(
  db: Database,
  orgId: number,
  graceDays: number,
  leases: LeaseForOverdue[],
  today: Date,
): Promise<Map<number, LeaseOverdueEntry>> {
  const out = new Map<number, LeaseOverdueEntry>();
  if (!leases.length) return out;
  const todayStr = formatDateOnly(today);
  const flaggedLeases = leases.filter((l) => isLeaseFlagged(l));
  if (flaggedLeases.length) {
    const states = await loadFlaggedDueStates(db, orgId, flaggedLeases, today, graceDays);
    for (const l of flaggedLeases) {
      const st = states.get(l.id)!;
      const f = flaggedStatsFromState(st, today, graceDays, !!l.rentProrationEnabled);
      out.set(l.id, { stats: f.stats, next: f.next, ledger: { ...st, openDueCount: f.openDueCount } });
    }
    leases = leases.filter((l) => !isLeaseFlagged(l));
    if (!leases.length) return out;
  }
  const payments = await db
    .select({
      leaseId: realEstateRentPayments.leaseId,
      paymentDate: realEstateRentPayments.paymentDate,
      amount: realEstateRentPayments.amount,
    })
    .from(realEstateRentPayments)
    .where(and(
      inArray(realEstateRentPayments.leaseId, leases.map((l) => l.id)),
      eq(realEstateRentPayments.organizationId, orgId),
      eq(realEstateRentPayments.status, "paid"),
    ))
    .orderBy(realEstateRentPayments.paymentDate);

  const byLease = new Map<number, Array<{ date: string; amount: number }>>();
  for (const p of payments) {
    const list = byLease.get(p.leaseId) ?? [];
    list.push({ date: p.paymentDate, amount: Number(p.amount || 0) });
    byLease.set(p.leaseId, list);
  }

  // Decimales des devises, uniquement si au moins un bail est au prorata.
  const decimalsByCurrency = new Map<number, number>();
  const currencyIds = [...new Set(
    leases.filter((l) => l.rentProrationEnabled && l.currencyId && l.currencyDecimals == null).map((l) => Number(l.currencyId)),
  )];
  if (currencyIds.length) {
    const cur = await db
      .select({ id: currencies.id, d: currencies.decimalPlaces })
      .from(currencies)
      .where(inArray(currencies.id, currencyIds));
    for (const c of cur) {
      const d = c.d == null ? NaN : Number(c.d);
      decimalsByCurrency.set(Number(c.id), Number.isInteger(d) && d >= 0 && d <= 6 ? d : 2);
    }
  }

  for (const l of leases) {
    const leasePayments = byLease.get(l.id) ?? [];
    if (l.rentProrationEnabled) {
      const dec = l.currencyDecimals == null ? NaN : Number(l.currencyDecimals);
      const decimals = Number.isInteger(dec) && dec >= 0 && dec <= 6 ? dec : (decimalsByCurrency.get(Number(l.currencyId)) ?? 2);
      const paidTotal = leasePayments.reduce((s, p) => s + p.amount, 0);
      const schedule = scheduleForLease(l, decimals, paidTotal, todayStr);
      const base = computeProratedOverdueStats(schedule, leasePayments, today, graceDays, decimals);
      const next = computeLeaseNextDue(l, leasePayments.map((p) => p.amount), decimals, todayStr);
      out.set(l.id, {
        stats: {
          ...base,
          overdueDays: base.overdueDueDate ? daysSince(base.overdueDueDate, today) : 0,
          graceDays,
        },
        next,
      });
    } else {
      out.set(l.id, {
        stats: computeLeaseOverdueStats(
          l.startDate, l.endDate, l.billingCycle, leasePayments,
          Number(l.rentAmount || 0), today, graceDays,
        ),
        next: null,
      });
    }
  }
  return out;
}

export interface PortalLeaseOverdue {
  isOverdue: boolean;
  overdueDueDate: string | null;
  overdueDays: number;
  unpaidCount: number;
  graceDays: number;
}

/** Champs additifs de retard par bail pour les portails (grace de l'org du token). */
export async function loadPortalOverdueByLease(
  db: Database,
  orgId: number,
  leases: LeaseForOverdue[],
): Promise<{ graceDays: number; today: Date; byLease: Map<number, PortalLeaseOverdue>; nextDue: Map<number, LeaseNextDue>; ledger: Map<number, LeaseDueState & { openDueCount: number }> }> {
  const graceDays = await readOverdueGraceDays(db, orgId);
  const today = parseDateOnly(formatDateOnly(new Date()));
  const entries = await loadOverdueByLease(db, orgId, graceDays, leases, today);
  const byLease = new Map<number, PortalLeaseOverdue>();
  const nextDue = new Map<number, LeaseNextDue>();
  const ledger = new Map<number, LeaseDueState & { openDueCount: number }>();
  const todayStr = formatDateOnly(today);
  for (const l of leases) {
    const e = entries.get(l.id);
    nextDue.set(l.id, e?.next ?? computeLeaseNextDue(l, [], 2, todayStr));
    if (e?.ledger) ledger.set(l.id, e.ledger);
  }
  for (const [id, e] of entries) {
    byLease.set(id, {
      isOverdue: e.stats.isOverdue,
      overdueDueDate: e.stats.overdueDueDate,
      overdueDays: e.stats.overdueDays,
      unpaidCount: e.stats.unpaidCount,
      graceDays,
    });
  }
  return { graceDays, today, byLease, nextDue, ledger };
}

/** Champs additifs par paiement : seules les echeances 'pending' peuvent etre en retard. */
export function paymentOverdueFields(
  status: string | null | undefined,
  paymentDate: string,
  today: Date,
  graceDays: number,
): { isOverdue: boolean; daysPastDue: number } {
  if (status !== "pending" || !paymentDate) return { isOverdue: false, daysPastDue: 0 };
  return {
    isOverdue: isPastGrace(paymentDate, today, graceDays),
    daysPastDue: daysSince(paymentDate, today),
  };
}

/** Format monetaire unique des SMS : separateur de milliers, decimales si non entier, devise de la DB. */
/**
 * Devise d'un montant envoye par SMS/email : celle du bail, sinon la devise par
 * defaut de l'organisation (Reglages, appSetting.currencyId) — meme regle que
 * l'ecran Loyers. Un montant n'est jamais affiche sans devise.
 */
export async function resolveCurrencySymbol(db: Database, orgId: number, symbol?: string | null): Promise<string> {
  if (symbol && symbol.trim()) return symbol;
  const row = await readOrgAppSetting(db, orgId, { currencyId: appSettings.currencyId });
  if (!row?.currencyId) return "";
  const [c] = await db
    .select({ symbol: currencies.currencySymbol, code: currencies.currencyCode })
    .from(currencies)
    .where(eq(currencies.id, Number(row.currencyId)))
    .limit(1);
  return (c?.symbol || c?.code || "").trim();
}

export function formatMoneyFr(amount: unknown, symbol?: string | null): string {
  const n = Number(amount ?? 0);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    : String(amount ?? "");
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/** Echeance echue non soldee, pour le preavis (montant reclame = reste). */
export interface NoticeDueLine {
  periodStart: string;
  periodEnd: string | null;
  dueDate: string;
  amount: number;
  remaining: number;
  prorated: boolean;
}

/**
 * Couverture sequentielle (plus anciennes d'abord) des echeances par le total verse :
 * bail non flagge, sans imputation par echeance.
 */
export function coverDuesSequentially(
  periods: Array<{ periodStart: string; periodEnd: string | null; dueDate: string; amount: number; prorated: boolean }>,
  paidTotal: number,
  decimals: number,
): NoticeDueLine[] {
  let left = Math.max(0, paidTotal);
  return periods.map((p) => {
    const used = Math.min(left, p.amount);
    left = roundMoney(left - used, decimals);
    return { ...p, remaining: Math.max(0, roundMoney(p.amount - used, decimals)) };
  });
}

/**
 * Preavis : seules les echeances dont la grace est depassee sont reclamees (late) ;
 * celles echues mais encore dans la grace sont mentionnees a titre d'information.
 */
export function splitNoticeDues(lines: NoticeDueLine[], today: Date, graceDays: number, decimals: number) {
  const todayStr = formatDateOnly(today);
  const open = lines.filter((l) => l.dueDate <= todayStr && l.remaining > 0);
  const late = open.filter((l) => isPastGrace(l.dueDate, today, graceDays));
  const inGrace = open.filter((l) => !isPastGrace(l.dueDate, today, graceDays));
  const sum = (xs: NoticeDueLine[]) => roundMoney(xs.reduce((s, l) => s + l.remaining, 0), decimals);
  return { late, inGrace, lateTotal: sum(late), inGraceTotal: sum(inGrace) };
}

/** Libelle de periode : « juillet 2026 (du 07/07 au 31/07, prorata) » ou « aout 2026 ». */
export function noticePeriodLabel(l: NoticeDueLine): string {
  const d = parseDateOnly(l.periodStart);
  const month = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
  if (!l.prorated) return month;
  const dm = (s: string) => parseDateOnly(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return l.periodEnd ? `${month} (du ${dm(l.periodStart)} au ${dm(l.periodEnd)}, prorata)` : `${month} (prorata)`;
}

/**
 * Total du (= « Reste a payer » de la carte Loyers) d'un bail a la date du jour,
 * pret pour {amount} : « 4 645,16 $ ». Charge les paiements regles.
 */
export async function loadLeaseTotalDue(
  db: Database,
  orgId: number,
  lease: LeaseForOverdue,
  currencySymbol?: string | null,
  now: Date = new Date(),
): Promise<{ value: number; text: string }> {
  if (isLeaseFlagged(lease)) {
    const graceDays = await readOverdueGraceDays(db, orgId);
    const today = parseDateOnly(formatDateOnly(now));
    const st = (await loadFlaggedDueStates(db, orgId, [lease], today, graceDays)).get(lease.id)!;
    return { value: st.totalDue, text: formatMoneyFr(st.totalDue, currencySymbol) };
  }
  const rows = await db
    .select({ amount: realEstateRentPayments.amount })
    .from(realEstateRentPayments)
    .where(and(
      eq(realEstateRentPayments.leaseId, lease.id),
      eq(realEstateRentPayments.organizationId, orgId),
      eq(realEstateRentPayments.status, "paid"),
    ));
  const paidTotal = (rows as Array<{ amount: unknown }>).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  let decimals = 2;
  if (lease.rentProrationEnabled) {
    const dec = lease.currencyDecimals == null ? NaN : Number(lease.currencyDecimals);
    if (Number.isInteger(dec) && dec >= 0 && dec <= 6) {
      decimals = dec;
    } else if (lease.currencyId) {
      const [c] = await db
        .select({ d: currencies.decimalPlaces })
        .from(currencies)
        .where(eq(currencies.id, Number(lease.currencyId)))
        .limit(1);
      const d = c?.d == null ? NaN : Number(c.d);
      if (Number.isInteger(d) && d >= 0 && d <= 6) decimals = d;
    }
  }
  const value = computeLeaseTotalDue(lease, paidTotal, decimals, now);
  return { value, text: formatMoneyFr(value, currencySymbol) };
}

/**
 * Montant cite par une RELANCE de retard (= « Retard » de la carte Loyers) :
 * reste du des seules echeances dont la grace est depassee. Une echeance encore
 * dans sa grace n'est pas « en retard » et n'y figure pas. Repli sur le total du
 * si rien n'est en retard (relance manuelle pendant la grace).
 */
export async function loadLeaseOverdueAmount(
  db: Database,
  orgId: number,
  lease: LeaseForOverdue,
  currencySymbol?: string | null,
  now: Date = new Date(),
): Promise<{ value: number; text: string; totalDue: { value: number; text: string } }> {
  const graceDays = await readOverdueGraceDays(db, orgId);
  const today = parseDateOnly(formatDateOnly(now));
  const [entry, totalDue] = await Promise.all([
    loadOverdueByLease(db, orgId, graceDays, [lease], today).then((m) => m.get(lease.id)),
    loadLeaseTotalDue(db, orgId, lease, currencySymbol, now),
  ]);
  // Jamais plus que le total du (sources differentes : on garde la plus prudente).
  const overdue = Math.min(entry?.stats.overdueAmount ?? 0, totalDue.value);
  return overdue > 0
    ? { value: overdue, text: formatMoneyFr(overdue, currencySymbol), totalDue }
    : { ...totalDue, totalDue };
}
