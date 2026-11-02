import { describe, expect, it } from "vitest";
import { groupRenewalChains } from "./loyers.jsx";

const card = (lease) => ({ lease, name: "Leon", status: lease.status === "ended" ? "late" : "pending" });

describe("groupRenewalChains : une carte par chaine de renouvellement", () => {
  it("fusionne l'ancien bail debiteur dans la carte du bail en cours", () => {
    const old = { id: 1, status: "ended" };
    const cur = { id: 2, status: "active", renewedFromLeaseId: 1 };
    const out = groupRenewalChains([card(cur), card(old)], [old, cur]);
    expect(out).toHaveLength(1);
    expect(out[0].lease.id).toBe(2);
    expect(out[0].priorDebts.map((p) => p.lease.id)).toEqual([1]);
  });

  it("suit la chaine A->B->C meme si B est solde (sans carte)", () => {
    const a = { id: 1, status: "ended" };
    const b = { id: 2, status: "ended", renewedFromLeaseId: 1 };
    const c = { id: 3, status: "active", renewedFromLeaseId: 2 };
    const out = groupRenewalChains([card(a), card(c)], [a, b, c]);
    expect(out.map((x) => x.lease.id)).toEqual([3]);
    expect(out[0].priorDebts.map((p) => p.lease.id)).toEqual([1]);
  });

  it("ex-locataire sans successeur actif : garde sa propre carte", () => {
    const old = { id: 1, status: "ended" };
    const cancelled = { id: 2, status: "cancelled", renewedFromLeaseId: 1 };
    const out = groupRenewalChains([card(old)], [old, cancelled]);
    expect(out.map((x) => x.lease.id)).toEqual([1]);
    expect(out[0].priorDebts).toBeUndefined();
  });
});
