import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { PropertyManagementService } from "./property-management.service";

type Rec = { inserts: any[]; sets: any[]; selectQueue: any[][] };

function fakeDb(selectQueue: any[][] = [], opts: { updateAffected?: number } = {}) {
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
    insert: () => ({ values: (v: any) => { rec.inserts.push(v); return Promise.resolve([{ insertId: nextId++ }]); } }),
    update: () => ({ set: (v: any) => { rec.sets.push(v); return chain(() => [{ affectedRows: opts.updateAffected ?? 1 }]); } }),
  };
  api.transaction = async (cb: any) => cb(api);
  return { db: api, rec };
}

const TD = 55;
const REVENUE = 700;
const LEASE = { id: 9, organizationId: 1, propertyId: 4, unitId: 7, status: "ended", terminationDate: "2027-03-31", startDate: "2027-01-01", rentAmount: "100", currencyId: 1, reference: "B-9", nextInvoiceDate: null, rentProrationEnabled: 0, allocationLedgerAt: null };
const DEP = { id: 5, amount: "1000.00", rentAppliedAmount: "0.00", currencyId: 1, status: "held", isActive: 1 };
const LINES = [
  { periodStart: "2027-01-01", periodEnd: null, dueDate: "2027-01-01", amount: 100, remaining: 100, prorated: false },
  { periodStart: "2027-02-01", periodEnd: null, dueDate: "2027-02-01", amount: 100, remaining: 100, prorated: false },
];

function makeSvc(opts: { lease?: any; queue?: any[][]; updateAffected?: number } = {}) {
  const { db, rec } = fakeDb(opts.queue ?? [[DEP], []], { updateAffected: opts.updateAffected });
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = db;
  svc.logger = { warn: jest.fn(), error: jest.fn() };
  svc.ledger = { post: jest.fn().mockResolvedValue({}), reverse: jest.fn().mockResolvedValue({}) };
  svc.leaseAllocations = { getLeaseDueState: jest.fn(), validateExplicit: jest.fn() };
  svc.ownerNotifications = { notifyDepositAppliedTenant: jest.fn().mockResolvedValue({ sent: 1 }), notifyPaymentReceived: jest.fn(), notifyPaymentReceivedTenant: jest.fn() };
  svc.getLeaseOrThrow = jest.fn().mockResolvedValue(opts.lease ?? LEASE);
  svc.currencyDecimals = jest.fn().mockResolvedValue(2);
  svc.noticeDueLines = jest.fn().mockResolvedValue({ lines: LINES });
  svc.getRentPaymentType = jest.fn().mockResolvedValue({ debitAccountId: 1, creditAccountId: REVENUE });
  svc.getOrCreateLiabilitySubAccount = jest.fn().mockResolvedValue(TD);
  svc.getOrCreateExpenseSubAccount = jest.fn().mockResolvedValue(800);
  svc.getRealEstateTaxTypeOptional = jest.fn().mockResolvedValue(null);
  svc.allocateAfterPayment = jest.fn().mockResolvedValue(null);
  svc.advanceLeaseInvoiceDateIfCovered = jest.fn().mockResolvedValue(undefined);
  svc.publishPaymentUpdate = jest.fn().mockResolvedValue(undefined);
  svc.findPayment = jest.fn().mockResolvedValue({ id: 101 });
  svc.findDeposit = jest.fn().mockResolvedValue(DEP);
  svc.saveProofFile = jest.fn().mockResolvedValue(null);
  svc.resolveDefaultCurrency = jest.fn().mockResolvedValue(1);
  svc.syncProratedNextInvoiceDate = jest.fn().mockResolvedValue(undefined);
  return { svc, rec };
}

const call = (svc: any, body: any = {}) => svc.applyDepositToRent(9, { amount: 150, applicationDate: "2027-04-02", ...body }, 1, "all", 3);
const codeOf = async (p: Promise<any>) => { try { await p; } catch (e: any) { return e?.response?.code ?? e?.message; } return null; };

describe("applyDepositToRent", () => {
  it("bail non termine -> LEASE_NOT_ENDED", async () => {
    const { svc } = makeSvc({ lease: { ...LEASE, status: "active" } });
    expect(await codeOf(call(svc))).toBe("LEASE_NOT_ENDED");
  });

  it("pas de caution -> NO_DEPOSIT", async () => {
    const { svc } = makeSvc({ queue: [[]] });
    expect(await codeOf(call(svc))).toBe("NO_DEPOSIT");
  });

  it("devises differentes -> CURRENCY_MISMATCH", async () => {
    const { svc } = makeSvc({ queue: [[{ ...DEP, currencyId: 2 }]] });
    expect(await codeOf(call(svc))).toBe("CURRENCY_MISMATCH");
  });

  it("montant superieur au disponible ou a l'impaye -> 400", async () => {
    const { svc } = makeSvc({ queue: [[{ ...DEP, rentAppliedAmount: "950.00" }], []] });
    await expect(call(svc, { amount: 100 })).rejects.toBeInstanceOf(BadRequestException);
    const b = makeSvc();
    await expect(call(b.svc, { amount: 250 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reservation perdue -> 409, aucune ecriture", async () => {
    const { svc, rec } = makeSvc({ updateAffected: 0 });
    await expect(call(svc)).rejects.toBeInstanceOf(ConflictException);
    expect(rec.inserts).toHaveLength(0);
    expect(svc.ledger.post).not.toHaveBeenCalled();
  });

  it("lignes ledger exactes : debit passif / credit revenu, jamais Caisse/Banque", async () => {
    const { svc, rec } = makeSvc();
    const res = await call(svc);
    const arg = svc.ledger.post.mock.calls[0][0];
    expect(arg.lines).toEqual([
      expect.objectContaining({ accountId: TD, side: "DEBIT", amount: 150 }),
      expect.objectContaining({ accountId: REVENUE, side: "CREDIT", amount: 150 }),
    ]);
    expect(arg.lines.some((l: any) => l.accountId === 1 || l.accountId === 2)).toBe(false);
    expect(arg.idempotencyKey).toBe("rent-payment:101");
    expect(arg.reference).toBe("RENT-101");
    expect(arg.sourceModule).toBe("rent");
    expect(rec.inserts[0]).toMatchObject({ type: "OD - Security Deposit Applied to Rent", debitId: TD, creditId: REVENUE, relatedId: "9" });
    expect(rec.inserts[1]).toMatchObject({ method: "deposit", status: "paid", securityDepositId: 5, transactionId: 100 });
    expect(res.deposit).toEqual({ amount: 1000, rentApplied: 150, available: 850 });
    expect(svc.ownerNotifications.notifyPaymentReceived).not.toHaveBeenCalled();
    expect(svc.ownerNotifications.notifyPaymentReceivedTenant).not.toHaveBeenCalled();
  });

  it("bail non flagge en manual -> 400 sans ecriture", async () => {
    const { svc, rec } = makeSvc();
    await expect(call(svc, { allocationMode: "manual", allocations: [{ dueId: 1 }] })).rejects.toThrow(/registre non active/);
    expect(rec.inserts).toHaveLength(0);
  });

  it("SMS seulement si notifyTenant (defaut vrai)", async () => {
    const a = makeSvc();
    const r1 = await call(a.svc);
    expect(a.svc.ownerNotifications.notifyDepositAppliedTenant).toHaveBeenCalledWith(expect.objectContaining({ amount: 150, remaining: 50, months: "janvier 2027 et fevrier 2027" }));
    expect(r1.sms).toEqual({ requested: true, sent: 1 });
    const b = makeSvc();
    const r2 = await call(b.svc, { notifyTenant: false });
    expect(b.svc.ownerNotifications.notifyDepositAppliedTenant).not.toHaveBeenCalled();
    expect(r2.sms.requested).toBe(false);
  });

  it("compensation si le ledger echoue : reservation rendue, transaction false, paiement voided", async () => {
    const { svc, rec } = makeSvc();
    svc.ledger.post.mockRejectedValue(new Error("ledger down"));
    await expect(call(svc)).rejects.toThrow("ledger down");
    expect(rec.sets.length).toBe(4);
    expect(rec.sets[1].rentAppliedAmount).toBeDefined();
    expect(rec.sets[2]).toMatchObject({ status: "false" });
    expect(rec.sets[3]).toMatchObject({ status: "voided" });
    expect(svc.ownerNotifications.notifyDepositAppliedTenant).not.toHaveBeenCalled();
  });

  it("anti-rejeu : renvoie le paiement existant sans rien ecrire", async () => {
    const { svc, rec } = makeSvc({ queue: [[DEP], [{ id: 77 }]] });
    const res = await call(svc);
    expect(res.replayed).toBe(true);
    expect(svc.findPayment).toHaveBeenCalledWith(77);
    expect(rec.inserts).toHaveLength(0);
    expect(rec.sets).toHaveLength(0);
  });
});

describe("voidPayment d'un paiement par la caution", () => {
  const PAY = { id: 101, leaseId: 9, status: "paid", transactionId: 100, amount: "150.00", taxAmount: null, paymentDate: "2027-04-02", notes: "x", securityDepositId: 5 };
  it("decremente rent_applied_amount", async () => {
    const { svc, rec } = makeSvc({ queue: [[PAY], [{ status: "held" }], [{ id: 1, status: "posted" }]] });
    await svc.voidPayment(101, "erreur", 1, 3);
    expect(svc.ledger.reverse).toHaveBeenCalled();
    expect(rec.sets.some((s) => s.rentAppliedAmount)).toBe(true);
  });
  it("refuse si la caution est restituee", async () => {
    const { svc, rec } = makeSvc({ queue: [[PAY], [{ status: "returned" }]] });
    await expect(svc.voidPayment(101, "erreur", 1, 3)).rejects.toThrow(/Caution deja restituee/);
    expect(rec.sets).toHaveLength(0);
  });
});

describe("returnDeposit avec imputation", () => {
  it("1000 detenus, 600 imputes, 100 de retenue -> 300 rendus", async () => {
    const { svc, rec } = makeSvc({ queue: [[{ ...DEP, rentAppliedAmount: "600.00" }]] });
    await svc.returnDeposit(9, { returnDate: "2027-05-01", deductionAmount: 100, returnMethod: "bank" }, 1);
    expect(rec.inserts.map((i) => i.amount)).toEqual([300, 100]);
    expect(rec.sets[0]).toMatchObject({ status: "returned", returnedAmount: "300" });
  });
  it("tout impute et sans retenue : passe a returned (0) sans ecriture", async () => {
    const { svc, rec } = makeSvc({ queue: [[{ ...DEP, rentAppliedAmount: "1000.00" }]] });
    await svc.returnDeposit(9, { returnDate: "2027-05-01" }, 1);
    expect(rec.inserts).toHaveLength(0);
    expect(svc.ledger.post).not.toHaveBeenCalled();
    expect(rec.sets[0]).toMatchObject({ status: "returned", returnedAmount: "0" });
  });
  it("collectDeposit et returnDeposit respectent le perimetre de biens", async () => {
    const { svc } = makeSvc({ queue: [[DEP]] });
    await expect(svc.returnDeposit(9, { returnDate: "2027-05-01" }, 1, undefined, undefined, [999])).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.collectDeposit(9, { amount: 1, paymentDate: "2027-05-01" }, 1, undefined, undefined, [999])).rejects.toBeInstanceOf(NotFoundException);
  });
});
