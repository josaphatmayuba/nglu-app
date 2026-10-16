import { PropertyManagementService } from "./property-management.service";
import { LeaseAllocationService } from "./lease-allocation.service";

// Hooks du registre d'imputations : bail NON flagge = comportement strictement inchange
// (le service d'imputation n'est jamais appele) ; bail flagge = imputation / rebuild.

type Rec = { inserts: any[]; sets: any[]; selectQueue: any[][] };

function fakeDb(selectQueue: any[][] = [], opts: { forbidWrites?: boolean; updateAffected?: number } = {}) {
  const rec: Rec = { inserts: [], sets: [], selectQueue };
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        return () => p;
      },
    });
    return p;
  };
  let nextId = 100;
  const api: any = {
    select: () => chain(() => rec.selectQueue.shift() ?? []),
    insert: () => ({
      values: (v: any) => {
        if (opts.forbidWrites) throw new Error("write interdit");
        rec.inserts.push(v);
        return Promise.resolve([{ insertId: nextId++ }]);
      },
    }),
    update: () => ({
      set: (v: any) => {
        if (opts.forbidWrites) throw new Error("write interdit");
        rec.sets.push(v);
        return chain(() => [{ affectedRows: opts.updateAffected ?? 1 }]);
      },
    }),
  };
  api.transaction = async (cb: any) => cb(api);
  return { db: api, rec };
}

const BASE_LEASE = { id: 9, organizationId: 1, propertyId: 4, unitId: 7, status: "active", startDate: "2026-07-01", endDate: null, rentAmount: "3000", currencyId: 1, reference: "B-9", nextInvoiceDate: null, rentProrationEnabled: 0 };

function makeSvc(lease: any, db: any, alloc: any) {
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = db;
  svc.logger = { warn: jest.fn(), error: jest.fn() };
  svc.leaseAllocations = alloc;
  svc.getLeaseOrThrow = jest.fn().mockResolvedValue(lease);
  svc.saveProofFile = jest.fn().mockResolvedValue(null);
  svc.ensureLeaseContractSigned = jest.fn().mockResolvedValue(undefined);
  svc.getRentPaymentType = jest.fn().mockResolvedValue({ debitAccountId: 1, creditAccountId: 2 });
  svc.resolvePaymentDebitAccount = jest.fn().mockResolvedValue(1);
  svc.ensureExists = jest.fn().mockResolvedValue(undefined);
  svc.resolveDefaultCurrency = jest.fn().mockResolvedValue(1);
  svc.currencyDecimals = jest.fn().mockResolvedValue(2);
  svc.getRealEstateTaxTypeOptional = jest.fn().mockResolvedValue(null);
  svc.advanceLeaseInvoiceDateIfCovered = jest.fn().mockResolvedValue(undefined);
  svc.syncProratedNextInvoiceDate = jest.fn().mockResolvedValue(undefined);
  svc.publishPaymentUpdate = jest.fn().mockResolvedValue(undefined);
  svc.findPayment = jest.fn().mockImplementation(async (id: number) => ({ id }));
  svc.ledger = { post: jest.fn().mockResolvedValue(undefined), reverse: jest.fn().mockResolvedValue(undefined) };
  svc.ownerNotifications = {
    notifyPaymentReceivedTenant: jest.fn().mockResolvedValue(undefined),
    notifyPaymentReceived: jest.fn().mockResolvedValue(undefined),
  };
  return svc;
}

const mockAlloc = () => ({
  validateExplicit: jest.fn().mockResolvedValue(undefined),
  onPaymentCreated: jest.fn().mockResolvedValue({}),
  rebuildForLease: jest.fn().mockResolvedValue({}),
  rebuildLeaseAllocations: jest.fn().mockResolvedValue({}),
  generateMissingDues: jest.fn().mockResolvedValue({ createdCount: 1, payments: [] }),
});

const PAY_INPUT = { leaseId: 9, paymentDate: "2026-10-16", amount: 3000, method: "cash" } as any;

describe("createPayment : hook du registre d'imputations", () => {
  it("bail NON flagge : aucun appel au service d'imputation, insertion inchangee (pas de rowKind)", async () => {
    const { db, rec } = fakeDb();
    const alloc = mockAlloc();
    const svc = makeSvc(BASE_LEASE, db, alloc);
    await svc.createPayment({ ...PAY_INPUT, allocationMode: "manual", allocations: [{ dueId: 1 }] }, 1);
    expect(alloc.validateExplicit).not.toHaveBeenCalled();
    expect(alloc.onPaymentCreated).not.toHaveBeenCalled();
    const row = rec.inserts.find((v) => v.leaseId === 9 && v.paymentDate)!;
    expect(row.rowKind).toBeUndefined();
    expect(svc.ledger.post).toHaveBeenCalledTimes(1);
  });

  it("bail flagge : validation avant ecriture, puis imputation (mode et allocations transmis)", async () => {
    const { db } = fakeDb();
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    const order: string[] = [];
    alloc.validateExplicit.mockImplementation(async () => { order.push("validate"); });
    svc.ledger.post.mockImplementation(async () => { order.push("ledger"); });
    alloc.onPaymentCreated.mockImplementation(async () => { order.push("allocate"); });
    await svc.createPayment({ ...PAY_INPUT, allocationMode: "manual", allocations: [{ dueId: 5, amount: 1000 }] }, 1);
    expect(order).toEqual(["validate", "ledger", "allocate"]);
    expect(alloc.onPaymentCreated).toHaveBeenCalledWith(expect.objectContaining({
      leaseId: 9, orgId: 1, paymentId: 101, mode: "manual", explicit: [{ dueId: 5, amount: 1000 }],
    }));
  });

  it("bail flagge : un echec d'imputation ne fait pas echouer l'encaissement (compta deja ecrite)", async () => {
    const { db } = fakeDb();
    const alloc = mockAlloc();
    alloc.onPaymentCreated.mockRejectedValue(new Error("boom"));
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    await expect(svc.createPayment(PAY_INPUT, 1)).resolves.toEqual({ id: 101 });
    expect(svc.logger.error).toHaveBeenCalled();
  });
});

describe("confirmPendingPayment : fusion/scission", () => {
  const pendingDue = { id: 50, leaseId: 9, status: "pending", rowKind: "due", periodStart: "2026-09-01", periodEnd: "2026-09-30", proofUrl: null };

  it("bail NON flagge : la ligne est transformee (UPDATE), aucune nouvelle ligne, ledger sur l'id d'origine", async () => {
    const { db, rec } = fakeDb([[pendingDue], [pendingDue]]);
    const alloc = mockAlloc();
    const svc = makeSvc(BASE_LEASE, db, alloc);
    await svc.confirmPendingPayment(50, { paymentDate: "2026-10-16", amount: 3000 } as any, 1);
    expect(rec.sets.some((v) => v.status === "paid")).toBe(true);
    expect(rec.inserts.filter((v) => v.leaseId === 9)).toHaveLength(0);
    expect(svc.ledger.post.mock.calls[0][0].idempotencyKey).toBe("rent-payment:50");
    expect(alloc.onPaymentCreated).not.toHaveBeenCalled();
  });

  it("bail flagge + echeance : nouvelle ligne payment imputee explicitement sur l'echeance, echeance non modifiee", async () => {
    const { db, rec } = fakeDb([[pendingDue], [], [pendingDue]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    const res = await svc.confirmPendingPayment(50, { paymentDate: "2026-10-16", amount: 3000 } as any, 1);
    const row = rec.inserts.find((v) => v.leaseId === 9)!;
    expect(row).toMatchObject({ status: "paid", rowKind: "payment", periodStart: "2026-09-01", amount: "3000" });
    expect(rec.sets.some((v) => v.status === "paid")).toBe(false);
    expect(svc.ledger.post.mock.calls[0][0].idempotencyKey).toMatch(/^rent-payment-confirm:50:[0-9a-f]{24}$/);
    expect(rec.sets.some((v) => v.method === "confirming")).toBe(true);
    expect(rec.sets.some((v) => v.method === "pending")).toBe(true);
    expect(alloc.onPaymentCreated).toHaveBeenCalledWith(expect.objectContaining({
      paymentId: 101, mode: "manual", explicit: [{ dueId: 50 }],
    }));
    expect(res).toEqual({ id: 101 });
  });

  it("bail flagge + echeance : confirmation deja en cours (claim refuse) => 400, AUCUNE ecriture compta", async () => {
    const { db, rec } = fakeDb([[pendingDue]], { updateAffected: 0 });
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, mockAlloc());
    await expect(svc.confirmPendingPayment(50, { paymentDate: "2026-10-16", amount: 3000 } as any, 1)).rejects.toThrow(/en cours/);
    expect(svc.ledger.post).not.toHaveBeenCalled();
    expect(rec.inserts).toHaveLength(0);
  });

  it("bail flagge + echeance : rejeu d'une confirmation identique => paiement existant renvoye, 0 ecriture compta", async () => {
    const { db, rec } = fakeDb([[pendingDue], [{ id: 101 }]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    const res = await svc.confirmPendingPayment(50, { paymentDate: "2026-10-16", amount: 3000 } as any, 1);
    expect(res).toEqual({ id: 101 });
    expect(svc.ledger.post).not.toHaveBeenCalled();
    expect(rec.inserts).toHaveLength(0);
    expect(alloc.onPaymentCreated).not.toHaveBeenCalled();
  });

  it("bail flagge + ligne sans rowKind (declaration) : transformee comme avant puis classee/imputee en auto", async () => {
    const { db, rec } = fakeDb([[{ ...pendingDue, rowKind: null }], [{ ...pendingDue, rowKind: null }]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    await svc.confirmPendingPayment(50, { paymentDate: "2026-10-16", amount: 3000 } as any, 1);
    expect(rec.sets.some((v) => v.status === "paid")).toBe(true);
    expect(rec.inserts.filter((v) => v.leaseId === 9)).toHaveLength(0);
    expect(alloc.onPaymentCreated).toHaveBeenCalledWith(expect.objectContaining({ paymentId: 50, mode: "auto" }));
  });
});

describe("voidPayment : desimputation", () => {
  const paid = { id: 70, leaseId: 9, status: "paid", transactionId: 5, amount: "3000", paymentDate: "2026-10-01", notes: "n", taxAmount: null };

  it("bail NON flagge : pas de rebuild", async () => {
    const { db } = fakeDb([[paid], []]);
    const alloc = mockAlloc();
    const svc = makeSvc(BASE_LEASE, db, alloc);
    await svc.voidPayment(70, "erreur de saisie", 1, 3);
    expect(alloc.rebuildForLease).not.toHaveBeenCalled();
  });

  it("bail flagge : rebuild apres la contre-passation ledger (ordre garanti)", async () => {
    const { db } = fakeDb([[paid], [{ id: 1, status: "posted" }]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    const order: string[] = [];
    svc.ledger.reverse.mockImplementation(async () => { order.push("reverse"); });
    alloc.rebuildForLease.mockImplementation(async () => { order.push("rebuild"); });
    await svc.voidPayment(70, "erreur de saisie", 1, 3);
    expect(order).toEqual(["reverse", "rebuild"]);
    expect(alloc.rebuildForLease).toHaveBeenCalledWith(9, 1, 3);
  });

  it("echeance pending annulee sur bail flagge : rebuild aussi", async () => {
    const { db } = fakeDb([[{ id: 71, leaseId: 9, status: "pending", rowKind: "due", transactionId: null, notes: null }], [{ allocationLedgerAt: new Date() }]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    await svc.voidPayment(71, "doublon", 1, 3);
    expect(alloc.rebuildForLease).toHaveBeenCalledWith(9, 1, 3);
  });
});

describe("voidPayment : echeance pending sur bail NON flagge", () => {
  it("aucune requete supplementaire, aucun rebuild, retour OK identique", async () => {
    const { db, rec } = fakeDb([[{ id: 72, leaseId: 9, status: "pending", rowKind: null, transactionId: null, notes: null }], [{ sentinel: true }]]);
    const alloc = mockAlloc();
    const svc = makeSvc(BASE_LEASE, db, alloc);
    await expect(svc.voidPayment(72, "doublon", 1, 3)).resolves.toEqual({ id: 72, status: "voided", ledgerReversed: false });
    expect(rec.selectQueue).toHaveLength(1); // la sentinelle n'a pas ete consommee
    expect(alloc.rebuildForLease).not.toHaveBeenCalled();
  });
});

describe("generateMissingPayments : bail flagge", () => {
  it("flagge : delegue au service d'imputation (rowKind=due + credit impute)", async () => {
    const { db } = fakeDb();
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, allocationLedgerAt: new Date() }, db, alloc);
    await expect(svc.generateMissingPayments(9, 1)).resolves.toEqual({ createdCount: 1, payments: [] });
    expect(alloc.generateMissingDues).toHaveBeenCalledWith(9, 1, false);
  });

  it("non flagge : jamais delegue", async () => {
    const { db } = fakeDb([[]]);
    const alloc = mockAlloc();
    const svc = makeSvc({ ...BASE_LEASE, endDate: "2026-07-31" }, db, alloc);
    await svc.generateMissingPayments(9, 1).catch(() => undefined);
    expect(alloc.generateMissingDues).not.toHaveBeenCalled();
  });
});

describe("LeaseAllocationService (DB factice)", () => {
  function makeAlloc(selectQueue: any[][], opts: { forbidWrites?: boolean } = {}) {
    const f = fakeDb(selectQueue, opts);
    const svc = Object.create(LeaseAllocationService.prototype) as any;
    svc.db = f.db;
    svc.logger = { error: jest.fn() };
    return { svc: svc as LeaseAllocationService, rec: f.rec };
  }
  const lease = { ...BASE_LEASE, allocationLedgerAt: new Date(), terminationDate: null };
  const due = (id: number, ps: string, over: any = {}) => ({
    id, status: "pending", rowKind: "due", paymentDate: ps, amount: "3000", currencyId: 1, periodStart: ps, periodEnd: null,
    amountPaid: "0", dueStatus: "pending", transactionId: null, proofUrl: null, notes: null, ...over,
  });

  it("backfill dryRun (defaut) : plan par bail, AUCUNE ecriture", async () => {
    const rows = [
      { ...due(1, "2026-07-01"), status: "paid", rowKind: null, amount: "3000", periodStart: null },
      due(2, "2026-08-01", { rowKind: null }),
    ];
    const { svc, rec } = makeAlloc(
      [[{ id: 9, reference: "B-9" }], [{ ...BASE_LEASE, allocationLedgerAt: null, terminationDate: null }], [{ d: 2 }], rows],
      { forbidWrites: true },
    );
    const out = await svc.backfill(1, { leaseIds: [9] }, 3, new Date("2026-08-20T00:00:00Z"));
    expect(out.dryRun).toBe(true);
    expect(out.leases[0].mode).toBe("preview");
    expect(rec.inserts).toHaveLength(0);
    expect(rec.sets).toHaveLength(0);
  });

  it("backfill apply sans leaseIds refuse (validation par bail)", async () => {
    const { svc } = makeAlloc([]);
    await expect(svc.backfill(1, { dryRun: false })).rejects.toThrow(/leaseIds/);
    await expect(svc.backfill(1, { revert: true, dryRun: false })).rejects.toThrow(/leaseIds/);
  });

  it("rebuild : paiement annule => imputation soft-void, echeance settled redevient pending, aucune suppression", async () => {
    const dues = [due(1, "2026-07-01", { status: "settled", amountPaid: "3000", dueStatus: "paid" })];
    const { svc, rec } = makeAlloc([
      [lease], [{ d: 2 }], dues,
      [{ id: 11, organizationId: 1, leaseId: 9, paymentId: 70, dueId: 1, amount: "3000", source: "auto", status: "true" }],
    ]);
    const tx = (svc as any).db;
    const res: any = await svc.rebuildLeaseAllocations(9, 1, tx);
    expect(res.skipped).toBe(false);
    expect(res.voided).toBe(1);
    expect(rec.sets.find((v) => v.status === "false")).toMatchObject({ voidReason: "Paiement annule" });
    expect(rec.sets.find((v) => v.status === "pending")).toBeDefined();
    expect(rec.sets.find((v) => v.dueStatus === "pending")).toBeDefined();
  });

  it("revert : refuse (400) si des paiements scindes existent, aucune ecriture", async () => {
    const { svc, rec } = makeAlloc([[{ id: 9, reference: "B-9" }], [lease], [{ id: 50 }]], { forbidWrites: true });
    await expect(svc.backfill(1, { leaseIds: [9], revert: true, dryRun: false })).rejects.toThrow(/Revert refuse/);
    expect(rec.sets).toHaveLength(0);
  });

  it("revert : echeances generees annulees (soft), periode/montant d'origine restaures, flag retire", async () => {
    const rows = [
      due(1, "2026-07-01", { notes: "Echeance generee par la reprise du registre d'imputations." }),
      due(2, "2026-08-01", { periodStart: "2026-08-01", amount: "2800", notes: 'legacy [REPRISE:{"ps":null,"pe":null,"amt":"3000"}]' }),
    ];
    const { svc, rec } = makeAlloc([[{ id: 9, reference: "B-9" }], [lease], [], rows]);
    const out = await svc.backfill(1, { leaseIds: [9], revert: true, dryRun: false });
    expect(out.leases[0].mode).toBe("reverted");
    expect(rec.sets.find((v) => v.status === "voided")).toBeDefined();
    expect(rec.sets.find((v) => v.amount === "3000" && v.periodStart === null && v.notes === "legacy")).toBeDefined();
    expect(rec.sets.find((v) => v.allocationLedgerAt === null)).toBeDefined();
  });

  it("rebuild sur bail non flagge : no-op sans ecriture", async () => {
    const { svc, rec } = makeAlloc([[{ ...lease, allocationLedgerAt: null }]], { forbidWrites: true });
    const res: any = await svc.rebuildLeaseAllocations(9, 1, (svc as any).db);
    expect(res.skipped).toBe(true);
    expect(rec.sets).toHaveLength(0);
  });
});
