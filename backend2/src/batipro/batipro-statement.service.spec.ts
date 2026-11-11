import { NotFoundException } from "@nestjs/common";
import { BatiproStatementService } from "./batipro-statement.service";
import { buildStatement } from "./statement.util";

const INVALID = "Ce lien n'est plus valide.";

function makeDb(selectQueue: any[][]) {
  const chain = (): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(() => selectQueue.shift() ?? []).then(ok, ko);
        return () => p;
      },
    });
    return p;
  };
  return { select: () => chain() };
}

const linkRow = (over: any = {}) => ({ organizationId: 1, projectId: 5, recipientType: "engineer", expiresAt: null, revokedAt: null, ...over });

// Releve reel (buildStatement) : un apport, une annulation d'apport, un BC paye, une facture client.
const full = () => ({
  project_id: 5,
  ...buildStatement({
    projectCurrencyId: 1,
    currencyCodeById: new Map([[1, "USD"]]),
    funds: [
      { id: 1, receivedAt: "2026-01-01", amount: 1000, currencyId: 1, isActive: 1, contributorName: "SECRET-CLIENT" },
      { id: 2, receivedAt: "2026-01-02", amount: 200, currencyId: 1, isActive: 0, cancelledAt: "2026-01-03", contributorName: "ANNULE" },
    ],
    docs: [
      { id: 10, kind: "expense_doc", number: "BC-1", type: "purchase_order", status: "issued", currencyId: 1, paidAmount: 150.5, paidDate: "2026-01-05", nature: "materials" },
      { id: 11, kind: "client_invoice", number: "F-1", type: "invoice", status: "paid", currencyId: 1, paidAmount: 500, paidDate: "2026-01-06", nature: "other" },
    ],
  }),
});

function setup(selectQueue: any[][]) {
  const batipro = {
    buildProjectStatement: jest.fn().mockImplementation(async () => full()),
    projectBudgetSummary: jest.fn().mockImplementation(async () => ({
      currency_code: "USD",
      spent_by_nature: [{ nature: "materials", label: "Materiaux", amount: 3165.25 }, { nature: "fees", label: "Honoraires", amount: 750 }],
      funds_received: 99999,
      fees: [{ mode: "percent_materials", paid: 750, remaining: 85.575 }, { mode: "none", paid: 5, remaining: 5 }],
    })),
  };
  const svc = new BatiproStatementService(makeDb(selectQueue) as any, batipro as any);
  return { svc, batipro };
}

describe("BatiproStatementService", () => {
  it("ingenieur : sorties seulement, aucun fonds ni solde dans la reponse", async () => {
    const { svc } = setup([[linkRow()], [{ id: 5 }]]);
    const res: any = await svc.getEngineerStatement("a-long-token-value-123456", {});
    const json = JSON.stringify(res);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0]).toMatchObject({ label: "Bon de commande BC-1", exit: 150.5, category: "materials" });
    for (const forbidden of ["funding", "funding_cancel", "client_invoice", "SECRET-CLIENT", "ANNULE", "F-1", "balance", "opening_balance", "closing_balance", "final_balance", "entries", "\"entry\""]) {
      expect(json).not.toContain(forbidden);
    }
    expect(res.totals).toEqual({ exits: 150.5 });
  });

  it("ingenieur : kpis materiaux / honoraires payes / reste, sans champ interdit", async () => {
    const { svc } = setup([[linkRow()], [{ id: 5 }]]);
    const res: any = await svc.getEngineerStatement("a-long-token-value-123456", {});
    expect(res.kpis).toEqual({ materials_total: 3165.25, fees_paid: 750, fees_remaining: 85.575, currency_code: "USD" });
    expect(Object.keys(res.kpis).sort()).toEqual(["currency_code", "fees_paid", "fees_remaining", "materials_total"]);
    for (const k of ["entry", "balance", "opening_balance", "closing_balance", "final_balance", "funds"]) expect(res).not.toHaveProperty(k);
    expect(res.totals).not.toHaveProperty("entries");
    expect(JSON.stringify(res)).not.toContain("99999");
  });

  it("ingenieur : honoraires non configures => fees_remaining null", async () => {
    const { svc, batipro } = setup([[linkRow()], [{ id: 5 }]]);
    batipro.projectBudgetSummary.mockResolvedValueOnce({ currency_code: "USD", spent_by_nature: [], fees: [] });
    const res: any = await svc.getEngineerStatement("a-long-token-value-123456", {});
    expect(res.kpis).toEqual({ materials_total: 0, fees_paid: 0, fees_remaining: null, currency_code: "USD" });
  });

  it("ingenieur : filtre categorie funding ne renvoie rien", async () => {
    const { svc } = setup([[linkRow()], [{ id: 5 }]]);
    const res: any = await svc.getEngineerStatement("a-long-token-value-123456", { category: "funding" });
    expect(res.lines).toEqual([]);
  });

  it("proprietaire : releve complet (entrees et solde)", async () => {
    const { svc, batipro } = setup([[linkRow({ recipientType: "owner" })], [{ id: 5 }]]);
    const res: any = await svc.getOwnerStatement("a-long-token-value-123456", { from: "2026-01-01" });
    expect(batipro.buildProjectStatement).toHaveBeenCalledWith(5, 1, { from: "2026-01-01" }, "all");
    expect(res.final_balance).toBeDefined();
    expect(res.lines.some((l: any) => l.category === "funding")).toBe(true);
  });

  it.each([
    ["inconnu", []],
    ["revoque", [linkRow({ revokedAt: new Date() })]],
    ["expire", [linkRow({ expiresAt: new Date(Date.now() - 1000) })]],
    ["mauvais type (proprietaire sur route ingenieur)", [linkRow({ recipientType: "owner" })]],
  ])("jeton %s : meme 404 generique", async (_n, rows) => {
    const { svc, batipro } = setup([rows as any[]]);
    await expect(svc.getEngineerStatement("a-long-token-value-123456", {})).rejects.toThrow(new NotFoundException(INVALID));
    expect(batipro.buildProjectStatement).not.toHaveBeenCalled();
  });

  it("chantier desactive : 404", async () => {
    const { svc } = setup([[linkRow()], []]);
    await expect(svc.getEngineerStatement("a-long-token-value-123456", {})).rejects.toThrow(INVALID);
  });

  it("jeton ingenieur refuse sur la route proprietaire", async () => {
    const { svc } = setup([[linkRow()]]);
    await expect(svc.getOwnerStatement("a-long-token-value-123456", {})).rejects.toThrow(INVALID);
  });
});
