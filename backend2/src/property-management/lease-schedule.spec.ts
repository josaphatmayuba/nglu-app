import { isLegacyAnchoredPeriod, anchoredPeriodDays, addBillingCycle, applyCoverage, buildLeaseSchedule, parseDateOnly } from "./lease-schedule";

const base = { rentAmount: 550, billingCycle: "monthly" as const };

describe("buildLeaseSchedule", () => {
  it("mensuel civil 2026-10-06 -> 2027-09-30 : 1re periode prorata, derniere pleine", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-06", endDate: "2027-09-30" });
    expect(s).toHaveLength(12); // oct 2026 .. sept 2027
    expect(s[0]).toMatchObject({ periodStart: "2026-10-06", periodEnd: "2026-10-31", dueDate: "2026-10-06", days: 26, periodDays: 31, amount: 461.29, prorated: true });
    expect(s[1]).toMatchObject({ periodStart: "2026-11-01", periodEnd: "2026-11-30", dueDate: "2026-11-01", amount: 550, prorated: false });
    expect(s[11]).toMatchObject({ periodStart: "2027-09-01", periodEnd: "2027-09-30", amount: 550, prorated: false });
    expect(s.slice(1).every((p) => p.amount === 550 && !p.prorated)).toBe(true);
  });

  it("mensuel civil 2026-10-11 -> 2027-09-15 : derniere periode prorata", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-09-15" });
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ days: 21, periodDays: 31, amount: 372.58, prorated: true });
    expect(s[11]).toMatchObject({ periodStart: "2027-09-01", periodEnd: "2027-09-15", days: 15, periodDays: 30, amount: 275, prorated: true });
  });

  it("fin le 10 du mois d'anniversaire : derniere periode 10/31", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-10-10" });
    expect(s).toHaveLength(13);
    expect(s[12]).toMatchObject({ periodStart: "2027-10-01", periodEnd: "2027-10-10", days: 10, periodDays: 31, amount: 177.42 });
  });

  it("debut 1er janvier -> 31 decembre = 12 pleines", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(s).toHaveLength(12);
    expect(s.every((p) => p.amount === 550 && !p.prorated)).toBe(true);
  });

  it("debut le 31 (mensuel civil) : 1 jour puis 1er du mois", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-31", endDate: null, horizonPeriods: 4 });
    expect(s.map((p) => p.dueDate)).toEqual(["2026-01-31", "2026-02-01", "2026-03-01", "2026-04-01"]);
    expect(s[0]).toMatchObject({ periodEnd: "2026-01-31", days: 1, periodDays: 31 });
    expect(s[1].periodEnd).toBe("2026-02-28");
  });

  it("trimestriel/annuel restent ancres sur la date de debut", () => {
    const q = buildLeaseSchedule({ startDate: "2026-10-11", endDate: null, billingCycle: "quarterly", rentAmount: 900, horizonPeriods: 2 });
    expect(q.map((p) => p.periodStart)).toEqual(["2026-10-11", "2027-01-11"]);
    expect(q[0].periodEnd).toBe("2027-01-10");
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

  it("sans endDate: horizon, 1re periode partielle puis pleines", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: null });
    expect(s).toHaveLength(12);
    expect(s[0].prorated).toBe(true);
    expect(s.slice(1).every((p) => !p.prorated && p.amount === 550)).toBe(true);
    expect(buildLeaseSchedule({ ...base, startDate: "2026-10-11", horizonPeriods: 3 })).toHaveLength(3);
  });

  it("devise sans decimale", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-11", endDate: "2027-09-30", currencyDecimals: 0 });
    expect(s[0].amount).toBe(373);
  });

  it("addBillingCycle ancre sur la date d'origine", () => {
    expect(addBillingCycle(parseDateOnly("2026-01-31"), "monthly", 2).toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

describe("applyCoverage", () => {
  const sched = buildLeaseSchedule({ ...base, startDate: "2026-10-01", endDate: "2027-09-15" });

  it("paiement groupe de 3 mois", () => {
    const c = applyCoverage(sched, [1650], "2026-12-20");
    expect(c.coveredCount).toBe(3);
    expect(c.coveredUntil).toBe("2026-12-31");
    expect(c.firstUncovered?.index).toBe(3);
    expect(c.nextDueDate).toBe("2027-01-01");
    expect(c.nextDueAmount).toBe(550);
    expect(c.balance).toBe(0);
  });

  it("paiement partiel", () => {
    const c = applyCoverage(sched, [{ amount: 300 }], "2026-10-20");
    expect(c.coveredCount).toBe(0);
    expect(c.coveredUntil).toBeNull();
    expect(c.nextDueDate).toBe("2026-10-01");
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

  it("credit si la derniere periode prorata (275) est payee 550", () => {
    const c = applyCoverage(sched, Array(12).fill(550), "2027-10-01");
    expect(c.coveredCount).toBe(12);
    expect(c.firstUncovered).toBeNull();
    expect(c.nextDueDate).toBeNull();
    expect(c.coveredUntil).toBe("2027-09-15");
    expect(c.balance).toBe(0);
    expect(c.credit).toBe(275);
  });
});

describe("debut les 29/30/31 et bail d'un jour", () => {
  it("debut 31/01, fin 15/03 : mois civils, derniere periode 15 j / 31", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-31", endDate: "2026-03-15" });
    expect(s).toHaveLength(3);
    expect(s[s.length - 1]).toMatchObject({ periodStart: "2026-03-01", days: 15, periodDays: 31, prorated: true });
    expect(anchoredPeriodDays("2026-01-31", "monthly", "2026-02-01")).toBe(28);
    expect(anchoredPeriodDays("2026-01-31", "quarterly", "2026-01-31")).toBe(89);
  });
  it("fin == debut : au moins 1 echeance", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-01-10", endDate: "2026-01-10" });
    expect(s).toHaveLength(1);
    expect(s[0].days).toBe(1);
  });
  it("bail finissant le 1er du mois : pas de periode d'un jour", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-01", endDate: "2027-01-01" });
    expect(s).toHaveLength(3);
    expect(s[2].periodEnd).toBe("2026-12-31");
  });
  it("fin == debut en mensuel : 1 echeance d'un jour sur le mois civil", () => {
    const s = buildLeaseSchedule({ ...base, startDate: "2026-10-31", endDate: "2026-10-31" });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ days: 1, periodDays: 31, prorated: true, amount: 17.74 });
  });
  it("anchoredPeriodDays / ancienne periode ancree le 31", () => {
    expect(anchoredPeriodDays("2026-01-31", "monthly", "2026-02-28")).toBe(28);
    expect(isLegacyAnchoredPeriod("2026-01-31", "monthly", "2026-02-28", "2026-03-30")).toBe(true);
    expect(isLegacyAnchoredPeriod("2026-10-06", "monthly", "2026-10-06", "2026-10-31")).toBe(false);
    expect(isLegacyAnchoredPeriod("2026-10-06", "monthly", "2026-11-06", "2026-12-05")).toBe(true);
  });
});
