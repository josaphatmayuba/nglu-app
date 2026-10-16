import { allocate, computeRebuild, dueStatusOf, isLeaseFlagged, planBackfill, type AllocDue } from "./lease-allocation";
import { buildLeaseSchedule } from "./lease-schedule";

const due = (id: number, periodStart: string, amount = 3000, paid = 0): AllocDue => ({ id, periodStart, amount, paid });
const D3 = [due(1, "2026-07-01"), due(2, "2026-08-01"), due(3, "2026-09-01")];

describe("allocate (pur)", () => {
  it("FIFO : l'echeance la plus ancienne non soldee d'abord", () => {
    const r = allocate({ dues: [...D3].reverse(), amount: 3000 });
    expect(r.allocations).toEqual([{ dueId: 1, amount: 3000 }]);
    expect(r.credit).toBe(0);
  });

  it("saute les echeances deja soldees", () => {
    const r = allocate({ dues: [due(1, "2026-07-01", 3000, 3000), ...D3.slice(1)], amount: 3000 });
    expect(r.allocations).toEqual([{ dueId: 2, amount: 3000 }]);
  });

  it("paiement partiel : une seule imputation partielle", () => {
    const r = allocate({ dues: D3, amount: 1000 });
    expect(r.allocations).toEqual([{ dueId: 1, amount: 1000 }]);
    expect(r.credit).toBe(0);
    expect(dueStatusOf(3000, 1000)).toBe("partially_paid");
  });

  it("surplus = avance imputee aux echeances suivantes, le reste en credit", () => {
    const r = allocate({ dues: D3, amount: 10000 });
    expect(r.allocations).toEqual([
      { dueId: 1, amount: 3000 },
      { dueId: 2, amount: 3000 },
      { dueId: 3, amount: 3000 },
    ]);
    expect(r.credit).toBe(1000);
  });

  it("imputation explicite prioritaire + avertissement si une echeance plus ancienne est impayee", () => {
    const r = allocate({ dues: D3, amount: 3000, explicit: [{ dueId: 3 }] });
    expect(r.allocations).toEqual([{ dueId: 3, amount: 3000 }]);
    expect(r.warnings.map((w) => w.code)).toContain("OLDER_DUE_UNSETTLED");
  });

  it("explicite partiel puis FIFO sur le reste", () => {
    const r = allocate({ dues: D3, amount: 4000, explicit: [{ dueId: 2, amount: 1000 }] });
    expect(r.allocations.find((a) => a.dueId === 2)!.amount).toBe(1000); // explicite 1000, le reste (3000) va FIFO sur l'echeance 1
    expect(r.allocations.find((a) => a.dueId === 1)!.amount).toBe(3000);
    expect(r.credit).toBe(0);
  });

  it("montant explicite superieur au reste : plafonne + warning", () => {
    const r = allocate({ dues: D3, amount: 5000, explicit: [{ dueId: 1, amount: 4000 }] });
    expect(r.warnings.map((w) => w.code)).toContain("OVER_ALLOCATION_CAPPED");
    expect(r.allocations[0]).toEqual({ dueId: 1, amount: 3000 });
  });

  it("1er mois au prorata solde = paid", () => {
    const sch = buildLeaseSchedule({ startDate: "2026-07-15", billingCycle: "monthly", rentAmount: 3000, horizonPeriods: 3 });
    expect(sch[0].amount).toBe(1645.16);
    const r = allocate({ dues: sch.map((p) => due(p.index, p.periodStart, p.amount)), amount: 1645.16 });
    expect(r.allocations).toEqual([{ dueId: 0, amount: 1645.16 }]);
    expect(dueStatusOf(1645.16, 1645.16)).toBe("paid");
  });

  it("fin de bail au prorata : derniere echeance partielle soldee, pas d'imputation au-dela", () => {
    const sch = buildLeaseSchedule({ startDate: "2026-08-01", endDate: "2026-10-10", billingCycle: "monthly", rentAmount: 3000 });
    expect(sch).toHaveLength(3);
    expect(sch[2].amount).toBe(967.74);
    const r = allocate({ dues: sch.map((p) => due(p.index, p.periodStart, p.amount)), amount: 8000 });
    expect(r.allocations.reduce((s, a) => s + a.amount, 0)).toBeCloseTo(6967.74, 2);
    expect(r.credit).toBeCloseTo(1032.26, 2);
  });

  it("resiliation : pas d'imputation apres la date de fin => credit", () => {
    const r = allocate({ dues: D3, amount: 9000, endDate: "2026-08-15" });
    expect(r.allocations).toEqual([{ dueId: 1, amount: 3000 }, { dueId: 2, amount: 3000 }]);
    expect(r.credit).toBe(3000);
  });

  it("devise differente : aucune imputation, credit + warning", () => {
    const r = allocate({ dues: D3, amount: 3000, currency: { payment: 2, due: 1 } });
    expect(r.allocations).toEqual([]);
    expect(r.credit).toBe(3000);
    expect(r.warnings[0].code).toBe("CURRENCY_MISMATCH");
  });

  it("arrondi aux decimales de la devise (0 decimale) et pas d'artefact flottant", () => {
    const r0 = allocate({ dues: [due(1, "2026-07-01", 100)], amount: 100.4, decimals: 0 });
    expect(r0.allocations).toEqual([{ dueId: 1, amount: 100 }]);
    expect(r0.credit).toBe(0);
    const r2 = allocate({ dues: [due(1, "2026-07-01", 0.3)], amount: 0.1 + 0.2 });
    expect(r2.allocations).toEqual([{ dueId: 1, amount: 0.3 }]);
    expect(r2.credit).toBe(0);
    expect(dueStatusOf(0.3, 0.1 + 0.2)).toBe("paid");
  });

  it("isLeaseFlagged", () => {
    expect(isLeaseFlagged({ allocationLedgerAt: null })).toBe(false);
    expect(isLeaseFlagged({})).toBe(false);
    expect(isLeaseFlagged({ allocationLedgerAt: new Date() })).toBe(true);
  });
});

describe("planBackfill (pur)", () => {
  const lease = { id: 11, startDate: "2026-07-15", endDate: null, currencyId: 1 };
  const sched = buildLeaseSchedule({ startDate: "2026-07-15", billingCycle: "monthly", rentAmount: 3000, horizonPeriods: 12 });
  const pending = (id: number, paymentDate: string, over: any = {}) => ({
    id, status: "pending", paymentDate, amount: 3000, currencyId: 1, ...over,
  });

  it("bail 11 prod : juil 1645.16 paid, aout paid, sept/oct dus, total du 6000, credit 0", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-07-15", amount: 1645.16, currencyId: 1 },
      { id: 2, status: "paid", paymentDate: "2026-08-05", amount: 3000, currencyId: 1 },
      pending(3, "2026-09-01", { periodStart: "2026-09-01", periodEnd: "2026-09-30" }),
      pending(4, "2026-10-01", { periodStart: "2026-10-01", periodEnd: "2026-10-31" }),
      ...["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01", "2027-05-01", "2027-06-01"]
        .map((d, i) => pending(5 + i, d, { periodStart: d, periodEnd: d })),
    ];
    const plan = planBackfill(lease, sched, rows, { today: "2026-10-16", legacyTotalDue: 6000 });
    const by = Object.fromEntries(plan.dues.map((d) => [d.periodStart, d]));
    expect(by["2026-07-15"]).toMatchObject({ amount: 1645.16, amountPaid: 1645.16, dueStatus: "paid", origin: "create" });
    expect(by["2026-08-01"]).toMatchObject({ amountPaid: 3000, dueStatus: "paid", origin: "create" });
    expect(by["2026-09-01"]).toMatchObject({ amountPaid: 0, dueStatus: "pending", origin: "reuse", rowId: 3 });
    expect(plan.totals.totalDueNew).toBe(6000);
    expect(plan.totals.overdueCount).toBe(2);
    expect(plan.credit).toBe(0);
    expect(plan.requiresForce).toBe(false);
    expect(plan.canApply).toBe(true);
    expect(plan.create.map((c) => c.periodStart)).toEqual(["2026-07-15", "2026-08-01"]);
    expect(plan.payments.map((p) => p.rowId)).toEqual([1, 2]);
  });

  it("ligne paid avec periode issue d'une confirmation = echeance fusionnee (auto-imputation)", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-08-03", amount: 3000, currencyId: 1, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ];
    const plan = planBackfill(lease, sched, rows, { today: "2026-08-20", legacyTotalDue: null });
    expect(plan.fused).toEqual([{ rowId: 1, periodStart: "2026-08-01", periodEnd: "2026-08-31", amount: 3000 }]);
    expect(plan.payments).toEqual([]);
    expect(plan.allocations).toContainEqual({ paymentRowId: 1, dueKey: "2026-08-01", amount: 3000 });
  });

  it("paid avec periode mais montant different : reste un paiement impute sur la periode", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-08-03", amount: 1000, currencyId: 1, periodStart: "2026-08-01", periodEnd: "2026-08-31" },
    ];
    const plan = planBackfill(lease, sched, rows, { today: "2026-08-20" });
    expect(plan.fused).toEqual([]);
    expect(plan.payments).toHaveLength(1);
    expect(plan.allocations).toEqual([{ paymentRowId: 1, dueKey: "2026-08-01", amount: 1000 }]);
  });

  it("anomalies : avant debut, devise differente, doublon probable, ecart legacy", () => {
    const rows = [
      { id: 1, status: "paid", paymentDate: "2026-07-01", amount: 500, currencyId: 1 },
      { id: 2, status: "paid", paymentDate: "2026-07-20", amount: 700, currencyId: 2 },
      { id: 3, status: "paid", paymentDate: "2026-07-21", amount: 800, currencyId: 1 },
      { id: 4, status: "paid", paymentDate: "2026-07-21", amount: 800, currencyId: 1 },
    ];
    const plan = planBackfill(lease, sched, rows, { today: "2026-08-20", legacyTotalDue: 99999 });
    const codes = plan.anomalies.map((a) => a.code);
    expect(codes).toEqual(expect.arrayContaining(["PAYMENT_BEFORE_START", "CURRENCY_MISMATCH", "DUPLICATE_SUSPECT", "LEGACY_DELTA"]));
    expect(plan.foreignPaymentIds).toEqual([2]);
    expect(plan.requiresForce).toBe(true);
  });

  it("bail sans echeancier : NO_SCHEDULE, rien a appliquer", () => {
    const plan = planBackfill(lease, [], [], { today: "2026-08-20" });
    expect(plan.canApply).toBe(false);
    expect(plan.anomalies[0].code).toBe("NO_SCHEDULE");
  });

  it("resiliation : echeances apres terminationDate exclues, surplus en credit", () => {
    const rows = [{ id: 1, status: "paid", paymentDate: "2026-07-20", amount: 9000, currencyId: 1 }];
    const plan = planBackfill({ ...lease, terminationDate: "2026-08-20" }, sched, rows, { today: "2026-10-01" });
    expect(plan.dues.map((d) => d.periodStart)).toEqual(["2026-07-15", "2026-08-01"]);
    expect(plan.credit).toBeCloseTo(9000 - 1645.16 - 3000, 2);
  });

  it("delegue en attente : jamais prise pour une echeance", () => {
    const rows = [pending(9, "2026-08-02", { notes: "Declare par le delegue : x" })];
    const plan = planBackfill(lease, sched, rows, { today: "2026-08-20" });
    expect(plan.reuse).toEqual([]);
    expect(plan.anomalies.map((a) => a.code)).toContain("DELEGATE_DECLARATION");
  });
});

describe("computeRebuild (pur)", () => {
  const dueRow = (id: number, ps: string, over: any = {}) => ({
    id, rowKind: "due", status: "pending", paymentDate: ps, amount: 3000, currencyId: 1, periodStart: ps, ...over,
  });
  const payRow = (id: number, date: string, amount: number, over: any = {}) => ({
    id, rowKind: "payment", status: "paid", paymentDate: date, amount, currencyId: 1, periodStart: null, ...over,
  });
  const rows = [dueRow(1, "2026-07-01"), dueRow(2, "2026-08-01"), dueRow(3, "2026-09-01")];

  it("FIFO par date de paiement, diff minimal (rien a ecrire si deja a jour)", () => {
    const r = computeRebuild({
      rows: [...rows, payRow(10, "2026-07-02", 4500)],
      allocs: [
        { id: 1, paymentId: 10, dueId: 1, amount: 3000, source: "auto" },
        { id: 2, paymentId: 10, dueId: 2, amount: 1500, source: "auto" },
      ],
      leaseCurrencyId: 1,
    });
    expect(r.voids).toEqual([]);
    expect(r.inserts).toEqual([]);
    expect(r.dues.map((d) => [d.id, d.dueStatus])).toEqual([[1, "paid"], [2, "partially_paid"], [3, "pending"]]);
    expect(r.credit).toBe(0);
  });

  it("paiement annule : imputations soft-void, echeances redeviennent dues", () => {
    const r = computeRebuild({
      rows: [...rows, payRow(10, "2026-07-02", 3000, { status: "voided" })],
      allocs: [{ id: 1, paymentId: 10, dueId: 1, amount: 3000, source: "auto" }],
      leaseCurrencyId: 1,
    });
    expect(r.voids).toEqual([{ id: 1, reason: "Paiement annule" }]);
    expect(r.dues[0]).toMatchObject({ id: 1, amountPaid: 0, dueStatus: "pending", remaining: 3000 });
  });

  it("imputation manuelle conservee, auto recalculee autour", () => {
    const r = computeRebuild({
      rows: [...rows, payRow(10, "2026-07-02", 3000), payRow(11, "2026-07-03", 3000)],
      allocs: [
        { id: 1, paymentId: 10, dueId: 3, amount: 3000, source: "manual" },
        { id: 2, paymentId: 11, dueId: 3, amount: 3000, source: "auto" }, // obsolete : echeance 3 prise par la manuelle
      ],
      leaseCurrencyId: 1,
    });
    expect(r.voids).toEqual([{ id: 2, reason: "Recalcul FIFO" }]);
    expect(r.inserts).toEqual([{ paymentId: 11, dueId: 1, amount: 3000 }]);
    expect(r.dues.find((d) => d.id === 3)!.dueStatus).toBe("paid");
  });

  it("paiement date plus tot insere : re-FIFO des suivants", () => {
    const r = computeRebuild({
      rows: [...rows, payRow(10, "2026-08-10", 3000), payRow(11, "2026-07-05", 3000)],
      allocs: [{ id: 1, paymentId: 10, dueId: 1, amount: 3000, source: "auto" }],
      leaseCurrencyId: 1,
    });
    expect(r.voids).toEqual([{ id: 1, reason: "Recalcul FIFO" }]);
    expect(r.inserts).toEqual([
      { paymentId: 11, dueId: 1, amount: 3000 },
      { paymentId: 10, dueId: 2, amount: 3000 },
    ]);
  });

  it("ligne fusionnee (due + paid) : auto-imputee sur elle-meme, jamais source de FIFO", () => {
    const r = computeRebuild({
      rows: [dueRow(1, "2026-07-01", { status: "paid" }), dueRow(2, "2026-08-01"), payRow(10, "2026-08-02", 3000)],
      allocs: [],
      leaseCurrencyId: 1,
    });
    expect(r.inserts).toContainEqual({ paymentId: 1, dueId: 1, amount: 3000, self: true });
    expect(r.inserts).toContainEqual({ paymentId: 10, dueId: 2, amount: 3000 });
    expect(r.dues.find((d) => d.id === 1)).toMatchObject({ fused: true, dueStatus: "paid" });
  });

  it("resiliation : echeance apres la date exclue, imputation annulee, surplus en credit", () => {
    const r = computeRebuild({
      rows: [...rows, payRow(10, "2026-07-02", 9000)],
      allocs: [
        { id: 1, paymentId: 10, dueId: 1, amount: 3000, source: "auto" },
        { id: 2, paymentId: 10, dueId: 2, amount: 3000, source: "auto" },
        { id: 3, paymentId: 10, dueId: 3, amount: 3000, source: "auto" },
      ],
      leaseCurrencyId: 1,
      terminationDate: "2026-08-20",
    });
    expect(r.voids).toEqual([{ id: 3, reason: "Echeance annulee ou hors duree du bail" }]);
    expect(r.credit).toBe(3000);
  });

  it("apercu : paiement virtuel impute sans rien ecrire (inserts hors virtuel)", () => {
    const r = computeRebuild({
      rows,
      allocs: [],
      leaseCurrencyId: 1,
      virtual: { id: -1, paymentDate: "2026-09-05", amount: 4000, currencyId: 1 },
    });
    expect(r.virtualAllocations).toEqual([{ dueId: 1, amount: 3000 }, { dueId: 2, amount: 1000 }]);
    expect(r.inserts).toEqual([]);
    expect(r.virtualCredit).toBe(0);
  });
});
