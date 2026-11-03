import { BadRequestException, ConflictException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { batiproDocuments, journalEntries, ledgerPendingEntries } from "../database/schema";
import { BatiproService } from "./batipro.service";
import { CancelDocumentPaymentDto } from "./dto/batipro.dto";

const ORG = 1;
const USD = 1;
const CDF = 2;

function setup(docOver: Record<string, unknown> = {}, opts: { entry?: any; pending?: any[]; reverse?: jest.Mock; affected?: number } = {}) {
  const updates: { table: any; patch: any }[] = [];
  const db: any = {
    update: jest.fn().mockImplementation((table: any) => ({
      set: jest.fn().mockImplementation((patch: any) => {
        updates.push({ table, patch });
        return { where: jest.fn().mockResolvedValue([{ affectedRows: table === batiproDocuments && patch.paymentLedgerEntryId === null ? opts.affected ?? 1 : 1 }]) };
      }),
    })),
  };
  const ledger: any = { reverse: opts.reverse ?? jest.fn().mockResolvedValue({}) };
  const svc: any = new BatiproService(db, {} as any, {} as any, ledger, {} as any, {} as any, {} as any);
  const doc = {
    id: 6, projectId: 5, type: "invoice", direction: "inbound", number: "FAC-2026-0001", status: "paid", currencyId: USD,
    totalTtc: "60.53", paidAmount: "60.53", paidAmountProjectCcy: "0.00", paymentLedgerEntryId: 1073, ...docOver,
  };
  svc.getDocument = jest.fn().mockResolvedValue(doc);
  svc.assertProjectInScope = jest.fn().mockResolvedValue(undefined);
  svc.getProject = jest.fn().mockResolvedValue({ id: 5, currencyId: USD });
  svc.loadPaymentEntry = jest.fn().mockResolvedValue(
    opts.entry === undefined ? { id: 1073, status: "posted", reversedById: null, totalDebit: "60.53", exchangeRate: null, idempotencyKey: "batipro:supplier_advance:6:6053" } : opts.entry,
  );
  svc.paymentPendingRows = jest.fn().mockResolvedValue(opts.pending ?? []);
  svc.recomputeProjectRisk = jest.fn().mockResolvedValue(undefined);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  return { svc, ledger, updates };
}

describe("BatiPro annulation du reglement d'un document", () => {
  it("nominal : contre-passe, paye remis a 0, facture paid -> issued, cle d'idempotence liberee", async () => {
    const { svc, ledger, updates } = setup();
    const out = await svc.cancelDocumentPayment(6, "Doublon avec le BC", ORG, 9, "all");
    expect(ledger.reverse).toHaveBeenCalledWith(1073, expect.stringContaining("Doublon"), ORG, 9);
    expect(updates[0].patch).toMatchObject({ paidAmount: "0.00", status: "issued", paymentLedgerEntryId: null });
    expect(updates.some((u) => u.table === journalEntries && /:rev1073$/.test(u.patch.idempotencyKey))).toBe(true);
    expect(out).toMatchObject({ paid_amount: 0, balance: 60.53, status: "issued", cancelled_payment_entry_id: 1073, cancelled_amount: 60.53 });
    expect(svc.recomputeProjectRisk).toHaveBeenCalledWith(ORG, 5);
    expect(svc.publish).toHaveBeenCalled();
  });

  it("motif manquant -> 400, rien n'est touche", async () => {
    const { svc, ledger, updates } = setup();
    await expect(svc.cancelDocumentPayment(6, "  ab ", ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.reverse).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("DTO : motif < 3 car. refuse", async () => {
    expect((await validate(plainToInstance(CancelDocumentPaymentDto, { reason: "ab" }))).map((e) => e.property)).toContain("reason");
    expect(await validate(plainToInstance(CancelDocumentPaymentDto, { reason: "Doublon" }))).toHaveLength(0);
  });

  it("depense refusee (son propre flux)", async () => {
    const { svc, ledger } = setup({ type: "expense", direction: "outbound" });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(BadRequestException);
    expect(ledger.reverse).not.toHaveBeenCalled();
  });

  it("document non paye refuse", async () => {
    const { svc } = setup({ paidAmount: "0.00", status: "issued" });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toThrow(/pas paye/i);
  });

  it("BC : statut inchange, paye partiel remis exact (100.10 - 40.05 = 60.05)", async () => {
    const { svc, updates } = setup(
      { type: "purchase_order", direction: "outbound", status: "confirmed", totalTtc: "200.00", paidAmount: "100.10", paymentLedgerEntryId: 7 },
      { entry: { id: 7, status: "posted", reversedById: null, totalDebit: "40.05", exchangeRate: null, idempotencyKey: null } },
    );
    const out = await svc.cancelDocumentPayment(5, "Erreur de saisie", ORG, 9, "all");
    expect(updates[0].patch).toMatchObject({ paidAmount: "60.05", status: "confirmed" });
    expect(out).toMatchObject({ paid_amount: 60.05, balance: 139.95 });
  });

  it("plusieurs reglements non identifiables (dernier > total paye) -> 409", async () => {
    const { svc, ledger } = setup({}, { entry: { id: 1073, status: "posted", reversedById: null, totalDebit: "80.00", exchangeRate: null, idempotencyKey: null } });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(ConflictException);
    expect(ledger.reverse).not.toHaveBeenCalled();
  });

  it("ecriture en attente d'approbation : ligne d'attente annulee, pas de contre-passation", async () => {
    const { svc, ledger, updates } = setup(
      { paymentLedgerEntryId: null },
      { pending: [{ id: 31, payload: { type: "batipro_supplier_advance", amountsByRole: { cash: 60.53 } } }] },
    );
    const out = await svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all");
    expect(ledger.reverse).not.toHaveBeenCalled();
    expect(updates.some((u) => u.table === ledgerPendingEntries && u.patch.status === "cancelled")).toBe(true);
    expect(out.paid_amount).toBe(0);
  });

  it("sans ecriture ni attente identifiable -> 409", async () => {
    const { svc } = setup({ paymentLedgerEntryId: null });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(ConflictException);
  });

  it("deja contre-passee : tolere (ecriture deja reversed, ou erreur ledger 'deja contre-passee')", async () => {
    const a = setup({}, { entry: { id: 1073, status: "reversed", reversedById: 99, totalDebit: "60.53", exchangeRate: null, idempotencyKey: null } });
    await expect(a.svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).resolves.toMatchObject({ paid_amount: 0 });
    expect(a.ledger.reverse).not.toHaveBeenCalled();
    const b = setup({}, { reverse: jest.fn().mockRejectedValue(new ConflictException("Cette ecriture a deja ete contre-passee.")) });
    await expect(b.svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).resolves.toMatchObject({ paid_amount: 0 });
  });

  it("periode cloturee : erreur remontee et document restaure", async () => {
    const { svc, updates } = setup({}, { reverse: jest.fn().mockRejectedValue(new BadRequestException("Periode cloturee")) });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toThrow(/cloturee/);
    const last = updates[updates.length - 1].patch;
    expect(last).toMatchObject({ paidAmount: "60.53", status: "paid", paymentLedgerEntryId: 1073 });
  });

  it("concurrence : claim perdu -> 409 sans contre-passation", async () => {
    const { svc, ledger } = setup({}, { affected: 0 });
    await expect(svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all")).rejects.toBeInstanceOf(ConflictException);
    expect(ledger.reverse).not.toHaveBeenCalled();
  });

  it("devise etrangere : contre-valeur chantier defaite au taux du reglement", async () => {
    const { svc, updates } = setup(
      { currencyId: CDF, totalTtc: "2800.00", paidAmount: "2800.00", paidAmountProjectCcy: "1.00", paymentLedgerEntryId: 8 },
      { entry: { id: 8, status: "posted", reversedById: null, totalDebit: "2800.00", exchangeRate: "2800.000000", idempotencyKey: null } },
    );
    const out = await svc.cancelDocumentPayment(6, "Doublon", ORG, 9, "all");
    expect(updates[0].patch).toMatchObject({ paidAmount: "0.00", paidAmountProjectCcy: expect.any(String) });
    expect(out).toHaveProperty("paid_amount_project_ccy");
  });
});
