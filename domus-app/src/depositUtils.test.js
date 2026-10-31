import { describe, expect, it } from "vitest";
import { cashPayments, depositFigures, fmtWithCurrency, paymentMethodLabel, rentAppliedOf } from "./depositUtils.js";

describe("depositFigures", () => {
  it("restitué = détenue − imputée − retenue, sans arrondi à l'unité", () => {
    const f = depositFigures({ amount: 1000, rentApplied: 333.33, deduction: 100.1 });
    expect(f.available).toBe(666.67);
    expect(f.refund).toBe(566.57);
  });
  it("plafonne la retenue au disponible", () => {
    expect(depositFigures({ amount: 500, rentApplied: 450, deduction: 200 }).refund).toBe(0);
  });
  it("sans imputation = ancien calcul", () => {
    expect(depositFigures({ amount: 800, deduction: 50 }).refund).toBe(750);
  });
  it("bruit flottant neutralisé", () => {
    expect(depositFigures({ amount: 0.3, rentApplied: 0.1 }).refund).toBe(0.2);
  });
});

describe("libellés et totaux", () => {
  it("deposit devient « Payée par la caution »", () => {
    expect(paymentMethodLabel("deposit")).toBe("Payée par la caution");
    expect(paymentMethodLabel("cash")).toBe("cash");
  });
  it("exclut la caution des encaissements", () => {
    expect(cashPayments([{ method: "cash" }, { method: "deposit" }])).toHaveLength(1);
  });
  it("rentAppliedOf lit les deux formes", () => {
    expect(rentAppliedOf({ rentAppliedAmount: "12.50" })).toBe(12.5);
    expect(rentAppliedOf({ rentApplied: 7 })).toBe(7);
    expect(rentAppliedOf(null)).toBe(0);
  });
  it("devise obligatoire, 2 décimales", () => {
    expect(fmtWithCurrency(1234.5, "USD")).toMatch(/^USD 1\s234,50$/);
    expect(fmtWithCurrency(5, "")).toBe("—");
  });
});

import { fifoDistribution, isValidApplyAmount, manualAllocations, manualCap } from "./depositUtils.js";

describe("répartition de l'imputation", () => {
  const dues = [
    { id: 2, periodStart: "2027-02-01", remaining: 100 },
    { id: 1, periodStart: "2027-01-01", remaining: 100.5 },
    { id: 3, periodStart: "2027-03-01", remaining: 100 },
  ];
  it("FIFO du plus ancien au plus récent, partiel inclus", () => {
    const r = fifoDistribution(dues, 150.25);
    expect(r.map((x) => [x.dueId, x.amount, x.remainingAfter])).toEqual([[1, 100.5, 0], [2, 49.75, 50.25]]);
  });
  it("mode manuel : seules les échéances cochées", () => {
    const r = manualAllocations(dues, [3], 80);
    expect(r).toEqual([{ dueId: 3, periodStart: "2027-03-01", amount: 80, remainingAfter: 20 }]);
    expect(manualCap(dues, [2, 3], 150)).toBe(150);
    expect(manualCap(dues, [2, 3], 500)).toBe(200);
  });
  it("valide le montant", () => {
    expect(isValidApplyAmount("12.5", 20)).toBe(true);
    expect(isValidApplyAmount("12.345", 20)).toBe(false);
    expect(isValidApplyAmount("0", 20)).toBe(false);
    expect(isValidApplyAmount("20.01", 20)).toBe(false);
  });
});
