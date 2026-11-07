import { spentByNature } from "./spent-by-nature.util";
import { convertedPaidCents, disbursedCentsByCurrency, fromCents, type SpendDoc } from "./funds.util";

const USD = 1, CDF = 2;
const doc = (o: Partial<SpendDoc> & { id: number }): SpendDoc => ({
  type: "purchase_order", direction: "outbound", status: "paid", isActive: 1, currencyId: USD,
  parentDocumentId: null, totalTtc: 0, paidAmount: 0, ...o,
});
const line = (documentId: number, lineTtc: string, lineType: string, serviceCategory: string | null = null) => ({ documentId, lineTtc, lineType, serviceCategory });
const amount = (rows: ReturnType<typeof spentByNature>, n: string) => rows.find((r) => r.nature === n)!.amount;

describe("spentByNature", () => {
  const docs: SpendDoc[] = [
    doc({ id: 1, paidAmount: "3215.25" }), // BC multi-lignes : materiaux + quincaillerie + accessoires
    doc({ id: 2, type: "expense", paidAmount: "450.00" }),
    doc({ id: 3, type: "expense", paidAmount: "100.00" }),
    doc({ id: 4, currencyId: CDF, fxRate: "2300", totalTtc: "210496", paidAmount: "210496", paidAmountProjectCcy: "91.52" }),
    doc({ id: 5, status: "cancelled", paidAmount: "999.00" }),
  ];
  const lines = [
    line(1, "3000.00", "material"), line(1, "60.53", "service", "hardware_invoice"), line(1, "5.00", "material"),
    line(2, "450.00", "service", "fees"), line(3, "100.00", "service", "labor"),
    line(4, "210496.00", "service", "transport"), line(5, "999.00", "material"),
  ];
  const rows = spentByNature(docs, lines, USD);

  it("repartit par nature, annule exclu, contre-valeur au taux fige", () => {
    expect(amount(rows, "materials")).toBe(3215.25);
    expect(amount(rows, "fees")).toBe(450);
    expect(amount(rows, "labor")).toBe(100);
    expect(amount(rows, "handling")).toBe(91.52);
    expect(amount(rows, "other")).toBe(0);
  });

  it("total == Deja depense (centimes exacts)", () => {
    const total = rows.reduce((s, r) => s + Math.round(r.amount * 100), 0);
    const actual = (disbursedCentsByCurrency(docs, USD).get(USD) ?? 0) + convertedPaidCents(docs, USD);
    expect(total).toBe(actual);
    expect(fromCents(total)).toBe(3856.77);
  });

  it("reste de centimes preserve sur prorata inegal", () => {
    const r = spentByNature([doc({ id: 9, paidAmount: "100.00" })], [line(9, "1", "material"), line(9, "1", "service", "labor"), line(9, "1", "service", "fees")], USD);
    expect(r.reduce((s, x) => s + Math.round(x.amount * 100), 0)).toBe(10000);
  });

  it("depense sans ligne -> Autres", () => {
    const r = spentByNature([doc({ id: 8, paidAmount: "12.34" })], [], USD);
    expect(amount(r, "other")).toBe(12.34);
  });
});
