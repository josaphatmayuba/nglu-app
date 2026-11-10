import { buildFundsSummary, type SpendDoc } from "./funds.util";
import { buildStatement, type StatementDoc, type StatementFund } from "./statement.util";

const USD = 1;
const CDF = 2;
const codes = new Map<number, string | null>([[USD, "USD"], [CDF, "CDF"]]);

const fund = (o: Partial<StatementFund> & { id: number; amount: number }): StatementFund => ({
  receivedAt: "2026-01-05", currencyId: USD, isActive: 1, ...o,
});
const doc = (o: Partial<StatementDoc> & { id: number; paidAmount: number }): StatementDoc => ({
  kind: "expense_doc", type: "purchase_order", status: "confirmed", currencyId: USD, paidDate: "2026-01-10", nature: "materials", ...o,
});

// Reference : meme definition que funds_available (buildFundsSummary).
const available = (funds: StatementFund[], docs: StatementDoc[]) => {
  const spend: SpendDoc[] = docs.filter((d) => d.kind === "expense_doc").map((d) => ({
    id: d.id, type: d.type, direction: "outbound", status: d.status, isActive: 1, currencyId: d.currencyId, parentDocumentId: null,
    totalTtc: d.paidAmount, paidAmount: d.paidAmount, fxRate: d.fxRate, paidAmountProjectCcy: d.paidAmountProjectCcy,
  }));
  const row = buildFundsSummary(funds, spend, USD, codes).find((r) => r.currency_id === USD);
  return row?.available ?? 0;
};
const run = (funds: StatementFund[], docs: StatementDoc[]) =>
  buildStatement({ projectCurrencyId: USD, currencyCodeById: codes, funds, docs });

describe("statement.util", () => {
  it("solde courant et final == funds_available", () => {
    const funds = [fund({ id: 1, amount: 1000.1 })];
    const docs = [doc({ id: 1, paidAmount: 200.2 }), doc({ id: 2, paidAmount: 0.1, paidDate: "2026-01-12" })];
    const s = run(funds, docs);
    expect(s.lines.map((l) => l.balance)).toEqual([1000.1, 799.9, 799.8]);
    expect(s.final_balance).toBe(available(funds, docs));
  });

  it("fonds annule : 2 lignes (entree puis annulation), solde == funds_available", () => {
    const funds = [fund({ id: 1, amount: 500 }), fund({ id: 2, amount: 300, isActive: 0, cancelledAt: "2026-01-08" })];
    const docs = [doc({ id: 1, paidAmount: 100 })];
    const s = run(funds, docs);
    expect(s.lines.filter((l) => l.category.startsWith("funding"))).toHaveLength(3);
    expect(s.lines.find((l) => l.status === "cancelled")?.exit).toBe(300);
    expect(s.final_balance).toBe(400);
    expect(s.final_balance).toBe(available(funds, docs));
  });

  it("FC sans taux : a convertir, hors solde ; avec reglement converti : compte", () => {
    const funds = [fund({ id: 1, amount: 1000 })];
    const noRate = doc({ id: 1, paidAmount: 28000, currencyId: CDF });
    const withRate = doc({ id: 2, paidAmount: 28000, currencyId: CDF, fxRate: "2800", paidAmountProjectCcy: 10 });
    const s = run(funds, [noRate, withRate]);
    expect(s.lines.find((l) => l.status === "to_convert")?.balance).toBeNull();
    expect(s.lines.find((l) => l.status === "to_convert")?.currency_code).toBe("CDF");
    expect(s.final_balance).toBe(990);
    expect(s.final_balance).toBe(available(funds, [noRate, withRate]));
  });

  it("paiement en attente : ligne signalee, solde == funds_available", () => {
    const funds = [fund({ id: 1, amount: 1000 })];
    const docs = [doc({ id: 1, paidAmount: 300, pendingCents: 10000 })];
    const s = run(funds, docs);
    const pend = s.lines.filter((l) => l.status === "pending");
    expect(pend).toHaveLength(1);
    expect(pend[0].exit).toBe(100);
    expect(s.final_balance).toBe(700);
    expect(s.final_balance).toBe(available(funds, docs));
  });

  it("filtre par date : solde d'ouverture et categorie", () => {
    const funds = [fund({ id: 1, amount: 1000 })];
    const docs = [doc({ id: 1, paidAmount: 100, paidDate: "2026-02-01", nature: "labor" })];
    const s = buildStatement({ projectCurrencyId: USD, currencyCodeById: codes, funds, docs }, { from: "2026-02-01" });
    expect(s.opening_balance).toBe(1000);
    expect(s.lines).toHaveLength(1);
    expect(s.closing_balance).toBe(900);
    const c = buildStatement({ projectCurrencyId: USD, currencyCodeById: codes, funds, docs }, { category: "funding" });
    expect(c.lines).toHaveLength(1);
  });

  it("facture client encaissee : info, hors solde", () => {
    const s = run([fund({ id: 1, amount: 50 })], [doc({ id: 9, kind: "client_invoice", type: "invoice", paidAmount: 999 })]);
    expect(s.final_balance).toBe(50);
    expect(s.lines.find((l) => l.status === "info")?.counted).toBe(false);
  });
});
