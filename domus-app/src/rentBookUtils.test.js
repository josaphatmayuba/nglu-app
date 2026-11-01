import { describe, expect, it } from "vitest";
import { assignPaymentsToMonths, buildFullRentSchedule, rentBookPrintBody } from "./rentBookUtils.js";

const paid = (id, paymentDate, amount = 230, extra = {}) => ({ id, paymentDate, amount, status: "paid", ...extra });

describe("buildFullRentSchedule (sans prorata)", () => {
  const lease = { startDate: "2026-01-01", rentAmount: 230, currencySymbol: "$" };

  it("paiement du mois suivant rangé sur le mois de loyer, vraie date conservée", () => {
    // Carnet Gloria : janvier payé le 06/02, avril le 07/05, mai le 06/05.
    const payments = [
      paid(1, "2026-02-06"), paid(2, "2026-03-15"), paid(3, "2026-04-09"),
      paid(4, "2026-05-07"), paid(5, "2026-05-06"), paid(6, "2026-06-07"),
    ];
    const s = buildFullRentSchedule(lease, payments);
    const byMonth = Object.fromEntries(s.map((l) => [l.rentMonth, l]));
    expect(byMonth["2026-01"].paymentDate).toBe("2026-02-06");
    expect(byMonth["2026-02"].paymentDate).toBe("2026-03-15");
    expect(byMonth["2026-06"].status).toBe("paid");
    expect(byMonth["2026-07"].status).toBe("pending");
    // Aucun paiement perdu (les deux paiements de mai sont affichés).
    expect(s.filter((l) => l.status === "paid")).toHaveLength(6);
  });

  it("jamais avant le début du bail", () => {
    const s = buildFullRentSchedule({ ...lease, startDate: "2026-09-01" }, [paid(1, "2026-10-09")]);
    expect(s[0].rentMonth).toBe("2026-09");
    expect(s[0].status).toBe("paid");
  });

  it("periodStart explicite respecté", () => {
    const m = assignPaymentsToMonths(["2026-01", "2026-02", "2026-03"], [paid(1, "2026-04-01", 230, { periodStart: "2026-03-01" })], 230);
    expect(m.get("2026-03")?.id).toBe(1);
    expect(m.has("2026-01")).toBe(false);
  });

  it("ligne en attente rangée par son échéance", () => {
    const m = assignPaymentsToMonths(["2026-01", "2026-02"], [paid(1, "2026-02-06"), { id: 2, paymentDate: "2026-02-01", amount: 230, status: "pending" }], 230);
    expect(m.get("2026-01")?.id).toBe(1);
    expect(m.get("2026-02")?.id).toBe(2);
  });
});

describe("buildFullRentSchedule (prorata)", () => {
  // Bail Thaddée : début 19/07, 400/mois, juillet 13 j = 167,74 payé 170.
  const schedule = [
    { periodStart: "2026-07-19", periodEnd: "2026-07-31", dueDate: "2026-07-19", amount: 167.74, prorated: true, days: 13, periodDays: 31 },
    { periodStart: "2026-08-01", periodEnd: "2026-08-31", dueDate: "2026-08-01", amount: 400 },
    { periodStart: "2026-09-01", periodEnd: "2026-09-30", dueDate: "2026-09-01", amount: 400 },
    { periodStart: "2026-10-01", periodEnd: "2026-10-31", dueDate: "2026-10-01", amount: 400 },
  ];
  const lease = { startDate: "2026-07-19", rentAmount: 400, currencySymbol: "$", schedule };

  it("paiements sans période rattachés dans l'ordre aux périodes", () => {
    const s = buildFullRentSchedule(lease, [paid(1, "2026-08-06", 170), paid(2, "2026-09-09", 400), paid(3, "2026-10-09", 400)]);
    expect(s).toHaveLength(4);
    expect(s.map((l) => [l.rentMonth, l.status, l.id ?? null])).toEqual([
      ["2026-07", "paid", 1], ["2026-08", "paid", 2], ["2026-09", "paid", 3], ["2026-10", "pending", null],
    ]);
    expect(s[0].isProrata).toBe(true);
  });

  it("échéance pending d'une période couverte remplacée par le paiement réel", () => {
    const pend = { id: 9, status: "pending", paymentDate: "2026-07-19", periodStart: "2026-07-19", amount: 167.74 };
    const s = buildFullRentSchedule(lease, [pend, paid(1, "2026-08-06", 170)]);
    expect(s[0].id).toBe(1);
    expect(s.find((l) => l.id === 9)).toBeUndefined();
  });
});

describe("rentBookPrintBody (exemplaire)", () => {
  const lease = { id: 1, reference: "B1", startDate: "2026-01-01", endDate: "2026-03-31", rentAmount: 230, currencySymbol: "$" };
  const count = (h, re) => (h.match(re) || []).length;

  it("locataire par défaut, bailleur au choix, les deux à la suite", () => {
    const t = rentBookPrintBody(lease, []);
    expect(t).toContain("Carnet du locataire");
    expect(count(t, /Exemplaire du locataire/g)).toBe(3);
    expect(t).not.toContain("bailleur");
    const b = rentBookPrintBody(lease, [], null, {}, "landlord");
    expect(b).toContain("Carnet du bailleur");
    expect(count(b, /Exemplaire du bailleur/g)).toBe(3);
    const both = rentBookPrintBody(lease, [], null, {}, "both");
    expect(count(both, /Exemplaire du locataire/g)).toBe(3);
    expect(count(both, /Exemplaire du bailleur/g)).toBe(3);
    expect(count(both, /class="copy-break"/g)).toBe(1);
  });
});
