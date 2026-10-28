import { BadRequestException } from "@nestjs/common";
import { computePurchaseTotals, computeSaleLine, computeSaleTotals, money, toCents } from "./invoice-money.util";

describe("invoice-money.util (bug #20 lot 2)", () => {
  it("toCents arrondit au centime exact sans artefact flottant", () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-2.675)).toBe(-268);
    expect(toCents(null)).toBe(0);
    expect(money(12.300000000001)).toBe(12.3);
  });

  it("ne jamais arrondir a l unite", () => {
    expect(money(1234.56)).toBe(1234.56);
  });

  it("vente : totaux = somme exacte des lignes arrondies au centime", () => {
    const t = computeSaleTotals(
      [
        { productQuantity: 3, productUnitSalePrice: 0.1, tax: 16 },
        { productQuantity: 1, productUnitSalePrice: 10.005, productDiscount: 1 },
      ],
      [0.05, 7],
      [{ amount: 5 }],
    );
    // ligne 1 : 0.30 HT, taxe 0.048 -> 0.05, final 0.35
    expect(t.lines[0]).toMatchObject({ taxableAmount: 0.3, taxAmount: 0.05, finalAmount: 0.35 });
    // ligne 2 : 10.01 brut, remise montant 1.00, HT 9.01
    expect(t.lines[1]).toMatchObject({ discountAmount: 1, taxableAmount: 9.01, taxAmount: 0, finalAmount: 9.01 });
    expect(t.totalAmount).toBe(9.31);
    expect(t.totalTaxAmount).toBe(0.05);
    expect(t.totalDiscountAmount).toBe(1);
    expect(t.receivable).toBe(9.36);
    expect(t.paidAmount).toBe(5);
    expect(t.dueAmount).toBe(4.36);
    expect(t.totalPurchasePrice).toBe(7.15);
    expect(t.profit).toBe(2.16);
  });

  it("remise = montant de ligne, plafonnee au sous-total (bug #43)", () => {
    const l = computeSaleLine({ productQuantity: 2, productUnitSalePrice: 50, productDiscount: 10, tax: 16 });
    expect(l).toMatchObject({ discountAmount: 10, taxableAmount: 90, taxAmount: 14.4, finalAmount: 104.4 });
    expect(computeSaleLine({ productQuantity: 2, productUnitSalePrice: 50, productDiscount: 100 }).finalAmount).toBe(0);
    expect(() => computeSaleLine({ productQuantity: 2, productUnitSalePrice: 50, productDiscount: 100.01 })).toThrow(/depasse le sous-total/);
    expect(() => computeSaleLine({ productQuantity: 1, productUnitSalePrice: 5, productDiscount: -1 })).toThrow(BadRequestException);
  });

  it("vente payee en entier : du exactement 0", () => {
    const t = computeSaleTotals([{ productQuantity: 3, productUnitSalePrice: 0.1 }], [0], [{ amount: 0.1 }, { amount: 0.2 }]);
    expect(t.dueAmount).toBe(0);
  });

  it("achat : taxe par ligne au centime, du coherent", () => {
    const t = computePurchaseTotals(
      [
        { productQuantity: 2, productUnitPurchasePrice: 160, tax: 16 },
        { productQuantity: 1, productUnitPurchasePrice: 0.125 },
      ],
      [{ amount: 100 }],
    );
    expect(t.lines[0]).toEqual({ tax: 16, taxAmount: 51.2, finalAmount: 371.2 });
    expect(t.lines[1]).toEqual({ tax: 0, taxAmount: 0, finalAmount: 0.13 });
    expect(t.totalPurchasePrice).toBe(320.13);
    expect(t.totalTax).toBe(51.2);
    expect(t.dueAmount).toBe(271.33);
  });
});
