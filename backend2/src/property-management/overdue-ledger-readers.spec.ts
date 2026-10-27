import {
  loadLeaseTotalDue,
  loadOverdueByLease,
  loadPortalOverdueByLease,
} from "./lease-overdue";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { PropertyManagementService } from "./property-management.service";
import { RentReminderService } from "./rent-reminder.service";
import {
  emailTemplates,
  realEstateLeases,
  realEstatePaymentAllocations,
  realEstateRentPayments,
} from "../database/schema";

jest.mock("../app-settings/org-app-setting", () => ({
  readOrgAppSetting: async () => ({ name: "Agence", phone: "+243800000000", enabled: 1, overdueDays: 1, hour: 9 }),
}));

// Phase 3 : lecteurs bascules sur l'etat impute pour les baux flagges.
// Bail 11 flagge : juillet (1645,16) paye, aout paye, sept 3000 du en retard, oct 3000 du (dans la grace).

const ORG = 1;
const NOW = new Date("2026-10-16T09:00:00Z");
const norm = (s: string) => s.replace(/[  ]/g, " ");

const lease11 = {
  id: 11,
  startDate: "2026-07-15",
  endDate: null,
  billingCycle: "monthly",
  rentAmount: "3000.00",
  rentProrationEnabled: 1,
  currencyId: 1,
  currencyDecimals: 2,
  nextInvoiceDate: "2026-11-15",
  allocationLedgerAt: new Date("2026-10-10T00:00:00Z"),
};

const due = (id: number, date: string, amount: string, status: string) => ({
  id, leaseId: 11, status, rowKind: "due", paymentDate: date, amount, periodStart: date, periodEnd: null,
});
const pay = (id: number, date: string, amount: string) => ({
  id, leaseId: 11, status: "paid", rowKind: "payment", paymentDate: date, amount, periodStart: null, periodEnd: null,
});
const ROWS = [
  due(1, "2026-07-15", "1645.16", "settled"),
  due(2, "2026-08-15", "3000.00", "settled"),
  due(3, "2026-09-15", "3000.00", "pending"),
  due(4, "2026-10-15", "3000.00", "pending"),
  pay(10, "2026-07-20", "1645.16"),
  pay(11, "2026-08-20", "3000.00"),
];
const ALLOCS = [
  { id: 1, leaseId: 11, paymentId: 10, dueId: 1, amount: "1645.16", source: "auto", status: "true" },
  { id: 2, leaseId: 11, paymentId: 11, dueId: 2, amount: "3000.00", source: "auto", status: "true" },
];

function fakeDb(lease?: any) {
  return {
    select: () => ({
      from: (table: any) => {
        const rows =
          table === realEstateRentPayments ? ROWS
          : table === realEstatePaymentAllocations ? ALLOCS
          : table === realEstateLeases ? (lease ? [lease] : [])
          : table === emailTemplates ? []
          : [];
        const done: any = Promise.resolve(rows);
        done.limit = () => Promise.resolve(rows);
        done.orderBy = () => Promise.resolve(rows);
        done.groupBy = () => Promise.resolve([]);
        const chain: any = { leftJoin: () => chain, innerJoin: () => chain, where: () => done };
        return chain;
      },
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  } as any;
}

describe("lecteurs sur bail flagge (etat impute)", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const today = new Date("2026-10-16T00:00:00Z");

  it("loadOverdueByLease : overdueCount 1, retard depuis septembre", async () => {
    const e = (await loadOverdueByLease(fakeDb(), ORG, 5, [lease11], today)).get(11)!;
    expect(e.stats.unpaidCount).toBe(1);
    expect(e.stats.isOverdue).toBe(true);
    expect(e.stats.overdueDueDate).toBe("2026-09-15");
    expect(e.stats.dueCount).toBe(4);
    expect(e.ledger!.totalDue).toBe(6000);
    expect(e.ledger!.openDueCount).toBe(2);
  });

  it("jour J : une echeance dont dueDate == aujourd'hui est echue (totalDue et dueCount)", async () => {
    const dayJ = new Date("2026-10-15T00:00:00Z");
    const e = (await loadOverdueByLease(fakeDb(), ORG, 5, [lease11], dayJ)).get(11)!;
    expect(e.ledger!.totalDue).toBe(6000);
    expect(e.stats.dueCount).toBe(4);
    const eve = new Date("2026-10-14T00:00:00Z");
    const e2 = (await loadOverdueByLease(fakeDb(), ORG, 5, [lease11], eve)).get(11)!;
    expect(e2.ledger!.totalDue).toBe(3000);
    expect(e2.stats.dueCount).toBe(3);
  });

  it("loadLeaseTotalDue : 6 000 $", async () => {
    const r = await loadLeaseTotalDue(fakeDb(), ORG, lease11, "$", NOW);
    expect(r.value).toBe(6000);
    expect(norm(r.text)).toBe("6 000 $");
  });

  it("reponse bail (withOverdueStats) : allocationLedger, dues, credit, sans fuite allocationLedgerAt", async () => {
    const ctx: any = {
      db: fakeDb(),
      overdueGraceDays: async () => 5,
      parseDateOnly: (v: string) => new Date(`${v}T00:00:00Z`),
      formatDateOnly: (d: Date) => d.toISOString().slice(0, 10),
    };
    const [row]: any[] = await (PropertyManagementService.prototype as any).withOverdueStats.call(ctx, [{ ...lease11, status: "active" }], ORG);
    expect(row.allocationLedger).toBe(true);
    expect(row.unpaidCount).toBe(1);
    expect(row.openDueCount).toBe(2);
    expect(row.totalDue).toBe(6000);
    expect(row.credit).toBe(0);
    expect(row.dues).toHaveLength(4);
    expect(row.allocationLedgerAt).toBeUndefined();
  });

  it("bail non flagge : allocationLedger false, pas de dues", async () => {
    const ctx: any = {
      db: fakeDb(),
      overdueGraceDays: async () => 5,
      parseDateOnly: (v: string) => new Date(`${v}T00:00:00Z`),
      formatDateOnly: (d: Date) => d.toISOString().slice(0, 10),
    };
    const [row]: any[] = await (PropertyManagementService.prototype as any).withOverdueStats.call(
      ctx, [{ ...lease11, allocationLedgerAt: null, rentProrationEnabled: 0, status: "active" }], ORG,
    );
    expect(row.allocationLedger).toBe(false);
    expect(row.dues).toBeUndefined();
  });

  it("portail locataire : meme solde et meme retard que l'ecran Loyers", async () => {
    const p = await loadPortalOverdueByLease(fakeDb(), ORG, [lease11]);
    expect(p.ledger.get(11)!.totalDue).toBe(6000);
    expect(p.byLease.get(11)!.unpaidCount).toBe(1);
    expect(p.nextDue.get(11)).toBeDefined();
  });

  it("SMS locataire + contact (RentReminderService) : 3 000 $ en retard (oct. dans la grace exclu)", async () => {
    const row = {
      ...lease11,
      leaseId: 11,
      organizationId: ORG,
      tenantId: 7,
      reference: "LEASE-11",
      lastReminder: null,
      tenantFirstName: "Benedicte",
      tenantLastName: "Mbombo",
      emergencyPhone: "+243810000000",
      currencySymbol: "$",
      propertyId: 3,
      propertyName: "VILLA",
      propertyAddress: "av X",
    };
    const db: any = fakeDb();
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
      landlordForProperty: async () => ({ name: "Jean Mukendi", phone: "+243811111111" }),
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
    for (const m of msgs) expect(m).toContain("3 000 $");
  });

  it("SMS proprietaire + delegue (notifyPaymentOverdue) : 3 000 $ en retard", async () => {
    const leaseRow = {
      ...lease11,
      reference: "LEASE-11",
      tenantId: 7,
      currencySymbol: "$",
      propertyName: "VILLA",
      propertyAddress: "av X",
      propertyCity: "Kin",
      unitName: "V-2",
      tenantFirstName: "Benedicte",
      tenantLastName: "Mbombo",
      tenantSex: "F",
      tenantPhone: "+243900000000",
    };
    const db = fakeDb(leaseRow);
    const sentSms: any[] = [];
    const sms = { sendSms: async (m: any) => { sentSms.push(m); return { success: true }; } };
    const svc: any = new OwnerNotificationsService(
      db, sms as any,
      { generateRentCheckLink: async () => ({ url: "https://d/1" }) } as any,
      { generateOwnerPortalLink: async () => ({ url: "https://o/1" }) } as any,
      {} as any,
    );
    svc.resolveOwnerForProperty = async () => ({ id: 1, name: "Prop", phone: "+243811111111" });
    svc.resolveDelegatesForProperty = async () => [{ id: 2, name: "Del", phone: "+243822222222" }];
    svc.ownerTenantLabel = async (_l: number, _o: number, fb: string) => fb;
    await svc.notifyPaymentOverdue(11, 3, 43, ORG);
    const byType = Object.fromEntries(sentSms.map((m) => [m.smsType, norm(m.message)]));
    expect(byType.payment_overdue_owner).toContain("3 000 $");
    expect(byType.payment_overdue_delegate).toContain("3 000 $");
  });

  it("rent-book : lease.allocationLedger + lease.dues pour un bail flagge, legacy sinon", async () => {
    const mk = (l: any) => ({
      logger: { warn() {}, log() {}, error() {}, debug() {} },
      db: fakeDb({ ...l, propertyId: 3, unitId: 1, tenantId: null }),
      ensurePropertyInScope: () => undefined,
      generateMissingPayments: async () => undefined,
      paymentQuery: () => ({ orderBy: async () => [] }),
      decoratePaymentRow: (x: any) => x,
      tenantPortal: { portalUrlForTenant: async () => "" },
      currencyDecimals: async () => 2,
      parseDateOnly: (v: string) => new Date(`${v}T00:00:00Z`),
      formatDateOnly: (d: Date) => d.toISOString().slice(0, 10),
    });
    const call = (l: any) => (PropertyManagementService.prototype as any).rentBook.call(mk(l), 11, ORG, "all");
    const flagged = await call(lease11);
    expect(flagged.lease.allocationLedger).toBe(true);
    expect(flagged.lease.dues).toHaveLength(4);
    expect(flagged.lease.allocationLedgerAt).toBeUndefined();
    const legacy = await call({ ...lease11, allocationLedgerAt: null, rentProrationEnabled: 0 });
    expect(legacy.lease.allocationLedger).toBe(false);
    expect(legacy.lease.dues).toBeUndefined();
  });
});
