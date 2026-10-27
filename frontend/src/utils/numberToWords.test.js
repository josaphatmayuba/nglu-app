import { describe, it, expect } from "vitest";
import { amountToWords, splitAmountCents } from "./numberToWords";

describe("amountToWords", () => {
  it("inclut les centimes sans arrondir", () => {
    expect(amountToWords(1234.56, "Dollars")).toBe(
      "One Thousand Two Hundred Thirty Four Dollars and Fifty Six Cents"
    );
  });
  it("devise sans cents nommes", () => {
    expect(amountToWords(100.56, "Francs Congolais")).toBe(
      "One Hundred Francs Congolais and Fifty Six Centimes"
    );
  });
  it("entier : pas de cents", () => {
    expect(amountToWords(50, "USD")).toBe("Fifty USD");
  });
  it("pas d'erreur flottante", () => {
    expect(splitAmountCents(1.15)).toEqual({ units: 1, cents: 15 });
    expect(splitAmountCents(0.29)).toEqual({ units: 0, cents: 29 });
    expect(amountToWords(0.29, "USD")).toBe("Zero USD and Twenty Nine Cents");
  });
});
