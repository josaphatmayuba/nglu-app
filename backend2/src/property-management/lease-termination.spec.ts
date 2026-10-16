import { BadRequestException } from "@nestjs/common";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { PropertyManagementService } from "./property-management.service";
import { OwnerNotificationsService } from "./owner-notifications.service";

// Resiliation de bail avec motif : validations, echeances futures voided (jamais paid),
// unite vacante, SMS best-effort sans motif, pas de regeneration apres la date d'effet.

const dialect = new MySqlDialect();

type Fake = { db: any; sets: any[]; wheres: any[]; selectQueue: any[][] };

function makeFakeDb(selectQueue: any[][]): Fake {
  const f: Fake = { db: null, sets: [], wheres: [], selectQueue };
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        if (prop === "where") return (w: any) => { f.wheres.push(w); return p; };
        return () => p;
      },
    });
    return p;
  };
  const api: any = {
    select: () => chain(() => f.selectQueue.shift() ?? []),
    update: () => ({
      set: (v: any) => {
        f.sets.push(v);
        return chain(() => [{ affectedRows: 1 }]);
      },
    }),
  };
  api.transaction = async (cb: any) => cb(api);
  f.db = api;
  return f;
}

const LEASE = { id: 9, organizationId: 1, propertyId: 4, unitId: 7, status: "active", startDate: "2026-01-01", endDate: "2026-12-31" };

function makeService(fake: Fake, lease: any = LEASE) {
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn() };
  svc.getLeaseOrThrow = jest.fn().mockResolvedValue(lease);
  svc.publishLeaseUpdate = jest.fn().mockResolvedValue(undefined);
  svc.findLease = jest.fn().mockResolvedValue({
    id: 9, reference: "B-9", propertyId: 4, propertyName: "Immeuble A", propertyAddress: "12 av. X",
    unitName: "A3", tenantFirstName: "Jean", tenantLastName: "K",
  });
  svc.sms = { sendSms: jest.fn().mockResolvedValue({ success: true }) };
  const on = Object.create(OwnerNotificationsService.prototype) as any;
  on.logger = { warn: jest.fn() };
  on.db = { select: () => { throw new Error("no db"); } }; // template illisible -> repli sur le defaut
  on.leaseRecipients = jest.fn().mockResolvedValue(new Map([[9, [
    { customerId: 1, name: "Jean K", firstName: "Jean", civilName: "Jean K", phone: "+243810000001", email: null, isPrincipal: true },
    { customerId: 2, name: "Marie K", firstName: "Marie", civilName: "Marie K", phone: "+243810000002", email: null, isPrincipal: false },
  ]]]));
  on.propertyContactVars = jest.fn().mockResolvedValue({ ownerContact: "", managerContact: "Paul au +243810000009", contacts: "" });
  on.civilNameForTenant = jest.fn().mockResolvedValue("");
  svc.ownerNotifications = on;
  return svc;
}

const input = (over: any = {}) => ({ terminationDate: "2026-06-30", reason: "Depart du locataire", notifyTenant: false, ...over });

describe("PropertyManagementService.terminateLease", () => {
  it("motif obligatoire : vide ou < 5 caracteres -> 400, aucune ecriture", async () => {
    for (const reason of ["", "   ", "abc"]) {
      const fake = makeFakeDb([]);
      const svc = makeService(fake);
      await expect(svc.terminateLease(9, input({ reason }), 1, 3)).rejects.toBeInstanceOf(BadRequestException);
      expect(fake.sets).toHaveLength(0);
    }
  });

  it("bail non actif refuse", async () => {
    for (const status of ["ended", "cancelled", "draft"]) {
      const fake = makeFakeDb([]);
      const svc = makeService(fake, { ...LEASE, status });
      await expect(svc.terminateLease(9, input(), 1, 3)).rejects.toBeInstanceOf(BadRequestException);
      expect(fake.sets).toHaveLength(0);
    }
  });

  it("date avant le debut du bail refusee", async () => {
    const fake = makeFakeDb([]);
    const svc = makeService(fake);
    await expect(svc.terminateLease(9, input({ terminationDate: "2025-12-31" }), 1, 3)).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.sets).toHaveLength(0);
  });

  it("echeances futures voided, bail ended + 4 champs, unite vacante", async () => {
    const fake = makeFakeDb([
      [
        { id: 11, amount: "500.00", periodDay: "2026-05-01" }, // avant la date : conserve (impaye)
        { id: 12, amount: "500.00", periodDay: "2026-07-01" },
        { id: 13, amount: "500.00", periodDay: "2026-08-01" },
      ],
      [], // aucun autre bail actif sur l'unite
    ]);
    const svc = makeService(fake);
    const res = await svc.terminateLease(9, input(), 1, 3);

    const lease = fake.sets.find((s) => s.status === "ended");
    expect(lease).toMatchObject({ terminationDate: "2026-06-30", terminationReason: "Depart du locataire", terminatedBy: 3, endDate: "2026-06-30" });
    const voided = fake.sets.find((s) => s.status === "voided");
    expect(voided).toBeDefined();
    expect(res.voidedCount).toBe(2);
    expect(res.voidedTotal).toBe(1000);
    // la requete de void cible uniquement les ids futurs 12 et 13, statuts pending/overdue
    const { params } = dialect.sqlToQuery(fake.wheres[2]);
    expect(params).toEqual(expect.arrayContaining([12, 13, "pending", "overdue"]));
    expect(params).not.toContain(11);
    expect(params).not.toContain("paid");
    expect(fake.sets.some((s) => s.status === "vacant")).toBe(true);
    expect(svc.publishLeaseUpdate).toHaveBeenCalledWith("updated", 9, expect.anything());
  });

  it("la requete des echeances ne selectionne jamais les paid", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake);
    await svc.terminateLease(9, input(), 1, 3);
    const { params } = dialect.sqlToQuery(fake.wheres[1]);
    expect(params).toEqual(expect.arrayContaining(["pending", "overdue"]));
    expect(params).not.toContain("paid");
  });

  it("autre bail actif sur l'unite : l'unite reste occupee", async () => {
    const fake = makeFakeDb([[], [{ id: 77 }]]);
    const svc = makeService(fake);
    await svc.terminateLease(9, input(), 1, 3);
    expect(fake.sets.some((s) => s.status === "vacant")).toBe(false);
  });

  it("fin de bail anterieure a la date : end_date conservee", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake, { ...LEASE, endDate: "2026-03-31" });
    await svc.terminateLease(9, input(), 1, 3);
    expect(fake.sets.find((s) => s.status === "ended").endDate).toBe("2026-03-31");
  });

  it("SMS non bloquant : un echec d'envoi ne fait pas echouer la resiliation, motif jamais envoye", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake);
    svc.sms.sendSms = jest.fn()
      .mockRejectedValueOnce(new Error("gateway down"))
      .mockResolvedValueOnce({ success: true });
    const res = await svc.terminateLease(9, input({ notifyTenant: true, reason: "Impayes repetes secret" }), 1, 3);

    expect(res.sms).toEqual({ requested: true, sent: 1, failed: 1 });
    expect(svc.sms.sendSms).toHaveBeenCalledTimes(2);
    for (const [arg] of svc.sms.sendSms.mock.calls) {
      expect(arg).toMatchObject({ smsType: "lease_terminated", relatedType: "real-estate-lease", relatedId: 9 });
      expect(arg.message).toContain("est resilie a compter du 30/06/2026");
      expect(arg.message).not.toMatch(/Impayes|secret/);
    }
  });

  it("notifyTenant=false : aucun SMS", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake);
    const res = await svc.terminateLease(9, input(), 1, 3);
    expect(svc.sms.sendSms).not.toHaveBeenCalled();
    expect(res.sms.requested).toBe(false);
  });

  it("SMS sans gestionnaire : la fin de phrase est nettoyee", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake);
    svc.ownerNotifications.propertyContactVars = jest.fn().mockResolvedValue({ ownerContact: "", managerContact: "", contacts: "" });
    await svc.terminateLease(9, input({ notifyTenant: true }), 1, 3);
    const msg = svc.sms.sendSms.mock.calls[0][0].message;
    expect(msg).toContain("30/06/2026.");
    expect(msg).not.toMatch(/gestionnaire|contactez/);
  });
});

describe("OwnerNotificationsService.tidy - contract_signed", () => {
  const on = Object.create(OwnerNotificationsService.prototype) as any;
  const base = (contacts: string) =>
    ("Bonjour Jean, felicitations. Votre contrat de bail B-9 est bien signe. Votre location court du 01/01/2026 au 31/12/2026 (12 mois). " +
      "Pour toute question, contactez {contacts}. — Avelomi").replace("{contacts}", contacts);

  it("{contacts} vide : phrase de contact retiree, texte correct", () => {
    const out = on.tidy(base(""));
    expect(out).toBe("Bonjour Jean, felicitations. Votre contrat de bail B-9 est bien signe. Votre location court du 01/01/2026 au 31/12/2026 (12 mois). — Avelomi");
  });

  it("{contacts} rempli : texte inchange", () => {
    const text = base("Paul au +243810000009");
    expect(on.tidy(text)).toBe(text);
  });
});

describe("garde apres resiliation", () => {
  it("terminatedOn : seulement pour un bail ended avec termination_date", () => {
    const svc = makeService(makeFakeDb([]));
    expect(svc.terminatedOn({ status: "ended", terminationDate: "2026-06-30" })).toBe("2026-06-30");
    expect(svc.terminatedOn({ status: "ended", terminationDate: null })).toBeNull();
    expect(svc.terminatedOn({ status: "active", terminationDate: "2026-06-30" })).toBeNull();
  });
});
