import { bucketPhaseSpend } from "./phase-spend.util";

const USD = 1, CDF = 2;
const row = (o: any) => ({ phaseId: 1, documentId: 1, lineHt: "0", lineCurrencyId: null, docCurrencyId: USD, docFxRate: null, phaseCurrencyId: USD, ...o });

describe("bucketPhaseSpend", () => {
  it("convertit un BC CDF avec le taux fige du document", () => {
    const { byPhase } = bucketPhaseSpend([
      row({ phaseId: 3, documentId: 5, lineHt: "139230.00", docCurrencyId: CDF, docFxRate: "2300.000000", phaseCurrencyId: USD }),
      row({ phaseId: 1, documentId: 9, lineHt: "125000.00", docCurrencyId: CDF, docFxRate: "2300.000000", phaseCurrencyId: USD }),
      row({ phaseId: 1, documentId: 2, lineHt: "826.52" }),
    ], USD);
    expect(byPhase.get(3)!.get(USD)).toBeCloseTo(60.53, 2);
    expect(byPhase.get(1)!.get(USD)).toBeCloseTo(880.87, 2);
  });
  it("document etranger sans taux : exclu", () => {
    const r = bucketPhaseSpend([row({ documentId: 5, lineHt: "139230", docCurrencyId: CDF })], USD);
    expect(r.byPhase.size).toBe(0);
    expect(r.excludedNoFx).toBe(1);
  });
  it("devise chantier inchangee, ligne sans devise = devise du document", () => {
    const { byPhase } = bucketPhaseSpend([row({ lineHt: "10.5" })], USD);
    expect(byPhase.get(1)!.get(USD)).toBe(10.5);
  });
});
