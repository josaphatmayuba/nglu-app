import {
  computeLeaseOverdueStats,
  daysSince,
  isPastGrace,
  normalizeGraceDays,
  paymentOverdueFields,
} from "./lease-overdue";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("isPastGrace", () => {
  it("jour J (date + grace) pas en retard, lendemain en retard", () => {
    expect(isPastGrace("2026-09-01", d("2026-09-06"), 5)).toBe(false);
    expect(isPastGrace("2026-09-01", d("2026-09-07"), 5)).toBe(true);
  });
  it("grace 0 : en retard des le lendemain de l echeance", () => {
    expect(isPastGrace("2026-09-01", d("2026-09-01"), 0)).toBe(false);
    expect(isPastGrace("2026-09-01", d("2026-09-02"), 0)).toBe(true);
  });
});

describe("normalizeGraceDays / daysSince", () => {
  it("borne 0..60 sinon defaut 5", () => {
    expect(normalizeGraceDays(30)).toBe(30);
    expect(normalizeGraceDays(0)).toBe(0);
    expect(normalizeGraceDays(61)).toBe(5);
    expect(normalizeGraceDays(null)).toBe(5);
  });
  it("jours depuis l echeance", () => {
    expect(daysSince("2026-10-01", d("2026-10-12"))).toBe(11);
  });
});

describe("computeLeaseOverdueStats", () => {
  // Echeances impayees au 01/08, 01/09, 01/10 ; aujourd hui 12/10.
  const run = (grace: number) =>
    computeLeaseOverdueStats("2026-08-01", null, "monthly", [], 100, d("2026-10-12"), grace);

  it("grace 30 : 2 en retard, la 3e (01/10) est echue seulement", () => {
    const s = run(30);
    expect(s.dueCount).toBe(3);
    expect(s.unpaidCount).toBe(2);
    expect(s.lateCount).toBe(2);
    expect(s.isOverdue).toBe(true);
    expect(s.overdueDueDate).toBe("2026-08-01");
    expect(s.overdueDays).toBe(72);
    expect(s.graceDays).toBe(30);
  });
  it("grace 0 : 3 en retard", () => {
    expect(run(0).unpaidCount).toBe(3);
  });
  it("grace 60 : 1 en retard", () => {
    expect(run(60).unpaidCount).toBe(1);
  });
  it("echeance du jour dans la grace : aucun retard, overdueDays 0", () => {
    const t = computeLeaseOverdueStats("2026-10-01", null, "monthly", [], 100, d("2026-10-12"), 30);
    expect(t.isOverdue).toBe(false);
    expect(t.overdueDays).toBe(0);
    expect(t.dueCount).toBe(1);
  });
  it("paiement fait apres la grace compte dans lateCount mais pas unpaidCount", () => {
    const s = computeLeaseOverdueStats(
      "2026-08-01", null, "monthly", [{ date: "2026-09-20", amount: 100 }], 100, d("2026-10-12"), 5,
    );
    expect(s.lateCount).toBeGreaterThanOrEqual(1);
    expect(s.unpaidCount).toBe(s.lateCount - 1);
  });
});

describe("paymentOverdueFields", () => {
  it("seules les echeances pending peuvent etre en retard", () => {
    expect(paymentOverdueFields("paid", "2026-01-01", d("2026-10-12"), 5).isOverdue).toBe(false);
    expect(paymentOverdueFields("pending", "2026-10-01", d("2026-10-12"), 30)).toEqual({ isOverdue: false, daysPastDue: 11 });
    expect(paymentOverdueFields("pending", "2026-09-13", d("2026-10-12"), 30)).toEqual({ isOverdue: false, daysPastDue: 29 });
    expect(paymentOverdueFields("pending", "2026-09-13", d("2026-10-14"), 30).isOverdue).toBe(true);
  });
});
