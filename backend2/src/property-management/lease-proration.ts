/**
 * Calculs PURS autour du prorata de loyer (opt-in par bail) : prochaine
 * echeance, retards par periode, plan de realignement des echeances pending.
 * Aucun acces DB / Nest : le service charge les donnees et applique le plan.
 */
import {
  addBillingCycle,
  applyCoverage,
  buildLeaseSchedule,
  cycleMonths,
  formatDateOnly,
  parseDateOnly,
  roundMoney,
  type SchedulePeriod,
} from "./lease-schedule";

export interface ProrationLease {
  rentProrationEnabled?: boolean | number | null;
  startDate: string;
  endDate?: string | null;
  billingCycle?: string | null;
  rentAmount?: string | number | null;
  nextInvoiceDate?: string | null;
  /** Bail 'ended' : le total du est plafonne a la sortie (terminationDate ?? endDate). */
  status?: string | null;
  terminationDate?: string | null;
  /** 0/false = mois de sortie au prorata des jours occupes ; absent/1 = periode complete (historique). */
  terminationFullPeriod?: boolean | number | null;
}

export interface LeaseNextDue {
  rentProrationEnabled: boolean;
  nextDueDate: string | null;
  nextDueAmount: number;
  isProratedNext: boolean;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** Echeancier d'un bail avec un horizon suffisant (bail sans fin : jusqu'a aujourd'hui + marge). */
export function scheduleForLease(
  lease: ProrationLease,
  decimals: number,
  paidTotal: number,
  todayStr: string,
  extraPeriods = 3,
): SchedulePeriod[] {
  const rent = Number(lease.rentAmount) || 0;
  const cm = cycleMonths(lease.billingCycle);
  const elapsed = Math.max(0, Math.floor(monthsBetween(parseDateOnly(lease.startDate), parseDateOnly(todayStr)) / cm)) + 1;
  const paidPeriods = rent > 0 ? Math.ceil(paidTotal / rent) : 0;
  const horizon = Math.min(1200, Math.max(12, elapsed + extraPeriods, paidPeriods + extraPeriods));
  return buildLeaseSchedule({
    startDate: lease.startDate,
    endDate: lease.endDate ?? null,
    billingCycle: lease.billingCycle as any,
    rentAmount: rent,
    currencyDecimals: decimals,
    horizonPeriods: horizon,
  });
}

export function computeLeaseNextDue(
  lease: ProrationLease,
  paidAmounts: number[],
  decimals: number,
  todayStr: string,
): LeaseNextDue {
  if (!lease.rentProrationEnabled) {
    return {
      rentProrationEnabled: false,
      nextDueDate: lease.nextInvoiceDate ?? null,
      nextDueAmount: Number(lease.rentAmount) || 0,
      isProratedNext: false,
    };
  }
  const paidTotal = paidAmounts.reduce((s, a) => s + (Number(a) || 0), 0);
  const schedule = scheduleForLease(lease, decimals, paidTotal, todayStr);
  const cov = applyCoverage(schedule, paidAmounts, todayStr, decimals);
  return {
    rentProrationEnabled: true,
    nextDueDate: cov.nextDueDate,
    nextDueAmount: cov.firstUncovered ? cov.nextDueAmount : 0,
    isProratedNext: cov.firstUncovered ? cov.firstUncovered.prorated : false,
  };
}

/**
 * TOTAL DU = meme valeur que « Reste a payer » de la carte Loyers : somme des
 * echeances echues (mois courant inclus) moins tout ce qui a ete verse, plancher 0.
 * Source UNIQUE du {amount} des SMS/emails de retard (locataire, contact,
 * proprietaire, delegue) et du preavis de defaut.
 * - prorata : somme des montants de periode de l'echeancier (1re periode partielle) ;
 * - sinon : (mois ecoules depuis le debut, mois courant inclus) x loyer.
 */
export function computeLeaseTotalDue(
  lease: ProrationLease,
  paidTotal: number,
  decimals: number,
  now: Date,
): number {
  const paid = Number(paidTotal) || 0;
  const cutoff = leaseEndedCutoff(lease);
  const realToday = formatDateOnly(now);
  const capped = cutoff !== null && cutoff <= realToday;
  if (lease.rentProrationEnabled) {
    const todayStr = capped ? (cutoff as string) : realToday;
    const schedule = scheduleForLease(lease, decimals, paid, todayStr);
    return applyCoverage(schedule, [paid], todayStr, decimals).balance;
  }
  const rent = Number(lease.rentAmount) || 0;
  if (capped) {
    // Bail termine : meme regle partout (anciens debiteurs, apercu caution, trop-percu).
    return Math.max(0, Math.round((terminationPeriodCharge(lease, cutoff as string, rent, 2).charge - paid) * 100) / 100);
  }
  const start = parseDateOnly(lease.startDate);
  const elapsedPast = Math.max(0, (now.getFullYear() - start.getUTCFullYear()) * 12 + (now.getMonth() - start.getUTCMonth()));
  return Math.max(0, Math.round(((elapsedPast + 1) * rent - paid) * 100) / 100);
}

/** Vrai si la resiliation de ce bail facture la periode de sortie au prorata (colonne explicitement a 0). */
export function isTerminationProrated(lease: { terminationFullPeriod?: boolean | number | null }): boolean {
  const v = lease.terminationFullPeriod;
  return v !== undefined && v !== null && (v === false || Number(v) === 0);
}

export interface ExitMonthProration {
  occupiedDays: number;
  periodDays: number;
  fullAmount: number;
  amount: number;
  reduction: number;
  periodStart: string;
  periodEnd: string;
}

/**
 * Periode de facturation (ancree sur startDate + k cycles, comme la couverture des echeances)
 * qui contient `day` : debut = dernier addBillingCycle(start, cycle, k) <= day ; fin = le suivant - 1 jour.
 * k = index 0-based de la periode. SOURCE UNIQUE des calculs de sortie au prorata.
 */
export function anchoredExitPeriod(startDate: string, billingCycle: string | null | undefined, day: string) {
  const start = parseDateOnly(startDate);
  const d = parseDateOnly(day);
  let k = Math.max(0, Math.floor(monthsBetween(start, d) / cycleMonths(billingCycle)));
  while (addBillingCycle(start, billingCycle, k + 1).getTime() <= d.getTime()) k++;
  while (k > 0 && addBillingCycle(start, billingCycle, k).getTime() > d.getTime()) k--;
  const ps = addBillingCycle(start, billingCycle, k);
  const next = addBillingCycle(start, billingCycle, k + 1);
  const DAY = 86_400_000;
  return {
    k,
    periodStart: formatDateOnly(ps),
    periodEnd: formatDateOnly(new Date(next.getTime() - DAY)),
    periodDays: Math.round((next.getTime() - ps.getTime()) / DAY),
    occupiedDays: Math.max(0, Math.round((d.getTime() - ps.getTime()) / DAY) + 1),
  };
}

/**
 * Prorata de la periode de sortie d'un loyer fixe : loyer x jours occupes (debut de periode ancree ->
 * sortie incluse) / jours de la periode. null si la sortie couvre la periode entiere ou si le prorata
 * n'est pas demande.
 */
export function exitMonthProration(
  lease: { startDate: string; billingCycle?: string | null; terminationFullPeriod?: boolean | number | null },
  cutoff: string,
  rent: number,
  decimals: number,
): ExitMonthProration | null {
  if (!isTerminationProrated(lease)) return null;
  const p = anchoredExitPeriod(String(lease.startDate).slice(0, 10), lease.billingCycle, cutoff);
  if (p.occupiedDays >= p.periodDays || p.occupiedDays < 1) return null;
  const amount = roundMoney((rent * p.occupiedDays) / p.periodDays, decimals);
  return {
    occupiedDays: p.occupiedDays, periodDays: p.periodDays, fullAmount: roundMoney(rent, decimals), amount,
    reduction: roundMoney(rent - amount, decimals), periodStart: p.periodStart, periodEnd: p.periodEnd,
  };
}

/**
 * Total facture d'un bail a loyer fixe sorti le `cutoff` (avant versements).
 * - prorata (terminationFullPeriod = 0) : periodes ancrees jusqu'a la sortie, la derniere au prorata ;
 * - sinon (historique) : mois civils depuis le debut, mois de sortie inclus, en entier.
 */
export function terminationPeriodCharge(
  lease: { startDate: string; billingCycle?: string | null; terminationFullPeriod?: boolean | number | null },
  cutoff: string,
  rent: number,
  decimals: number,
): { periods: number; exit: ExitMonthProration | null; charge: number } {
  if (isTerminationProrated(lease)) {
    const p = anchoredExitPeriod(String(lease.startDate).slice(0, 10), lease.billingCycle, cutoff);
    const exit = exitMonthProration(lease, cutoff, rent, decimals);
    return { periods: p.k + 1, exit, charge: roundMoney((p.k + 1) * rent - (exit ? exit.reduction : 0), decimals) };
  }
  const months = Math.max(0, monthsBetween(parseDateOnly(lease.startDate), parseDateOnly(cutoff))) + 1;
  return { periods: months, exit: null, charge: roundMoney(months * rent, decimals) };
}

/**
 * Total facture d'un bail resilie a la date `day` (non plafonne par les versements) : meme regle
 * que computeLeaseTotalDue. Sert a mesurer un trop-percu : max(0, verse - charge).
 */
export function computeTerminationCharge(
  lease: ProrationLease & { terminationFullPeriod?: boolean | number | null },
  day: string,
  decimals: number,
): number {
  const rent = Number(lease.rentAmount) || 0;
  if (lease.rentProrationEnabled) {
    const end = lease.endDate && String(lease.endDate).slice(0, 10) < day ? String(lease.endDate).slice(0, 10) : day;
    const schedule = buildLeaseSchedule({
      startDate: lease.startDate,
      endDate: end,
      billingCycle: lease.billingCycle as any,
      rentAmount: rent,
      currencyDecimals: decimals,
      horizonPeriods: 12,
    });
    return roundMoney(schedule.reduce((s, p) => s + p.amount, 0), decimals);
  }
  return terminationPeriodCharge(lease, day, rent, decimals).charge;
}

export interface TerminationDueRow {
  id: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  paymentDate: string;
  amount: number;
  taxAmount?: number | null;
}

export interface TerminationRowProration {
  rowId: number;
  periodStart: string;
  periodEnd: string;
  occupiedDays: number;
  periodDays: number;
  initialAmount: number;
  amount: number;
  initialTax: number | null;
  tax: number | null;
}

/**
 * Echeance dont la periode CONTIENT le jour de sortie (periodStart <= jour <= periodEnd) et son
 * montant au prorata : montant x jours occupes (debut de periode -> sortie incluse) / jours de la
 * periode de la ligne. Periode sans periodEnd : un cycle de facturation depuis son debut.
 * Arrondi a `decimals` (centimes), jamais a l'unite. null si aucune ligne ou sortie = fin de periode.
 */
export function planTerminationProration(
  rows: TerminationDueRow[],
  day: string,
  billingCycle: string | null | undefined,
  decimals: number,
): TerminationRowProration | null {
  const dayD = parseDateOnly(day);
  let best: { row: TerminationDueRow; s: Date; e: Date } | null = null;
  for (const row of rows) {
    const sStr = String(row.periodStart || row.paymentDate || "").slice(0, 10);
    if (!sStr) continue;
    const s = parseDateOnly(sStr);
    if (s.getTime() > dayD.getTime()) continue;
    const e = row.periodEnd
      ? parseDateOnly(String(row.periodEnd))
      : new Date(addBillingCycle(s, billingCycle, 1).getTime() - 86_400_000);
    if (e.getTime() < dayD.getTime()) continue;
    if (!best || s.getTime() > best.s.getTime()) best = { row, s, e };
  }
  if (!best) return null;
  const DAY = 86_400_000;
  const periodDays = Math.round((best.e.getTime() - best.s.getTime()) / DAY) + 1;
  const occupiedDays = Math.round((dayD.getTime() - best.s.getTime()) / DAY) + 1;
  if (occupiedDays >= periodDays || occupiedDays < 1) return null;
  const initialAmount = Number(best.row.amount) || 0;
  const initialTax = best.row.taxAmount == null ? null : Number(best.row.taxAmount) || 0;
  return {
    rowId: best.row.id,
    periodStart: formatDateOnly(best.s),
    periodEnd: formatDateOnly(best.e),
    occupiedDays,
    periodDays,
    initialAmount,
    amount: roundMoney((initialAmount * occupiedDays) / periodDays, decimals),
    initialTax,
    tax: initialTax === null ? null : roundMoney((initialTax * occupiedDays) / periodDays, decimals),
  };
}

/** Date de sortie (YYYY-MM-DD) d'un bail 'ended' ; null si le bail n'est pas termine. */
export function leaseEndedCutoff(lease: { status?: string | null; terminationDate?: string | null; endDate?: string | null }): string | null {
  if (lease.status !== "ended") return null;
  const d = lease.terminationDate || lease.endDate;
  return d ? String(d).slice(0, 10) : null;
}

export interface OverdueStats {
  lateCount: number;
  unpaidCount: number;
  dueCount: number;
  lateRatio: number;
  isOverdue: boolean;
  overdueDueDate: string | null;
  /**
   * Retards graves (badge « Mauvais payeur ») : echeance soldee — ou toujours
   * impayee — apres la grace de l'echeance SUIVANTE (ex. septembre paye en novembre).
   * Un retard rattrape avant l'echeance suivante + grace n'en est pas un.
   */
  severeLateCount: number;
  /** Retards graves dont l'echeance date des 12 derniers mois (fenetre glissante). */
  recentSevereLateCount: number;
  /** Echeances echues des 12 derniers mois (denominateur du ratio recent). */
  recentDueCount: number;
  /**
   * Echeances consecutives les plus recentes reglees dans la grace (« mois a jour
   * d'affilee ») ; une echeance encore dans sa grace est neutre.
   */
  onTimeStreak: number;
  /** Reste du des echeances dont la grace est depassee (montant en retard). */
  overdueAmount: number;
  /** Reste du des echeances echues mais encore dans la grace. */
  graceDueAmount: number;
}

/** Une echeance echue vue par le badge : date, echeance suivante, date de solde (null = ouverte ou sans date). */
export interface DueBehaviourRecord {
  dueDate: Date;
  nextDue: Date;
  settledAt: Date | null;
  open: boolean;
}

export const BEHAVIOUR_WINDOW_MONTHS = 12;

/**
 * Comportement de paiement (badge « Mauvais payeur » / « En amelioration ») :
 * retard grave = solde (ou toujours ouvert) apres la grace de l'echeance suivante.
 */
export function paymentBehaviour(records: DueBehaviourRecord[], today: Date, graceDays: number) {
  const after = (base: Date, at: Date) => {
    const lim = new Date(base.getTime());
    lim.setUTCDate(lim.getUTCDate() + graceDays);
    return at.getTime() > lim.getTime();
  };
  const windowStart = addBillingCycle(today, "monthly", -BEHAVIOUR_WINDOW_MONTHS);
  let severeLateCount = 0;
  let recentSevereLateCount = 0;
  let recentDueCount = 0;
  for (const r of records) {
    const recent = r.dueDate.getTime() >= windowStart.getTime();
    if (recent) recentDueCount += 1;
    const at = r.open ? today : r.settledAt;
    if (at && after(r.nextDue, at)) {
      severeLateCount += 1;
      if (recent) recentSevereLateCount += 1;
    }
  }
  let onTimeStreak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.open) {
      if (!after(r.dueDate, today)) continue; // encore dans sa grace : neutre
      break;
    }
    if (r.settledAt && after(r.dueDate, r.settledAt)) break;
    onTimeStreak += 1;
  }
  return { severeLateCount, recentSevereLateCount, recentDueCount, onTimeStreak };
}

/**
 * Meme logique que computeLeaseOverdueStats (couverture par montants cumules,
 * delai de grace) mais le montant du par periode est celui de l'echeancier.
 */
export function computeProratedOverdueStats(
  schedule: SchedulePeriod[],
  paymentRows: Array<{ date: string; amount: number }>,
  today: Date,
  graceDays: number,
  decimals: number,
): OverdueStats {
  let dueCount = 0;
  let lateCount = 0;
  let unpaidCount = 0;
  let isOverdue = false;
  let overdueDueDate: string | null = null;
  const records: DueBehaviourRecord[] = [];
  let overdueAmount = 0;
  let graceDueAmount = 0;
  let cumulDue = 0;
  const paidTotal = paymentRows.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  for (let i = 0; i < schedule.length; i++) {
    const period = schedule[i];
    const dueDate = parseDateOnly(period.dueDate);
    if (dueDate.getTime() > today.getTime()) break;
    dueCount += 1;
    const prevCumul = cumulDue;
    cumulDue = roundMoney(cumulDue + period.amount, decimals);
    const remaining = Math.max(0, Math.min(period.amount, roundMoney(cumulDue - Math.max(prevCumul, paidTotal), decimals)));
    // Grace de l'echeance suivante : periode i+1 (l'echeancier deborde toujours d'au moins une periode).
    const nextDue = schedule[i + 1] ? parseDateOnly(schedule[i + 1].dueDate) : addBillingCycle(dueDate, "monthly", 1);
    let coveringPayment: Date | null = null;
    let cumulated = 0;
    for (const p of paymentRows) {
      cumulated += Number(p.amount) || 0;
      if (cumulated + 0.005 >= cumulDue) {
        coveringPayment = parseDateOnly(p.date);
        break;
      }
    }
    const graceLimit = new Date(dueDate.getTime());
    graceLimit.setUTCDate(graceLimit.getUTCDate() + graceDays);
    records.push({ dueDate, nextDue, settledAt: coveringPayment, open: !coveringPayment });
    if (coveringPayment) {
      if (coveringPayment.getTime() > graceLimit.getTime()) lateCount += 1;
    } else if (today.getTime() > graceLimit.getTime()) {
      lateCount += 1;
      unpaidCount += 1;
      isOverdue = true;
      if (overdueDueDate === null) overdueDueDate = period.dueDate;
    }
    if (!coveringPayment) {
      if (today.getTime() > graceLimit.getTime()) overdueAmount = roundMoney(overdueAmount + remaining, decimals);
      else graceDueAmount = roundMoney(graceDueAmount + remaining, decimals);
    }
  }
  return {
    lateCount,
    unpaidCount,
    dueCount,
    lateRatio: dueCount > 0 ? lateCount / dueCount : 0,
    isOverdue,
    overdueDueDate,
    ...paymentBehaviour(records, today, graceDays),
    overdueAmount,
    graceDueAmount,
  };
}

// ─── Plan de realignement des echeances ────────────────────────────────────

export interface RealignRow {
  id: number;
  status: string;
  paymentDate: string;
  amount: string | number;
  transactionId?: number | null;
  proofUrl?: string | null;
  proofUploadCount?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export type RealignActionKind = "update" | "keep" | "aligned" | "void" | "untouched";

export interface RealignAction {
  rowId: number;
  action: RealignActionKind;
  /** Valeurs a ecrire (null si aucune ecriture). */
  proposed: { paymentDate: string; amount: number; periodStart: string; periodEnd: string } | null;
  /** Periode (index de l'echeancier) rattachee, si trouvee. */
  periodIndex: number | null;
}

const monthKey = (d: string) => String(d).slice(0, 7);

/**
 * Periodes couvertes par les lignes 'paid' : par periodStart quand il existe
 * (et correspond a l'echeancier), sinon par couverture cumulee (ordre de date)
 * sur les premieres periodes restantes.
 */
export function assignPaidRows(
  schedule: SchedulePeriod[],
  paidRows: Array<{ id: number; paymentDate: string; amount: string | number; periodStart?: string | null }>,
  decimals: number,
): { taken: Set<number>; byRow: Map<number, number | null> } {
  const taken = new Set<number>();
  const byRow = new Map<number, number | null>();
  const cumulative: typeof paidRows = [];
  for (const r of paidRows) {
    const ps = r.periodStart ? String(r.periodStart).slice(0, 10) : null;
    const p = ps ? schedule.find((s) => !taken.has(s.index) && s.periodStart === ps) : null;
    if (p) {
      taken.add(p.index);
      byRow.set(r.id, p.index);
    } else {
      cumulative.push(r);
    }
  }
  cumulative.sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)) || a.id - b.id);
  const remaining = schedule.filter((s) => !taken.has(s.index));
  let paid = 0;
  let count = 0;
  let cumulDue = 0;
  for (const r of cumulative) {
    paid = roundMoney(paid + (Number(r.amount) || 0), decimals);
    while (count < remaining.length) {
      const next = roundMoney(cumulDue + remaining[count].amount, decimals);
      if (paid + 0.005 >= next) {
        cumulDue = next;
        count++;
      } else break;
    }
    byRow.set(r.id, count > 0 ? remaining[count - 1].index : null);
  }
  for (let i = 0; i < count; i++) taken.add(remaining[i].index);
  return { taken, byRow };
}

/**
 * Rattache chaque ligne a une periode : par periodStart, sinon par mois
 * calendaire (YYYY-MM) de la date de la ligne vs date d'echeance de la periode.
 * - paid / pending avec transaction : jamais modifiees ('untouched').
 * - pending sans transaction : mise a jour date/montant/period_* ; avec
 *   justificatif : montant et date conservees, seulement period_* ('keep') ;
 *   sans periode correspondante : 'void' (ou 'keep' si justificatif).
 */
export function planProrationRealign(
  schedule: SchedulePeriod[],
  rows: RealignRow[],
  decimals: number,
): RealignAction[] {
  const taken = new Set<number>();
  const result = new Map<number, RealignAction>();

  const findPeriod = (row: RealignRow): SchedulePeriod | null => {
    if (row.periodStart) {
      const byStart = schedule.find((p) => !taken.has(p.index) && p.periodStart === String(row.periodStart).slice(0, 10));
      if (byStart) return byStart;
    }
    const mk = monthKey(row.paymentDate);
    return schedule.find((p) => !taken.has(p.index) && monthKey(p.dueDate) === mk) ?? null;
  };

  const frozen = (r: RealignRow) => r.status !== "pending" || !!r.transactionId;

  // Lignes 'paid' : jamais rattachees par le MOIS de leur date de paiement reelle
  // (un loyer de janvier peut etre paye en fevrier) mais par periodStart, sinon
  // par couverture cumulee sur les premieres periodes libres.
  const frozenRows = rows.filter(frozen);
  const paidRows = frozenRows.filter((r) => r.status === "paid");
  const paidAssign = assignPaidRows(schedule, paidRows, decimals);
  for (const i of paidAssign.taken) taken.add(i);

  for (const row of frozenRows) {
    let idx: number | null = null;
    if (row.status === "paid") {
      idx = paidAssign.byRow.get(row.id) ?? null;
    } else {
      const p = findPeriod(row);
      if (p) {
        taken.add(p.index);
        idx = p.index;
      }
    }
    result.set(row.id, { rowId: row.id, action: "untouched", proposed: null, periodIndex: idx });
  }

  for (const row of rows.filter((r) => !frozen(r))) {
    const p = findPeriod(row);
    const hasProof = !!row.proofUrl || Number(row.proofUploadCount || 0) > 0;
    if (!p) {
      result.set(row.id, {
        rowId: row.id,
        action: hasProof ? "keep" : "void",
        proposed: null,
        periodIndex: null,
      });
      continue;
    }
    taken.add(p.index);
    const samePeriod =
      String(row.periodStart ?? "").slice(0, 10) === p.periodStart &&
      String(row.periodEnd ?? "").slice(0, 10) === p.periodEnd;
    if (hasProof) {
      result.set(row.id, {
        rowId: row.id,
        action: samePeriod ? "aligned" : "keep",
        proposed: samePeriod
          ? null
          : {
              paymentDate: String(row.paymentDate).slice(0, 10),
              amount: roundMoney(Number(row.amount) || 0, decimals),
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
            },
        periodIndex: p.index,
      });
      continue;
    }
    const aligned =
      samePeriod &&
      String(row.paymentDate).slice(0, 10) === p.dueDate &&
      roundMoney(Number(row.amount) || 0, decimals) === p.amount;
    result.set(row.id, {
      rowId: row.id,
      action: aligned ? "aligned" : "update",
      proposed: aligned
        ? null
        : { paymentDate: p.dueDate, amount: p.amount, periodStart: p.periodStart, periodEnd: p.periodEnd },
      periodIndex: p.index,
    });
  }

  return rows.map((r) => result.get(r.id)!);
}

/**
 * Mois (YYYY-MM) deja "occupes" par une ligne pending sans transaction : pending
 * sans periodStart (historique) OU dont le periodStart n'est plus dans l'echeancier
 * (ancienne periode ancree, ex. 2026-11-06 avant passage en mois civil). Evite de
 * creer un doublon a l'ouverture du carnet avant realignement.
 */
export function occupiedMonthKeys(
  existing: Array<{ status: string; paymentDate: any; periodStart?: any; transactionId?: any }>,
  schedule: SchedulePeriod[],
): Set<string> {
  const starts = new Set(schedule.map((p) => p.periodStart));
  return new Set(
    existing
      .filter((p) => {
        if (p.status !== "pending") return false;
        if (!p.periodStart) return true;
        return !p.transactionId && !starts.has(String(p.periodStart).slice(0, 10));
      })
      .map((p) => String(p.paymentDate).slice(0, 7)),
  );
}

/** Aujourd'hui (UTC) au format YYYY-MM-DD. */
export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}
