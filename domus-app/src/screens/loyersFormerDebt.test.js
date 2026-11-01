import { describe, expect, it } from "vitest";
import { buildLeaseCards } from "./loyers.jsx";

const ended = { id: 21, status: "ended", rentAmount: 500, startDate: "2025-01-01", endDate: "2025-06-30", tenantFirstName: "A", tenantLastName: "B", unpaidCount: 0 };
const active = { id: 22, status: "active", rentAmount: 500, startDate: "2026-01-01", endDate: null };
const owing = new Map([["21", { leaseId: 21, balance: "120.50", currency: { symbol: "$" } }]]);

describe("baux termines suivis dans Loyers", () => {
  it("bail termine NON flagge avec balance > 0 (API) : conserve, avec la dette", () => {
    const cards = buildLeaseCards([ended, active], [], owing);
    const c = cards.find((x) => x.lease.id === 21);
    expect(c).toBeTruthy();
    expect(c.formerDebt.balance).toBe("120.50");
  });

  it("bail termine sans solde API : ecarte, meme avec unpaidCount > 0", () => {
    const cards = buildLeaseCards([{ ...ended, unpaidCount: 4, openDueCount: 4 }, active], [], new Map());
    expect(cards.map((x) => x.lease.id)).toEqual([22]);
  });

  it("sans 3e argument (tableau de bord) : seuls les baux actifs, pas de double comptage", () => {
    expect(buildLeaseCards([ended, active], []).map((x) => x.lease.id)).toEqual([22]);
  });
});
