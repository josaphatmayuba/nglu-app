import { buildPhaseDetail, type PhaseDetailRow, type PoPayInfo } from "./phase-detail.util";

const phase = { id: 1, projectId: 5, label: "RDC – Électricité", progress: 10, plannedBudget: null, currencyId: 1 };
const codes = new Map<number, string>([[1, "USD"], [2, "CDF"]]);

let seq = 0;
const row = (over: Partial<PhaseDetailRow>): PhaseDetailRow => ({
  lineId: ++seq, documentId: 100, designation: "Ligne", quantity: 1, unitPrice: 100, lineHt: 100,
  lineActive: 1, lineCurrencyId: null, docType: "quote", docDirection: "outbound", docStatus: "accepted",
  docActive: 1, docNumber: "DOC-1", docCurrencyId: 1, docPaidAmount: 0, docDate: "2026-10-01", submittedBy: null, ...over,
});
const usd = (d: ReturnType<typeof buildPhaseDetail>) => d.totals_by_currency.find((t) => t.currency_code === "USD")!;

describe("buildPhaseDetail", () => {
  it("prevu = devis client sortant accepte uniquement; devis non accepte ignore", () => {
    const d = buildPhaseDetail(phase, [
      row({ lineHt: 1026 }),
      row({ docStatus: "draft", lineHt: 500, documentId: 101 }),
      row({ docStatus: "refused", lineHt: 700, documentId: 102 }),
    ], new Map(), codes);
    expect(usd(d).planned).toBe(1026);
    expect(d.planned_lines).toHaveLength(1);
  });

  it("lignes ou documents inactifs ignores", () => {
    const d = buildPhaseDetail(phase, [
      row({ lineHt: 100 }),
      row({ lineHt: 900, lineActive: 0 }),
      row({ lineHt: 800, docActive: 0, documentId: 101 }),
    ], new Map(), codes);
    expect(usd(d).planned).toBe(100);
  });

  it("devis artisan inbound : refuse/annule exclus", () => {
    const base = { docDirection: "inbound", docType: "quote" };
    const d = buildPhaseDetail(phase, [
      row({ ...base, docStatus: "submitted", lineHt: 1200, submittedBy: "Jean SARL" }),
      row({ ...base, docStatus: "refused", lineHt: 50, documentId: 101 }),
      row({ ...base, docStatus: "cancelled", lineHt: 60, documentId: 102 }),
    ], new Map(), codes);
    expect(usd(d).artisan_quote).toBe(1200);
    expect(d.artisan_lines).toHaveLength(1);
    expect(d.alerts.map((a) => a.code)).toContain("artisan_over_planned");
  });

  const pay = (docTotalTtc: number, docPaidAmount: number, totals: PoPayInfo["totals"] = []): PoPayInfo => ({ docTotalTtc, docPaidAmount, totals });
  const po = { docType: "purchase_order", docDirection: "outbound", docStatus: "sent" };

  it("BC annule ignore; paye (TTC) reparti en HT au prorata", () => {
    const d = buildPhaseDetail(phase, [
      row({ ...po, documentId: 200, lineHt: 250, docPaidAmount: 400 }),
      row({ ...po, documentId: 201, lineHt: 999, docPaidAmount: 999, docStatus: "cancelled" }),
    ], new Map([[200, pay(1000, 400)], [201, pay(999, 999)]]), codes);
    expect(usd(d).committed).toBe(250);
    expect(usd(d).paid).toBe(100); // 250 * 400/1000
    expect(d.expense_lines).toHaveLength(1);
  });

  it("paye TTC contre engage HT : BC paye en entier avec TVA 16% => paye = engage", () => {
    const d = buildPhaseDetail(phase, [row({ ...po, documentId: 200, lineHt: 1000 })], new Map([[200, pay(1160, 1160)]]), codes);
    expect(usd(d).committed).toBe(1000);
    expect(usd(d).paid).toBe(1000);
  });

  it("BC multi-devises : paye par devise via document_totals, jamais melange", () => {
    const totals = [{ currencyId: 1, totalTtc: 116, paid: 58 }, { currencyId: 2, totalTtc: 2320000, paid: 2320000 }];
    const d = buildPhaseDetail(phase, [
      row({ ...po, documentId: 200, lineHt: 100 }),
      row({ ...po, documentId: 200, lineHt: 2000000, lineCurrencyId: 2 }),
    ], new Map([[200, pay(0, 0, totals)]]), codes);
    expect(usd(d).paid).toBe(50);
    expect(d.totals_by_currency.find((t) => t.currency_code === "CDF")!.paid).toBe(2000000);
  });

  it("sans document_totals : seules les lignes en devise du document sont payees", () => {
    const d = buildPhaseDetail(phase, [
      row({ ...po, documentId: 200, lineHt: 100 }),
      row({ ...po, documentId: 200, lineHt: 5000, lineCurrencyId: 2 }),
    ], new Map([[200, pay(116, 116)]]), codes);
    expect(usd(d).paid).toBe(100);
    expect(d.totals_by_currency.find((t) => t.currency_code === "CDF")!.paid).toBe(0);
  });

  it("total de BC nul ou negatif => paye 0; plafonne au paye du BC (ligne negative)", () => {
    const zero = buildPhaseDetail(phase, [row({ ...po, documentId: 200, lineHt: 100 })], new Map([[200, pay(0, 50)]]), codes);
    expect(usd(zero).paid).toBe(0);
    const neg = buildPhaseDetail(phase, [row({ ...po, documentId: 200, lineHt: 100 })], new Map([[200, pay(-10, 50)]]), codes);
    expect(usd(neg).paid).toBe(0);
    // total TTC 50 (apres ajustement), paye 50, deux lignes positives de 40 + 40 : plafond a 50
    const cap = buildPhaseDetail(phase, [
      row({ ...po, documentId: 200, lineHt: 40 }),
      row({ ...po, documentId: 200, lineHt: 40 }),
      row({ ...po, documentId: 200, lineHt: -30 }),
    ], new Map([[200, pay(50, 50)]]), codes);
    expect(usd(cap).paid).toBe(50);
  });

  it("facture inbound ignoree; devis artisan draft exclu", () => {
    const d = buildPhaseDetail(phase, [
      row({ docDirection: "inbound", docType: "invoice", docStatus: "submitted", lineHt: 300 }),
      row({ docDirection: "inbound", docType: "quote", docStatus: "draft", lineHt: 400, documentId: 101 }),
    ], new Map(), codes);
    expect(d.artisan_lines).toHaveLength(0);
    expect(d.totals_by_currency).toHaveLength(0);
  });

  it("repli de devise : document puis phase", () => {
    const d = buildPhaseDetail(phase, [
      row({ lineHt: 10, docCurrencyId: 2 }), // document CDF
      row({ lineHt: 20, docCurrencyId: null, documentId: 101 }), // phase USD
    ], new Map(), codes);
    expect(d.totals_by_currency.find((t) => t.currency_code === "CDF")!.planned).toBe(10);
    expect(usd(d).planned).toBe(20);
  });

  it("reste = prevu - paye et alertes engage/paye > prevu", () => {
    const d = buildPhaseDetail(phase, [
      row({ lineHt: 1000 }),
      row({ ...po, documentId: 200, lineHt: 1200 }),
    ], new Map([[200, pay(1200, 1100)]]), codes);
    expect(usd(d).remaining).toBe(1000 - 1100);
    expect(d.alerts.map((a) => a.code).sort()).toEqual(["committed_over_planned", "paid_over_planned"]);
  });

  it("multi-devise : USD et CDF jamais additionnes (devise de ligne > devise du document)", () => {
    const d = buildPhaseDetail(phase, [
      row({ lineHt: 1000 }),
      row({ lineHt: 2000000, lineCurrencyId: 2, documentId: 101 }),
    ], new Map(), codes);
    expect(d.totals_by_currency).toHaveLength(2);
    expect(usd(d).planned).toBe(1000);
    expect(d.totals_by_currency.find((t) => t.currency_code === "CDF")!.planned).toBe(2000000);
  });
});
