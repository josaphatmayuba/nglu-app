import { addBillingCycle, formatDateOnly, parseDateOnly } from "./lease-schedule";
import { LeaseAllocationService } from "./lease-allocation.service";

const svc = new LeaseAllocationService(null as any);
const lease = (o: any) => ({ billingCycle: "monthly", rentAmount: "1500", rentProrationEnabled: false, status: "active", ...o });
const total = (s: Array<{ amount: number }>) => s.reduce((a, p) => a + p.amount, 0);

describe("echeancier bail sans prorata (jour de debut)", () => {
  it("bail du 15/09/2026 au 14/09/2027 : 12 periodes, 18000", () => {
    const s = svc.buildSchedule(lease({ startDate: "2026-09-15", endDate: "2027-09-14" }), 2, "2026-11-13");
    expect(s).toHaveLength(12);
    expect(s[0]).toMatchObject({ dueDate: "2026-09-15", periodStart: "2026-09-15", periodEnd: "2026-10-14", amount: 1500 });
    expect(s[11]).toMatchObject({ dueDate: "2027-08-15", periodStart: "2027-08-15", periodEnd: "2027-09-14" });
    expect(total(s)).toBe(18000);
  });

  it("bail du 15 au 15 (fin 2027-09-15) : 12 echeances", () => {
    const s = svc.buildSchedule(lease({ startDate: "2026-09-15", endDate: "2027-09-15" }), 2, "2026-11-13");
    expect(s).toHaveLength(12);
    expect(total(s)).toBe(18000);
  });

  it("bail du 31/01/2026 : repli au dernier jour du mois, ancre sur le 31", () => {
    const s = svc.buildSchedule(lease({ startDate: "2026-01-31", endDate: "2027-01-30" }), 2, "2026-11-13");
    expect(s).toHaveLength(12);
    expect(s[1].dueDate).toBe("2026-02-28");
    expect(s[1].periodEnd).toBe("2026-03-30");
    expect(s[2].dueDate).toBe("2026-03-31");
    expect(s[3].dueDate).toBe("2026-04-30");
    expect(total(s)).toBe(18000);
  });

  it("bail avec prorata : mois civils inchanges", () => {
    const s = svc.buildSchedule(
      lease({ startDate: "2026-09-15", endDate: "2027-09-14", rentProrationEnabled: true }), 2, "2026-11-13");
    expect(s[0]).toMatchObject({ periodStart: "2026-09-15", periodEnd: "2026-09-30", prorated: true });
    expect(s[1]).toMatchObject({ periodStart: "2026-10-01", dueDate: "2026-10-01", amount: 1500 });
    expect(s).toHaveLength(13);
  });
});

describe("dates d'echeance du carnet (generateMissingPayments)", () => {
  const due = (start: string, k: number) => formatDateOnly(addBillingCycle(parseDateOnly(start), "monthly", k));
  it("jour du bail, repli fin de mois, jamais chaine", () => {
    expect([0, 1, 2, 11].map((k) => due("2026-09-15", k))).toEqual(["2026-09-15", "2026-10-15", "2026-11-15", "2027-08-15"]);
    expect([0, 1, 2, 3].map((k) => due("2026-01-31", k))).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
});
