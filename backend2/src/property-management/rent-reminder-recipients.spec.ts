import { RentReminderService } from "./rent-reminder.service";
import { OwnerNotificationsService } from "./owner-notifications.service";

jest.mock("../app-settings/org-app-setting", () => ({
  readOrgAppSetting: async () => ({ name: "Agence", phone: "+243800000000", enabled: 1, overdueDays: 1, expiryDays: 30, hour: 9 }),
}));

// Rappels de loyer / fin de bail avec plusieurs locataires par bail :
// - 1 locataire = comportement inchange (rattache au bail) ;
// - 2 locataires = 1 envoi chacun, rattaches a leur dossier ;
// - numero partage = 1 seul envoi (dedoublonnage dans leaseRecipients) ;
// - throttle par BAIL : lastOverdueReminderDate pose une seule fois apres la boucle.

const ORG = 1;
const person = (id: number, first: string, phone: string | null, email: string | null = null) => ({
  customerId: id,
  name: `${first} Kabila`,
  firstName: first,
  civilName: `Mr ${first} Kabila`,
  phone,
  email,
  isPrincipal: id === 7,
});

function today(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function makeService(opts: { recipients: any[]; smsFailPhones?: string[]; row?: Record<string, unknown>; failLookup?: boolean }) {
  const updates: any[] = [];
  const sentEmails: any[] = [];
  const sentSms: any[] = [];
  const row = {
    leaseId: 10,
    organizationId: ORG,
    tenantId: 7,
    reference: "B-1",
    rentAmount: "100.00",
    startDate: "2026-01-01",
    endDate: today(10),
    billingCycle: "monthly",
    rentProrationEnabled: 0,
    currencyDecimals: 2,
    nextInvoiceDate: today(-5),
    lastReminder: null,
    lastExpiryReminder: null,
    tenantFirstName: "Jean",
    tenantLastName: "Kabila",
    emergencyPhone: null,
    currencySymbol: "$",
    propertyId: 3,
    propertyName: "Villa",
    propertyAddress: "12 av. X",
    ...opts.row,
  };
  const db: any = {
    update: () => ({ set: (vals: any) => ({ where: () => { updates.push(vals); return Promise.resolve(); } }) }),
    select: () => {
      const chain: any = {
        from: () => chain,
        leftJoin: () => chain,
        innerJoin: () => chain,
        where: () => Promise.resolve([row]),
      };
      return chain;
    },
  };
  const sms = {
    sendSms: async (m: any) => {
      sentSms.push(m);
      return { success: !opts.smsFailPhones?.includes(m.phone) };
    },
  };
  const ownerNotifications = {
    propertyContactVars: async () => ({ ownerContact: "", managerContact: "", contacts: "Marie" }),
    landlordForProperty: async () => ({ name: "Jean Mukendi", phone: "+243811111111" }),
    renderMessage: async (_e: string, fallback: string, vars: Record<string, string>) => {
      let out = fallback;
      for (const [k, v] of Object.entries(vars)) out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? "");
      return out;
    },
    fitOneSms: (t: string) => t,
    shortDate: (d: string) => d,
    leaseRecipients: async () => {
      if (opts.failLookup) throw new Error("db down");
      return new Map([[10, opts.recipients]]);
    },
    notifyPaymentOverdue: async () => undefined,
    notifyLeaseExpiring: async () => undefined,
  };
  const tenantPortal = {
    portalUrlForTenant: async (id: number) => `https://p/${id}`,
    appendPortalFooterToSms: async (t: string, id: number) => `${t} https://p/${id}`,
    appendPortalFooterToEmail: async (t: string) => t,
  };
  const emails = { send: async (m: any) => { sentEmails.push(m); return { ok: true }; } };
  const service = new RentReminderService(db, sms as any, emails as any, tenantPortal as any, ownerNotifications as any);
  return { service, updates, sentSms, sentEmails };
}

const manual = (service: RentReminderService) =>
  service.runLeaseReminder(10, ORG, { tenant: true, emergency: false, owner: false, delegates: false });

describe("runOverdueReminders — locataires multiples", () => {
  it("1 locataire : 1 SMS rattache au bail, periode marquee", async () => {
    const { service, sentSms, updates } = makeService({ recipients: [person(7, "Jean", "+243900000000")] });
    const res: any = await manual(service);
    expect(sentSms).toHaveLength(1);
    expect(sentSms[0]).toMatchObject({ relatedType: "real-estate-lease", relatedId: 10 });
    expect(res.smsStatus).toBe("sent");
    expect(updates).toHaveLength(1);
  });

  it("2 locataires : 2 SMS personnalises (sans lien portail), throttle pose UNE fois", async () => {
    const { service, sentSms, updates } = makeService({
      recipients: [person(7, "Jean", "+243900000000"), person(8, "Marie", "+243900000001")],
    });
    await manual(service);
    expect(sentSms).toHaveLength(2);
    expect(sentSms[0].message).toContain("Jean");
    expect(sentSms[0].message).not.toContain("https://p/7"); // plus de lien portail dans le SMS de relance
    expect(sentSms[1].message).toContain("Marie");
    expect(sentSms[1].message).not.toContain("https://p/8");
    expect(sentSms.map((m) => [m.relatedType, m.relatedId])).toEqual([["tenant", 7], ["tenant", 8]]);
    expect(updates).toHaveLength(1);
  });

  it("FAIBLE b : nom HTML echappe dans l'email de rappel", async () => {
    const { service, sentEmails } = makeService({
      recipients: [{ ...person(7, "<b>Jean</b>", null, "j@x.cd") }],
    });
    await manual(service);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].html).toContain("&lt;b&gt;Jean&lt;/b&gt;");
    expect(sentEmails[0].html).not.toContain("<b>Jean</b>");
  });

  it("R6 : echec de leaseRecipients -> repli sur le principal du bail (telephone du bail), pas d'echec silencieux", async () => {
    const { service, sentSms } = makeService({ recipients: [], failLookup: true, row: { tenantPhone: "+243911111111", tenantEmail: null } });
    await manual(service);
    expect(sentSms).toHaveLength(1);
    expect(sentSms[0].phone).toBe("+243911111111");
  });

  it("numero partage (phone=null apres dedoublonnage) : 1 seul SMS", async () => {
    const { service, sentSms } = makeService({
      recipients: [person(7, "Jean", "+243900000000"), person(8, "Marie", null)],
    });
    await manual(service);
    expect(sentSms).toHaveLength(1);
  });

  it("un echec pour un locataire ne bloque pas l'autre ; periode marquee tant qu'un SMS est parti", async () => {
    const { service, sentSms, updates } = makeService({
      recipients: [person(7, "Jean", "+243900000000"), person(8, "Marie", "+243900000001")],
      smsFailPhones: ["+243900000000"],
    });
    const res: any = await manual(service);
    expect(sentSms).toHaveLength(2);
    expect(res.smsStatus).toBe("sent");
    expect(updates).toHaveLength(1);
  });

  it("tous les SMS echouent : periode NON marquee (nouvel essai possible)", async () => {
    const { service, updates } = makeService({
      recipients: [person(7, "Jean", "+243900000000"), person(8, "Marie", "+243900000001")],
      smsFailPhones: ["+243900000000", "+243900000001"],
    });
    const res: any = await manual(service);
    expect(res.smsStatus).toBe("failed");
    expect(updates).toHaveLength(0);
  });
});

describe("runExpiryReminders — locataires multiples", () => {
  it("2 locataires : 2 SMS, lastExpiryReminderDate pose une fois ; 1 locataire inchange", async () => {
    const two = makeService({
      recipients: [person(7, "Jean", "+243900000000"), person(8, "Marie", "+243900000001")],
    });
    // La fenetre d'expiry est lue dans env (defaut) : endDate dans 10 jours.
    const r2: any = await two.service.runExpiryReminders();
    expect(r2.sent).toBe(1);
    expect(two.sentSms).toHaveLength(2);
    expect(two.sentSms[1].message).toContain("Marie");
    expect(two.updates).toHaveLength(1);

    const one = makeService({ recipients: [person(7, "Jean", "+243900000000")] });
    await one.service.runExpiryReminders();
    expect(one.sentSms).toHaveLength(1);
    expect(one.sentSms[0].relatedType).toBe("real-estate-lease");
  });
});

describe("leaseRecipients — ordre et dedoublonnage", () => {
  // 1er select = principaux, 2e select = colocataires (2 requetes simples).
  function recipientsService(principals: any[], cotenants: any[] = []) {
    const queue = [principals, cotenants];
    const db: any = {
      select: () => {
        const rows = queue.shift() ?? [];
        const done: any = Promise.resolve(rows);
        done.orderBy = () => Promise.resolve(rows);
        const chain: any = { from: () => chain, innerJoin: () => chain, leftJoin: () => chain, where: () => done };
        return chain;
      },
    };
    return new OwnerNotificationsService(db, {} as any, {} as any, {} as any, {} as any);
  }
  const r = (customerId: number, first: string, phone: string | null, email: string | null, position: number | null) => ({
    leaseId: 10, principalId: 7, customerId, firstName: first, lastName: "K", phone, email, sex: "M", position, status: "true",
  });

  it("principal d'abord puis colocataires par position ; numero et email partages mis a null", async () => {
    const svc = recipientsService(
      [r(7, "Jean", "+243-900-000-000", "luc@x.com", null)],
      [r(8, "Marie", "00243900000000", "m@x.com", 1), r(9, "Luc", "+243 900 000 002", "LUC@x.com", 2)],
    );
    const list = (await svc.leaseRecipients([10], ORG)).get(10)!;
    expect(list.map((x) => x.customerId)).toEqual([7, 8, 9]);
    expect(list[0].phone).toBe("+243-900-000-000");
    expect(list[1].phone).toBeNull(); // 00243... == +243... (normalisation partagee)
    expect(list[1].email).toBe("m@x.com");
    expect(list[2].email).toBeNull(); // meme email (casse ignoree) que le principal
    expect(list[2].phone).toBe("+243 900 000 002");
    expect(list[0].civilName).toBe("Mr Jean K");
  });

  it("R6 : bail a 1 locataire dont la fiche client est inactive -> principal conserve (repli)", async () => {
    const svc = recipientsService([{ ...r(7, "Jean", "+243900000001", "j@x.com", null), status: "false" }], []);
    const list = (await svc.leaseRecipients([10], ORG)).get(10)!;
    expect(list.map((x) => x.customerId)).toEqual([7]);
    expect(list[0].phone).toBe("+243900000001");
  });

  it("principal inactif + colocataire actif : principal exclu", async () => {
    const svc = recipientsService([{ ...r(7, "Jean", "+243900000001", null, null), status: "false" }], [r(8, "Marie", "+243900000002", null, 1)]);
    const list = (await svc.leaseRecipients([10], ORG)).get(10)!;
    expect(list.map((x) => x.customerId)).toEqual([8]);
  });

  it("aucun id : aucune requete", async () => {
    const svc = recipientsService([]);
    expect((await svc.leaseRecipients([], ORG)).size).toBe(0);
  });
});
