import { and, eq, inArray } from "drizzle-orm";
import { realEstateRentPayments } from "../database/schema";
import type { Database } from "../database/types";
import { computeLeaseNextDue, todayDateOnly, type LeaseNextDue, type ProrationLease } from "./lease-proration";

export type NextDueLeaseRow = ProrationLease & { id: number; currencyDecimals?: number | null };

/**
 * Prochaine echeance (nextDueDate / nextDueAmount / isProratedNext) par bail,
 * pour les portails et les rappels. Baux sans prorata : valeurs historiques
 * (loyer du bail, nextInvoiceDate) sans aucune requete supplementaire.
 */
export async function loadNextDueByLease(
  db: Database,
  organizationId: number,
  leases: NextDueLeaseRow[],
): Promise<Map<number, LeaseNextDue>> {
  const out = new Map<number, LeaseNextDue>();
  const todayStr = todayDateOnly();
  const prorated = leases.filter((l) => !!l.rentProrationEnabled);
  const paidByLease = new Map<number, number[]>();
  if (prorated.length) {
    const rows = await db
      .select({ leaseId: realEstateRentPayments.leaseId, amount: realEstateRentPayments.amount })
      .from(realEstateRentPayments)
      .where(and(
        eq(realEstateRentPayments.organizationId, organizationId),
        eq(realEstateRentPayments.status, "paid"),
        inArray(realEstateRentPayments.leaseId, prorated.map((l) => l.id)),
      ));
    for (const r of rows) {
      const list = paidByLease.get(r.leaseId) ?? [];
      list.push(Number(r.amount || 0));
      paidByLease.set(r.leaseId, list);
    }
  }
  for (const l of leases) {
    const dec = Number(l.currencyDecimals);
    const decimals = Number.isInteger(dec) && dec >= 0 && dec <= 6 ? dec : 2;
    out.set(l.id, computeLeaseNextDue(l, paidByLease.get(l.id) ?? [], decimals, todayStr));
  }
  return out;
}
