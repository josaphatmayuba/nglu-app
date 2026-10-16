/**
 * Registre d'imputations loyer (module PUR : pas de DB, pas de Nest).
 * « 1 mois = 1 echeance = ses paiements » : un encaissement est impute sur une
 * ou plusieurs echeances (FIFO par defaut, imputation explicite possible).
 * Le service (lease-allocation.service.ts) charge/ecrit ; ici uniquement le calcul.
 */
import { roundMoney, type SchedulePeriod } from "./lease-schedule";

export type DueId = number | string;

/** Un bail est « flagge » (registre d'imputations actif) quand allocationLedgerAt est renseigne. */
export function isLeaseFlagged(lease: { allocationLedgerAt?: unknown } | null | undefined): boolean {
  return !!lease && !!lease.allocationLedgerAt;
}

export interface AllocDue {
  id: DueId;
  periodStart: string;
  amount: number;
  /** Deja impute (autres paiements / imputations conservees). */
  paid: number;
}

export interface AllocationWarning {
  code: "CURRENCY_MISMATCH" | "OLDER_DUE_UNSETTLED" | "DUE_NOT_ELIGIBLE" | "OVER_ALLOCATION_CAPPED";
  message: string;
  dueId?: DueId;
  /** Parametres structures (affichage localise cote front). */
  params?: { date?: string; [k: string]: unknown };
}

export interface AllocateInput {
  dues: AllocDue[];
  amount: number;
  /** Devise du paiement vs devise des echeances ; differentes (toutes deux connues) => aucune imputation. */
  currency?: { payment?: number | null; due?: number | null } | null;
  /** Imputation explicite (prioritaire) ; amount absent = « autant que possible ». */
  explicit?: Array<{ dueId: DueId; amount?: number }>;
  decimals?: number;
  /** Aucune imputation sur une echeance dont periodStart > endDate (fin de bail / resiliation). */
  endDate?: string | null;
}

export interface AllocateResult {
  allocations: Array<{ dueId: DueId; amount: number }>;
  credit: number;
  warnings: AllocationWarning[];
}

export type DueStatus = "pending" | "partially_paid" | "paid";

export function dueStatusOf(amount: number, paid: number, decimals = 2): DueStatus {
  const p = roundMoney(paid, decimals);
  if (p <= 0) return "pending";
  return roundMoney(amount - p, decimals) > 0 ? "partially_paid" : "paid";
}

export function allocate(input: AllocateInput): AllocateResult {
  const decimals = input.decimals ?? 2;
  const total = Math.max(0, roundMoney(Number(input.amount) || 0, decimals));
  const warnings: AllocationWarning[] = [];

  const pc = input.currency?.payment;
  const dc = input.currency?.due;
  if (pc != null && dc != null && Number(pc) !== Number(dc)) {
    warnings.push({ code: "CURRENCY_MISMATCH", message: "Devise du paiement differente de celle du bail : aucune imputation." });
    return { allocations: [], credit: total, warnings };
  }

  const eligible = [...input.dues]
    .filter((d) => !input.endDate || d.periodStart <= input.endDate)
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  const taken = new Map<DueId, number>();
  const remainingOf = (d: AllocDue) => roundMoney(d.amount - d.paid - (taken.get(d.id) ?? 0), decimals);
  let left = total;

  const explicitIds = new Set<DueId>();
  for (const e of input.explicit ?? []) {
    const d = eligible.find((x) => x.id === e.dueId);
    if (!d) {
      warnings.push({ code: "DUE_NOT_ELIGIBLE", message: "Echeance introuvable ou hors duree du bail.", dueId: e.dueId });
      continue;
    }
    const rem = remainingOf(d);
    const want = e.amount == null ? Infinity : roundMoney(Number(e.amount) || 0, decimals);
    if (e.amount != null && want > rem) {
      warnings.push({ code: "OVER_ALLOCATION_CAPPED", message: "Montant impute superieur au reste de l'echeance : plafonne.", dueId: d.id });
    }
    const take = Math.min(left, rem, want);
    if (take > 0) {
      taken.set(d.id, roundMoney((taken.get(d.id) ?? 0) + take, decimals));
      left = roundMoney(left - take, decimals);
      explicitIds.add(d.id);
    }
  }

  // Avertissement (non bloquant) : une echeance plus ancienne reste non soldee alors qu'une plus recente est payee.
  for (const id of explicitIds) {
    const d = eligible.find((x) => x.id === id)!;
    const older = eligible.find((x) => x.periodStart < d.periodStart && !explicitIds.has(x.id) && remainingOf(x) > 0);
    if (older) {
      warnings.push({
        code: "OLDER_DUE_UNSETTLED",
        message: `L'echeance du ${older.periodStart} n'est pas soldee alors qu'une echeance plus recente est payee.`,
        dueId: older.id,
        params: { date: older.periodStart },
      });
    }
  }

  for (const d of eligible) {
    if (left <= 0) break;
    const rem = remainingOf(d);
    if (rem <= 0) continue;
    const take = Math.min(left, rem);
    taken.set(d.id, roundMoney((taken.get(d.id) ?? 0) + take, decimals));
    left = roundMoney(left - take, decimals);
  }

  const allocations = [...taken.entries()]
    .filter(([, v]) => v > 0)
    .map(([dueId, amount]) => ({ dueId, amount }));
  return { allocations, credit: Math.max(0, left), warnings };
}

// ─── Plan de reprise (backfill) ────────────────────────────────────────────

export interface BackfillLease {
  id: number;
  startDate: string;
  endDate?: string | null;
  terminationDate?: string | null;
  currencyId?: number | null;
}

export interface BackfillRow {
  id: number;
  status: string;
  paymentDate: string;
  amount: number | string;
  currencyId?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  transactionId?: number | null;
  proofUrl?: string | null;
  notes?: string | null;
}

export interface BackfillOptions {
  decimals?: number;
  /** YYYY-MM-DD */
  today: string;
  /** Total du calcule par la logique legacy (computeLeaseTotalDue), pour mesurer l'ecart. */
  legacyTotalDue?: number | null;
  /** Periodes sans ligne creees seulement si dueDate <= createUntil (defaut = today). */
  createUntil?: string;
  /** Delai de grace (jours) : une echeance n'est « en retard » que si today > dueDate + graceDays. Defaut 0. */
  graceDays?: number;
}

export type BackfillAnomalyCode =
  | "NO_SCHEDULE"
  | "PAYMENT_BEFORE_START"
  | "CURRENCY_MISMATCH"
  | "DUPLICATE_SUSPECT"
  | "DUPLICATE_DUE"
  | "PENDING_UNMATCHED"
  | "DELEGATE_DECLARATION"
  | "PERIOD_UNKNOWN"
  | "DUE_AMOUNT_DIFFERS"
  | "UNKNOWN_STATUS"
  | "OLDER_DUE_UNSETTLED"
  | "LEGACY_DELTA";

export interface BackfillAnomaly {
  code: BackfillAnomalyCode;
  rowId?: number;
  message: string;
}

export interface BackfillDue {
  key: string; // periodStart
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  origin: "reuse" | "fused" | "create";
  rowId: number | null;
  amountPaid: number;
  remaining: number;
  dueStatus: DueStatus;
}

export interface BackfillPlan {
  leaseId: number;
  /** false = rien a appliquer (bail sans echeancier). */
  canApply: boolean;
  /** true = ecart avec le legacy : apply refuse sans force. */
  requiresForce: boolean;
  dues: BackfillDue[];
  /** Echeances existantes (pending/overdue) rattachees a une periode : deviennent rowKind=due. */
  reuse: Array<{ rowId: number; periodStart: string; periodEnd: string; amount: number; setAmount: boolean }>;
  /** Echeances manquantes a creer (pending, sans transaction). */
  create: Array<{ periodStart: string; periodEnd: string; dueDate: string; amount: number }>;
  /**
   * Lignes « paid avec periode » dont le montant = montant de l'echeance : la ligne est
   * a la fois echeance ET paiement (rowKind=due, status paid, auto-imputation sur elle-meme).
   */
  fused: Array<{ rowId: number; periodStart: string; periodEnd: string; amount: number }>;
  /** Lignes paid devenant des paiements (rowKind=payment). */
  payments: Array<{ rowId: number; paymentDate: string; amount: number }>;
  /** paymentRowId -> echeance (cle = periodStart). Inclut les auto-imputations des lignes fusionnees. */
  allocations: Array<{ paymentRowId: number; dueKey: string; amount: number }>;
  /** Credit non impute (surplus sans echeance) ; paiements en devise etrangere exclus. */
  credit: number;
  foreignPaymentIds: number[];
  anomalies: BackfillAnomaly[];
  totals: { totalDueNew: number; totalDueLegacy: number | null; delta: number | null; overdueCount: number };
}

const monthKeyOf = (d: string) => String(d).slice(0, 7);

export function planBackfill(
  lease: BackfillLease,
  scheduleIn: SchedulePeriod[],
  rows: BackfillRow[],
  opts: BackfillOptions,
): BackfillPlan {
  const decimals = opts.decimals ?? 2;
  const unit = Math.pow(10, -decimals);
  const anomalies: BackfillAnomaly[] = [];
  const term = lease.terminationDate ? String(lease.terminationDate).slice(0, 10) : null;
  const schedule = scheduleIn.filter((p) => !term || p.periodStart <= term);

  const plan: BackfillPlan = {
    leaseId: lease.id,
    canApply: schedule.length > 0,
    requiresForce: false,
    dues: [],
    reuse: [],
    create: [],
    fused: [],
    payments: [],
    allocations: [],
    credit: 0,
    foreignPaymentIds: [],
    anomalies,
    totals: { totalDueNew: 0, totalDueLegacy: opts.legacyTotalDue ?? null, delta: null, overdueCount: 0 },
  };
  if (!schedule.length) {
    anomalies.push({ code: "NO_SCHEDULE", message: "Bail sans echeancier exploitable : reprise impossible." });
    return plan;
  }

  const live = rows.filter((r) => r.status !== "voided");
  const pendingRows = live.filter((r) => r.status === "pending" || r.status === "overdue")
    .sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)) || a.id - b.id);
  const paidRows = live.filter((r) => r.status === "paid")
    .sort((a, b) => String(a.paymentDate).localeCompare(String(b.paymentDate)) || a.id - b.id);
  for (const r of live) {
    if (!["pending", "overdue", "paid"].includes(r.status)) {
      anomalies.push({ code: "UNKNOWN_STATUS", rowId: r.id, message: `Statut inattendu '${r.status}' : ligne ignoree.` });
    }
  }

  const byStart = new Map(schedule.map((p) => [p.periodStart, p]));
  // origin de chaque periode : rowId + type
  const origin = new Map<string, { kind: "reuse" | "fused"; rowId: number }>();

  // 1. Echeances existantes : periode exacte d'abord, puis mois de la date.
  const matchedPending = new Set<number>();
  const isDeclaration = (r: BackfillRow) => !r.periodStart && /declare par le delegue/i.test(String(r.notes ?? ""));
  for (const r of pendingRows) {
    if (isDeclaration(r)) {
      anomalies.push({ code: "DELEGATE_DECLARATION", rowId: r.id, message: "Declaration de delegue en attente : ni echeance ni paiement, laissee telle quelle." });
      matchedPending.add(r.id);
      continue;
    }
    const ps = r.periodStart ? String(r.periodStart).slice(0, 10) : null;
    if (ps && byStart.has(ps)) {
      if (origin.has(ps)) {
        anomalies.push({ code: "DUPLICATE_DUE", rowId: r.id, message: `Deux echeances pour la periode ${ps} : la 2e est laissee telle quelle.` });
      } else {
        origin.set(ps, { kind: "reuse", rowId: r.id });
      }
      matchedPending.add(r.id);
    }
  }
  for (const r of pendingRows) {
    if (matchedPending.has(r.id)) continue;
    const mk = monthKeyOf(r.paymentDate);
    const p = schedule.find((s) => !origin.has(s.periodStart) && monthKeyOf(s.dueDate) === mk);
    if (p) {
      origin.set(p.periodStart, { kind: "reuse", rowId: r.id });
    } else {
      anomalies.push({ code: "PENDING_UNMATCHED", rowId: r.id, message: "Echeance sans periode correspondante dans l'echeancier : laissee telle quelle." });
    }
  }

  // 2. Lignes paid : fusionnees (echeance + paiement) si periode connue et montant = echeance.
  const fusedIds = new Set<number>();
  for (const r of paidRows) {
    const ps = r.periodStart ? String(r.periodStart).slice(0, 10) : null;
    if (!ps) continue;
    const p = byStart.get(ps);
    if (!p) {
      anomalies.push({ code: "PERIOD_UNKNOWN", rowId: r.id, message: `Periode ${ps} absente de l'echeancier : imputation FIFO.` });
      continue;
    }
    if (origin.has(ps)) continue; // periode deja portee par une echeance pending : la ligne reste un paiement
    const amt = roundMoney(Number(r.amount) || 0, decimals);
    const sameCurrency = r.currencyId == null || lease.currencyId == null || Number(r.currencyId) === Number(lease.currencyId);
    if (sameCurrency && Math.abs(amt - p.amount) < unit * 0.5 + 1e-9) {
      origin.set(ps, { kind: "fused", rowId: r.id });
      fusedIds.add(r.id);
    }
  }

  // Periodes retenues : celles qui ont deja une ligne, ou echues (dueDate <= createUntil, defaut aujourd'hui).
  const createUntil = opts.createUntil ?? opts.today;
  const included = schedule.filter((p) => origin.has(p.periodStart) || p.dueDate <= createUntil);

  // 3. Dues (une par periode) + etat d'imputation.
  const paidOn = new Map<string, number>();
  const dues = new Map<string, BackfillDue>();
  for (const p of included) {
    const o = origin.get(p.periodStart);
    dues.set(p.periodStart, {
      key: p.periodStart,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      dueDate: p.dueDate,
      amount: p.amount,
      origin: o ? o.kind : "create",
      rowId: o ? o.rowId : null,
      amountPaid: 0,
      remaining: p.amount,
      dueStatus: "pending",
    });
    if (!o) {
      plan.create.push({ periodStart: p.periodStart, periodEnd: p.periodEnd, dueDate: p.dueDate, amount: p.amount });
    } else if (o.kind === "reuse") {
      const row = rows.find((x) => x.id === o.rowId)!;
      const cur = roundMoney(Number(row.amount) || 0, decimals);
      const differs = Math.abs(cur - p.amount) >= unit * 0.5 + 1e-9;
      const frozen = !!row.proofUrl || !!row.transactionId;
      if (differs && frozen) {
        anomalies.push({ code: "DUE_AMOUNT_DIFFERS", rowId: row.id, message: `Montant de l'echeance (${cur}) different de l'echeancier (${p.amount}) : conserve (justificatif/transaction).` });
      }
      plan.reuse.push({ rowId: row.id, periodStart: p.periodStart, periodEnd: p.periodEnd, amount: p.amount, setAmount: differs && !frozen });
      if (differs && !frozen) {
        // Le montant sera aligne sur l'echeancier : rien d'autre a faire.
      }
    } else {
      plan.fused.push({ rowId: o.rowId, periodStart: p.periodStart, periodEnd: p.periodEnd, amount: p.amount });
      plan.allocations.push({ paymentRowId: o.rowId, dueKey: p.periodStart, amount: p.amount });
      paidOn.set(p.periodStart, p.amount);
    }
  }

  // 4. Paiements restants (FIFO par date, periode renseignee prioritaire).
  const seen = new Map<string, number>();
  let credit = 0;
  for (const r of paidRows) {
    if (fusedIds.has(r.id)) continue;
    const amt = roundMoney(Number(r.amount) || 0, decimals);
    plan.payments.push({ rowId: r.id, paymentDate: String(r.paymentDate).slice(0, 10), amount: amt });
    if (String(r.paymentDate).slice(0, 10) < String(lease.startDate).slice(0, 10)) {
      anomalies.push({ code: "PAYMENT_BEFORE_START", rowId: r.id, message: "Paiement anterieur au debut du bail." });
    }
    const dupKey = `${String(r.paymentDate).slice(0, 10)}|${amt}`;
    if (seen.has(dupKey)) {
      anomalies.push({ code: "DUPLICATE_SUSPECT", rowId: r.id, message: `Doublon probable du paiement #${seen.get(dupKey)} (meme date et meme montant).` });
    } else {
      seen.set(dupKey, r.id);
    }
    if (r.currencyId != null && lease.currencyId != null && Number(r.currencyId) !== Number(lease.currencyId)) {
      anomalies.push({ code: "CURRENCY_MISMATCH", rowId: r.id, message: "Devise differente de celle du bail : paiement non impute." });
      plan.foreignPaymentIds.push(r.id);
      continue;
    }
    const ps = r.periodStart ? String(r.periodStart).slice(0, 10) : null;
    const res = allocate({
      dues: included.map((p) => ({ id: p.periodStart, periodStart: p.periodStart, amount: p.amount, paid: paidOn.get(p.periodStart) ?? 0 })),
      amount: amt,
      explicit: ps && byStart.has(ps) ? [{ dueId: ps }] : undefined,
      decimals,
      endDate: term,
    });
    for (const a of res.allocations) {
      paidOn.set(String(a.dueId), roundMoney((paidOn.get(String(a.dueId)) ?? 0) + a.amount, decimals));
      plan.allocations.push({ paymentRowId: r.id, dueKey: String(a.dueId), amount: a.amount });
    }
    for (const w of res.warnings) {
      if (w.code === "OLDER_DUE_UNSETTLED") anomalies.push({ code: "OLDER_DUE_UNSETTLED", rowId: r.id, message: w.message });
    }
    credit = roundMoney(credit + res.credit, decimals);
  }
  plan.credit = credit;

  // 5. Etat final des echeances + totaux.
  let totalDue = 0;
  let overdue = 0;
  for (const d of dues.values()) {
    d.amountPaid = roundMoney(paidOn.get(d.key) ?? 0, decimals);
    d.remaining = Math.max(0, roundMoney(d.amount - d.amountPaid, decimals));
    d.dueStatus = dueStatusOf(d.amount, d.amountPaid, decimals);
    if (d.dueDate <= opts.today && d.remaining > 0) {
      totalDue = roundMoney(totalDue + d.remaining, decimals);
      // Meme regle que isPastGrace (lease-overdue) : today strictement apres dueDate + grace.
      const limit = new Date(`${d.dueDate}T00:00:00Z`);
      limit.setUTCDate(limit.getUTCDate() + (opts.graceDays ?? 0));
      if (new Date(`${opts.today}T00:00:00Z`).getTime() > limit.getTime()) overdue++;
    }
  }
  plan.dues = [...dues.values()];
  plan.totals.totalDueNew = totalDue;
  plan.totals.overdueCount = overdue;
  if (opts.legacyTotalDue != null) {
    const delta = roundMoney(totalDue - opts.legacyTotalDue, decimals);
    plan.totals.delta = delta;
    if (Math.abs(delta) > Math.max(unit, 0.01) + 1e-9) {
      plan.requiresForce = true;
      anomalies.push({ code: "LEGACY_DELTA", message: `Total du reprise (${totalDue}) different du calcul legacy (${opts.legacyTotalDue}) : ecart ${delta}.` });
    }
  }
  return plan;
}

// ─── Reconstruction des imputations (rebuild) ──────────────────────────────

export interface RebuildRow {
  id: number;
  rowKind: "due" | "payment" | string | null;
  status: string;
  paymentDate: string;
  amount: number;
  currencyId?: number | null;
  periodStart?: string | null;
}

export interface RebuildAlloc {
  id: number;
  paymentId: number;
  dueId: number;
  amount: number;
  source: string;
}

export interface RebuildVirtualPayment {
  id: number; // negatif
  paymentDate: string;
  amount: number;
  currencyId?: number | null;
  /** Imputation explicite ; amount absent = autant que possible. */
  explicit?: Array<{ dueId: number; amount?: number }>;
}

export interface RebuildInput {
  rows: RebuildRow[];
  /** Imputations actives (status 'true'). */
  allocs: RebuildAlloc[];
  leaseCurrencyId?: number | null;
  decimals?: number;
  terminationDate?: string | null;
  /** Paiement hypothetique (apercu) : jamais ecrit. */
  virtual?: RebuildVirtualPayment | null;
}

export interface RebuildDueState {
  id: number;
  periodStart: string;
  amount: number;
  amountPaid: number;
  remaining: number;
  dueStatus: DueStatus;
  fused: boolean;
}

export interface RebuildResult {
  voids: Array<{ id: number; reason: string }>;
  inserts: Array<{ paymentId: number; dueId: number; amount: number; self?: boolean }>;
  dues: RebuildDueState[];
  /** Part non imputee par paiement (credit). */
  unallocated: Array<{ paymentId: number; amount: number }>;
  credit: number;
  warnings: AllocationWarning[];
  /** Imputations attribuees au paiement virtuel (apercu). */
  virtualAllocations: Array<{ dueId: number; amount: number }>;
  /** Part non imputee du paiement virtuel (apercu). */
  virtualCredit: number;
}

/**
 * Calcule, sans ecrire, l'etat cible des imputations d'un bail :
 * manuelles conservees, auto/backfill recalculees (FIFO par paymentDate, periode du
 * paiement prioritaire), imputations orphelines annulees, diff minimal.
 * Ligne « fusionnee » (rowKind due + status paid) = echeance ET paiement, auto-imputee.
 */
export function computeRebuild(input: RebuildInput): RebuildResult {
  const decimals = input.decimals ?? 2;
  const term = input.terminationDate ? String(input.terminationDate).slice(0, 10) : null;
  const dateOf = (r: RebuildRow) => String(r.paymentDate).slice(0, 10);
  const psOf = (r: RebuildRow) => (r.periodStart ? String(r.periodStart).slice(0, 10) : dateOf(r));

  const live = input.rows.filter((r) => r.status !== "voided");
  const dueRows = live.filter((r) => r.rowKind === "due" && (!term || psOf(r) <= term));
  const fusedRows = dueRows.filter((r) => r.status === "paid");
  const fusedIds = new Set(fusedRows.map((r) => r.id));
  const payRows = live.filter((r) => r.status === "paid" && r.rowKind !== "due");
  const dueById = new Map(dueRows.map((r) => [r.id, r]));

  interface Pay { id: number; amount: number; date: string; currencyId?: number | null; periodStart: string | null; virtual: boolean }
  const payById = new Map<number, Pay>();
  for (const r of payRows) {
    payById.set(r.id, { id: r.id, amount: roundMoney(r.amount, decimals), date: dateOf(r), currencyId: r.currencyId, periodStart: r.periodStart ? String(r.periodStart).slice(0, 10) : null, virtual: false });
  }
  for (const r of fusedRows) {
    payById.set(r.id, { id: r.id, amount: roundMoney(r.amount, decimals), date: dateOf(r), currencyId: r.currencyId, periodStart: null, virtual: false });
  }
  const v = input.virtual ?? null;
  if (v) {
    payById.set(v.id, { id: v.id, amount: roundMoney(v.amount, decimals), date: String(v.paymentDate).slice(0, 10), currencyId: v.currencyId, periodStart: null, virtual: true });
  }

  const voids: RebuildResult["voids"] = [];
  const keptPaidByDue = new Map<number, number>();
  const keptByPay = new Map<number, number>();
  const addKept = (a: { paymentId: number; dueId: number; amount: number }) => {
    keptPaidByDue.set(a.dueId, roundMoney((keptPaidByDue.get(a.dueId) ?? 0) + a.amount, decimals));
    keptByPay.set(a.paymentId, roundMoney((keptByPay.get(a.paymentId) ?? 0) + a.amount, decimals));
  };

  const existingAuto: RebuildAlloc[] = [];
  const candidates: Array<{ id: number | null; paymentId: number; dueId: number; amount: number | null }> = [];
  for (const a of [...input.allocs].sort((x, y) => x.id - y.id)) {
    const amount = roundMoney(a.amount, decimals);
    if (!dueById.has(a.dueId)) { voids.push({ id: a.id, reason: "Echeance annulee ou hors duree du bail" }); continue; }
    if (!payById.has(a.paymentId)) { voids.push({ id: a.id, reason: "Paiement annule" }); continue; }
    const self = a.paymentId === a.dueId;
    if (!self && (a.source === "auto" || a.source === "backfill")) { existingAuto.push({ ...a, amount }); continue; }
    candidates.push({ id: a.id, paymentId: a.paymentId, dueId: a.dueId, amount });
  }
  for (const e of v?.explicit ?? []) {
    if (!dueById.has(e.dueId)) continue;
    candidates.push({ id: null, paymentId: v!.id, dueId: e.dueId, amount: e.amount == null ? null : roundMoney(Number(e.amount) || 0, decimals) });
  }

  for (const k of candidates) {
    const due = dueById.get(k.dueId)!;
    const pay = payById.get(k.paymentId)!;
    const dueCap = roundMoney(due.amount - (keptPaidByDue.get(k.dueId) ?? 0), decimals);
    const payCap = roundMoney(pay.amount - (keptByPay.get(k.paymentId) ?? 0), decimals);
    const amount = k.amount == null ? Math.min(dueCap, payCap) : k.amount;
    if (amount <= 0 || amount > dueCap + 1e-9 || amount > payCap + 1e-9) {
      if (k.id != null) voids.push({ id: k.id, reason: "Depasse le montant de l'echeance ou du paiement" });
      continue;
    }
    addKept({ paymentId: k.paymentId, dueId: k.dueId, amount });
  }

  const inserts: RebuildResult["inserts"] = [];
  // Lignes fusionnees : auto-imputation sur elles-memes si absente.
  for (const f of fusedRows) {
    if ((keptByPay.get(f.id) ?? 0) > 0) continue;
    const amt = roundMoney(f.amount, decimals);
    inserts.push({ paymentId: f.id, dueId: f.id, amount: amt, self: true });
    addKept({ paymentId: f.id, dueId: f.id, amount: amt });
  }

  const paidNow = new Map(keptPaidByDue);
  const warnings: AllocationWarning[] = [];
  const desired: Array<{ paymentId: number; dueId: number; amount: number }> = [];
  const unallocated: RebuildResult["unallocated"] = [];

  const payments = [...payById.values()].sort((a, b) => a.date.localeCompare(b.date) || Math.abs(a.id) - Math.abs(b.id));
  for (const p of payments) {
    if (fusedIds.has(p.id)) continue;
    const free = roundMoney(p.amount - (keptByPay.get(p.id) ?? 0), decimals);
    if (free <= 0) continue;
    const pref = p.periodStart ? dueRows.find((d) => psOf(d) === p.periodStart) : undefined;
    const res = allocate({
      dues: dueRows.map((d) => ({ id: d.id, periodStart: psOf(d), amount: roundMoney(d.amount, decimals), paid: paidNow.get(d.id) ?? 0 })),
      amount: free,
      currency: { payment: p.currencyId ?? null, due: input.leaseCurrencyId ?? null },
      explicit: pref ? [{ dueId: pref.id }] : undefined,
      decimals,
      endDate: term,
    });
    for (const a of res.allocations) {
      paidNow.set(a.dueId as number, roundMoney((paidNow.get(a.dueId as number) ?? 0) + a.amount, decimals));
      desired.push({ paymentId: p.id, dueId: a.dueId as number, amount: a.amount });
    }
    warnings.push(...res.warnings);
    if (res.credit > 0) unallocated.push({ paymentId: p.id, amount: res.credit });
  }

  // Diff avec les imputations auto/backfill existantes (pas de churn si inchangees).
  const remainingDesired = [...desired];
  for (const e of existingAuto) {
    const i = remainingDesired.findIndex((d) => d.paymentId === e.paymentId && d.dueId === e.dueId && Math.abs(d.amount - e.amount) < 1e-9);
    if (i >= 0) remainingDesired.splice(i, 1);
    else voids.push({ id: e.id, reason: "Recalcul FIFO" });
  }
  for (const d of remainingDesired) if (d.paymentId > 0) inserts.push(d);

  const duesState: RebuildDueState[] = dueRows
    .map((r) => {
      const amount = roundMoney(r.amount, decimals);
      const paid = roundMoney(paidNow.get(r.id) ?? 0, decimals);
      return {
        id: r.id,
        periodStart: psOf(r),
        amount,
        amountPaid: paid,
        remaining: Math.max(0, roundMoney(amount - paid, decimals)),
        dueStatus: dueStatusOf(amount, paid, decimals),
        fused: fusedIds.has(r.id),
      };
    })
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart) || a.id - b.id);

  const realUnalloc = unallocated.filter((u) => u.paymentId > 0);
  return {
    voids,
    inserts,
    dues: duesState,
    unallocated: realUnalloc,
    credit: roundMoney(realUnalloc.reduce((s, u) => s + u.amount, 0), decimals),
    warnings,
    virtualCredit: v ? (unallocated.find((u) => u.paymentId === v.id)?.amount ?? 0) : 0,
    virtualAllocations: v ? desired.filter((d) => d.paymentId === v.id).map((d) => ({ dueId: d.dueId, amount: d.amount })) : [],
  };
}
