import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { batiproProjectFunds, ledgerPendingEntries } from "../database/schema";
import { BatiproService } from "./batipro.service";
import { CancelBatiproFundDto, CreateBatiproFundDto } from "./dto/batipro.dto";
import { buildFundsSummary, disbursedCentsByCurrency, type SpendDoc } from "./funds.util";

const ORG = 1;
const USD = 1;
const CDF = 2;

function makeDb() {
  const inserts: any[] = [];
  const updates: { table: any; patch: any }[] = [];
  const db: any = {
    insert: jest.fn().mockImplementation((table: any) => ({
      values: jest.fn().mockImplementation((v: any) => {
        inserts.push({ table, values: v });
        return { $returningId: jest.fn().mockResolvedValue([{ id: 42 }]) };
      }),
    })),
    update: jest.fn().mockImplementation((table: any) => ({
      set: jest.fn().mockImplementation((patch: any) => {
        updates.push({ table, patch });
        return { where: jest.fn().mockResolvedValue([{ affectedRows: db.affectedRows ?? 1 }]) };
      }),
    })),
  };
  return { db, inserts, updates };
}

function setup(opts: { postResult?: any; postError?: Error; fund?: any; postedEntryId?: number | null; reverseError?: Error } = {}) {
  const { db, inserts, updates } = makeDb();
  const ledger: any = {
    postByRules: opts.postError
      ? jest.fn().mockRejectedValue(opts.postError)
      : jest.fn().mockResolvedValue(opts.postResult ?? { id: 900, idempotent: false }),
    reverse: opts.reverseError
      ? jest.fn().mockRejectedValue(opts.reverseError)
      : jest.fn().mockResolvedValue({ reversedEntryId: 900, reversalEntryId: 901 }),
  };
  const svc: any = new BatiproService(db, {} as any, {} as any, ledger, {} as any, {} as any, {} as any);
  svc.assertProjectInScope = jest.fn().mockImplementation(async (projectId: number, _org: number, scope: any) => {
    if (scope !== "all" && !scope.includes(projectId)) throw new NotFoundException("Chantier introuvable.");
  });
  svc.getProject = jest.fn().mockResolvedValue({ id: 5, code: "CH-5", name: "Villa", currencyId: USD });
  svc.findActiveCurrency = jest.fn().mockImplementation(async (id: number) => (id === USD || id === CDF ? { id, currencyCode: id === USD ? "USD" : "CDF" } : null));
  svc.resolveAnalyticProjectId = jest.fn().mockResolvedValue(77);
  svc.getProjectFund = jest.fn().mockImplementation(async (id: number) => ({ id }));
  svc.getFundRow = jest.fn().mockResolvedValue(opts.fund ?? null);
  svc.findPostedFundingEntryId = jest.fn().mockResolvedValue(opts.postedEntryId ?? null);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  return { svc, db, ledger, inserts, updates };
}

const baseDto = {
  received_at: "2026-10-20",
  amount: 1500.25,
  currency_id: CDF,
  contributor_kind: "owner",
  funding_nature: "partner_account",
  payment_method: "mobile_money",
} as any;

describe("BatiPro fonds du chantier - creation", () => {
  it("comptabilise via postByRules (type, roles, devise, date, sourceModule dedie, idempotencyKey)", async () => {
    const { svc, ledger, inserts, updates } = setup();
    await svc.createProjectFund(5, baseDto, ORG, 9, "all");
    expect(inserts[0].table).toBe(batiproProjectFunds);
    expect(inserts[0].values).toMatchObject({ organizationId: ORG, projectId: 5, amount: "1500.25", currencyId: CDF, receivedAt: "2026-10-20" });
    expect(ledger.postByRules).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "batipro_project_funding",
        sourceModule: "batipro_funding",
        relatedId: "42",
        idempotencyKey: "batipro:funding:42",
        currencyId: CDF,
        date: "2026-10-20",
        amountsByRole: { mobile_money: 1500.25, partner_account: 1500.25 },
        dimensions: { projectId: 77 },
      }),
      ORG,
      9,
    );
    expect(updates.at(-1)).toMatchObject({ table: batiproProjectFunds, patch: { ledgerEntryId: 900, ledgerStatus: "posted" } });
  });

  it("nature par defaut = client_advance", async () => {
    const { svc, ledger } = setup();
    await svc.createProjectFund(5, { ...baseDto, funding_nature: undefined, payment_method: "cash" }, ORG, 9, "all");
    expect(ledger.postByRules.mock.calls[0][0].amountsByRole).toEqual({ cash: 1500.25, client_advance: 1500.25 });
  });

  it("ecriture differee (gate) -> ledger_status pending", async () => {
    const { svc, updates } = setup({ postResult: { id: 0, deferred: true } });
    await svc.createProjectFund(5, baseDto, ORG, 9, "all");
    expect(updates.at(-1)!.patch).toMatchObject({ ledgerEntryId: null, ledgerStatus: "pending" });
  });

  it("echec comptable -> compensation is_active=0 et erreur relancee", async () => {
    const { svc, updates } = setup({ postError: new ConflictException("Periode comptable cloturee") });
    await expect(svc.createProjectFund(5, baseDto, ORG, 9, "all")).rejects.toBeInstanceOf(ConflictException);
    expect(updates.at(-1)).toMatchObject({ table: batiproProjectFunds, patch: { isActive: 0 } });
  });

  it("rejette montant <= 0 et 3 decimales (service)", async () => {
    const { svc, db } = setup();
    await expect(svc.createProjectFund(5, { ...baseDto, amount: 0 }, ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createProjectFund(5, { ...baseDto, amount: -3 }, ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createProjectFund(5, { ...baseDto, amount: 10.123 }, ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejette une devise inconnue", async () => {
    const { svc, db } = setup();
    await expect(svc.createProjectFund(5, { ...baseDto, currency_id: 999 }, ORG, 9, "all")).rejects.toThrow("Devise inconnue");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejette un chantier hors scope", async () => {
    const { svc, db, ledger } = setup();
    await expect(svc.createProjectFund(5, baseDto, ORG, 9, [8])).rejects.toBeInstanceOf(NotFoundException);
    expect(db.insert).not.toHaveBeenCalled();
    expect(ledger.postByRules).not.toHaveBeenCalled();
  });

  it("DTO : montant <= 0, 3 decimales, telephone non international refuses ; valide accepte", async () => {
    const errs = async (p: any) => (await validate(plainToInstance(CreateBatiproFundDto, p))).map((e) => e.property);
    expect(await errs({ ...baseDto, amount: 0 })).toContain("amount");
    expect(await errs({ ...baseDto, amount: 1.234 })).toContain("amount");
    expect(await errs({ ...baseDto, contributor_phone: "0812345678" })).toContain("contributor_phone");
    expect(await errs({ ...baseDto, payment_method: "cheque" })).toContain("payment_method");
    expect(await errs({ ...baseDto, contributor_phone: "+243812345678" })).toEqual([]);
    expect((await validate(plainToInstance(CancelBatiproFundDto, { reason: "ab" }))).length).toBe(1);
  });
});

describe("BatiPro fonds du chantier - annulation", () => {
  const activeFund = { id: 42, organizationId: ORG, projectId: 5, isActive: 1, ledgerEntryId: 900, ledgerStatus: "posted", cancelledAt: null };

  it("ecriture comptabilisee -> contre-passation puis soft delete", async () => {
    const { svc, ledger, updates } = setup({ fund: activeFund });
    await svc.cancelProjectFund(42, "Erreur de saisie", ORG, 9, "all");
    expect(ledger.reverse).toHaveBeenCalledWith(900, expect.stringContaining("Erreur de saisie"), ORG, 9);
    expect(updates.at(-1)).toMatchObject({
      table: batiproProjectFunds,
      patch: { isActive: 0, cancelledBy: 9, cancelReason: "Erreur de saisie", reversalEntryId: 901 },
    });
  });

  it("ecriture deja contre-passee (Conflict) toleree", async () => {
    const { svc, updates } = setup({ fund: activeFund, reverseError: new ConflictException("Cette ecriture a deja ete contre-passee.") });
    await svc.cancelProjectFund(42, "Doublon", ORG, 9, "all");
    expect(updates.at(-1)!.patch).toMatchObject({ isActive: 0 });
  });

  it("periode cloturee propagee, la ligne reste active", async () => {
    const { svc, updates } = setup({ fund: activeFund, reverseError: new ConflictException('Periode comptable "2026-09" cloturee : aucune ecriture possible au 2026-10-27.') });
    await expect(svc.cancelProjectFund(42, "Doublon", ORG, 9, "all")).rejects.toThrow("cloturee");
    // Reservation puis liberation (cancelledAt remis a null), jamais de soft delete.
    expect(updates.find((u) => u.table === batiproProjectFunds && u.patch.isActive === 0)).toBeUndefined();
    expect(updates.at(-1)).toMatchObject({ table: batiproProjectFunds, patch: { cancelledAt: null } });
  });

  it("annulation simultanee : ligne deja reservee -> 409, pas de contre-passation", async () => {
    const { svc, db, ledger } = setup({ fund: activeFund });
    db.affectedRows = 0;
    await expect(svc.cancelProjectFund(42, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(ConflictException);
    expect(ledger.reverse).not.toHaveBeenCalled();
  });

  it("ecriture en attente (gate) -> pending entry cancelled", async () => {
    const { svc, ledger, updates } = setup({ fund: { ...activeFund, ledgerEntryId: null, ledgerStatus: "pending" } });
    await svc.cancelProjectFund(42, "Doublon", ORG, 9, "all");
    expect(ledger.reverse).not.toHaveBeenCalled();
    expect(updates.find((u) => u.table === ledgerPendingEntries)).toMatchObject({ patch: { status: "cancelled" } });
    expect(updates.at(-1)).toMatchObject({ table: batiproProjectFunds, patch: { isActive: 0, reversalEntryId: null } });
  });

  it("pending approuvee entre-temps -> contre-passe l ecriture retrouvee par idempotencyKey", async () => {
    const { svc, ledger } = setup({ fund: { ...activeFund, ledgerEntryId: null, ledgerStatus: "pending" }, postedEntryId: 950 });
    await svc.cancelProjectFund(42, "Doublon", ORG, 9, "all");
    expect(ledger.reverse).toHaveBeenCalledWith(950, expect.any(String), ORG, 9);
  });

  it("double annulation -> 400", async () => {
    const { svc, ledger } = setup({ fund: { ...activeFund, isActive: 0, cancelledAt: new Date() } });
    await expect(svc.cancelProjectFund(42, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.reverse).not.toHaveBeenCalled();
  });

  it("versement introuvable -> 404 ; hors scope -> 404", async () => {
    await expect(setup().svc.cancelProjectFund(42, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ fund: activeFund }).svc.cancelProjectFund(42, "Doublon", ORG, 9, [3])).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("BatiPro fonds du chantier - synthese par devise", () => {
  const codes = new Map<number, string | null>([[USD, "USD"], [CDF, "CDF"]]);
  const doc = (p: Partial<SpendDoc>): SpendDoc => ({
    id: 1, type: "purchase_order", direction: "outbound", status: "confirmed", isActive: 1,
    currencyId: null, parentDocumentId: null, totalTtc: 0, paidAmount: 0, ...p,
  });

  it("USD et CDF separes, annules/inactifs exclus, factures fournisseur comptees, shortfall", () => {
    const funds = [
      { amount: "1000.00", currencyId: USD, isActive: 1 },
      { amount: "500.00", currencyId: USD, isActive: 0 }, // annule
      { amount: "200000.00", currencyId: CDF, isActive: 1 },
    ];
    const docs = [
      doc({ id: 10, totalTtc: "800.00", paidAmount: "300.00" }), // BC USD (devise chantier)
      doc({ id: 11, type: "invoice", direction: "inbound", status: "paid", parentDocumentId: 10, totalTtc: "200.00", paidAmount: "200.00" }),
      doc({ id: 12, type: "invoice", direction: "inbound", status: "issued", currencyId: CDF, totalTtc: "50000.00", paidAmount: "10000.00" }), // sans BC
      doc({ id: 13, status: "cancelled", totalTtc: "999.00", paidAmount: "999.00" }), // annule
      doc({ id: 14, isActive: 0, totalTtc: "999.00", paidAmount: "999.00" }), // inactif
      doc({ id: 15, totalTtc: "1500.00", paidAmount: "0" }), // BC non paye
    ];
    const rows = buildFundsSummary(funds, docs, USD, codes);
    const usd = rows.find((r) => r.currency_id === USD)!;
    const cdf = rows.find((r) => r.currency_id === CDF)!;
    expect(usd).toEqual({
      currency_id: USD, currency_code: "USD",
      received: 1000, disbursed: 500, available: 500,
      committed_unpaid: 1800, // (800-300-200) + 1500
      shortfall: 1300,
    });
    expect(cdf).toEqual({
      currency_id: CDF, currency_code: "CDF",
      received: 200000, disbursed: 10000, available: 190000,
      committed_unpaid: 40000, shortfall: 0,
    });
    expect(rows[0].currency_id).toBe(USD);
  });

  it("pas de double comptage BC + facture enfant dans le decaisse", () => {
    const m = disbursedCentsByCurrency([
      doc({ id: 10, totalTtc: "100.00", paidAmount: "40.00" }),
      doc({ id: 11, type: "invoice", direction: "inbound", status: "issued", parentDocumentId: 10, totalTtc: "60.00", paidAmount: "60.00" }),
    ], USD);
    expect(m.get(USD)).toBe(10000);
  });

  it("sommes exactes au centime : 0.10 + 0.20 = 0.30", () => {
    const rows = buildFundsSummary(
      [{ amount: "0.10", currencyId: USD, isActive: 1 }, { amount: "0.20", currencyId: USD, isActive: 1 }],
      [doc({ totalTtc: "0.30", paidAmount: "0.05" })],
      USD,
      codes,
    );
    expect(rows[0].received).toBe(0.3);
    expect(rows[0].available).toBe(0.25);
    expect(rows[0].committed_unpaid).toBe(0.25);
  });

  it("devise du chantier toujours presente meme sans mouvement", () => {
    expect(buildFundsSummary([], [], CDF, codes)).toEqual([
      { currency_id: CDF, currency_code: "CDF", received: 0, disbursed: 0, available: 0, committed_unpaid: 0, shortfall: 0 },
    ]);
  });
});
