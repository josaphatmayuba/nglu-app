import { convertDocsToProjectCurrency } from "./multi-currency-total.util";

const USD = 1;
const CDF = 285;

describe("convertDocsToProjectCurrency", () => {
  it("devis mixte USD + CDF sans taux : part CDF a convertir, total = part USD", () => {
    const r = convertDocsToProjectCurrency(
      [{ id: 7, currencyId: USD, totalTtc: "28705.00", fxRate: null }],
      [
        { documentId: 7, currencyId: USD, totalTtc: "28705.00", fxRate: null },
        { documentId: 7, currencyId: CDF, totalTtc: "1316900.00", fxRate: null },
      ],
      USD,
    );
    expect(r.totalCents).toBe(2870500);
    expect(r.unconvertedCents.get(CDF)).toBe(131690000);
    expect(r.convertedOriginCents.size).toBe(0);
  });

  it("devis mixte avec taux CDF 2300 : part CDF convertie au centime (half-up)", () => {
    const r = convertDocsToProjectCurrency(
      [{ id: 7, currencyId: USD, totalTtc: "28705.00", fxRate: null }],
      [
        { documentId: 7, currencyId: USD, totalTtc: "28705.00", fxRate: null },
        { documentId: 7, currencyId: CDF, totalTtc: "1316900.00", fxRate: "2300.000000" },
      ],
      USD,
    );
    // 1 316 900 / 2300 = 572,565... -> 572,57
    expect(r.convertedProjectCents.get(CDF)).toBe(57257);
    expect(r.totalCents).toBe(2870500 + 57257);
    expect(r.unconvertedCents.size).toBe(0);
  });

  it("document mono-devise etrangere : reprend le taux fige du document", () => {
    const r = convertDocsToProjectCurrency(
      [{ id: 9, currencyId: CDF, totalTtc: "230000.00", fxRate: "2300.000000" }],
      [{ documentId: 9, currencyId: CDF, totalTtc: "230000.00", fxRate: null }],
      USD,
    );
    expect(r.totalCents).toBe(10000);
  });

  it("document historique sans ligne de total : devise d'en-tete", () => {
    const r = convertDocsToProjectCurrency(
      [
        { id: 1, currencyId: USD, totalTtc: "250.00", fxRate: null },
        { id: 2, currencyId: null, totalTtc: "10.50", fxRate: null },
        { id: 3, currencyId: CDF, totalTtc: "5000.00", fxRate: null },
      ],
      [],
      USD,
    );
    expect(r.totalCents).toBe(26050);
    expect(r.unconvertedCents.get(CDF)).toBe(500000);
  });

  it("multi-devises : taux d'en-tete ignore quand le document a plusieurs devises", () => {
    const r = convertDocsToProjectCurrency(
      [{ id: 7, currencyId: USD, totalTtc: "100.00", fxRate: "2300.000000" }],
      [
        { documentId: 7, currencyId: USD, totalTtc: "100.00", fxRate: null },
        { documentId: 7, currencyId: CDF, totalTtc: "2300.00", fxRate: null },
      ],
      USD,
    );
    expect(r.totalCents).toBe(10000);
    expect(r.unconvertedCents.get(CDF)).toBe(230000);
  });
});
