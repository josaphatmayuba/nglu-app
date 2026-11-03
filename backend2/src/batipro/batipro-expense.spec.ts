import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { buildFundsSummary } from "./funds.util";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { batiproDocumentLines, batiproDocuments, batiproMaterials, batiproStockMovements } from "../database/schema";
import { BatiproService } from "./batipro.service";
import { CancelExpenseDto, CreateBatiproExpenseDto } from "./dto/batipro.dto";

const ORG = 1;
const USD = 1;
const CDF = 2;

function setup(opts: { bundle?: any; ledger?: any } = {}) {
  const inserts: { table: any; values: any }[] = [];
  const updates: { table: any; patch: any }[] = [];
  const txMock: any = {
    insert: jest.fn().mockImplementation((table: any) => ({
      values: jest.fn().mockImplementation((values: any) => {
        inserts.push({ table, values });
        return Object.assign(Promise.resolve([{ affectedRows: 1 }]), {
          $returningId: () => Promise.resolve([{ id: 42 }]),
          onDuplicateKeyUpdate: () => Promise.resolve(),
        });
      }),
    })),
    select: jest.fn().mockImplementation(() => {
      const chain: any = { from: () => chain, where: () => chain, for: () => chain, limit: () => Promise.resolve([{ id: 1, lastNumber: 6 }]) };
      return chain;
    }),
    update: jest.fn().mockImplementation((table: any) => ({
      set: jest.fn().mockImplementation((patch: any) => {
        updates.push({ table, patch });
        return { where: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
      }),
    })),
  };
  const db: any = { ...txMock, transaction: jest.fn().mockImplementation(async (fn: any) => fn(txMock)) };
  const ledger: any = opts.ledger ?? { postByRules: jest.fn(), reverse: jest.fn().mockResolvedValue({ reversedEntryId: 7, reversalEntryId: 8 }) };
  const svc: any = new BatiproService(db, {} as any, {} as any, ledger, {} as any, {} as any, {} as any);
  svc.findExpenseEntry = jest.fn().mockResolvedValue(null);
  svc.expensePendingRows = jest.fn().mockResolvedValue([]);
  svc.assertProjectInScope = jest.fn().mockImplementation(async (projectId: number, _o: number, scope: any) => {
    if (scope !== "all" && !scope.includes(projectId)) throw new NotFoundException("Chantier introuvable.");
  });
  svc.getProject = jest.fn().mockResolvedValue({ id: 5, name: "Villa", currencyId: USD });
  svc.findActiveCurrency = jest.fn().mockImplementation(async (id: number) => (id === USD || id === CDF ? { id, currencyCode: id === USD ? "USD" : "CDF" } : null));
  svc.validPhaseIds = jest.fn().mockResolvedValue(new Set([11, 12]));
  svc.recomputeProjectRisk = jest.fn().mockResolvedValue(undefined);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  // Releve en base apres ecriture : renvoie ce que l'insert a produit.
  svc.loadExpenseBundle = jest.fn().mockImplementation(async () => {
    if (opts.bundle) return opts.bundle;
    const d = inserts.find((i) => i.table === batiproDocuments)!.values;
    const l = inserts.find((i) => i.table === batiproDocumentLines)!.values;
    return { doc: { id: 42, ...d, paidAmount: "0.00", paidAmountProjectCcy: "0.00" }, line: l, projectName: "Villa", currencyCode: "USD", supplierName: null, subcontractorName: null, workerName: null };
  });
  const docIns = () => inserts.find((i) => i.table === batiproDocuments)!.values;
  const lineIns = () => inserts.find((i) => i.table === batiproDocumentLines)!.values;
  return { svc, db, ledger, inserts, updates, docIns, lineIns };
}

const dto = (over: Record<string, unknown> = {}) => ({
  project_id: 5, category: "labor", designation: "Macons semaine 44", expense_date: "2026-10-30",
  currency_id: USD, amount_ttc: 123.45, beneficiary_kind: "text", beneficiary_name: "Equipe Jean", ...over,
}) as any;

const bundle = (docOver: Record<string, unknown> = {}, lineOver: Record<string, unknown> = {}) => ({
  doc: {
    id: 42, projectId: 5, type: "expense", direction: "outbound", number: "DEP-2026-0007", status: "recorded", currencyId: USD,
    totalHt: "123.45", totalVat: "0.00", totalTtc: "123.45", paidAmount: "0.00", ledgerEntryId: null, fxRate: null, ...docOver,
  },
  line: { id: 99, phaseId: null, serviceCategory: "labor", designation: "x", vatRate: "0.00", lineNote: null, ...lineOver },
  projectName: "Villa", currencyCode: "USD", supplierName: null, subcontractorName: null, workerName: null,
});

describe("BatiPro depense chantier - creation", () => {
  it("numero DEP-AAAA-nnnn, ligne service, aucun materiau ni mouvement de stock", async () => {
    const { svc, inserts } = setup();
    const out = await svc.createExpense(dto(), ORG, 9, "all");
    const doc = inserts.find((i) => i.table === batiproDocuments)!.values;
    const line = inserts.find((i) => i.table === batiproDocumentLines)!.values;
    expect(doc).toMatchObject({ type: "expense", direction: "outbound", status: "recorded", number: "DEP-2026-0007", createdBy: 9, issueDate: "2026-10-30", currencyId: USD });
    expect(line).toMatchObject({ lineType: "service", serviceCategory: "labor", materialId: null, quantity: "1", documentId: 42 });
    expect(inserts.some((i) => i.table === batiproMaterials || i.table === batiproStockMovements)).toBe(false);
    expect(out).toMatchObject({ id: 42, type: "expense", number: "DEP-2026-0007", status: "recorded", amountTtc: "123.45", paidAmount: "0.00", balance: "123.45" });
  });

  it("montants exacts sans arrondi : 123.45 TTC, 150.61 TTC/HT, TVA = TTC - HT en centimes", async () => {
    const a = setup();
    await a.svc.createExpense(dto({ amount_ttc: 123.45 }), ORG, 9, "all");
    expect(a.docIns()).toMatchObject({ totalHt: "123.45", totalVat: "0.00", totalTtc: "123.45" });
    expect(a.lineIns()).toMatchObject({ unitPrice: "123.45", lineHt: "123.45", lineTtc: "123.45" });

    const b = setup();
    const out = await b.svc.createExpense(dto({ amount_ttc: 150.61, amount_ht: 129.84, vat_rate: 16 }), ORG, 9, "all");
    expect(b.docIns()).toMatchObject({ totalHt: "129.84", totalVat: "20.77", totalTtc: "150.61" });
    expect(b.lineIns()).toMatchObject({ lineHt: "129.84", lineTtc: "150.61", vatRate: "16" });
    expect(out).toMatchObject({ amountHt: "129.84", amountVat: "20.77", amountTtc: "150.61", vatRate: "16" });
  });

  it("plus de 2 decimales -> 400 (jamais arrondi)", async () => {
    const { svc, inserts } = setup();
    await expect(svc.createExpense(dto({ amount_ttc: 10.005 }), ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createExpense(dto({ amount_ttc: 10, amount_ht: 9.999 }), ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    expect(inserts).toHaveLength(0);
  });

  it("DTO : 123.456 refuse par la validation", async () => {
    const errors = await validate(plainToInstance(CreateBatiproExpenseDto, dto({ amount_ttc: 123.456 })));
    expect(errors.map((e) => e.property)).toContain("amount_ttc");
    expect(await validate(plainToInstance(CreateBatiproExpenseDto, dto()))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateBatiproExpenseDto, dto({ currency_id: undefined })))).map((e) => e.property)).toContain("currency_id");
    expect((await validate(plainToInstance(CreateBatiproExpenseDto, dto({ category: "stock" })))).map((e) => e.property)).toContain("category");
  });

  it("devise obligatoire ; devise inconnue refusee", async () => {
    const { svc } = setup();
    await expect(svc.createExpense(dto({ currency_id: undefined }), ORG, 9, "all")).rejects.toThrow(/devise/i);
    await expect(svc.createExpense(dto({ currency_id: 99 }), ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("HT > TTC -> 400", async () => {
    const { svc } = setup();
    await expect(svc.createExpense(dto({ amount_ttc: 100, amount_ht: 100.01 }), ORG, 9, "all")).rejects.toThrow(/HT/);
  });

  it("phase d'un autre chantier -> 400 ; phase du chantier -> risque recalcule", async () => {
    const { svc } = setup();
    await expect(svc.createExpense(dto({ phase_id: 77 }), ORG, 9, "all")).rejects.toThrow(/phase/i);
    await svc.createExpense(dto({ phase_id: 11 }), ORG, 9, "all");
    expect(svc.recomputeProjectRisk).toHaveBeenCalledWith(ORG, 5);
  });

  it("hors scope chantier -> 404 ; beneficiaire texte sans nom -> 400", async () => {
    const { svc } = setup();
    await expect(svc.createExpense(dto(), ORG, 9, [8])).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.createExpense(dto({ beneficiary_name: "  " }), ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createExpense(dto({ beneficiary_kind: "supplier", supplier_id: 1, worker_id: 2 }), ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("devise etrangere + taux : contre-valeur figee", async () => {
    const { svc, docIns } = setup();
    await svc.createExpense(dto({ currency_id: CDF, amount_ttc: 280000, fx_rate: 2800 }), ORG, 9, "all");
    expect(docIns()).toMatchObject({ fxRate: "2800.000000", totalTtcProjectCcy: "100.00", totalTtc: "280000.00" });
  });
});

describe("BatiPro depense chantier - verrous des endpoints generiques", () => {
  it("update/delete/share/html d'un document expense -> 400 /expenses", async () => {
    const { svc } = setup();
    svc.getDocument = jest.fn().mockResolvedValue({ id: 42, type: "expense", direction: "outbound", status: "recorded", projectId: 5 });
    await expect(svc.updateDocument(42, { notes: "x" }, ORG)).rejects.toThrow(/expenses/);
    await expect(svc.deleteDocument(42, ORG)).rejects.toThrow(/expenses/);
    await expect(svc.shareDocument(42, ORG)).rejects.toThrow(/expenses/);
    await expect(svc.documentHtml(42, ORG)).rejects.toThrow(/expenses/);
  });
});

describe("BatiPro depense chantier - modification", () => {
  it("annulee -> 400", async () => {
    const { svc } = setup({ bundle: bundle({ status: "cancelled" }) });
    await expect(svc.updateExpense(42, { designation: "y" }, ORG, "all")).rejects.toThrow(/annulee/);
  });

  it("montant/devise verrouilles si payee ou comptabilisee, autres champs OK", async () => {
    const paid = setup({ bundle: bundle({ paidAmount: "10.00" }) });
    await expect(paid.svc.updateExpense(42, { amount_ttc: 200 }, ORG, "all")).rejects.toThrow(/non modifiables/);
    await expect(paid.svc.updateExpense(42, { currency_id: CDF }, ORG, "all")).rejects.toThrow(/non modifiables/);
    await paid.svc.updateExpense(42, { designation: "Nouveau libelle" }, ORG, "all");
    expect(paid.updates.find((u) => u.table === batiproDocumentLines)!.patch).toEqual({ designation: "Nouveau libelle" });

    const posted = setup({ bundle: bundle({ ledgerEntryId: 7 }) });
    await expect(posted.svc.updateExpense(42, { amount_ht: 100 }, ORG, "all")).rejects.toThrow(/non modifiables/);
  });

  it("montant modifie : recalcul exact doc + ligne ; TTC seul realigne le HT", async () => {
    const { svc, updates } = setup({ bundle: bundle() });
    await svc.updateExpense(42, { amount_ttc: 150.61 }, ORG, "all");
    expect(updates.find((u) => u.table === batiproDocuments)!.patch).toMatchObject({ totalHt: "150.61", totalVat: "0.00", totalTtc: "150.61" });
    expect(updates.find((u) => u.table === batiproDocumentLines)!.patch).toMatchObject({ lineHt: "150.61", lineTtc: "150.61", unitPrice: "150.61" });
    await expect(svc.updateExpense(42, { amount_ttc: 1.234 }, ORG, "all")).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateExpense(42, { amount_ht: 999 }, ORG, "all")).rejects.toThrow(/HT/);
  });

  it("phase d'un autre chantier -> 400", async () => {
    const { svc } = setup({ bundle: bundle() });
    await expect(svc.updateExpense(42, { phase_id: 77 }, ORG, "all")).rejects.toThrow(/phase/i);
  });
});

describe("BatiPro depense chantier - annulation et suppression", () => {
  it("annulation : motif requis, refusee si payee, renseigne cancelled_*", async () => {
    const ok = setup({ bundle: bundle({ ledgerEntryId: 7 }, { phaseId: 11 }) });
    await expect(ok.svc.cancelExpense(42, "  ", ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    await ok.svc.cancelExpense(42, "Saisie en double", ORG, 9, "all");
    expect(ok.ledger.reverse).toHaveBeenCalledWith(7, expect.stringContaining("Saisie en double"), ORG, 9);
    const patch = ok.updates.find((u) => u.table === batiproDocuments && u.patch.status)!.patch;
    expect(patch).toMatchObject({ status: "cancelled", cancelledBy: 9, cancelReason: "Saisie en double" });
    expect(patch.cancelledAt).toBeInstanceOf(Date);
    expect(ok.svc.recomputeProjectRisk).toHaveBeenCalledWith(ORG, 5);

    const paid = setup({ bundle: bundle({ paidAmount: "5.00", status: "paid" }) });
    await expect(paid.svc.cancelExpense(42, "Erreur", ORG, 9, "all")).rejects.toThrow(/payee/);
    const done = setup({ bundle: bundle({ status: "cancelled" }) });
    await expect(done.svc.cancelExpense(42, "Erreur", ORG, 9, "all")).rejects.toThrow(/deja annulee/);
  });

  it("DTO annulation : motif 3..500", async () => {
    expect(await validate(plainToInstance(CancelExpenseDto, { reason: "ab" }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CancelExpenseDto, { reason: "Doublon" }))).toHaveLength(0);
  });

  it("suppression : soft delete (is_active=0) si recorded vierge, jamais DELETE", async () => {
    const { svc, db, updates } = setup({ bundle: bundle() });
    db.delete = jest.fn();
    await svc.deleteExpense(42, ORG, "all");
    expect(updates.map((u) => u.patch)).toEqual([{ isActive: 0 }, { isActive: 0 }]);
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("suppression refusee (payee / comptabilisee / annulee) -> 400 'annulez'", async () => {
    for (const over of [{ paidAmount: "1.00" }, { ledgerEntryId: 3 }, { status: "paid" }, { status: "cancelled" }]) {
      const { svc, updates } = setup({ bundle: bundle(over) });
      await expect(svc.deleteExpense(42, ORG, "all")).rejects.toThrow(/annulez/);
      expect(updates).toHaveLength(0);
    }
  });
});

describe("BatiPro depense chantier - contrat JSON", () => {
  it("beneficiaire ouvrier, montants chaines exactes, solde, annulation", () => {
    const b = bundle({ beneficiaryWorkerId: 4, totalHt: "129.84", totalVat: "20.77", totalTtc: "150.61", paidAmount: "50.10", attachedFileKey: "k", createdBy: 9 });
    const j = BatiproService.toExpenseJson({ ...b, workerName: "Paul K." });
    expect(j).toMatchObject({
      amountHt: "129.84", amountVat: "20.77", amountTtc: "150.61", paidAmount: "50.10", balance: "100.51",
      beneficiary: { kind: "worker", id: 4, name: "Paul K." }, hasAttachment: true, createdBy: 9, cancelledAt: null, currencyCode: "USD",
    });
    const c = BatiproService.toExpenseJson(bundle({ status: "cancelled", cancelledAt: new Date("2026-11-01T10:00:00Z"), cancelReason: "x" }));
    expect(c).toMatchObject({ balance: "0.00", cancelledAt: "2026-11-01T10:00:00.000Z", cancelReason: "x" });
  });
});

// ── Lot 3 : reglement + comptabilisation ─────────────────────────────────────
// Base simulee a etat : la transaction restaure l'etat si le callback leve
// (rollback), le SELECT ... FOR UPDATE relit l'etat courant.
function paySetup(docOver: Record<string, unknown> = {}, opts: { projectCurrencyId?: number; ledger?: any } = {}) {
  const state: any = {
    id: 42, projectId: 5, type: "expense", direction: "outbound", number: "DEP-2026-0007", status: "recorded", currencyId: USD,
    currencyCode: "USD", totalHt: "123.45", totalVat: "0.00", totalTtc: "123.45", paidAmount: "0.00", paidAmountProjectCcy: "0.00",
    ledgerEntryId: null, paymentLedgerEntryId: null, cancelledAt: null, isActive: 1, beneficiaryName: "Equipe Jean", ...docOver,
  };
  const apply = (table: any, patch: any) => { if (table === batiproDocuments) Object.assign(state, patch); };
  const mkDb = (): any => ({
    select: jest.fn().mockImplementation(() => {
      const chain: any = { from: () => chain, where: () => chain, for: () => chain, limit: () => Promise.resolve([{ ...state }]) };
      return chain;
    }),
    update: jest.fn().mockImplementation((table: any) => ({
      set: jest.fn().mockImplementation((patch: any) => ({ where: jest.fn().mockImplementation(async () => { apply(table, patch); return [{ affectedRows: 1 }]; }) })),
    })),
  });
  const tx = mkDb();
  const db: any = mkDb();
  db.transaction = jest.fn().mockImplementation(async (fn: any) => {
    const snap = { ...state };
    try { return await fn(tx); } catch (e) { Object.keys(state).forEach((k) => delete state[k]); Object.assign(state, snap); throw e; }
  });
  const keys = new Map<string, number>();
  let next = 500;
  const ledger: any = opts.ledger ?? {
    postByRules: jest.fn().mockImplementation(async (input: any) => {
      if (keys.has(input.idempotencyKey)) return { id: keys.get(input.idempotencyKey), idempotent: true };
      const id = next++;
      keys.set(input.idempotencyKey, id);
      return { id, idempotent: false };
    }),
    reverse: jest.fn().mockResolvedValue({ reversedEntryId: 500, reversalEntryId: 900 }),
  };
  const notifier = { notifyPayment: jest.fn() };
  const svc: any = new BatiproService(db, {} as any, {} as any, ledger, {} as any, {} as any, notifier as any);
  svc.getDocument = jest.fn().mockImplementation(async () => ({ ...state, totalsByCurrency: [] }));
  const pc = opts.projectCurrencyId ?? USD;
  svc.getProject = jest.fn().mockResolvedValue({ id: 5, currencyId: pc, currencyCode: pc === USD ? "USD" : "CDF" });
  svc.resolveAnalyticProjectId = jest.fn().mockResolvedValue(77);
  svc.expensePendingRows = jest.fn().mockResolvedValue([]);
  svc.findExpenseEntry = jest.fn().mockResolvedValue(null);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  svc.recomputeProjectRisk = jest.fn().mockResolvedValue(undefined);
  svc.assertProjectInScope = jest.fn().mockResolvedValue(undefined);
  svc.loadExpenseBundle = jest.fn().mockImplementation(async () => ({ doc: { ...state }, line: { phaseId: null }, projectName: "Villa", currencyCode: "USD" }));
  const calls = () => ledger.postByRules.mock.calls.map((c: any[]) => c[0]);
  return { svc, ledger, state, calls };
}

describe("BatiPro depense chantier - reglement (lot 3)", () => {
  it("partiel puis total : recorded -> paid, achat poste une seule fois AVANT le decaissement", async () => {
    const { svc, state, calls } = paySetup();
    const r1 = await svc.recordPayment(42, 50.1, ORG, 9);
    expect(r1).toEqual({
      id: 42, type: "expense", paid_amount: 50.1, balance: 73.35, status: "recorded",
      ledger_entry_id: 500, payment_ledger_entry_id: 501, payment_deferred: false,
    });
    expect(state).toMatchObject({ paidAmount: "50.10", status: "recorded", ledgerEntryId: 500, paymentLedgerEntryId: 501 });
    const r2 = await svc.recordPayment(42, 73.35, ORG, 9);
    expect(r2).toMatchObject({ paid_amount: 123.45, balance: 0, status: "paid", ledger_entry_id: 500, payment_ledger_entry_id: 502 });
    expect(state).toMatchObject({ paidAmount: "123.45", status: "paid" });

    const c = calls();
    expect(c.map((x: any) => x.type)).toEqual(["batipro_purchase", "batipro_supplier_payment", "batipro_supplier_payment"]);
    expect(c.some((x: any) => x.type === "batipro_supplier_advance")).toBe(false);
    expect(c[0]).toMatchObject({
      idempotencyKey: "batipro:expense:42", particulars: "Dépense chantier DEP-2026-0007", reference: "DEP-2026-0007",
      sourceModule: "batipro", relatedId: "42", amountsByRole: { expense: 123.45, vat_input: 0, payable: 123.45 }, dimensions: { projectId: 77 },
    });
    expect(c[1]).toMatchObject({ idempotencyKey: "batipro:expense_payment:42:5010", amountsByRole: { payable: 50.1, cash: 50.1 }, dimensions: { projectId: 77 } });
    expect(c[2]).toMatchObject({ idempotencyKey: "batipro:expense_payment:42:12345", amountsByRole: { payable: 73.35, cash: 73.35 } });
  });

  it("150.61 (HT 129.84 / TVA 20.77) : montants exacts en centimes, solde nul -> paid", async () => {
    const { svc, state, calls } = paySetup({ totalHt: "129.84", totalVat: "20.77", totalTtc: "150.61" });
    const r = await svc.recordPayment(42, 150.61, ORG, 9);
    expect(r).toMatchObject({ paid_amount: 150.61, balance: 0, status: "paid" });
    expect(state.paidAmount).toBe("150.61");
    expect(calls()[0].amountsByRole).toEqual({ expense: 129.84, vat_input: 20.77, payable: 150.61 });
    expect(calls()[1]).toMatchObject({ idempotencyKey: "batipro:expense_payment:42:15061", amountsByRole: { payable: 150.61, cash: 150.61 } });
  });

  it("achat deja comptabilise (post-purchase idempotent) : pas de 2e ecriture d'achat", async () => {
    const { svc, calls } = paySetup();
    const p1 = await svc.postPurchaseToLedger(42, ORG, 9);
    const p2 = await svc.postPurchaseToLedger(42, ORG, 9);
    expect(p1).toEqual({ id: 42, ledger_entry_id: 500, deferred: false });
    expect(p2.ledger_entry_id).toBe(500);
    await svc.recordPayment(42, 10, ORG, 9);
    expect(calls().filter((x: any) => x.type === "batipro_purchase")).toHaveLength(2); // 2e = idempotent cote ledger
    expect(calls().filter((x: any) => x.type === "batipro_supplier_payment")).toHaveLength(1);
    expect(calls().every((x: any) => x.type !== "batipro_purchase" || x.idempotencyKey === "batipro:expense:42")).toBe(true);
  });

  it("refus : surpaiement, 3 decimales, montant <= 0, depense annulee -> 400 sans ecriture", async () => {
    const over = paySetup({ paidAmount: "100.00" });
    await expect(over.svc.recordPayment(42, 23.46, ORG, 9)).rejects.toThrow(/depasse le solde/);
    await expect(over.svc.recordPayment(42, 1.001, ORG, 9)).rejects.toBeInstanceOf(BadRequestException);
    await expect(over.svc.recordPayment(42, 0, ORG, 9)).rejects.toBeInstanceOf(BadRequestException);
    expect(over.ledger.postByRules).not.toHaveBeenCalled();
    expect(over.state.paidAmount).toBe("100.00");
    const cancelled = paySetup({ status: "cancelled" });
    await expect(cancelled.svc.recordPayment(42, 10, ORG, 9)).rejects.toThrow(/annulee/);
    expect(cancelled.ledger.postByRules).not.toHaveBeenCalled();
  });

  it("devise etrangere : taux obligatoire (400), sinon contre-valeur cumulee + taux transmis", async () => {
    const noRate = paySetup({ currencyId: CDF, currencyCode: "CDF", totalHt: "280000.00", totalTtc: "280000.00" });
    await expect(noRate.svc.recordPayment(42, 140000, ORG, 9)).rejects.toThrow(/taux de change est obligatoire/);
    expect(noRate.ledger.postByRules).not.toHaveBeenCalled();
    const ok = paySetup({ currencyId: CDF, currencyCode: "CDF", totalHt: "280000.00", totalTtc: "280000.00" });
    const r = await ok.svc.recordPayment(42, 140000, ORG, 9, 2800);
    expect(r).toMatchObject({ paid_amount: 140000, paid_amount_project_ccy: 50, status: "recorded" });
    expect(ok.state.paidAmountProjectCcy).toBe("50.00");
    expect(ok.calls()[1]).toMatchObject({ type: "batipro_supplier_payment", exchangeRate: 2800, currencyId: CDF });
  });

  it("echec du ledger (decaissement ou regle absente) : paid_amount et statut inchanges", async () => {
    const failPay = paySetup({ ledgerEntryId: 300 });
    failPay.ledger.postByRules.mockRejectedValueOnce(new BadRequestException('Aucune regle comptable pour le type "batipro_supplier_payment" (org 1).'));
    await expect(failPay.svc.recordPayment(42, 50, ORG, 9)).rejects.toThrow(/Aucune regle/);
    expect(failPay.state).toMatchObject({ paidAmount: "0.00", status: "recorded", paymentLedgerEntryId: null });

    const noRule = paySetup();
    noRule.ledger.postByRules.mockRejectedValueOnce(new BadRequestException('Aucune regle comptable pour le type "batipro_purchase" (org 2).'));
    await expect(noRule.svc.recordPayment(42, 50, ORG, 9)).rejects.toThrow(/Aucune regle/);
    expect(noRule.state).toMatchObject({ paidAmount: "0.00", status: "recorded", ledgerEntryId: null });
    expect(noRule.ledger.postByRules).toHaveBeenCalledTimes(1);
  });

  it("achat en attente d'approbation -> 409, rien n'est paye", async () => {
    const s = paySetup();
    s.ledger.postByRules.mockResolvedValueOnce({ id: 0, deferred: true });
    await expect(s.svc.recordPayment(42, 50, ORG, 9)).rejects.toBeInstanceOf(ConflictException);
    expect(s.state).toMatchObject({ paidAmount: "0.00", status: "recorded" });
    expect(s.ledger.postByRules).toHaveBeenCalledTimes(1);
    const p = paySetup();
    p.svc.expensePendingRows.mockResolvedValue([{ id: 1, status: "pending" }]);
    await expect(p.svc.recordPayment(42, 50, ORG, 9)).rejects.toBeInstanceOf(ConflictException);
    expect(p.ledger.postByRules).not.toHaveBeenCalled();
  });
});

describe("BatiPro depense chantier - annulation comptable (lot 3)", () => {
  it("comptabilisee non payee : ledger.reverse puis statut cancelled", async () => {
    const s = paySetup({ ledgerEntryId: 500 });
    const out = await s.svc.cancelExpense(42, "Doublon de saisie", ORG, 9, "all");
    expect(s.ledger.reverse).toHaveBeenCalledWith(500, "Annulation depense DEP-2026-0007 : Doublon de saisie", ORG, 9);
    expect(s.state).toMatchObject({ status: "cancelled", cancelledBy: 9, cancelReason: "Doublon de saisie" });
    expect(out).toMatchObject({ status: "cancelled" });
  });

  it("ecriture retrouvee par cle (ledger_entry_id NULL) : contre-passee aussi", async () => {
    const s = paySetup();
    s.svc.findExpenseEntry.mockResolvedValue({ id: 610, status: "posted", reversedById: null });
    await s.svc.cancelExpense(42, "Erreur", ORG, 9, "all");
    expect(s.ledger.reverse).toHaveBeenCalledWith(610, expect.any(String), ORG, 9);
  });

  it("payee -> refusee sans contre-passation ; echec reverse (periode close) -> rien annule", async () => {
    const paid = paySetup({ ledgerEntryId: 500, paidAmount: "10.00" });
    await expect(paid.svc.cancelExpense(42, "Erreur", ORG, 9, "all")).rejects.toThrow(/payee/);
    expect(paid.ledger.reverse).not.toHaveBeenCalled();
    const closed = paySetup({ ledgerEntryId: 500 });
    closed.ledger.reverse.mockRejectedValueOnce(new ConflictException("Periode cloturee."));
    await expect(closed.svc.cancelExpense(42, "Erreur", ORG, 9, "all")).rejects.toThrow(/cloturee/);
    expect(closed.state).toMatchObject({ status: "recorded", cancelledAt: null });
  });
});

describe("BatiPro depense chantier - fonds / budget", () => {
  it("depense payee : decaisse, disponible baisse, reste du = TTC - paye, sans double comptage", () => {
    const docs = [
      { id: 1, type: "expense", direction: "outbound", status: "recorded", isActive: 1, currencyId: USD, parentDocumentId: null, totalTtc: "150.61", paidAmount: "50.10" },
      { id: 2, type: "expense", direction: "outbound", status: "paid", isActive: 1, currencyId: USD, parentDocumentId: null, totalTtc: "123.45", paidAmount: "123.45" },
      { id: 3, type: "expense", direction: "outbound", status: "cancelled", isActive: 1, currencyId: USD, parentDocumentId: null, totalTtc: "999.00", paidAmount: "0.00" },
    ];
    const [row] = buildFundsSummary([{ amount: "1000.00", currencyId: USD, isActive: 1 }], docs, USD, new Map([[USD, "USD"]]));
    expect(row).toMatchObject({ received: 1000, disbursed: 173.55, available: 826.45, committed_unpaid: 100.51 });
  });
});
