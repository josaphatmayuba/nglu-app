import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLeaseCards } from "./loyers.jsx";
import { buildFullRentSchedule } from "../rentBookUtils.js";
import { allocationsOfPayment, futureBeforeLate } from "../duesUtils.js";

const NOW = new Date(2026, 9, 16, 12);
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => vi.useRealTimers());

const ym = ["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06"];
const mkDue = (i, o = {}) => {
  const amount = i === 0 ? 1645.16 : 3000;
  const start = i === 0 ? "2026-07-15" : `${ym[i]}-01`;
  return { id: 100 + i, periodStart: start, periodEnd: `${ym[i]}-28`, amount, amountPaid: 0, remaining: amount, dueStatus: "pending", status: true, allocations: [], ...o };
};
const paidDue = (i, pid) => mkDue(i, { amountPaid: mkDue(i).amount, remaining: 0, dueStatus: "paid", allocations: [{ paymentId: pid, amount: mkDue(i).amount }] });
const lease = (dues, o = {}) => ({ id: 11, status: "active", rentAmount: 3000, startDate: "2026-07-15", endDate: "2027-07-14", graceDays: 15, rentProrationEnabled: true, allocationLedger: true, credit: 0, dues, ...o });
const bail11 = () => ym.map((_, i) => (i === 0 ? paidDue(0, 1) : i === 1 ? paidDue(1, 2) : mkDue(i)));
const pays = [
  { id: 1, leaseId: 11, status: "paid", amount: 1645.16, paymentDate: "2026-07-20", method: "Cash" },
  { id: 2, leaseId: 11, status: "paid", amount: 3000, paymentDate: "2026-08-02", method: "Cash" },
];

describe("carte depuis dues (bail flagge)", () => {
  it("bail 11 : juil/aout payes, sept en retard, oct du, 2/12, reste 6000", () => {
    const [c] = buildLeaseCards([lease(bail11())], pays);
    expect(c.dueFrise.kinds.slice(0, 5)).toEqual(["paid", "paid", "late", "due", "future"]);
    expect(c.dueFrise.kinds.filter((k) => k === "paid").length).toBe(2);
    expect(c.dueFrise.kinds.length).toBe(12);
    expect(c.balance).toBeCloseTo(6000, 2);
    expect(c.status).toBe("late");
    expect(c.monthsBehind).toBe(2);
    expect(c.credit).toBe(0);
  });

  it("paiement partiel : partial dans la grace avec reste, late apres", () => {
    const d = bail11();
    d[3] = mkDue(3, { amountPaid: 1000, remaining: 2000, dueStatus: "partially_paid" });
    d[2] = mkDue(2, { amountPaid: 500, remaining: 2500, dueStatus: "partially_paid" });
    const [c] = buildLeaseCards([lease(d)], pays);
    expect(c.dueFrise.kinds.slice(2, 4)).toEqual(["late", "partial"]);
    expect(c.dueFrise.fills[3]).toBe(33);
    expect(c.balance).toBeCloseTo(4500, 2);
  });

  it("avance : credit expose et mois futur paye", () => {
    const d = bail11();
    d[4] = paidDue(4, 3);
    const [c] = buildLeaseCards([lease(d, { credit: 250 })], pays);
    expect(c.credit).toBe(250);
    expect(c.dueFrise.kinds[4]).toBe("paid");
    expect(c.monthsAhead).toBe(1);
  });

  it("jour J : echeance du jour echue (comme le serveur), lendemain non ; reste = lease.totalDue", () => {
    const dJ = mkDue(3, { periodStart: "2026-10-01", dueDate: "2026-10-16" });
    const dNext = mkDue(4, { periodStart: "2026-10-01", dueDate: "2026-10-17" });
    const [c1] = buildLeaseCards([lease([paidDue(0, 1), paidDue(1, 2), mkDue(2, { dueDate: "2026-09-15" }), dJ, dNext])], pays);
    expect(c1.balance).toBeCloseTo(6000, 2);
    expect(c1.monthsBehind).toBe(2);
    const [c2] = buildLeaseCards([lease([dJ, dNext], { totalDue: 1234.5 })], pays);
    expect(c2.balance).toBeCloseTo(1234.5, 2);
  });

  it("imputations d'un paiement et avertissement mois futur avant retard", () => {
    const d = bail11();
    d[4] = paidDue(4, 3);
    expect(allocationsOfPayment(d, 3)).toHaveLength(1);
    const picked = new Map([[d[4].id, 3000]]);
    expect(futureBeforeLate(d, picked, 15, NOW)).toBe(true);
    expect(futureBeforeLate(d, new Map([[d[2].id, 3000]]), 15, NOW)).toBe(false);
  });

  it("carnet : une ligne par echeance avec paiements lies", () => {
    const l = lease(bail11(), { currencySymbol: "$" });
    const s = buildFullRentSchedule(l, pays);
    expect(s).toHaveLength(12);
    expect(s[0].status).toBe("paid");
    expect(s[0].linkedPayments[0].amount).toBe(1645.16);
    expect(s[2].status).toBe("pending");
  });
});

describe("non-regression : bail non flagge", () => {
  it("sans allocationLedger : chemin historique, pas de dueFrise", () => {
    const l = lease(bail11(), { allocationLedger: false });
    const [c] = buildLeaseCards([l], pays);
    expect(c.dueFrise).toBeUndefined();
  });
});

describe("frise : total = periodes du bail", () => {
  it("dues generees jusqu'a aujourd'hui (4) : 12 cases, mois futurs a venir", () => {
    const [c] = buildLeaseCards([lease(bail11().slice(0, 4))], pays);
    expect(c.dueFrise.kinds.length).toBe(12);
    expect(c.dueFrise.kinds.slice(4)).toEqual(Array(8).fill("future"));
    expect(c.dueFrise.fills.length).toBe(12);
    expect(c.dueFrise.months[4].getMonth()).toBe(10);
    expect(c.dueFrise.months[11].getFullYear()).toBe(2027);
    expect(c.dueFrise.kinds.filter((k) => k === "paid").length).toBe(2);
    expect(c.monthsDue).toBe(4);
  });
});
