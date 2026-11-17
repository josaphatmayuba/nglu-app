import { describe, expect, it } from "vitest";
import { delegatePaymentMap } from "./loyers.jsx";

describe("delegatePaymentMap", () => {
  it("indexe les paiements declares par un delegue par rentPaymentId", () => {
    const m = delegatePaymentMap([
      { id: 1, answer: "paid", rentPaymentId: 437, delegateName: "Overseas" },
      { id: 2, answer: "unpaid", rentPaymentId: null },
      { id: 3, answer: "paid", rentPaymentId: null },
    ]);
    expect(m.size).toBe(1);
    expect(m.get(437).delegateName).toBe("Overseas");
  });
  it("tolere une entree invalide", () => {
    expect(delegatePaymentMap(null).size).toBe(0);
  });
});
