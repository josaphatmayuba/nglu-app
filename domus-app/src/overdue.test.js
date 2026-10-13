import { describe, expect, it } from "vitest";
import { classifyDue, countLateDues, dueChipFor, dueDateForMonth, friseKinds, isPaymentOverdue, leaseCardStatus, parseLocalDay } from "./overdue.js";

const NOW = new Date(2026, 9, 12, 10, 0, 0); // 12/10/2026 local

describe("classifyDue / countLateDues", () => {
  // Echeances impayees au 01/08, 01/09, 01/10 (aujourd hui 12/10).
  const dues = ["2026-08-01", "2026-09-01", "2026-10-01"];
  it("grace 30 : 2 en retard, la 3e est echue", () => {
    expect(countLateDues(dues, 30, NOW)).toBe(2);
    expect(classifyDue("2026-10-01", 30, NOW)).toBe("due");
  });
  it("grace 0 : 3 en retard", () => expect(countLateDues(dues, 0, NOW)).toBe(3));
  it("grace 60 : 1 en retard", () => expect(countLateDues(dues, 60, NOW)).toBe(1));
  it("jour J (date + grace) pas en retard, lendemain en retard", () => {
    expect(classifyDue("2026-09-12", 30, NOW)).toBe("due"); // 12/09 + 30 = 12/10
    expect(classifyDue("2026-09-11", 30, NOW)).toBe("late");
  });
  it("echeance a venir ou du jour = upcoming", () => {
    expect(classifyDue("2026-10-12", 0, NOW)).toBe("upcoming");
    expect(classifyDue("2026-11-01", 0, NOW)).toBe("upcoming");
  });
  it("sans graceDays : ancienne regle, toute echeance passee est en retard", () => {
    expect(classifyDue("2026-10-01", null, NOW)).toBe("late");
  });
});

describe("leaseCardStatus", () => {
  it("flag backend prioritaire", () => {
    expect(leaseCardStatus({ isOverdue: true }, 0, NOW)).toBe("late");
    expect(leaseCardStatus({ isOverdue: false, nextDueDate: "2026-01-01" }, 100, NOW)).toBe("pending");
    expect(leaseCardStatus({ isOverdue: false }, 0, NOW)).toBe("ok");
  });
  it("sans flag : date + graceDays", () => {
    expect(leaseCardStatus({ graceDays: 30, nextDueDate: "2026-10-01" }, 600, NOW)).toBe("pending");
    expect(leaseCardStatus({ graceDays: 5, nextDueDate: "2026-10-01" }, 600, NOW)).toBe("late");
  });
  it("sans flag ni grace : ancienne regle", () => {
    expect(leaseCardStatus({ nextDueDate: "2026-10-01" }, 600, NOW)).toBe("late");
    expect(leaseCardStatus({}, 0, NOW)).toBe("ok");
  });
  it("prorata : echeances pending 13/09 et 01/10, grace 30 -> aucune en retard", () => {
    const l = { graceDays: 30, isOverdue: false, nextDueDate: "2026-09-13" };
    expect(leaseCardStatus(l, 960, NOW)).toBe("pending");
  });
});

describe("isPaymentOverdue", () => {
  it("flag backend prioritaire, sinon date + grace", () => {
    expect(isPaymentOverdue({ status: "pending", paymentDate: "2026-01-01", isOverdue: false }, 30, NOW)).toBe(false);
    expect(isPaymentOverdue({ status: "pending", paymentDate: "2026-10-01" }, 30, NOW)).toBe(false);
    expect(isPaymentOverdue({ status: "pending", paymentDate: "2026-09-13" }, 30, NOW)).toBe(false);
    expect(isPaymentOverdue({ status: "pending", paymentDate: "2026-09-11" }, 30, NOW)).toBe(true);
    expect(isPaymentOverdue({ status: "paid", paymentDate: "2026-01-01" }, 0, NOW)).toBe(false);
  });
});

describe("dueChipFor", () => {
  it("en retard uniquement si le bail l est (flag)", () => {
    expect(dueChipFor({ isOverdue: true, overdueDays: 72 }, "2026-10-01", NOW)).toEqual({ kind: "overdue", days: 72 });
    expect(dueChipFor({ isOverdue: false }, "2026-10-01", NOW)).toEqual({ kind: "due", days: 11 });
  });
  it("sans flag : grace puis ancienne regle", () => {
    expect(dueChipFor({ graceDays: 30 }, "2026-10-01", NOW).kind).toBe("due");
    expect(dueChipFor({}, "2026-10-01", NOW).kind).toBe("overdue");
  });
  it("a venir / aucune date", () => {
    expect(dueChipFor({ isOverdue: false }, "2026-10-15", NOW).kind).toBe("soon");
    expect(dueChipFor({}, null, NOW).kind).toBe("none");
  });
});

describe("dates locales", () => {
  it("parseLocalDay lit AAAA-MM-JJ en jour local", () => {
    const d = parseLocalDay("2026-10-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1]);
  });
  it("dueDateForMonth clamp fin de mois", () => {
    const d = dueDateForMonth("2026-01-31", 1);
    expect([d.getMonth(), d.getDate()]).toEqual([1, 28]);
  });
});

describe("friseKinds", () => {
  const base = { totalMonths: 6, monthsCoveredFloat: 1 };
  it("prorata debut 20/09, grace 5, au 07/10 : Oct rouge (echeance le 1er), compteur 1", () => {
    const now = new Date(2026, 9, 7, 10);
    const r = friseKinds({ ...base, startDate: "2026-09-20", graceDays: 5, prorata: true, monthsDue: 2, now });
    expect(r.kinds.slice(0, 3)).toEqual(["paid", "late", "future"]);
    expect(r.lateCount).toBe(1);
    // Regle ancree sur le jour de debut (non prorata) : 20/10 pas atteint -> pas en retard.
    const r2 = friseKinds({ ...base, startDate: "2026-09-20", graceDays: 5, prorata: false, monthsDue: 2, now });
    expect(r2.kinds[1]).toBe("cur");
  });
  it("compteur == cases rouges ; echu dans la grace = due", () => {
    const now = new Date(2026, 9, 12, 10);
    const r = friseKinds({ totalMonths: 6, monthsDue: 3, monthsCoveredFloat: 0, startDate: "2026-08-01", graceDays: 30, now });
    expect(r.kinds.slice(0, 4)).toEqual(["late", "late", "due", "future"]);
    expect(r.lateCount).toBe(r.kinds.filter((k) => k === "late").length);
  });
  it("partial conserve ; compte seulement si echeance en retard", () => {
    const now = new Date(2026, 9, 12, 10);
    const r = friseKinds({ totalMonths: 4, monthsDue: 3, monthsCoveredFloat: 0.5, startDate: "2026-08-01", graceDays: 30, now });
    expect(r.kinds[0]).toBe("partial");
    expect(r.lateCount).toBe(2);
  });
  it("sans graceDays : ancienne classification", () => {
    const now = new Date(2026, 9, 12, 10);
    const r = friseKinds({ totalMonths: 4, monthsDue: 3, monthsCoveredFloat: 0, startDate: "2026-08-01", graceDays: null, now });
    expect(r.kinds.slice(0, 4)).toEqual(["late", "late", "cur", "future"]);
    expect(r.lateCount).toBe(2);
  });
});
