import { PropertyManagementService } from "./property-management.service";
import { currencies, realEstateLeases, realEstateRentPayments } from "../database/schema";
import {
  computeLeaseNextDue,
  computeProratedOverdueStats,
  planProrationRealign,
  scheduleForLease,
  occupiedMonthKeys,
} from "./lease-proration";

// Prorata opt-in : (1) fonctions pures, (2) branches du service avec une base
// factice en memoire. Le bail SANS option doit garder le comportement historique.

const ORG = 1;

const baseLease = (extra: Record<string, unknown> = {}) => ({
  id: 10,
  organizationId: ORG,
  propertyId: 3,
  unitId: 4,
  tenantId: 7,
  currencyId: 1,
  startDate: "2026-01-01",
  endDate: "2026-03-20",
  billingCycle: "monthly",
  rentAmount: "100.00",
  nextInvoiceDate: "2026-01-01",
  rentProrationEnabled: 1,
  ...extra,
});

function makeService(lease: any, rows: any[] = []) {
  const inserts: any[] = [];
  const updates: any[] = [];
  let nextId = 500;
  const db: any = {
    insert: (table: any) => ({
      values: (vals: any) => {
        inserts.push({ table, vals });
        return Promise.resolve([{ insertId: nextId++ }]);
      },
    }),
    update: (table: any) => ({
      set: (vals: any) => ({
        where: () => {
          updates.push({ table, vals });
          return Promise.resolve([{ affectedRows: 1 }]);
        },
      }),
    }),
    transaction: (fn: any) => fn(db),
    select: (_cols?: any) => ({
      from: (table: any) => {
        const data =
          table === realEstateLeases ? [lease] : table === currencies ? [{ d: 2 }] : table === realEstateRentPayments ? rows : [];
        const result: any = {
          then: (res: any, rej: any) => Promise.resolve(data).then(res, rej),
          orderBy: () => result,
          limit: () => Promise.resolve(data),
          for: () => result,
        };
        const chain: any = { leftJoin: () => chain, innerJoin: () => chain, where: () => result };
        return chain;
      },
    }),
  };
  const service = new PropertyManagementService(
    db, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    {} as any,
  );
  return { service, inserts, updates };
}

describe("lease-proration (pur)", () => {
  const lease = baseLease() as any;
  const schedule = scheduleForLease(lease, 2, 0, "2026-02-01");

  it("echeancier : 3 mois civils, derniere au prorata 20/31", () => {
    expect(schedule.map((p) => p.amount)).toEqual([100, 100, 64.52]);
    expect(schedule[2].prorated).toBe(true);
  });

  it("prochaine echeance : option off = loyer du bail, on = reste de la periode", () => {
    const off = computeLeaseNextDue({ ...lease, rentProrationEnabled: 0 }, [100], 2, "2026-02-01");
    expect(off).toMatchObject({ nextDueAmount: 100, isProratedNext: false, rentProrationEnabled: false });
    const on = computeLeaseNextDue(lease, [200], 2, "2026-03-20");
    expect(on).toMatchObject({ nextDueDate: "2026-03-01", nextDueAmount: 64.52, isProratedNext: true });
  });

  it("retards par periode : non paye au-dela de la grace", () => {
    const st = computeProratedOverdueStats(schedule, [{ date: "2026-01-15", amount: 100 }], new Date("2026-03-20T00:00:00Z"), 5, 2);
    expect(st).toMatchObject({ dueCount: 3, unpaidCount: 2, isOverdue: true, overdueDueDate: "2026-02-01" });
  });

  it("plan : pending legacy realignes, surplus annule, paid et justificatif proteges", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-01-15", amount: "100", transactionId: 9 },
      { id: 2, status: "pending", paymentDate: "2026-02-01", amount: "100", transactionId: null },
      { id: 3, status: "pending", paymentDate: "2026-03-01", amount: "100", transactionId: null, proofUrl: "k/x.jpg" },
      { id: 4, status: "pending", paymentDate: "2026-07-01", amount: "100", transactionId: null },
    ];
    const plan = planProrationRealign(schedule, rows as any, 2);
    expect(plan.map((a) => a.action)).toEqual(["untouched", "update", "keep", "void"]);
    expect(plan[1].proposed).toMatchObject({ paymentDate: "2026-02-01", amount: 100, periodStart: "2026-02-01" });
    expect(plan[2].proposed).toMatchObject({ amount: 100, periodStart: "2026-03-01", periodEnd: "2026-03-20" });
  });

  it("loyer de janvier paye en fevrier : pas de pending annulee a tort, pas de trou", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-02-02", amount: "100", transactionId: 9, periodStart: null },
      { id: 2, status: "pending", paymentDate: "2026-02-15", amount: "100", transactionId: null, periodStart: null },
      { id: 3, status: "pending", paymentDate: "2026-03-15", amount: "64.52", transactionId: null, periodStart: null },
    ];
    const plan = planProrationRealign(schedule, rows as any, 2);
    expect(plan.map((a) => a.action)).toEqual(["untouched", "update", "update"]);
    expect(plan[1].proposed).toMatchObject({ periodStart: "2026-02-01" });
    expect(plan[2].proposed).toMatchObject({ periodStart: "2026-03-01" });
    expect(plan[0].periodIndex).toBe(0);
    expect(plan[1].periodIndex).toBe(1);
  });
});

describe("PropertyManagementService — prorata opt-in", () => {
  it("generation : cree une ligne par periode (prorata inclus) avec period_*", async () => {
    const { service, inserts } = makeService(baseLease());
    const res = await service.generateMissingPayments(10, ORG, true);
    expect(res.createdCount).toBe(3);
    const vals = inserts.map((i) => i.vals);
    expect(vals.map((v) => v.paymentDate)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(vals.map((v) => v.amount)).toEqual(["100", "100", "64.52"]);
    expect(vals[2]).toMatchObject({ periodStart: "2026-03-01", periodEnd: "2026-03-20", status: "pending" });
  });

  it("idempotence : lignes avec period_* puis lignes legacy (cle mois) => zero doublon", async () => {
    const withPeriods = [
      { id: 1, status: "pending", amount: "100", paymentDate: "2026-01-01", periodStart: "2026-01-01" },
      { id: 1, status: "pending", amount: "100", paymentDate: "2026-02-01", periodStart: "2026-02-01" },
      { id: 1, status: "pending", amount: "64.52", paymentDate: "2026-03-01", periodStart: "2026-03-01" },
    ];
    const a = makeService(baseLease(), withPeriods);
    expect((await a.service.generateMissingPayments(10, ORG, true)).createdCount).toBe(0);

    const legacy = [
      { id: 1, status: "pending", amount: "100", paymentDate: "2026-01-01", periodStart: null },
      { id: 1, status: "pending", amount: "100", paymentDate: "2026-02-01", periodStart: null },
      { id: 1, status: "pending", amount: "100", paymentDate: "2026-03-01", periodStart: null },
    ];
    const b = makeService(baseLease(), legacy);
    expect((await b.service.generateMissingPayments(10, ORG, true)).createdCount).toBe(0);
    expect(b.inserts).toHaveLength(0);
  });


  it("ancienne ligne pending ancree (periodStart hors echeancier) : aucun doublon cree", async () => {
    const lease = baseLease({ startDate: "2026-10-06", endDate: "2027-09-30", nextInvoiceDate: "2026-10-06" });
    const rows = [
      { id: 1, status: "pending", amount: "550", paymentDate: "2026-10-06", periodStart: "2026-10-06", transactionId: null },
      { id: 2, status: "pending", amount: "550", paymentDate: "2026-11-06", periodStart: "2026-11-06", transactionId: null },
    ];
    const { service, inserts } = makeService(lease, rows);
    await service.generateMissingPayments(10, ORG, true);
    const dates = inserts.map((i) => i.vals.paymentDate);
    expect(dates).not.toContain("2026-11-01");
    expect(dates).not.toContain("2026-10-06");
    expect(dates).toContain("2026-12-01");
  });

  it("occupiedMonthKeys : pending ancienne periode oui, pending alignee non, avec transaction non", () => {
    const sch = scheduleForLease(baseLease({ startDate: "2026-10-06", endDate: "2027-09-30" }) as any, 2, 0, "2026-10-12");
    const keys = occupiedMonthKeys([
      { status: "pending", paymentDate: "2026-11-06", periodStart: "2026-11-06" },
      { status: "pending", paymentDate: "2026-12-01", periodStart: "2026-12-01" },
      { status: "pending", paymentDate: "2027-01-06", periodStart: "2027-01-06", transactionId: 5 },
      { status: "paid", paymentDate: "2026-10-06", periodStart: null },
    ], sch);
    expect([...keys]).toEqual(["2026-11"]);
  });

  it("decoratePaymentRow : ancienne ligne ancree (06/11->05/12) n'est pas un prorata", () => {
    const { service } = makeService(baseLease());
    const r = (service as any).decoratePaymentRow({
      periodStart: "2026-11-06", periodEnd: "2026-12-05", leaseProrationEnabled: 1,
      leaseBillingCycle: "monthly", leaseStartDate: "2026-10-06",
    });
    expect(r.isProrata).toBe(false);
  });

  it("loyer de janvier paye en fevrier : generation sans doublon ni trou", async () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-02-02", amount: "100", periodStart: null },
      { id: 2, status: "pending", paymentDate: "2026-02-15", amount: "100", periodStart: null },
    ];
    const { service, inserts } = makeService(baseLease(), rows);
    const res = await service.generateMissingPayments(10, ORG, true);
    expect(res.createdCount).toBe(1);
    expect(inserts[0].vals).toMatchObject({ periodStart: "2026-03-01", status: "pending" });
  });

  it("decoratePaymentRow : mois civil (debut 15/01, fin 20/03 => 20 j / 31)", () => {
    const { service } = makeService(baseLease());
    const r = (service as any).decoratePaymentRow({
      periodStart: "2026-03-01", periodEnd: "2026-03-20", leaseProrationEnabled: 1,
      leaseBillingCycle: "monthly", leaseStartDate: "2026-01-15",
    });
    expect(r).toMatchObject({ isProrata: true, prorataDays: 20, periodDays: 31 });
  });

  it("apercu : aucune ecriture, compteurs coherents", async () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-01-15", amount: "100", transactionId: 9, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
      { id: 2, status: "pending", paymentDate: "2026-02-01", amount: "100", transactionId: null, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
      { id: 3, status: "pending", paymentDate: "2026-03-01", amount: "100", transactionId: null, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
      { id: 4, status: "pending", paymentDate: "2026-06-01", amount: "100", transactionId: null, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
    ];
    const { service, inserts, updates } = makeService(baseLease({ rentProrationEnabled: 0 }), rows);
    const p = await service.prorationPreview(10, ORG, "all");
    expect(p).toMatchObject({ willUpdate: 2, willVoid: 1, willKeep: 0, paidUntouched: 1, totalProposed: 264.52 });
    expect(p.schedule).toHaveLength(3);
    expect(p.currentRows.map((r) => r.action)).toEqual(["untouched", "update", "update", "void"]);
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("realignement : UPDATE des pending (id conserves, aucun INSERT), surplus -> voided, paid intacte", async () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-01-15", amount: "100", transactionId: 9, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
      { id: 3, status: "pending", paymentDate: "2026-03-01", amount: "100", transactionId: null, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
      { id: 4, status: "pending", paymentDate: "2026-06-01", amount: "100", transactionId: null, proofUrl: null, proofUploadCount: 0, periodStart: null, periodEnd: null },
    ];
    const { service, inserts, updates } = makeService(baseLease(), rows);
    const res = await service.prorationRealign(10, ORG, "all");
    expect(res).toMatchObject({ updated: 1, voided: 1, kept: 0, paidUntouched: 1 });
    expect(inserts).toHaveLength(0);
    const rentUpdates = updates.filter((u) => u.table === realEstateRentPayments).map((u) => u.vals);
    expect(rentUpdates).toHaveLength(2);
    expect(rentUpdates[0]).toMatchObject({ paymentDate: "2026-03-01", amount: "64.52", periodStart: "2026-03-01" });
    expect(rentUpdates[1]).toMatchObject({ status: "voided" });
  });

  it("bail SANS option : generation historique inchangee (1er du mois, pas de period_*)", async () => {
    const { service, inserts } = makeService(baseLease({ rentProrationEnabled: 0, endDate: "2026-03-20" }));
    const res = await service.generateMissingPayments(10, ORG, true);
    expect(res.createdCount).toBe(3);
    const vals = inserts.map((i) => i.vals);
    expect(vals.map((v) => v.paymentDate)).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
    expect(vals.every((v) => v.amount === "100" && !("periodStart" in v))).toBe(true);
  });

  it("realignement refuse si l'option est inactive", async () => {
    const { service } = makeService(baseLease({ rentProrationEnabled: 0 }));
    await expect(service.prorationRealign(10, ORG, "all")).rejects.toThrow();
  });
});
