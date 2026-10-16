import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLeaseCards } from "./loyers.jsx";
import { friseKinds } from "../overdue.js";

const NOW = new Date(2026, 9, 16, 12);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

const lease = (o = {}) => ({ id: 11, status: "active", rentAmount: 3000, startDate: "2026-07-15", graceDays: 15, rentProrationEnabled: true, billingCycle: "monthly", ...o });
const pending = (ym) => ({ leaseId: 11, status: "pending", amount: 3000, periodStart: `${ym}-01`, periodEnd: `${ym}-28`, paymentDate: `${ym}-01` });
const paid = (amount, extra = {}) => ({ leaseId: 11, status: "paid", amount, paymentDate: "2026-07-20", ...extra });
const frise = (c, l) => friseKinds({
  startDate: l.startDate, graceDays: l.graceDays, prorata: true,
  periodStarts: c.list.filter((p) => p.periodStart).map((p) => p.periodStart).sort(),
  totalMonths: 12, monthsDue: c.monthsDue, monthsCoveredFloat: c.monthsCoveredFloat, now: NOW,
});
const months = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06"];

describe("couverture par mois civil (prorata)", () => {
  it("bail 11 : paiements sans periode, echeances sept->juin", () => {
    const l = lease();
    const [c] = buildLeaseCards([l], [paid(1645.16), paid(3000, { paymentDate: "2026-08-02" }), ...months.map(pending)]);
    expect(c.monthsCoveredFloat).toBeCloseTo(2, 5);
    expect(c.balance).toBeCloseTo(6000, 2);
    const k = frise(c, l).kinds;
    expect(k.slice(0, 4)).toEqual(["paid", "paid", "late", "due"]);
    expect(k.filter((x) => x === "paid").length).toBe(2);
    expect(k).not.toContain("partial");
  });

  it("prorata avec paiements portant une periode", () => {
    const l = lease();
    const rows = [
      paid(1645.16, { periodStart: "2026-07-15", periodEnd: "2026-07-31" }),
      paid(3000, { periodStart: "2026-08-01", periodEnd: "2026-08-31", paymentDate: "2026-08-02" }),
    ];
    const [c] = buildLeaseCards([l], [...rows, ...months.map(pending)]);
    expect(frise(c, l).kinds.slice(0, 4)).toEqual(["paid", "paid", "late", "due"]);
    expect(c.monthsCoveredFloat).toBeCloseTo(2, 5);
  });

  it("1re periode prorata payee seule = 1 mois plein, pas partiel", () => {
    const [c] = buildLeaseCards([lease()], [paid(1645.16)]);
    expect(c.monthsCoveredFloat).toBeCloseTo(1, 5);
  });

  it("bail demarrant le 1er", () => {
    const l = lease({ startDate: "2026-07-01" });
    const [c] = buildLeaseCards([l], [paid(3000), paid(3000, { paymentDate: "2026-08-02" })]);
    expect(c.monthsCoveredFloat).toBeCloseTo(2, 5);
    expect(c.balance).toBeCloseTo(6000, 2);
  });

  it("bail non prorata classique", () => {
    const l = lease({ rentProrationEnabled: false, startDate: "2026-08-01" });
    const [c] = buildLeaseCards([l], [paid(3000), paid(1500, { paymentDate: "2026-09-02" })]);
    expect(c.monthsCoveredFloat).toBeCloseTo(1.5, 5);
    expect(c.balance).toBeCloseTo(4500, 2);
  });
});
