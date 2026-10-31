import { BadRequestException } from "@nestjs/common";
import { BatiproService } from "./batipro.service";
import { convertedPaidCents, summarizeFx, type SpendDoc } from "./funds.util";
import { convertToProjectCents, invertDecimalRate, parseFxRate, fxRateToString } from "./fx.util";

const ORG = 1;
const USD = 1;
const CDF = 2;

const po = (o: Partial<SpendDoc> = {}): SpendDoc => ({
  id: 1, type: "purchase_order", direction: "outbound", status: "confirmed", isActive: 1,
  currencyId: CDF, parentDocumentId: null, totalTtc: "2800000.00", paidAmount: 0, ...o,
});

describe("fx.util", () => {
  it("parse un taux a 6 decimales, refuse <=0 et > 6 decimales", () => {
    expect(parseFxRate(2800)).toBe(2800000000n);
    expect(parseFxRate("2800.123456")).toBe(2800123456n);
    expect(parseFxRate(0)).toBeNull();
    expect(parseFxRate(-1)).toBeNull();
    expect(parseFxRate("2800.1234567")).toBeNull();
    expect(parseFxRate(2800.1234567)).toBeNull();
    expect(fxRateToString(2800123456n)).toBe("2800.123456");
  });

  it("contre-valeur au centime, half-up, sans arrondi a l'unite", () => {
    const r = parseFxRate(2800)!;
    expect(convertToProjectCents(280000000, r)).toBe(100000); // 2 800 000,00 CDF = 1 000,00 USD
    expect(convertToProjectCents(100, r)).toBe(0); // 1,00 CDF = 0,0004 USD -> 0,00
    const r3 = parseFxRate(3)!;
    expect(convertToProjectCents(1000, r3)).toBe(333); // 10,00 / 3 = 3,333 -> 3,33
    expect(convertToProjectCents(1100, r3)).toBe(367); // 11,00 / 3 = 3,666 -> 3,67
    expect(convertToProjectCents(150, parseFxRate(2)!)).toBe(75);
    expect(convertToProjectCents(1, parseFxRate(2)!)).toBe(1); // 0,005 -> 0,01 (half-up)
  });

  it("inverse un taux sur la valeur exacte stockee", () => {
    expect(invertDecimalRate("0.000400")).toBe(2500000000n);
    expect(invertDecimalRate("2800.000000")).toBe(357n); // 1/2800 = 0,000357
    expect(invertDecimalRate("0")).toBeNull();
  });
});

describe("summarizeFx / convertedPaidCents (chantier USD)", () => {
  it("BC CDF sans taux : exclu de l'engage converti, compte comme taux a fixer", () => {
    const f = summarizeFx([po()], USD);
    expect(f.engagedConvertedCents).toBe(0);
    expect(f.poWithoutRateCount).toBe(1);
    expect(f.convertedPoIds).toEqual([]);
    expect(convertedPaidCents([po()], USD)).toBe(0);
    // paye non converti : absent du paye d'origine (coherent avec paid_converted = 0)
    const g = summarizeFx([po({ paidAmount: "580000.00" })], USD);
    expect(g.rows[0]).toMatchObject({ paid_origin_amount: 0, paid_converted_amount: 0 });
  });

  it("BC CDF avec taux : engage = contre-valeur figee", () => {
    const f = summarizeFx([po({ fxRate: "2800.000000", totalTtcProjectCcy: "1000.00" })], USD);
    expect(f.engagedConvertedCents).toBe(100000);
    expect(f.convertedPoIds).toEqual([1]);
    expect(f.rows[0]).toMatchObject({ currency_id: CDF, origin_amount: 2800000, converted_amount: 1000 });
  });

  it("paiement partiel a un taux different : depense = contre-valeur payee, ecart = prevu - reel", () => {
    // paye 1 400 000 CDF a 2900 -> 482,76 USD ; prevu au taux du BC (2800) = 500,00 -> gain 17,24
    const d = po({ fxRate: "2800.000000", totalTtcProjectCcy: "1000.00", paidAmount: "1400000.00", paidAmountProjectCcy: "482.76" });
    expect(convertedPaidCents([d], USD)).toBe(48276);
    const f = summarizeFx([d], USD);
    expect(f.gainLossCents).toBe(1724);
    expect(f.rows[0]).toMatchObject({ paid_origin_amount: 1400000, paid_converted_amount: 482.76 });
  });

  it("perte de change : paye plus cher que prevu", () => {
    const d = po({ fxRate: "2800.000000", totalTtcProjectCcy: "1000.00", paidAmount: "2800000.00", paidAmountProjectCcy: "1037.04" }); // taux 2700
    expect(summarizeFx([d], USD).gainLossCents).toBe(-3704);
  });

  it("facture fournisseur enfant en CDF : son paye entre dans la depense et l'ecart du BC", () => {
    const bc = po({ fxRate: "2800.000000", totalTtcProjectCcy: "1000.00" });
    const inv: SpendDoc = po({ id: 2, type: "invoice", direction: "inbound", parentDocumentId: 1, paidAmount: "280000.00", paidAmountProjectCcy: "100.00" });
    expect(convertedPaidCents([bc, inv], USD)).toBe(10000);
    expect(summarizeFx([bc, inv], USD).gainLossCents).toBe(0);
  });

  it("document en devise chantier ou annule : ignore", () => {
    const cancelled = po({ id: 3, status: "cancelled", fxRate: "2800", totalTtcProjectCcy: "1" });
    expect(summarizeFx([po({ currencyId: USD, paidAmountProjectCcy: "5" }), cancelled], USD).engagedConvertedCents).toBe(0);
    expect(convertedPaidCents([po({ currencyId: USD, paidAmountProjectCcy: "5" })], USD)).toBe(0);
  });
});

function setupPayment(doc: any) {
  const updates: any[] = [];
  const db: any = {
    update: jest.fn().mockImplementation(() => ({
      set: jest.fn().mockImplementation((patch: any) => { updates.push(patch); return { where: jest.fn().mockResolvedValue([{}]) }; }),
    })),
  };
  const ledger: any = { postByRules: jest.fn().mockResolvedValue({ id: 900, idempotent: false }) };
  const svc: any = new BatiproService(db, {} as any, {} as any, ledger, {} as any, {} as any, { notifyPayment: jest.fn() } as any);
  svc.getDocument = jest.fn().mockResolvedValue(doc);
  svc.getProject = jest.fn().mockResolvedValue({ id: 5, currencyId: USD, currencyCode: "USD" });
  svc.resolveAnalyticProjectId = jest.fn().mockResolvedValue(77);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  return { svc, ledger, updates };
}

const poDoc = (o: any = {}) => ({
  id: 10, projectId: 5, type: "purchase_order", direction: "outbound", status: "confirmed", currencyId: CDF, currencyCode: "CDF",
  totalTtc: "2800000.00", paidAmount: "0", paidAmountProjectCcy: "0.00", totalsByCurrency: [], number: "BC-1", ...o,
});

describe("recordPayment multi-devise", () => {
  it("refuse sans taux (400 en francais) quand devise doc != devise chantier", async () => {
    const { svc, updates } = setupPayment(poDoc());
    await expect(svc.recordPayment(10, 100000, ORG, 1)).rejects.toThrow(BadRequestException);
    await expect(svc.recordPayment(10, 100000, ORG, 1)).rejects.toThrow(/taux de change est obligatoire/);
    expect(updates).toHaveLength(0);
  });

  it("cumule la contre-valeur et passe exchangeRate au ledger (cle d'idempotence inchangee)", async () => {
    const { svc, ledger, updates } = setupPayment(poDoc({ paidAmount: "1400000.00", paidAmountProjectCcy: "500.00" }));
    const res = await svc.recordPayment(10, 700000, ORG, 1, 2800);
    expect(updates[0]).toMatchObject({ paidAmount: "2100000", paidAmountProjectCcy: "750.00" });
    const arg = ledger.postByRules.mock.calls[0][0];
    expect(arg.exchangeRate).toBe(2800);
    expect(arg.idempotencyKey).toBe("batipro:supplier_advance:10:210000000");
    expect(res.paid_amount_project_ccy).toBe(750);
  });

  it("meme devise : taux non requis, paidAmountProjectCcy inchange, pas d'exchangeRate", async () => {
    const { svc, ledger, updates } = setupPayment(poDoc({ currencyId: USD, currencyCode: "USD", totalTtc: "1000.00" }));
    await svc.recordPayment(10, 100, ORG, 1);
    expect(updates[0]).not.toHaveProperty("paidAmountProjectCcy");
    expect(ledger.postByRules.mock.calls[0][0].exchangeRate).toBeUndefined();
  });
});

describe("setDocumentFxRate / fxRateSuggestion", () => {
  function setupFx(doc: any, rows: any[][] = []) {
    const updates: any[] = [];
    const queue = [...rows];
    const chain: any = { from: () => chain, where: () => chain, innerJoin: () => chain, orderBy: () => chain, limit: jest.fn().mockImplementation(async () => queue.shift() ?? []) };
    const db: any = {
      select: jest.fn().mockReturnValue(chain),
      update: jest.fn().mockImplementation(() => ({ set: jest.fn().mockImplementation((p: any) => { updates.push(p); return { where: jest.fn().mockResolvedValue([{}]) }; }) })),
    };
    const svc: any = new BatiproService(db, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    svc.getDocument = jest.fn().mockResolvedValue(doc);
    svc.publish = jest.fn().mockResolvedValue(undefined);
    return { svc, updates };
  }

  it("fixe le taux, calcule la contre-valeur et reprend un BC deja paye (paid_fx_rate)", async () => {
    const { svc, updates } = setupFx(poDoc({ paidAmount: "1400000.00" }), [[{ currencyId: USD }]]);
    await svc.setDocumentFxRate(10, { fx_rate: 2800, paid_fx_rate: 2900 }, ORG);
    expect(updates[0]).toMatchObject({ fxRate: "2800.000000", fxRateSource: "manual", totalTtcProjectCcy: "1000.00", paidAmountProjectCcy: "482.76" });
  });

  it("refuse si devise doc = devise chantier", async () => {
    const { svc } = setupFx(poDoc({ currencyId: USD }), [[{ currencyId: USD }]]);
    await expect(svc.setDocumentFxRate(10, { fx_rate: 2800 }, ORG)).rejects.toThrow(/devise du chantier/);
  });

  it("suggestion : echange direct, inverse sans perte, sinon dernier document, sinon null", async () => {
    let r = setupFx({}, [[{ from: USD, rate: "2800.000000", date: new Date("2026-10-01T00:00:00Z") }]]);
    expect(await r.svc.fxRateSuggestion(USD, CDF, ORG)).toMatchObject({ rate: 2800, source: "last_exchange", inverted: false });
    r = setupFx({}, [[{ from: CDF, rate: "0.000400", date: new Date("2026-10-01T00:00:00Z") }]]);
    expect(await r.svc.fxRateSuggestion(USD, CDF, ORG)).toMatchObject({ rate: 2500, inverted: true });
    r = setupFx({}, [[], [{ rate: "2750.000000", date: "2026-09-01" }]]);
    expect(await r.svc.fxRateSuggestion(USD, CDF, ORG)).toMatchObject({ rate: 2750, source: "last_document" });
    r = setupFx({}, [[], []]);
    expect((await r.svc.fxRateSuggestion(USD, CDF, ORG)).rate).toBeNull();
  });
});
