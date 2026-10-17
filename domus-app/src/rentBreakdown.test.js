import { describe, expect, it } from "vitest";
import { splitRentPayments } from "./rentBreakdown.js";

const now = new Date(2026, 9, 16);
const sum = (rows) => rows.reduce((s, p) => s + p.amount, 0);

describe("splitRentPayments", () => {
  const rows = [
    { id: 1, status: "paid", amount: 100, paymentDate: "2026-09-01" },
    { id: 2, status: "pending", amount: 50, paymentDate: "2026-08-01" },
    { id: 3, status: "pending", amount: 70, paymentDate: "2026-11-01" },
    { id: 4, status: "voided", amount: 999, paymentDate: "2026-11-01" },
    { id: 5, status: "pending", amount: 888, paymentDate: "2026-12-01", rowKind: "due" },
    { id: 6, status: "settled", amount: 777, paymentDate: "2026-01-01" },
    { id: 7, status: "paid", amount: 5, paymentDate: "2026-10-16" },
  ];
  it("repartit paid / pending passe / pending futur", () => {
    const r = splitRentPayments(rows, now);
    expect(sum(r.paid)).toBe(105);
    expect(sum(r.pendingPast)).toBe(50);
    expect(sum(r.upcoming)).toBe(70 + 888);
  });
  it("exclut voided, settled, due et supprimes", () => {
    const r = splitRentPayments([...rows, { id: 8, status: false, amount: 1 }], now);
    const ids = [...r.paid, ...r.upcoming, ...r.pendingPast].map((p) => p.id);
    expect(ids.sort()).toEqual([1, 2, 3, 5, 7]);
    expect(r.paid.map((p) => p.id)).not.toContain(5);
  });
  it("echeance future (rowKind due) : A venir pour son reste, jamais encaisse", () => {
    const r = splitRentPayments([
      { id: 9, status: "pending", rowKind: "due", amount: 3000, amountPaid: 1000, periodStart: "2026-11-01" },
      { id: 10, status: "pending", rowKind: "due", amount: 3000, amountPaid: 0, periodStart: "2026-09-01" },
      { id: 11, status: "settled", rowKind: "due", amount: 3000, amountPaid: 3000, periodStart: "2026-12-01" },
    ], now);
    expect(r.upcoming.map((p) => [p.id, p.amount])).toEqual([[9, 2000]]);
    expect(r.paid).toEqual([]);
  });
});
