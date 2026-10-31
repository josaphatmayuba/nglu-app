import { BadRequestException } from "@nestjs/common";
import { eligibleDues, monthsLabelFromLines, planDepositApplication } from "./deposit-rent-application";

const dues = [
  { id: 3, periodStart: "2027-03-01", remaining: 100 },
  { id: 1, periodStart: "2027-01-01", remaining: 100 },
  { id: 2, periodStart: "2027-02-01", remaining: 100 },
];

describe("planDepositApplication (pur)", () => {
  it("FIFO : plus ancienne d'abord, partiel sur la derniere", () => {
    const p = planDepositApplication({ dues, available: 500, amount: 250, terminationDate: "2027-12-31" });
    expect(p.allocations.map((a) => [a.dueId, a.amount, a.remainingAfter])).toEqual([[1, 100, 0], [2, 100, 0], [3, 50, 50]]);
    expect(p.totalUnpaid).toBe(300);
    expect(p.warnings.length).toBe(1);
    expect(p.monthsLabel).toBe("janvier 2027, fevrier 2027 et mars 2027");
  });

  it("plafonds : disponible, total impaye, <= 0", () => {
    expect(() => planDepositApplication({ dues, available: 150, amount: 200 })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ dues, available: 900, amount: 301 })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ dues, available: 900, amount: 0 })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ dues, available: 900, amount: -5 })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ dues, available: 900, amount: 10.005 })).toThrow(BadRequestException);
  });

  it("sans montant : maximum applicable = min(disponible, impaye)", () => {
    expect(planDepositApplication({ dues, available: 120 }).amount).toBe(120);
    expect(planDepositApplication({ dues, available: 900 }).amount).toBe(300);
  });

  it("choix explicite puis FIFO pour le reste", () => {
    const p = planDepositApplication({
      dues, available: 500, amount: 150, mode: "manual", explicit: [{ dueId: 3, amount: 100 }],
    });
    expect(p.allocations.map((a) => [a.dueId, a.amount])).toEqual([[1, 50], [3, 100]]);
    expect(p.warnings.some((w) => /plus anciennes/.test(w))).toBe(true);
  });

  it("choix explicite invalide : inconnu, doublon, trop eleve, total depasse", () => {
    const base = { dues, available: 500, amount: 100, mode: "manual" as const };
    expect(() => planDepositApplication({ ...base, explicit: [{ dueId: 99 }] })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ ...base, explicit: [{ dueId: 1 }, { dueId: 1 }] })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ ...base, explicit: [{ dueId: 1, amount: 101 }] })).toThrow(BadRequestException);
    expect(() => planDepositApplication({ ...base, explicit: [{ dueId: 1, amount: 60 }, { dueId: 2, amount: 60 }] })).toThrow(BadRequestException);
  });

  it("exclut les echeances commencant apres la sortie", () => {
    expect(eligibleDues(dues, "2027-02-15").map((d) => d.id)).toEqual([1, 2]);
    expect(() => planDepositApplication({ dues, available: 500, amount: 250, terminationDate: "2027-02-15" })).toThrow(BadRequestException);
  });

  it("exactitude 0.10 + 0.20 = 0.30 (aucun arrondi entier)", () => {
    const p = planDepositApplication({
      dues: [{ id: 1, periodStart: "2027-01-01", remaining: 0.1 }, { id: 2, periodStart: "2027-02-01", remaining: 0.2 }],
      available: 0.3, amount: 0.3,
    });
    expect(p.allocations.map((a) => a.amount)).toEqual([0.1, 0.2]);
    expect(p.totalUnpaid).toBe(0.3);
  });

  it("libelle des mois", () => {
    expect(monthsLabelFromLines([{ periodStart: "2027-05-01" }])).toBe("mai 2027");
    expect(monthsLabelFromLines([])).toBe("");
  });
});
