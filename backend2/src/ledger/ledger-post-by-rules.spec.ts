import { LedgerService } from "./ledger.service";

// postByRules : transmission optionnelle de exchangeRate a post() (taux fige batipro).
function setup() {
  const rules = [
    { role: "payable", side: "DEBIT", accountId: 10 },
    { role: "cash", side: "CREDIT", accountId: 20 },
  ];
  const where = jest.fn().mockResolvedValue(rules);
  const db: any = { select: () => ({ from: () => ({ where }) }) };
  const svc = new LedgerService(db);
  const post = jest.spyOn(svc, "post").mockResolvedValue({ id: 5, idempotent: false } as any);
  return { svc, post };
}

const base = { type: "batipro_supplier_payment", particulars: "x", amountsByRole: { payable: 100, cash: 100 } };

describe("LedgerService.postByRules exchangeRate", () => {
  it("transmet exchangeRate a post()", async () => {
    const { svc, post } = setup();
    await svc.postByRules({ ...base, exchangeRate: 2800.5 }, 1, 7);
    expect(post.mock.calls[0][0].exchangeRate).toBe(2800.5);
  });

  it("reste retrocompatible sans exchangeRate", async () => {
    const { svc, post } = setup();
    await svc.postByRules({ ...base }, 1, 7);
    expect(post.mock.calls[0][0].exchangeRate).toBeUndefined();
    expect(post.mock.calls[0][0].lines).toHaveLength(2);
  });
});
