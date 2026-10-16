import { BatiproOwnerNotifier } from "./batipro-owner-notifier.service";

// SMS proprietaire : gardes, format (<=160 car., ASCII), devise differente, jamais de throw.

const claimRows: number[] = [];
function makeDb(selectQueue: any[][]) {
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        return () => p;
      },
    });
    return p;
  };
  return { select: () => chain(() => selectQueue.shift() ?? []), update: () => chain(() => [{ affectedRows: claimRows.shift() ?? 1 }]) };
}

const project = (over: any = {}) => ({
  code: "CH-001",
  name: "Residence Elysee",
  currencyId: 1,
  ownerPhone: "+243990000000",
  ownerSmsEnabled: 1,
  ...over,
});

function setup(selectQueue: any[][], sendSms: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  const n = new BatiproOwnerNotifier(makeDb(selectQueue) as any, { sendSms } as any);
  return { n, sendSms };
}

describe("BatiproOwnerNotifier", () => {
  it("garde : aucun projet retenu (sms off / inactif / autre org) -> pas de sendSms", async () => {
    const { n, sendSms } = setup([[]]);
    await n.notifyProgress(1, 5, 30);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("garde : pas de numero (vide / blancs / null) -> pas de sendSms", async () => {
    for (const ownerPhone of ["", "   ", null]) {
      const { n, sendSms } = setup([[project({ ownerPhone })]]);
      await n.notifyProgress(1, 5, 30);
      expect(sendSms).not.toHaveBeenCalled();
    }
  });

  it("avancement : envoie avec smsType/relatedType/org et texte <=160 ASCII", async () => {
    const { n, sendSms } = setup([[project({ name: "Résidence Élysée" })]]);
    await n.notifyProgress(7, 5, 30);
    expect(sendSms).toHaveBeenCalledTimes(1);
    const arg = sendSms.mock.calls[0][0];
    expect(arg).toMatchObject({ phone: "+243990000000", smsType: "batipro_owner_progress", organizationId: 7, relatedType: "batipro_project", relatedId: 5 });
    expect(arg.message).toBe("Chantier CH-001 Residence Elysee: avancement 30% atteint.");
    expect(arg.message).toMatch(/^[\x20-\x7E]*$/);
  });

  it("statut : libelle sans underscore, <=160 meme avec nom tres long", async () => {
    const { n, sendSms } = setup([[project({ name: "Très long nom de chantier ".repeat(10) })]]);
    await n.notifyStatusChange(1, 5, "in_progress", "on_hold");
    const msg = sendSms.mock.calls[0][0].message as string;
    expect(msg.length).toBeLessThanOrEqual(160);
    expect(msg).toContain("in progress a on hold");
    expect(msg).toMatch(/^[\x20-\x7E]*$/);
  });

  it("paiement meme devise : inclut Depense / budget", async () => {
    const load = jest.fn().mockResolvedValue({ spent: 12500, budget: 100000 });
    const { n, sendSms } = setup([[project()], [{ code: "USD" }]]);
    await n.notifyPayment(1, 5, { amount: 1500.5, currencyId: 1, supplierName: "Quincaillerie Ngolu", loadBudgetSummary: load });
    const msg = sendSms.mock.calls[0][0].message as string;
    expect(load).toHaveBeenCalled();
    expect(msg).toContain("1 500.50 USD");
    expect(msg).toContain("Depense: 12 500 / budget 100 000 USD");
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it("paiement devise differente : pas de partie Depense, loadBudgetSummary non appele", async () => {
    const load = jest.fn();
    const { n, sendSms } = setup([[project({ currencyId: 1 })], [{ code: "CDF" }]]);
    await n.notifyPayment(1, 5, { amount: 200000, currencyId: 2, supplierName: "X", loadBudgetSummary: load });
    const msg = sendSms.mock.calls[0][0].message as string;
    expect(msg).not.toContain("Depense");
    expect(msg).toContain("200 000 CDF");
    expect(load).not.toHaveBeenCalled();
  });

  it("paiement : fournisseur et chantier tres longs -> <=160", async () => {
    const { n, sendSms } = setup([[project({ name: "N".repeat(120) })], [{ code: "USD" }]]);
    await n.notifyPayment(1, 5, {
      amount: 123456789.12,
      currencyId: 1,
      supplierName: "Fournisseur Éléphant ".repeat(8),
      loadBudgetSummary: async () => ({ spent: 987654321, budget: 999999999 }),
    });
    expect(sendSms.mock.calls[0][0].message.length).toBeLessThanOrEqual(160);
  });

  it("devis recu : texte ASCII <=160, tiers par defaut", async () => {
    const { n, sendSms } = setup([[project()], [{ code: "USD" }]]);
    await n.notifyQuoteReceived(1, 5, { tiers: null, totalTtc: 4200, currencyId: 1 });
    expect(sendSms.mock.calls[0][0].message).toBe("Chantier CH-001: nouveau devis recu de un sous-traitant - 4 200 USD.");
  });

  it("devis recu : nom neutralise (caracteres speciaux retires)", async () => {
    const { n, sendSms } = setup([[project()], [{ code: "USD" }]]);
    await n.notifyQuoteReceived(1, 5, { tiers: "Ets <b>Dupont</b> http://x.co 123", totalTtc: 10, currencyId: 1 });
    expect(sendSms.mock.calls[0][0].message).toContain("de Ets bDupontb httpx.co - 10 USD");
  });

  it("devis recu : cooldown actif (claim 0 ligne) -> pas de sendSms", async () => {
    claimRows.push(0);
    const { n, sendSms } = setup([[project()]]);
    await n.notifyQuoteReceived(1, 5, { tiers: "X", totalTtc: 10, currencyId: 1 });
    expect(sendSms).not.toHaveBeenCalled();
  });

  it("sendSms qui throw -> aucune exception propagee", async () => {
    const sendSms = jest.fn().mockRejectedValue(new Error("gateway down"));
    const { n } = setup([[project()]], sendSms);
    await expect(n.notifyProgress(1, 5, 40)).resolves.toBeUndefined();
    expect(sendSms).toHaveBeenCalled();
  });

  it("db qui throw -> aucune exception propagee, pas d'envoi", async () => {
    const sendSms = jest.fn();
    const db = { select: () => { throw new Error("db down"); } };
    const n = new BatiproOwnerNotifier(db as any, { sendSms } as any);
    await expect(n.notifyStatusChange(1, 5, "a", "b")).resolves.toBeUndefined();
    expect(sendSms).not.toHaveBeenCalled();
  });
});
