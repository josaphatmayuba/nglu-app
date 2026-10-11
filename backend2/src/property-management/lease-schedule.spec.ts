import { anchoredPeriodDays, addBillingCycle, applyCoverage, buildLeaseSchedule, parseDateOnly } from "./lease-schedule";

const base = { rentAmount: 550, billingCycle: "monthly" as const };

describe("buildLeaseSchedule", () => {
  it("prorata derniere periode 2026-10-11 -> 2027-09-30", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-09-30" });
    expect(s).toHaveLength(12);
    expect(s.slice(0, 11).every((p) => p.amount === 550 && !p.prorated)).toBe(true);
    const last = s[11];
    expect(last).toMatchObject({ amount: 366.67, days: 20, periodDays: 30, dueDate: "2027-09-11", periodEnd: "2027-09-30", prorated: true });
    expect(s.reduce((t, p) => t + p.amount, 0)).toBeCloseTo(6416.67, 2);
  });

  it("fin la veille de l'anniversaire = 12 pleines", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-10-10" });
    expect(s).toHaveLength(12);
    expect(s.every((p) => p.amount === 550 && !p.prorated)).toBe(true);
    expect(s[11].periodEnd).toBe("2027-10-10");
  });

  it("fin le jour anniversaire = 12 pleines (regle existante)", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-10-11" });
    expect(s).toHaveLength(12);
    expect(s.every((p) => !p.prorated)).toBe(true);
  });

  it("debut 1er janvier -> 31 decembre = 12 pleines", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(s).toHaveLength(12);
    expect(s.every((p) => p.amount === 550 && !p.prorated)).toBe(true);
  });

  it("debut le 31: clamp fevrier sans derive", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-31", endDate: null, horizonPeriods: 4 });
    expect(s.map((p) => p.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(s[0].periodEnd).toBe("2026-02-27");
    expect(s[1].periodEnd).toBe("2026-03-30");
  });

  it("trimestriel avec fin incomplete", () => {
    const s = buildLeaseSchedule({ startDate: "2026-01-01", endDate: "2026-11-15", billingCycle: "quarterly", rentAmount: 900 });
    expect(s).toHaveLength(4);
    expect(s[2].amount).toBe(900);
    const last = s[3]; // 2026-10-01 -> 2026-12-31 (92j), fin 11-15 = 46j
    expect(last).toMatchObject({ days: 46, periodDays: 92, amount: 450, prorated: true });
  });

  it("annuel", () => {
    const s = buildLeaseSchedule({ startDate: "2026-03-01", endDate: "2028-08-31", billingCycle: "annual", rentAmount: 1200 });
    expect(s).toHaveLength(3);
    expect(s[0].amount).toBe(1200);
    expect(s[2].prorated).toBe(true);
    expect(s[2].days).toBe(184);
    expect(s[2].periodDays).toBe(365);
    expect(s[2].amount).toBe(604.93);
  });

  it("sans endDate: horizon de periodes pleines", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: null });
    expect(s).toHaveLength(12);
    expect(s.every((p) => !p.prorated && p.amount === 550)).toBe(true);
    expect(buildLeaseSchedule({ ...base, startDate: "2026-10-11", horizonPeriods: 3 })).toHaveLength(3);
  });

  it("devise sans decimale", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-09-30", currencyDecimals: 0 });
    expect(s[11].amount).toBe(367);
  });

  it("addBillingCycle ancre sur la date d'origine", () => {
    expect(addBillingCycle(parseDateOnly("2026-01-31"), "monthly", 2).toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

describe("applyCoverage", () => {
  const sched = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-09-30" });

  it("paiement groupe de 3 mois", () => {
    const c = applyCoverage(sched, [1650], "2026-12-20");
    expect(c.coveredCount).toBe(3);
    expect(c.coveredUntil).toBe("2027-01-10");
    expect(c.firstUncovered?.index).toBe(3);
    expect(c.nextDueDate).toBe("2027-01-11");
    expect(c.nextDueAmount).toBe(550);
    expect(c.balance).toBe(0);
  });

  it("paiement partiel", () => {
    const c = applyCoverage(sched, [{ amount: 300 }], "2026-10-20");
    expect(c.coveredCount).toBe(0);
    expect(c.coveredUntil).toBeNull();
    expect(c.nextDueDate).toBe("2026-10-11");
    expect(c.nextDueAmount).toBe(250);
    expect(c.balance).toBe(250);
    expect(c.credit).toBe(0);
  });

  it("partiel apres couverture + reste", () => {
    const c = applyCoverage(sched, [550, 100], "2026-11-15");
    expect(c.coveredCount).toBe(1);
    expect(c.nextDueAmount).toBe(450);
    expect(c.balance).toBe(450);
  });

  it("paiement d'avance", () => {
    const c = applyCoverage(sched, [550 * 5], "2026-10-15");
    expect(c.coveredCount).toBe(5);
    expect(c.balance).toBe(0);
    expect(c.credit).toBe(2200);
    expect(c.totalDueThrough("2026-10-15")).toBe(550);
  });

  it("credit si la derniere periode prorata est payee 550", () => {
    const c = applyCoverage(sched, Array(12).fill(550), "2027-10-01");
    expect(c.coveredCount).toBe(12);
    expect(c.firstUncovered).toBeNull();
    expect(c.nextDueDate).toBeNull();
    expect(c.coveredUntil).toBe("2027-09-30");
    expect(c.balance).toBe(0);
    expect(c.credit).toBe(183.33);
  });
});

describe("debut les 29/30/31 et bail d'un jour", () => {
  it("debut 31/01, fin 15/03 : derniere periode 16 j / 31", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-31", endDate: "2026-03-15" });
    expect(s[s.length - 1]).toMatchObject({ periodStart: "2026-02-28", days: 16, periodDays: 31, prorated: true });
    expect(anchoredPeriodDays("2026-01-31", "monthly", "2026-02-28")).toBe(31);
  });
  it("fin == debut : au moins 1 echeance", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-10", endDate: "2026-01-10" });
    expect(s).toHaveLength(1);
    expect(s[0].days).toBe(1);
  });
});
