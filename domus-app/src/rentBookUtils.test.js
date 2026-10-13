import { describe, expect, it } from "vitest";
import { assignPaymentsToMonths, buildFullRentSchedule } from "./rentBookUtils.js";

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
