import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import {
  currencies,
  customers,
  realEstateLeaseCotenants,
  realEstateLeases,
  realEstatePaymentAllocations,
  realEstateProperties,
  realEstateRentPayments,
  realEstateSecurityDeposits,
  realEstateUnits,
  smsLogs,
  tenantDetails,
} from "../database/schema";
import type { Database } from "../database/types";
import { buildFlaggedDueState } from "./lease-overdue";
import { isLeaseFlagged } from "./lease-allocation";
import { formatDateOnly } from "./lease-schedule";
import { computeLeaseTotalDue, leaseEndedCutoff } from "./lease-proration";

// Dettes d'anciens locataires : solde d'un bail TERMINE (status 'ended').
// Partie pure (computeEndedLeaseBalance, totalsByCurrency) + chargeurs batch.
// Argent en unites mineures entieres (centimes), rendu en chaine a N decimales.
// La caution disponible n'est JAMAIS deduite : elle est exposee a part (provisional).

export const FORMER_DEBT_STATUS = "ended";

export function toMinor(value: unknown, decimals: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10 ** decimals); // arrondi a l'unite MINEURE (centime), jamais a l'unite
}

export function minorToString(minor: number, decimals: number): string {
  const neg = minor < 0;
  const abs = String(Math.abs(Math.trunc(minor))).padStart(decimals + 1, "0");
  const int = decimals > 0 ? abs.slice(0, -decimals) : abs;
  const frac = decimals > 0 ? `.${abs.slice(-decimals)}` : "";
  return `${neg ? "-" : ""}${int}${frac}`;
}

function clampDecimals(d: unknown): number {
  const n = d == null ? NaN : Number(d);
  return Number.isInteger(n) && n >= 0 ? Math.min(n, 2) : 2;
}

export interface EndedLeaseInput {
  id: number;
  startDate: string;
  endDate?: string | null;
  billingCycle?: string | null;
  rentAmount?: string | number | null;
  rentProrationEnabled?: boolean | number | null;
  terminationDate?: string | null;
  terminationFullPeriod?: boolean | number | null;
  allocationLedgerAt?: unknown;
  currencyId?: number | null;
}

export interface EndedPaymentRow {
  id: number;
  status: string;
  rowKind: string | null;
  paymentDate: string;
  amount: unknown;
  periodStart: string | null;
  periodEnd: string | null;
  method?: string | null;
}

export interface EndedAllocRow {
  id: number;
  paymentId: number;
  dueId: number;
  amount: unknown;
  source: string;
}

export interface EndedDepositRow {
  amount: unknown;
  rentAppliedAmount?: unknown;
  status?: string | null;
  isActive?: number | null;
}

export interface EndedLeaseBalance {
  leaseId: number;
  currencyId: number | null;
  decimals: number;
  balanceMinor: number;
  /** Chaine a `decimals` decimales, >= 0 (trop-percu = "0.00"). */
  balance: string;
  /** true si une caution disponible (> 0) pourrait encore reduire la dette : jamais deduite d'office. */
  provisional: boolean;
  depositAvailableMinor: number;
  depositAvailable: string;
  terminationDate: string | null;
  lastPayment: { date: string; amount: string } | null;
}

export function computeEndedLeaseBalance(input: {
  lease: EndedLeaseInput;
  decimals: number;
  payments: EndedPaymentRow[];
  allocs?: EndedAllocRow[];
  deposits?: EndedDepositRow[];
  now?: Date;
}): EndedLeaseBalance {
  const { lease } = input;
  const dec = clampDecimals(input.decimals);
  const now = input.now ?? new Date();
  const todayStr = formatDateOnly(now);
  const cutoff = leaseEndedCutoff({ status: FORMER_DEBT_STATUS, terminationDate: lease.terminationDate, endDate: lease.endDate });
  const limit = cutoff && cutoff < todayStr ? cutoff : todayStr;
  const payments = input.payments.filter((p) => p.status !== "voided");

  let balanceMinor: number;
  if (isLeaseFlagged(lease)) {
    const state = buildFlaggedDueState(payments as any, (input.allocs ?? []) as any, dec, now, 0);
    balanceMinor = state.dues
      .filter((d) => d.periodStart <= limit)
      .reduce((s, d) => s + toMinor(d.remaining, dec), 0);
  } else {
    // Paiements 'paid' (y compris method='deposit' = imputation de caution) : comptes UNE fois ici.
    const paidMinor = payments
      .filter((p) => p.status === "paid" && p.rowKind !== "due")
      .reduce((s, p) => s + toMinor(p.amount, dec), 0);
    const due = computeLeaseTotalDue(
      { ...lease, status: FORMER_DEBT_STATUS, terminationDate: lease.terminationDate ?? null },
      paidMinor / 10 ** dec,
      dec,
      now,
    );
    balanceMinor = toMinor(due, dec);
  }
  balanceMinor = Math.max(0, balanceMinor);

  const depositAvailableMinor = Math.max(
    0,
    (input.deposits ?? [])
      .filter((d) => (d.status ?? "held") === "held" && (d.isActive ?? 1) === 1)
      .reduce((s, d) => s + toMinor(d.amount, dec) - toMinor(d.rentAppliedAmount ?? 0, dec), 0),
  );

  // Dernier VRAI versement du locataire (l'imputation de caution n'en est pas un).
  const last = payments
    .filter((p) => p.status === "paid" && p.rowKind !== "due" && p.method !== "deposit")
    .sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)) || b.id - a.id)[0];

  return {
    leaseId: lease.id,
    currencyId: lease.currencyId ?? null,
    decimals: dec,
    balanceMinor,
    balance: minorToString(balanceMinor, dec),
    provisional: depositAvailableMinor > 0,
    depositAvailableMinor,
    depositAvailable: minorToString(depositAvailableMinor, dec),
    terminationDate: cutoff,
    lastPayment: last ? { date: String(last.paymentDate).slice(0, 10), amount: minorToString(toMinor(last.amount, dec), dec) } : null,
  };
}

/** Totaux par devise, un bail compte une seule fois (dedoublonne par leaseId, ex. co-locataires). */
export function totalsByCurrency(
  rows: Array<{ leaseId: number; currencyId: number | null; decimals: number; balanceMinor: number }>,
): Array<{ currencyId: number | null; amount: string }> {
  const seen = new Set<number>();
  const sums = new Map<string, { currencyId: number | null; decimals: number; minor: number }>();
  for (const r of rows) {
    if (seen.has(r.leaseId)) continue;
    seen.add(r.leaseId);
    const key = String(r.currencyId ?? "null");
    const cur = sums.get(key) ?? { currencyId: r.currencyId ?? null, decimals: r.decimals, minor: 0 };
    cur.minor += r.balanceMinor;
    sums.set(key, cur);
  }
  return [...sums.values()].map((c) => ({ currencyId: c.currencyId, amount: minorToString(c.minor, c.decimals) }));
}

// ─── Chargeurs ────────────────────────────────────────────────────────────

export interface EndedLeaseBalanceWithCurrency extends EndedLeaseBalance {
  currency: { id: number | null; code: string | null; symbol: string | null; decimals: number };
  reference: string;
  propertyId: number;
  unitId: number;
  tenantId: number;
}

/** Soldes de plusieurs baux termines : 5 requetes max, aucune par bail. Les baux non 'ended' sont ignores. */
export async function loadEndedLeaseBalances(
  db: Database,
  orgId: number,
  leaseIds: number[],
  now: Date = new Date(),
): Promise<Map<number, EndedLeaseBalanceWithCurrency>> {
  const out = new Map<number, EndedLeaseBalanceWithCurrency>();
  const ids = [...new Set(leaseIds.map(Number))].filter((n) => n > 0);
  if (!ids.length) return out;

  const leases = await db
    .select({
      id: realEstateLeases.id,
      reference: realEstateLeases.reference,
      propertyId: realEstateLeases.propertyId,
      unitId: realEstateLeases.unitId,
      tenantId: realEstateLeases.tenantId,
      startDate: realEstateLeases.startDate,
      endDate: realEstateLeases.endDate,
      billingCycle: realEstateLeases.billingCycle,
      rentAmount: realEstateLeases.rentAmount,
      rentProrationEnabled: realEstateLeases.rentProrationEnabled,
      terminationDate: realEstateLeases.terminationDate,
      terminationFullPeriod: realEstateLeases.terminationFullPeriod,
      allocationLedgerAt: realEstateLeases.allocationLedgerAt,
      currencyId: realEstateLeases.currencyId,
      curCode: currencies.currencyCode,
      curSymbol: currencies.currencySymbol,
      curDecimals: currencies.decimalPlaces,
    })
    .from(realEstateLeases)
    .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
    .where(and(
      eq(realEstateLeases.organizationId, orgId),
      inArray(realEstateLeases.id, ids),
      eq(realEstateLeases.status, FORMER_DEBT_STATUS),
    ));
  if (!leases.length) return out;
  const endedIds = leases.map((l) => Number(l.id));

  const payments = await db
    .select({
      id: realEstateRentPayments.id,
      leaseId: realEstateRentPayments.leaseId,
      status: realEstateRentPayments.status,
      rowKind: realEstateRentPayments.rowKind,
      paymentDate: realEstateRentPayments.paymentDate,
      amount: realEstateRentPayments.amount,
      periodStart: realEstateRentPayments.periodStart,
      periodEnd: realEstateRentPayments.periodEnd,
      method: realEstateRentPayments.method,
    })
    .from(realEstateRentPayments)
    .where(and(
      eq(realEstateRentPayments.organizationId, orgId),
      inArray(realEstateRentPayments.leaseId, endedIds),
      ne(realEstateRentPayments.status, "voided"),
    ))
    .orderBy(asc(realEstateRentPayments.paymentDate), asc(realEstateRentPayments.id));

  const flaggedIds = leases.filter((l) => isLeaseFlagged(l)).map((l) => Number(l.id));
  const allocs = flaggedIds.length
    ? await db
        .select()
        .from(realEstatePaymentAllocations)
        .where(and(
          eq(realEstatePaymentAllocations.organizationId, orgId),
          inArray(realEstatePaymentAllocations.leaseId, flaggedIds),
          eq(realEstatePaymentAllocations.status, "true"),
        ))
        .orderBy(asc(realEstatePaymentAllocations.id))
    : [];

  // Table des cautions hors journal sur certains environnements : absence tolere.
  let deposits: any[] = [];
  try {
    deposits = await db
      .select({
        leaseId: realEstateSecurityDeposits.leaseId,
        amount: realEstateSecurityDeposits.amount,
        rentAppliedAmount: realEstateSecurityDeposits.rentAppliedAmount,
        status: realEstateSecurityDeposits.status,
        isActive: realEstateSecurityDeposits.isActive,
      })
      .from(realEstateSecurityDeposits)
      .where(and(
        eq(realEstateSecurityDeposits.organizationId, orgId),
        inArray(realEstateSecurityDeposits.leaseId, endedIds),
        eq(realEstateSecurityDeposits.isActive, 1),
      ));
  } catch {
    deposits = [];
  }

  const group = <T extends { leaseId: unknown }>(rows: T[]) => {
    const m = new Map<number, T[]>();
    for (const r of rows) {
      const k = Number(r.leaseId);
      const l = m.get(k);
      if (l) l.push(r); else m.set(k, [r]);
    }
    return m;
  };
  const payBy = group(payments as any[]);
  const allocBy = group(allocs as any[]);
  const depBy = group(deposits);

  for (const l of leases) {
    const decimals = clampDecimals(l.curDecimals);
    const b = computeEndedLeaseBalance({
      lease: l as any,
      decimals,
      payments: (payBy.get(Number(l.id)) ?? []) as any,
      allocs: (allocBy.get(Number(l.id)) ?? []) as any,
      deposits: depBy.get(Number(l.id)) ?? [],
      now,
    });
    out.set(Number(l.id), {
      ...b,
      currency: { id: l.currencyId == null ? null : Number(l.currencyId), code: l.curCode ?? null, symbol: l.curSymbol ?? null, decimals },
      reference: l.reference,
      propertyId: Number(l.propertyId),
      unitId: Number(l.unitId),
      tenantId: Number(l.tenantId),
    });
  }
  return out;
}

export interface FormerDebtorTenant {
  id: number;
  name: string;
  phone: string | null;
  tenantType: string;
  companyName: string | null;
}

export interface FormerDebtorsFilters {
  currencyId?: number;
  propertyId?: number;
  search?: string;
}

/** Locataires (principal + co-locataires actifs) de plusieurs baux, en 2 requetes. */
async function loadLeaseTenants(db: Database, orgId: number, leases: Array<{ id: number; tenantId: number }>) {
  const leaseIds = leases.map((l) => l.id);
  const links = await db
    .select({ leaseId: realEstateLeaseCotenants.leaseId, customerId: realEstateLeaseCotenants.customerId, position: realEstateLeaseCotenants.position })
    .from(realEstateLeaseCotenants)
    .where(and(
      eq(realEstateLeaseCotenants.organizationId, orgId),
      inArray(realEstateLeaseCotenants.leaseId, leaseIds),
      eq(realEstateLeaseCotenants.isActive, 1),
    ))
    .orderBy(asc(realEstateLeaseCotenants.position));
  const customerIds = [...new Set([...leases.map((l) => l.tenantId), ...links.map((k) => Number(k.customerId))])];
  const people = await db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      tenantType: tenantDetails.tenantType,
      companyName: tenantDetails.companyName,
    })
    .from(customers)
    .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
    .where(and(eq(customers.organizationId, orgId), inArray(customers.id, customerIds)));
  const byId = new Map<number, FormerDebtorTenant>(
    people.map((p) => [
      Number(p.id),
      {
        id: Number(p.id),
        name: [p.firstName, p.lastName].filter(Boolean).join(" "),
        phone: p.phone ?? null,
        tenantType: p.tenantType === "company" ? "company" : "individual",
        companyName: p.companyName ?? null,
      },
    ]),
  );
  const out = new Map<number, FormerDebtorTenant[]>();
  for (const l of leases) {
    const ids = [l.tenantId, ...links.filter((k) => Number(k.leaseId) === l.id).map((k) => Number(k.customerId))];
    const uniq = [...new Set(ids)];
    out.set(l.id, uniq.map((id) => byId.get(id)).filter((t): t is FormerDebtorTenant => !!t));
  }
  return out;
}

/** Liste des anciens locataires debiteurs (baux 'ended', non annules, solde > 0). */
export async function listFormerDebtors(
  db: Database,
  orgId: number,
  scope: "all" | number[],
  filters: FormerDebtorsFilters = {},
  now: Date = new Date(),
) {
  if (scope !== "all" && !scope.length) return { rows: [], totals: [] };
  const conds = [
    eq(realEstateLeases.organizationId, orgId),
    eq(realEstateLeases.status, FORMER_DEBT_STATUS),
  ];
  if (scope !== "all") conds.push(inArray(realEstateLeases.propertyId, scope));
  if (filters.propertyId) conds.push(eq(realEstateLeases.propertyId, filters.propertyId));
  if (filters.currencyId) conds.push(eq(realEstateLeases.currencyId, filters.currencyId));
  const base = await db
    .select({ id: realEstateLeases.id })
    .from(realEstateLeases)
    .where(and(...conds));
  const balances = await loadEndedLeaseBalances(db, orgId, base.map((b) => Number(b.id)), now);
  const owing = [...balances.values()].filter((b) => b.balanceMinor > 0);
  if (!owing.length) return { rows: [], totals: [] };

  const tenantsBy = await loadLeaseTenants(db, orgId, owing.map((b) => ({ id: b.leaseId, tenantId: b.tenantId })));
  const [places, reminders] = await Promise.all([
    (async () => {
      const props = await db
        .select({ id: realEstateProperties.id, name: realEstateProperties.name })
        .from(realEstateProperties)
        .where(and(eq(realEstateProperties.organizationId, orgId), inArray(realEstateProperties.id, [...new Set(owing.map((b) => b.propertyId))])));
      const units = await db
        .select({ id: realEstateUnits.id, name: realEstateUnits.name })
        .from(realEstateUnits)
        .where(and(eq(realEstateUnits.organizationId, orgId), inArray(realEstateUnits.id, [...new Set(owing.map((b) => b.unitId))])));
      return { props: new Map(props.map((p) => [Number(p.id), p.name])), units: new Map(units.map((u) => [Number(u.id), u.name])) };
    })(),
    loadLastReminders(db, orgId, owing.map((b) => ({ leaseId: b.leaseId, tenantIds: (tenantsBy.get(b.leaseId) ?? []).map((t) => t.id) }))),
  ]);

  const q = (filters.search ?? "").trim().toLowerCase();
  let rows = owing.map((b) => {
    const tenants = tenantsBy.get(b.leaseId) ?? [];
    return {
      leaseId: b.leaseId,
      reference: b.reference,
      propertyId: b.propertyId,
      propertyName: places.props.get(b.propertyId) ?? null,
      unitId: b.unitId,
      unitName: places.units.get(b.unitId) ?? null,
      tenants,
      currency: b.currency,
      currencyId: b.currency.id,
      balance: b.balance,
      balanceMinor: b.balanceMinor,
      decimals: b.decimals,
      provisional: b.provisional,
      depositAvailable: b.depositAvailable,
      terminationDate: b.terminationDate,
      lastPayment: b.lastPayment,
      lastReminderAt: reminders.get(b.leaseId) ?? null,
    };
  });
  if (q) {
    rows = rows.filter((r) =>
      [r.reference, r.propertyName, r.unitName, ...r.tenants.flatMap((t) => [t.name, t.phone, t.companyName])]
        .some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }
  rows.sort((a, b) => b.balanceMinor - a.balanceMinor || a.leaseId - b.leaseId);
  const totals = totalsByCurrency(rows);
  return {
    rows: rows.map(({ balanceMinor: _m, decimals: _d, currencyId: _c, ...r }) => r),
    totals,
  };
}

/** Dernier rappel SMS de paiement par bail (rattache au bail ou, pour les baux multi-locataires, au locataire). */
export async function loadLastReminders(
  db: Database,
  orgId: number,
  leases: Array<{ leaseId: number; tenantIds: number[] }>,
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  try {
    const tenantToLeases = new Map<number, number[]>();
    for (const l of leases) for (const t of l.tenantIds) tenantToLeases.set(t, [...(tenantToLeases.get(t) ?? []), l.leaseId]);
    const rows = await db
      .select({ relatedType: smsLogs.relatedType, relatedId: smsLogs.relatedId, at: sql<string>`MAX(${smsLogs.createdAt})` })
      .from(smsLogs)
      .where(and(
        eq(smsLogs.organizationId, orgId),
        eq(smsLogs.smsType, "payment_reminder"),
        or(
          and(eq(smsLogs.relatedType, "real-estate-lease"), inArray(smsLogs.relatedId, leases.map((l) => String(l.leaseId)))),
          and(eq(smsLogs.relatedType, "tenant"), inArray(smsLogs.relatedId, [...tenantToLeases.keys()].map(String))),
        ),
      ))
      .groupBy(smsLogs.relatedType, smsLogs.relatedId);
    for (const r of rows) {
      if (!r.at) continue;
      const iso = new Date(r.at as any).toISOString();
      const targets = r.relatedType === "tenant" ? tenantToLeases.get(Number(r.relatedId)) ?? [] : [Number(r.relatedId)];
      for (const id of targets) if (!out.get(id) || out.get(id)! < iso) out.set(id, iso);
    }
  } catch {
    /* journal SMS indisponible : pas de date de relance */
  }
  return out;
}

/** Dette d'un locataire (principal OU co-locataire actif) sur ses baux termines. */
export async function loadTenantFormerDebt(db: Database, orgId: number, tenantId: number, now: Date = new Date()) {
  const asCo = await db
    .select({ leaseId: realEstateLeaseCotenants.leaseId })
    .from(realEstateLeaseCotenants)
    .where(and(
      eq(realEstateLeaseCotenants.organizationId, orgId),
      eq(realEstateLeaseCotenants.customerId, tenantId),
      eq(realEstateLeaseCotenants.isActive, 1),
    ));
  const coIds = asCo.map((c) => Number(c.leaseId));
  const leases = await db
    .select({ id: realEstateLeases.id })
    .from(realEstateLeases)
    .where(and(
      eq(realEstateLeases.organizationId, orgId),
      eq(realEstateLeases.status, FORMER_DEBT_STATUS),
      coIds.length ? or(eq(realEstateLeases.tenantId, tenantId), inArray(realEstateLeases.id, coIds))! : eq(realEstateLeases.tenantId, tenantId),
    ))
    .orderBy(desc(realEstateLeases.id));
  const balances = await loadEndedLeaseBalances(db, orgId, leases.map((l) => Number(l.id)), now);
  const debts = [...balances.values()]
    .filter((b) => b.balanceMinor > 0)
    .map((b) => ({ leaseId: b.leaseId, reference: b.reference, amount: b.balance, currency: b.currency }));
  return { blocking: debts.length > 0, debts };
}

/** Dettes de plusieurs locataires (principal OU co-locataire actif) en lot : pas de N+1. */
export async function loadFormerDebtsForTenants(db: Database, orgId: number, tenantIds: number[], now: Date = new Date()) {
  const out = new Map<number, Array<{ leaseId: number; reference: string; amount: string; currency: EndedLeaseBalanceWithCurrency["currency"] }>>();
  const ids = [...new Set(tenantIds.map(Number))].filter((n) => n > 0);
  if (!ids.length) return out;
  const links = await db
    .select({ leaseId: realEstateLeaseCotenants.leaseId, customerId: realEstateLeaseCotenants.customerId })
    .from(realEstateLeaseCotenants)
    .where(and(
      eq(realEstateLeaseCotenants.organizationId, orgId),
      inArray(realEstateLeaseCotenants.customerId, ids),
      eq(realEstateLeaseCotenants.isActive, 1),
    ));
  const coLeaseIds = links.map((l) => Number(l.leaseId));
  const leases = await db
    .select({ id: realEstateLeases.id, tenantId: realEstateLeases.tenantId })
    .from(realEstateLeases)
    .where(and(
      eq(realEstateLeases.organizationId, orgId),
      eq(realEstateLeases.status, FORMER_DEBT_STATUS),
      coLeaseIds.length ? or(inArray(realEstateLeases.tenantId, ids), inArray(realEstateLeases.id, coLeaseIds))! : inArray(realEstateLeases.tenantId, ids),
    ))
    .orderBy(desc(realEstateLeases.id));
  const balances = await loadEndedLeaseBalances(db, orgId, leases.map((l) => Number(l.id)), now);
  for (const l of leases) {
    const b = balances.get(Number(l.id));
    if (!b || b.balanceMinor <= 0) continue;
    const holders = new Set<number>([Number(l.tenantId), ...links.filter((k) => Number(k.leaseId) === Number(l.id)).map((k) => Number(k.customerId))]);
    for (const t of holders) {
      if (!ids.includes(t)) continue;
      const list = out.get(t) ?? [];
      list.push({ leaseId: b.leaseId, reference: b.reference, amount: b.balance, currency: b.currency });
      out.set(t, list);
    }
  }
  return out;
}
