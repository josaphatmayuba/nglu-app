import { RentReminderService } from "./rent-reminder.service";

jest.mock("../app-settings/org-app-setting", () => ({
  readOrgAppSetting: async () => ({ name: "Agence", phone: "+243800000000", enabled: 1, overdueDays: 1, expiryDays: 30, hour: 9 }),
}));

// overdueValue pilote par test (retard reel) ; le reste de lease-overdue est neutralise.
let overdueValue = 100;
jest.mock("./lease-overdue", () => ({
  loadFlaggedDueStates: async () => new Map(),
  readOverdueGraceDays: async () => 0,
  resolveCurrencySymbol: async () => "$",
  loadLeaseOverdueAmount: async () => ({
    value: overdueValue > 0 ? overdueValue : 250,
    text: "100,00 $",
    totalDue: { value: 250, text: "250,00 $" },
    overdueValue,
  }),
}));

// Passe automatique : robustesse (1 bail en erreur), marquage de periode, retard a 0.

const lease = (id: number, tenantId: number, propertyId: number) => ({
  leaseId: id,
  organizationId: 1,
  tenantId,
  reference: `B-${id}`,
  rentAmount: "100.00",
  startDate: "2026-01-01",
  endDate: null,
  billingCycle: "monthly",
  rentProrationEnabled: 0,
  currencyDecimals: 2,
  nextInvoiceDate: new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10),
  currencyId: 1,
  allocationLedgerAt: null,
  lastReminder: null,
  tenantFirstName: "T",
  tenantLastName: String(id),
  tenantEmail: null,
  tenantPhone: `+24390000000${id}`,
  emergencyPhone: null,
  currencySymbol: "$",
  propertyId,
  propertyName: "Villa",
  propertyAddress: "12 av. X",
});

function makeService(opts: { rows: any[]; failPropertyId?: number; smsResult?: any }) {
  const updates: any[] = [];
  const sentSms: any[] = [];
  const db: any = {
    update: () => ({ set: (vals: any) => ({ where: () => { updates.push(vals); return Promise.resolve(); } }) }),
    select: () => {
      const chain: any = {
        from: () => chain,
        leftJoin: () => chain,
        innerJoin: () => chain,
        where: () => {
          const done: any = Promise.resolve(opts.rows);
          done.orderBy = () => Promise.resolve([]);
          return done;
        },
      };
      return chain;
    },
  };
  const sms = {
    sendSms: async (m: any) => {
      sentSms.push(m);
      return opts.smsResult ?? { success: true };
    },
  };
  const ownerNotifications = {
    propertyContactVars: async () => ({ ownerContact: "", managerContact: "", contacts: "Marie" }),
    landlordForProperty: async (propertyId: number) => {
      if (propertyId === opts.failPropertyId) throw new Error("boom");
      return { name: "Jean", phone: "+243811111111" };
    },
    renderMessage: async (_e: string, fallback: string) => fallback,
    fitOneSms: (t: string) => t,
    shortDate: (d: string) => d,
    leaseRecipients: async (ids: number[]) =>
      new Map(
        opts.rows.map((r) => [
          r.leaseId,
          [{ customerId: r.tenantId, name: `T ${r.leaseId}`, firstName: "T", civilName: "T", phone: r.tenantPhone, email: null, isPrincipal: true }],
        ]),
      ),
    notifyPaymentOverdue: async () => undefined,
    notifyLeaseExpiring: async () => undefined,
  };
  const tenantPortal = {
    portalUrlForTenant: async () => "https://p",
    appendPortalFooterToEmail: async (t: string) => t,
  };
  const emails = { send: async () => ({ ok: true }) };
  const service = new RentReminderService(db, sms as any, emails as any, tenantPortal as any, ownerNotifications as any);
  return { service, updates, sentSms };
}

describe("runOverdueReminders — passe automatique", () => {
  beforeEach(() => {
    overdueValue = 100;
  });

  it("un bail qui leve une exception n'empeche pas l'envoi au bail suivant", async () => {
    const { service, sentSms, updates } = makeService({ rows: [lease(1, 11, 3), lease(2, 12, 4)], failPropertyId: 3 });
    const res: any = await service.runOverdueReminders(undefined, { hour: 9 });
    expect(sentSms).toHaveLength(1);
    expect(sentSms[0].phone).toBe("+243900000002");
    expect(updates).toHaveLength(1);
    expect(res.sent).toBe(1);
    expect(res.errors).toBe(1);
  });

  it("envoi skipped (SMS desactives) : periode NON marquee", async () => {
    const { service, updates } = makeService({ rows: [lease(1, 11, 3)], smsResult: { success: false, skipped: true } });
    await service.runOverdueReminders(undefined, { hour: 9 });
    expect(updates).toHaveLength(0);
  });

  it("envoi reel : periode marquee", async () => {
    const { service, updates } = makeService({ rows: [lease(1, 11, 3)] });
    await service.runOverdueReminders(undefined, { hour: 9 });
    expect(updates).toHaveLength(1);
  });

  it("retard reel a 0 (repli sur le total du) : rien n'est envoye", async () => {
    overdueValue = 0;
    const { service, sentSms, updates } = makeService({ rows: [lease(1, 11, 3)] });
    await service.runOverdueReminders(undefined, { hour: 9 });
    expect(sentSms).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });
});

describe("runOverdueReminders — no_phone", () => {
  it("locataire sans telephone : periode marquee (reessayer ne servirait a rien)", async () => {
    overdueValue = 100;
    const { service, sentSms, updates } = makeService({ rows: [{ ...lease(1, 11, 3), tenantPhone: null }] });
    await service.runOverdueReminders(undefined, { hour: 9 });
    expect(sentSms).toHaveLength(0);
    expect(updates).toHaveLength(1);
  });
});
