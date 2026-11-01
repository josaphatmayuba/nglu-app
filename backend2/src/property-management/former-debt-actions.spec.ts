import { BadRequestException, ConflictException, HttpException } from "@nestjs/common";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { PropertyManagementService } from "./property-management.service";
import { RentReminderService } from "./rent-reminder.service";
import { smsSegments } from "../compat/sms-preview";
import * as fd from "./former-debt";

jest.mock("./former-debt", () => ({
  ...jest.requireActual("./former-debt"),
  loadEndedLeaseBalances: jest.fn(),
  loadLastReminders: jest.fn(),
}));
jest.mock("../app-settings/org-app-setting", () => ({
  readOrgAppSetting: async () => ({ name: "Agence Kodi", phone: "+243800000000", enabled: 1, overdueDays: 1, hour: 9, currencyId: 1 }),
}));

const ORG = 1;
const bal = {
  leaseId: 5, tenantId: 7, propertyId: 3, unitId: 1, reference: "B-5", balanceMinor: 15050, balance: "150.50", decimals: 2,
  currency: { id: 1, code: "USD", symbol: "$", decimals: 2 },
};
const loadBal = fd.loadEndedLeaseBalances as jest.Mock;
const loadLast = fd.loadLastReminders as jest.Mock;

describe("createPayment sur un bail termine", () => {
  const svc: any = Object.create(PropertyManagementService.prototype);
  svc.getLeaseOrThrow = async () => ({ id: 5, propertyId: 3, status: "ended" });
  svc.ensurePropertyInScope = () => undefined;
  svc.db = {};
  const dto = (extra: any = {}) => ({ leaseId: 5, paymentDate: "2026-10-31", amount: 50, ...extra });
  beforeEach(() => loadBal.mockResolvedValue(new Map([[5, bal]])));

  it("sans confirmEndedLease -> 409 ENDED_LEASE_CONFIRM_REQUIRED", async () => {
    const err: any = await svc.createPayment(dto(), ORG).catch((e: any) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().code).toBe("ENDED_LEASE_CONFIRM_REQUIRED");
  });

  it("montant > solde -> 400 « depasse le solde de 150.50 $ »", async () => {
    const err: any = await svc.createPayment(dto({ amount: 150.51, confirmEndedLease: true }), ORG).catch((e: any) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toContain("depasse le solde de 150.50 $");
  });

  it("applyDepositToRent n'appelle pas createPayment (jamais bloque par la confirmation)", () => {
    const src = PropertyManagementService.prototype.applyDepositToRent.toString();
    expect(src).not.toMatch(/createPayment/);
  });
});

function makeReminder(phone: string | null = "+243900000000") {
  const sent: any[] = [];
  const rows = [{ name: "Marie Kabongo Tshala", firstName: "Marie", customerId: 7, phone, email: null, isPrincipal: true }];
  const db: any = {
    select: () => ({ from: () => { const d: any = Promise.resolve([{ name: "Residence Les Palmiers", status: "ended" }]); d.where = () => d; d.limit = () => d; return d; } }),
  };
  const sms = { sendSms: async (m: any) => { sent.push(m); return { success: true }; } };
  const on: any = {
    leaseRecipients: async () => new Map([[5, rows]]),
    renderMessage: async (_e: string, fb: string, vars: any) => Object.entries(vars).reduce((t, [k, v]) => t.replace(`{${k}}`, String(v)), fb),
    fitOneSms: (t: string) => t,
  };
  return { service: new RentReminderService(db, sms as any, {} as any, {} as any, on), sent, db };
}

describe("relance d'un bail termine", () => {
  beforeEach(() => { loadBal.mockResolvedValue(new Map([[5, bal]])); loadLast.mockResolvedValue(new Map()); });

  it("SMS 1 segment, montant = solde 2 decimales + devise, prenom seul, sans reference", async () => {
    const { service, sent } = makeReminder();
    const res: any = await service.runLeaseReminder(5, ORG);
    expect(res.smsStatus).toBe("sent");
    expect(sent).toHaveLength(1);
    const m: string = sent[0].message.replace(/[  ]/g, " ");
    expect(m).toContain("150,50 $");
    expect(m).toContain("Bonjour Marie,");
    expect(m).not.toContain("B-5");
    expect(m).not.toMatch(/\{/);
    expect(smsSegments(m).segments ?? 1).toBe(1);
  });

  it("deuxieme relance < 24 h -> 429, aucun SMS", async () => {
    loadLast.mockResolvedValue(new Map([[5, new Date(Date.now() - 3600_000).toISOString()]]));
    const { service, sent } = makeReminder();
    const err: any = await service.runLeaseReminder(5, ORG).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(sent).toHaveLength(0);
  });

  it("relance de plus de 24 h -> autorisee", async () => {
    loadLast.mockResolvedValue(new Map([[5, new Date(Date.now() - 25 * 3600_000).toISOString()]]));
    const { service, sent } = makeReminder();
    await service.runLeaseReminder(5, ORG);
    expect(sent).toHaveLength(1);
  });

  it("solde nul -> 400", async () => {
    loadBal.mockResolvedValue(new Map([[5, { ...bal, balanceMinor: 0, balance: "0.00" }]]));
    const { service } = makeReminder();
    await expect(service.runLeaseReminder(5, ORG)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("cron automatique", () => {
  it("la selection du cron est limitee aux baux actifs (jamais 'ended')", async () => {
    let where: any;
    const db: any = {
      select: () => ({
        from: () => {
          const chain: any = { leftJoin: () => chain, where: (w: any) => { where = w; return Promise.resolve([]); } };
          return chain;
        },
      }),
    };
    const service = new RentReminderService(db, {} as any, {} as any, {} as any, {} as any);
    await service.runOverdueReminders(undefined, { hour: 9 });
    const q = new MySqlDialect().sqlToQuery(where);
    expect(q.params).toContain("active");
    expect(q.params).not.toContain("ended");
  });
});
