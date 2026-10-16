/**
 * Retard de loyer : source UNIQUE de la regle "en retard" = date d'echeance +
 * delai de grace (reglage org `rentOverdueGraceDays`) strictement depassee.
 * "Echue" = date d'echeance passee (grace ou non) ; "en retard" = echue ET
 * au-dela de la grace. Partage par baux/locataires, portails et dashboard.
 */
import { and, eq, inArray } from "drizzle-orm";
import { appSettings, currencies, realEstateRentPayments } from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import {
  addBillingCycle,
  formatDateOnly,
  parseDateOnly,
} from "./lease-schedule";
import {
  computeLeaseNextDue,
  computeLeaseTotalDue,
  computeProratedOverdueStats,
  scheduleForLease,
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
  // Chaque echeance est ancree sur `start` + N cycles (clamp fin de mois).
  let period = 0;
  let dueDate = start;

  while (dueDate.getTime() <= today.getTime() && (!boundary || dueDate.getTime() <= boundary.getTime())) {
    dueCount += 1;

    // Couverture par montants cumules : l'echeance N est couverte par le paiement
    // qui fait atteindre N loyers cumules (paiement groupe/avance couvre plusieurs).
    let coveringPayment: Date | null = null;
    let cumulated = 0;
    for (const p of payments) {
      cumulated += p.amount;
      if (cumulated + 0.0001 >= (period + 1) * unit) { coveringPayment = p.date; break; }
    }

    if (coveringPayment) {
      if (isPastGrace(dueDate, coveringPayment, graceDays)) lateCount += 1;
    } else if (isPastGrace(dueDate, today, graceDays)) {
      lateCount += 1;
      unpaidCount += 1;
      isOverdue = true;
      if (overdueDueDate === null) overdueDueDate = formatDateOnly(dueDate);
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
  };
}

/** Delai de grace de l'organisation (Reglages Domus) ; NULL/invalide = defaut. */
export async function readOverdueGraceDays(db: Database, orgId: number): Promise<number> {
  const row = await readOrgAppSetting(db, orgId, { days: appSettings.rentOverdueGraceDays });
  return normalizeGraceDays(row?.days);
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
}

export interface LeaseOverdueEntry {
  stats: LeaseOverdueStats;
  /** Present seulement pour les baux au prorata. */
  next: LeaseNextDue | null;
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
): Promise<{ graceDays: number; today: Date; byLease: Map<number, PortalLeaseOverdue>; nextDue: Map<number, LeaseNextDue> }> {
  const graceDays = await readOverdueGraceDays(db, orgId);
  const today = parseDateOnly(formatDateOnly(new Date()));
  const entries = await loadOverdueByLease(db, orgId, graceDays, leases, today);
  const byLease = new Map<number, PortalLeaseOverdue>();
  const nextDue = new Map<number, LeaseNextDue>();
  const todayStr = formatDateOnly(today);
  for (const l of leases) {
    const e = entries.get(l.id);
    nextDue.set(l.id, e?.next ?? computeLeaseNextDue(l, [], 2, todayStr));
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
  return { graceDays, today, byLease, nextDue };
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
export function formatMoneyFr(amount: unknown, symbol?: string | null): string {
  const n = Number(amount ?? 0);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
    : String(amount ?? "");
  return symbol ? `${formatted} ${symbol}` : formatted;
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
