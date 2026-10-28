import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLeaseCards, cardFriseLateDue, leaseTotalMonths } from "./loyers.jsx";

// KPI « Impayé échu » du tableau de bord = Retard de la carte Loyers (grâce dépassée).
const NOW = new Date(2026, 9, 28, 12);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

const lease = (o = {}) => ({ id: 8, status: "active", rentAmount: 1500, startDate: "2025-10-01", endDate: null, ...o });
const paid = (amount, paymentDate) => ({ leaseId: 8, status: "paid", amount, paymentDate });
const payments = [paid(1500, "2026-10-08"), ...["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((m) => paid(1500, `${m}-01`))];

describe("Impayé échu hors délai de grâce", () => {
  it("grâce 36 j : octobre (dans la grâce) exclu, juil-sept comptés", () => {
    const [c] = buildLeaseCards([lease({ graceDays: 36 })], payments);
    expect(c.balance).toBeCloseTo(6000, 2);
    const { late, due } = cardFriseLateDue(c).lateDue;
    expect(late).toBeCloseTo(4500, 2);
    expect(due).toBeCloseTo(1500, 2);
  });

  it("grâce dépassée pour octobre : tout le solde est en retard", () => {
    const [c] = buildLeaseCards([lease({ graceDays: 5 })], payments);
    expect(cardFriseLateDue(c).lateDue.late).toBeCloseTo(6000, 2);
  });

  it("rien en retard tant que la seule échéance est dans la grâce", () => {
    const [c] = buildLeaseCards([lease({ graceDays: 36 })], [...payments, paid(4500, "2026-10-20")]);
    expect(cardFriseLateDue(c).lateDue.late).toBe(0);
  });
});

describe("fin de bail (règle backend : échéance >= date de fin non due)", () => {
  it("mois facturables", () => {
    expect(leaseTotalMonths({ startDate: "2025-10-01", endDate: "2026-10-01" })).toBe(12);
    expect(leaseTotalMonths({ startDate: "2025-10-01", endDate: "2026-09-30" })).toBe(12);
    expect(leaseTotalMonths({ startDate: "2025-10-01", endDate: "2026-10-02" })).toBe(13);
    expect(leaseTotalMonths({ startDate: "2026-01-15", endDate: "2027-01-14" })).toBe(12);
    expect(leaseTotalMonths({ startDate: "2026-01-15", endDate: "2026-01-15" })).toBe(1);
    expect(leaseTotalMonths({ startDate: "2026-01-15", endDate: null })).toBeNull();
  });

  it("bail #8 fini le 01/10/2026 : octobre 2026 n'est pas dû", () => {
    const [c] = buildLeaseCards([lease({ endDate: "2026-10-01", graceDays: 5 })], payments);
    expect(c.monthsDue).toBe(12);
    expect(c.balance).toBeCloseTo(4500, 2);
    expect(c.status).toBe("late");
    expect(cardFriseLateDue(c).lateDue.late).toBeCloseTo(4500, 2);
  });

  it("bail fini et soldé : à jour", () => {
    const [c] = buildLeaseCards([lease({ endDate: "2026-10-01", graceDays: 5 })], [...payments, paid(4500, "2026-10-20")]);
    expect(c.balance).toBe(0);
    expect(c.status).toBe("ok");
  });
});
