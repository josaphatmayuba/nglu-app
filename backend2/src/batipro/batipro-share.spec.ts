import { NotFoundException } from "@nestjs/common";
import { BatiproShareService, hashShareToken } from "./batipro-share.service";

// Lien public de suivi : jeton hache, lien revoque/expire refuse, aucune fuite de
// notes, photo d'un autre chantier refusee.

const INVALID = "Ce lien n'est plus valide.";

function makeDb(selectQueue: any[][], inserted: any[] = [], updated: any[] = []) {
  const chain = (resolve: () => unknown, onValues?: (v: any) => void): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        if (prop === "$returningId") return () => Promise.resolve([{ id: 7 }]);
        return (...args: any[]) => {
          if ((prop === "values" || prop === "set") && onValues) onValues(args[0]);
          return p;
        };
      },
    });
    return p;
  };
  return {
    select: () => chain(() => selectQueue.shift() ?? []),
    insert: () => chain(() => [], (v) => inserted.push(v)),
    update: () => chain(() => [], (v) => updated.push(v)),
  };
}

const TOKEN = "tok-abc-123";
const linkRow = (over: any = {}) => ({
  id: 1, organizationId: 1, projectId: 5, recipientType: "owner", expiresAt: null, revokedAt: null, ...over,
});

function setup(selectQueue: any[][], extra: { inserted?: any[]; updated?: any[]; sms?: jest.Mock } = {}) {
  const batipro = {
    getProject: jest.fn().mockResolvedValue({ id: 5, ownerName: "Jean", ownerPhone: "0990000000" }),
    projectBudgetSummary: jest.fn().mockResolvedValue({ quote_accepted: 1000, notes: "SECRET", margin: 99 }),
  };
  const storage = { getObject: jest.fn().mockResolvedValue({ body: "stream", contentType: "text/html", contentLength: 5 }) };
  const notifier = { sendShareLink: extra.sms ?? jest.fn().mockResolvedValue(true) };
  const svc = new BatiproShareService(makeDb(selectQueue, extra.inserted, extra.updated) as any, batipro as any, storage as any, notifier as any);
  return { svc, batipro, storage, notifier };
}

describe("BatiproShareService", () => {
  it("createLink : stocke le HASH du jeton, jamais le jeton, numero +243, un SMS", async () => {
    const inserted: any[] = [];
    const sms = jest.fn().mockResolvedValue(true);
    const { svc } = setup([], { inserted, sms });
    const res = await svc.createLink(5, { send_sms: true }, 1, 9, "all");
    expect(res.token.length).toBeGreaterThanOrEqual(20);
    expect(inserted[0].tokenHash).toBe(hashShareToken(res.token));
    expect(JSON.stringify(inserted[0])).not.toContain(res.token);
    expect(inserted[0].recipientType).toBe("owner");
    expect(inserted[0].recipientPhone).toBe("+243990000000");
    expect(inserted[0].expiresAt).toBeInstanceOf(Date); // 90 j par defaut
    expect(res.url.endsWith(`/batipro/suivi/${res.token}`)).toBe(true);
    expect(sms).toHaveBeenCalledTimes(1);
    expect(sms.mock.calls[0][2]).toBe("+243990000000");
    expect(res.sms_sent).toBe(true);
  });

  it("createLink : 365 jours (sans expiration = 1 an max), pas de SMS par defaut", async () => {
    const inserted: any[] = [];
    const sms = jest.fn();
    const { svc } = setup([], { inserted, sms });
    await svc.createLink(5, { expires_in_days: 365 }, 1, 9, "all");
    const days = (inserted[0].expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(364);
    expect(days).toBeLessThanOrEqual(365);
    expect(sms).not.toHaveBeenCalled();
  });

  it("chantier hors scope RBAC -> introuvable", async () => {
    const { svc } = setup([]);
    await expect(svc.listLinks(5, 1, [6])).rejects.toBeInstanceOf(NotFoundException);
  });

  it("revokeLink : pose revoked_at (update), jamais de delete", async () => {
    const updated: any[] = [];
    const { svc } = setup([[{ id: 3, revokedAt: null }]], { updated });
    await svc.revokeLink(5, 3, 1, "all");
    expect(updated).toHaveLength(1);
    expect(updated[0]).toHaveProperty("revokedAt");
  });

  it("lien inconnu / revoque / expire / autre type -> message neutre sans donnee", async () => {
    const bad = [
      [],
      [linkRow({ revokedAt: new Date() })],
      [linkRow({ expiresAt: new Date(Date.now() - 1000) })],
      [linkRow({ recipientType: "subcontractor" })],
    ];
    for (const q of bad) {
      const { svc, batipro } = setup([q]);
      await expect(svc.getPublicTracking(TOKEN)).rejects.toThrow(INVALID);
      expect(batipro.projectBudgetSummary).not.toHaveBeenCalled();
    }
  });

  it("suivi : liste blanche, aucune fuite de notes/telephone, devises separees, last_viewed_at maj", async () => {
    const updated: any[] = [];
    const queue = [
      [linkRow()],
      [{ id: 5 }],
      [{ name: "Villa", status: "En_cours", progress: 40, startDate: "2026-01-01", dueDate: "2026-12-31", budget: "5000", currencyId: 1, notes: "NOTE INTERNE", ownerPhone: "+243999" }],
      [{ id: 1, code: "USD", symbol: "$" }, { id: 2, code: "CDF", symbol: "FC" }],
      [
        { id: 10, number: "BC-1", issueDate: "2026-02-01", createdAt: new Date(), currencyId: 1, totalTtc: "100", paidAmount: "40", subcontractorId: 4, notes: "NOTE BC" },
        { id: 11, number: "BC-2", issueDate: null, createdAt: new Date("2026-03-01"), currencyId: 2, totalTtc: "200000", paidAmount: "0", subcontractorId: null },
      ],
      [{ documentId: 10, designation: "Ciment" }],
      [{ id: 20, number: "F-1", issueDate: "2026-02-05", createdAt: new Date(), currencyId: 1, totalTtc: "50", paidAmount: "10", attachedFileKey: "k/secret-key" }],
      [{ id: 30, linkedDocumentId: 20 }],
      [{ id: 4, name: "Maco", trade: "Maconnerie", contractAmount: "300", currencyId: 1 }],
      [{ id: 40, caption: "Dalle", takenAt: new Date() }],
    ];
    const { svc } = setup(queue, { updated });
    const out = await svc.getPublicTracking(TOKEN);
    const json = JSON.stringify(out);
    expect(json).not.toContain("NOTE INTERNE");
    expect(json).not.toContain("NOTE BC");
    expect(json).not.toContain("SECRET");
    expect(json).not.toContain("+243999");
    expect(json).not.toContain("secret-key");
    expect(out.budget.accepted_quote).toBe(1000);
    expect(out.purchase_orders[0]).toMatchObject({ number: "BC-1", label: "Ciment", engaged: 100, paid: 40, remaining: 60, currency_code: "USD" });
    expect(out.purchase_orders[1]).toMatchObject({ currency_code: "CDF", remaining: 200000 });
    expect(out.remaining_by_currency).toEqual(expect.arrayContaining([
      { currency_code: "USD", currency_symbol: "$", remaining: 60 },
      { currency_code: "CDF", currency_symbol: "FC", remaining: 200000 },
    ]));
    expect(out.subcontractors[0]).toMatchObject({ name: "Maco", contract: 300, paid: 40, remaining: 260 });
    expect(out.supplier_invoices[0]).toMatchObject({ photo_ids: [30], has_attachment: true });
    expect(updated.some((u) => "lastViewedAt" in u)).toBe(true);
  });

  it("chantier desactive -> lien invalide (suivi et photos)", async () => {
    const { svc, storage } = setup([[linkRow()], []]);
    await expect(svc.getPublicPhoto(TOKEN, 5)).rejects.toThrow(INVALID);
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("photo introuvable (autre chantier / inactive) -> 404, aucun acces au stockage", async () => {
    const { svc, storage } = setup([[linkRow()], [{ id: 5 }], []]);
    await expect(svc.getPublicPhoto(TOKEN, 99)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("photo non-site rattachee a une facture absente du chantier -> 404", async () => {
    const { svc, storage } = setup([[linkRow()], [{ id: 5 }], [{ fileKey: "k", kind: "source_document", linkedDocumentId: 77 }], []]);
    await expect(svc.getPublicPhoto(TOKEN, 5)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("photo site du chantier -> stream, type non image force en binaire", async () => {
    const { svc, storage } = setup([[linkRow()], [{ id: 5 }], [{ fileKey: "k1", kind: "site", linkedDocumentId: null }]]);
    const f = await svc.getPublicPhoto(TOKEN, 5);
    expect(storage.getObject).toHaveBeenCalledWith("k1");
    expect(f.contentType).toBe("application/octet-stream");
  });

  it("photo avec lien revoque -> refuse avant tout acces", async () => {
    const { svc, storage } = setup([[linkRow({ revokedAt: new Date() })]]);
    await expect(svc.getPublicPhoto(TOKEN, 5)).rejects.toThrow(INVALID);
    expect(storage.getObject).not.toHaveBeenCalled();
  });
});
