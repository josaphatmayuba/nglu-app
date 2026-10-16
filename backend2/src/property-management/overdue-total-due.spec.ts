import { computeLeaseTotalDue } from "./lease-proration";
import { formatMoneyFr, loadLeaseTotalDue } from "./lease-overdue";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { RentReminderService } from "./rent-reminder.service";
import { emailTemplates, realEstateLeases, realEstateRentPayments } from "../database/schema";

jest.mock("../app-settings/org-app-setting", () => ({
  readOrgAppSetting: async () => ({ name: "Agence", phone: "+243800000000", enabled: 1, overdueDays: 1, hour: 9 }),
}));

// Montant des SMS de retard = TOTAL DU (« Reste a payer » de la carte Loyers),
// identique pour locataire, contact, proprietaire et delegue.
// Cas PROD : bail 11, loyer 3000 USD, prorata debut 15/07/2026, 2 paiements de 3000,
// aujourd'hui 16/10/2026 => 1645.16 (juillet) + 3000 x 3 - 6000 = 4645.16.

const ORG = 1;
const NOW = new Date("2026-10-16T09:00:00Z");
const norm = (s: string) => s.replace(/[  ]/g, " ");

const lease11 = {
  id: 11,
  startDate: "2026-07-15",
  endDate: null,
  billingCycle: "monthly",
  rentAmount: "3000.00",
  rentProrationEnabled: 1,
  currencyId: 1,
  currencyDecimals: 2,
  nextInvoiceDate: "2026-09-01",
};
const simple = {
  id: 12,
  startDate: "2026-09-01",
  endDate: null,
  billingCycle: "monthly",
  rentAmount: "500.00",
  rentProrationEnabled: 0,
  currencyId: 1,
  currencyDecimals: 2,
  nextInvoiceDate: "2026-09-01",
};

/** db factice : select().from(table).where() -> lignes selon la table. */
function fakeDb(tables: { payments?: any[]; lease?: any }) {
  return {
    select: () => ({
      from: (table: any) => {
        const rows =
          table === realEstateRentPayments ? tables.payments ?? []
          : table === realEstateLeases ? (tables.lease ? [tables.lease] : [])
          : table === emailTemplates ? []
          : [];
        const done: any = Promise.resolve(rows);
        done.limit = () => Promise.resolve(rows);
        done.orderBy = () => Promise.resolve(rows);
        const chain: any = { leftJoin: () => chain, innerJoin: () => chain, where: () => done };
        return chain;
      },
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  } as any;
}

describe("computeLeaseTotalDue / loadLeaseTotalDue", () => {
  it("bail 11 (prorata, 2 paiements de 3000 sans periode) = 4645.16", () => {
    expect(computeLeaseTotalDue(lease11, 6000, 2, NOW)).toBe(4645.16);
  });

  it("bail simple non prorata : 2 mois echus impayes a 500 (sept + oct) = 1000", () => {
    expect(computeLeaseTotalDue(simple, 0, 2, NOW)).toBe(1000);
  });

  it("tout paye = 0 (jamais negatif)", () => {
    expect(computeLeaseTotalDue(simple, 5000, 2, NOW)).toBe(0);
  });

  it("loader : texte formate avec milliers, decimales et devise DB", async () => {
    const db = fakeDb({ payments: [{ amount: "3000.00" }, { amount: "3000.00" }] });
    const r = await loadLeaseTotalDue(db, ORG, lease11, "$", NOW);
    expect(r.value).toBe(4645.16);
    expect(norm(r.text)).toBe("4 645,16 $");
    expect(norm(formatMoneyFr(3000, "$"))).toBe("3 000 $");
  });
});

describe("SMS de retard du bail 11 : meme total du partout", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const payments = [{ amount: "3000.00" }, { amount: "3000.00" }];

  it("locataire + contact (RentReminderService) : 4 645,16 $", async () => {
    const row = {
      ...lease11,
      leaseId: 11,
      organizationId: ORG,
      tenantId: 7,
      reference: "LEASE-1791055321988",
      lastReminder: null,
      tenantFirstName: "Benedicte",
      tenantLastName: "Mbombo",
      emergencyPhone: "+243810000000",
      currencySymbol: "$",
      propertyId: 3,
      propertyName: "VILLA MONTFLEURY",
      propertyAddress: "av X",
    };
    const db: any = fakeDb({ payments });
    // Le select principal (baux) renvoie la ligne enrichie ; les paiements restent ceux ci-dessus.
    const base = db.select;
    db.select = (cols?: any) => {
      const q = base(cols);
      const from = q.from;
      q.from = (table: any) => {
        const chain = from(table);
        if (table === realEstateLeases) chain.where = () => Promise.resolve([row]);
        return chain;
      };
      return q;
    };
    const sentSms: any[] = [];
    const sms = { sendSms: async (m: any) => { sentSms.push(m); return { success: true }; } };
    const renderer = new OwnerNotificationsService(db, sms as any, {} as any, {} as any, {} as any);
    const ownerNotifications = {
      propertyContactVars: async () => ({ ownerContact: "", managerContact: "", contacts: "Marie" }),
      renderMessage: renderer.renderMessage.bind(renderer),
      fitOneSms: (t: string) => t,
      leaseRecipients: async () =>
        new Map([[11, [{ customerId: 7, name: "Benedicte Mbombo", firstName: "Benedicte", civilName: "Mme B", phone: "+243900000000", email: null, isPrincipal: true }]]]),
      notifyPaymentOverdue: async () => undefined,
    };
    const tenantPortal = {
      portalUrlForTenant: async () => "",
      appendPortalFooterToSms: async (t: string) => t,
      appendPortalFooterToEmail: async (t: string) => t,
    };
    const service = new RentReminderService(db, sms as any, { send: async () => ({}) } as any, tenantPortal as any, ownerNotifications as any);
    await service.runLeaseReminder(11, ORG, { tenant: true, emergency: true, owner: false, delegates: false });
    const msgs = sentSms.map((m) => norm(m.message));
    expect(msgs).toHaveLength(2);
    for (const m of msgs) {
      expect(m).toContain("4 645,16 $");
      expect(m).not.toContain("1645.16");
    }
  });

  it("proprietaire + delegue (notifyPaymentOverdue) : 4 645,16 $", async () => {
    const leaseRow = {
      ...lease11,
      reference: "LEASE-1791055321988",
      tenantId: 7,
      currencySymbol: "$",
      propertyName: "VILLA MONTFLEURY",
      propertyAddress: "av X",
      propertyCity: "Kin",
      unitName: "VILLA-2",
      tenantFirstName: "Benedicte",
      tenantLastName: "Mbombo",
      tenantSex: "F",
      tenantPhone: "+243900000000",
    };
    const db = fakeDb({ payments, lease: leaseRow });
    const sentSms: any[] = [];
    const sms = { sendSms: async (m: any) => { sentSms.push(m); return { success: true }; } };
    const delegatePortal = { generateRentCheckLink: async () => ({ url: "https://d/1" }) };
    const ownerPortal = { generateOwnerPortalLink: async () => ({ url: "https://o/1" }) };
    const svc: any = new OwnerNotificationsService(db, sms as any, delegatePortal as any, ownerPortal as any, {} as any);
    svc.resolveOwnerForProperty = async () => ({ id: 1, name: "Prop", phone: "+243811111111" });
    svc.resolveDelegatesForProperty = async () => [{ id: 2, name: "Del", phone: "+243822222222" }];
    svc.ownerTenantLabel = async (_l: number, _o: number, fb: string) => fb;
    await svc.notifyPaymentOverdue(11, 3, 43, ORG);
    const byType = Object.fromEntries(sentSms.map((m) => [m.smsType, norm(m.message)]));
    expect(byType.payment_overdue_owner).toContain("4 645,16 $");
    expect(byType.payment_overdue_delegate).toContain("4 645,16 $");
    expect(byType.payment_overdue_owner).not.toContain("3 000 $");
  });
});
