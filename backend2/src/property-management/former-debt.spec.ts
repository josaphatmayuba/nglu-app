import { computeEndedLeaseBalance, minorToString, totalsByCurrency } from "./former-debt";

const NOW = new Date(2026, 9, 31); // 31 oct. 2026
const lease = (o: any = {}) => ({
  id: 1, startDate: "2026-01-01", endDate: null, billingCycle: "monthly", rentAmount: "100",
  rentProrationEnabled: 0, terminationDate: "2026-03-31", allocationLedgerAt: null, currencyId: 1, ...o,
});
const pay = (id: number, amount: string, o: any = {}) => ({
  id, status: "paid", rowKind: null, paymentDate: "2026-02-05", amount, periodStart: null, periodEnd: null, method: "cash", ...o,
});

describe("computeEndedLeaseBalance", () => {
  it("non flagge : plafonne a la sortie, aucune croissance apres", () => {
    const a = computeEndedLeaseBalance({ lease: lease(), decimals: 2, payments: [pay(1, "100")], now: new Date(2026, 3, 5) });
    const b = computeEndedLeaseBalance({ lease: lease(), decimals: 2, payments: [pay(1, "100")], now: NOW });
    expect(a.balance).toBe("200.00");
    expect(b.balance).toBe("200.00");
  });

  it("imputation de caution (method=deposit) comptee une seule fois", () => {
    const r = computeEndedLeaseBalance({
      lease: lease(), decimals: 2,
      payments: [pay(1, "100"), pay(2, "150", { method: "deposit", paymentDate: "2026-04-02" })],
      deposits: [{ amount: "300", rentAppliedAmount: "150", status: "held", isActive: 1 }],
      now: NOW,
    });
    expect(r.balance).toBe("50.00");
    expect(r.depositAvailable).toBe("150.00");
    expect(r.provisional).toBe(true);
    expect(r.lastPayment).toEqual({ date: "2026-02-05", amount: "100.00" });
  });

  it("trop-percu donne 0 ; caution restituee ou absente : non provisoire", () => {
    const r = computeEndedLeaseBalance({
      lease: lease(), decimals: 2, payments: [pay(1, "500")],
      deposits: [{ amount: "300", rentAppliedAmount: "0", status: "returned", isActive: 1 }], now: NOW,
    });
    expect(r.balance).toBe("0.00");
    expect(r.balanceMinor).toBe(0);
    expect(r.provisional).toBe(false);
    expect(computeEndedLeaseBalance({ lease: lease(), decimals: 2, payments: [], now: NOW }).provisional).toBe(false);
  });

  it("0.10 + 0.20 exact en centimes", () => {
    const r = computeEndedLeaseBalance({
      lease: lease({ rentAmount: "0.30", terminationDate: "2026-01-20" }), decimals: 2,
      payments: [pay(1, "0.10"), pay(2, "0.10")], now: NOW,
    });
    expect(r.balance).toBe("0.10");
    expect(minorToString(30, 2)).toBe("0.30");
    expect(minorToString(5, 2)).toBe("0.05");
  });

  it("flagge : restes dus des echeances commencant au plus tard a la sortie", () => {
    const due = (id: number, ps: string, amount: string) => ({
      id, status: "pending", rowKind: "due", paymentDate: ps, amount, periodStart: ps, periodEnd: null,
    });
    const rows = [
      due(10, "2026-01-01", "100"), due(11, "2026-02-01", "100"), due(12, "2026-03-01", "100"), due(13, "2026-04-01", "100"),
      { ...pay(20, "130"), rowKind: "payment" },
    ];
    const allocs = [
      { id: 1, paymentId: 20, dueId: 10, amount: 100, source: "auto" },
      { id: 2, paymentId: 20, dueId: 11, amount: 30, source: "auto" },
    ];
    const r = computeEndedLeaseBalance({ lease: lease({ allocationLedgerAt: "2026-01-01" }), decimals: 2, payments: rows, allocs, now: NOW });
    expect(r.balance).toBe("170.00"); // 70 + 100 ; avril exclu
  });
});

describe("totalsByCurrency", () => {
  it("regroupe par devise et dedoublonne par bail (co-locataires)", () => {
    const rows = [
      { leaseId: 1, currencyId: 1, decimals: 2, balanceMinor: 1010 },
      { leaseId: 1, currencyId: 1, decimals: 2, balanceMinor: 1010 },
      { leaseId: 2, currencyId: 1, decimals: 2, balanceMinor: 2020 },
      { leaseId: 3, currencyId: 2, decimals: 2, balanceMinor: 5 },
    ];
    expect(totalsByCurrency(rows)).toEqual([
      { currencyId: 1, amount: "30.30" },
      { currencyId: 2, amount: "0.05" },
    ]);
  });
});
