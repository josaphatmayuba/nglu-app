/**
 * Echeancier de bail (module PUR : pas de DB, pas de Nest).
 * Dates 'YYYY-MM-DD' traitees en UTC. Les periodes sont ancrees sur startDate
 * + k cycles (jamais chainees) avec clamp fin de mois, comme addBillingCycle.
 */

export type LeaseBillingCycle = "monthly" | "quarterly" | "yearly" | "annual" | null | undefined;

export interface SchedulePeriod {
  index: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  days: number;
  periodDays: number;
  fullAmount: number;
  amount: number;
  prorated: boolean;
  ratio: number;
}

export interface BuildLeaseScheduleInput {
  startDate: string;
  endDate?: string | null;
  billingCycle?: LeaseBillingCycle;
  rentAmount: number;
  currencyDecimals?: number;
  horizonPeriods?: number;
}

const DAY_MS = 86_400_000;
const EPS = 0.005;

export function parseDateOnly(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) throw new Error(`Date invalide: ${value}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Arrondi commercial (demi vers le haut) a `decimals` decimales, sans artefact flottant. */
export function roundMoney(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const f = Math.pow(10, decimals);
  const s = Math.sign(value);
  return Math.round(Math.abs(value) * f + 1e-9) * s / f || 0;
}

export function cycleMonths(billingCycle?: string | null): number {
  const n = String(billingCycle || "monthly").toLowerCase();
  if (n === "yearly" || n === "annual") return 12;
  if (n === "quarterly") return 3;
  return 1;
}

/** Meme logique que PropertyManagementService.addBillingCycle (clamp fin de mois). */
export function addBillingCycle(value: Date, billingCycle?: string | null, periods = 1): Date {
  const next = new Date(value.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + cycleMonths(billingCycle) * periods);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

/**
 * Longueur (jours) de la periode complete qui commence a `periodStart`, calculee
 * depuis l'ancre `anchorStart` (startDate du bail) comme buildLeaseSchedule
 * (jamais chainee : un debut le 31 donne Feb28 -> Mar31 = 31 j).
 */
export function anchoredPeriodDays(anchorStart: string, billingCycle: string | null | undefined, periodStart: string): number {
  const a = parseDateOnly(anchorStart);
  const s = parseDateOnly(periodStart);
  const months = (s.getUTCFullYear() - a.getUTCFullYear()) * 12 + (s.getUTCMonth() - a.getUTCMonth());
  const k = Math.max(0, Math.round(months / cycleMonths(billingCycle)));
  return diffDays(addBillingCycle(a, billingCycle, k), addBillingCycle(a, billingCycle, k + 1));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function buildLeaseSchedule(input: BuildLeaseScheduleInput): SchedulePeriod[] {
  const decimals = input.currencyDecimals ?? 2;
  const horizon = input.horizonPeriods ?? 12;
  const rent = Number(input.rentAmount) || 0;
  const start = parseDateOnly(input.startDate);
  const end = input.endDate ? parseDateOnly(input.endDate) : null;
  const cycle = input.billingCycle;
  const fullAmount = roundMoney(rent, decimals);
  const out: SchedulePeriod[] = [];

  for (let k = 0; ; k++) {
    if (!end && k >= horizon) break;
    const pStart = addBillingCycle(start, cycle, k);
    // Un bail finissant le jour anniversaire (ou avant) ne facture pas ce mois-la.
    // Exception : bail d'un seul jour (fin == debut) -> au moins 1 echeance (comme l'ancien code).
    const oneDayLease = !!end && k === 0 && end.getTime() === start.getTime();
    if (end && ((pStart.getTime() >= end.getTime() && !oneDayLease) || k > 1200)) break;
    const nextStart = addBillingCycle(start, cycle, k + 1);
    const theoreticalEnd = new Date(nextStart.getTime() - DAY_MS);
    const periodDays = diffDays(pStart, nextStart);
    let pEnd = theoreticalEnd;
    let days = periodDays;
    let prorated = false;
    if (end && end.getTime() < theoreticalEnd.getTime()) {
      pEnd = end;
      days = diffDays(pStart, end) + 1;
      prorated = true;
    }
    const amount = prorated ? roundMoney((fullAmount * days) / periodDays, decimals) : fullAmount;
    out.push({
      index: k,
      periodStart: formatDateOnly(pStart),
      periodEnd: formatDateOnly(pEnd),
      dueDate: formatDateOnly(pStart),
      days,
      periodDays,
      fullAmount,
      amount,
      prorated,
      ratio: prorated ? days / periodDays : 1,
    });
  }
  return out;
}

export interface CoverageResult {
  coveredCount: number;
  coveredUntil: string | null;
  firstUncovered: SchedulePeriod | null;
  nextDueDate: string | null;
  nextDueAmount: number;
  totalDueThrough: (asOfDate: string) => number;
  balance: number;
  credit: number;
}

export function applyCoverage(
  schedule: SchedulePeriod[],
  paidAmounts: Array<number | { amount: number }>,
  asOfDate: string,
  decimals = 2,
): CoverageResult {
  const paid = roundMoney(
    (paidAmounts || []).reduce<number>((s, p) => s + (Number(typeof p === "number" ? p : p?.amount) || 0), 0),
    decimals,
  );
  let cumul = 0;
  let coveredCount = 0;
  let firstUncovered: SchedulePeriod | null = null;
  let nextDueAmount = 0;
  for (const p of schedule) {
    cumul = roundMoney(cumul + p.amount, decimals);
    if (!firstUncovered && paid + EPS >= cumul) {
      coveredCount++;
    } else if (!firstUncovered) {
      firstUncovered = p;
      nextDueAmount = roundMoney(cumul - paid, decimals);
    }
  }
  const totalDueThrough = (asOf: string) =>
    roundMoney(
      schedule.filter((p) => p.dueDate <= asOf).reduce((s, p) => s + p.amount, 0),
      decimals,
    );
  const dueNow = totalDueThrough(asOfDate);
  return {
    coveredCount,
    coveredUntil: coveredCount > 0 ? schedule[coveredCount - 1].periodEnd : null,
    firstUncovered,
    nextDueDate: firstUncovered ? firstUncovered.dueDate : null,
    nextDueAmount,
    totalDueThrough,
    balance: Math.max(0, roundMoney(dueNow - paid, decimals)),
    credit: Math.max(0, roundMoney(paid - dueNow, decimals)),
  };
}
