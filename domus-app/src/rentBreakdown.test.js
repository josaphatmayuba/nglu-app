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
    expect(sum(r.upcoming)).toBe(70);
  });
  it("exclut voided, settled, due et supprimes", () => {
    const r = splitRentPayments([...rows, { id: 8, status: false, amount: 1 }], now);
    const ids = [...r.paid, ...r.upcoming, ...r.pendingPast].map((p) => p.id);
    expect(ids.sort()).toEqual([1, 2, 3, 7]);
  });
});
