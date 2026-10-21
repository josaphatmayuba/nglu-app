import { PropertyManagementService } from "./property-management.service";
import { LeaseScheduledTerminationService } from "./lease-scheduled-termination.service";

// Cron des resiliations programmees : execution, idempotence, multi-org, bail non actif, retry, unite liberee.

type Fake = { db: any; sets: any[]; selectQueue: any[][] };

function makeFakeDb(selectQueue: any[][]): Fake {
  const f: Fake = { db: null, sets: [], selectQueue };
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
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

const row = (over: any = {}) => ({
  id: 1, organizationId: 1, leaseId: 9, effectiveDate: "2026-01-01", reason: "Depart", createdBy: 3, status: "scheduled", ...over,
});
const LEASE = { id: 9, organizationId: 1, propertyId: 4, unitId: 7, status: "active", startDate: "2025-01-01", endDate: null };

function realPm(fake: Fake) {
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn() };
  svc.publishLeaseUpdate = jest.fn().mockResolvedValue(undefined);
  svc.findLease = jest.fn().mockResolvedValue({ id: 9 });
  svc.sms = { sendSms: jest.fn() };
  return svc;
}

function makeCron(fake: Fake, pm: any) {
  const cron = new LeaseScheduledTerminationService(fake.db, pm);
  (cron as any).logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return cron;
}

describe("LeaseScheduledTerminationService.runDue", () => {
  it("execute l'echeance : bail ended, planning executed, unite vacante, aucun SMS ; 2e run = rien", async () => {
    const fake = makeFakeDb([
      [row()], // planning du jour
      [LEASE], // bail
      [{ id: 9 }], // verrou du bail (d'abord)
      [{ status: "scheduled" }], // verrou du planning
      [], // echeances
      [], // aucun autre bail actif
      [], // 2e run : plus rien
    ]);
    const pm = realPm(fake);
    const cron = makeCron(fake, pm);

    const r1 = await cron.runDue();
    expect(r1).toMatchObject({ due: 1, executed: 1, failed: 0 });
    expect(fake.sets.find((s) => s.status === "ended")).toMatchObject({ terminationDate: "2026-01-01", terminatedBy: 3 });
    expect(fake.sets.some((s) => s.status === "vacant")).toBe(true);
    expect(fake.sets.some((s) => s.status === "executed")).toBe(true);
    expect(pm.sms.sendSms).not.toHaveBeenCalled();

    const before = fake.sets.length;
    const r2 = await cron.runDue();
    expect(r2.due).toBe(0);
    expect(fake.sets).toHaveLength(before);
  });

  it("autre bail actif sur l'unite : l'unite reste occupee", async () => {
    const fake = makeFakeDb([[row()], [LEASE], [{ id: 9 }], [{ status: "scheduled" }], [], [{ id: 77 }]]);
    await makeCron(fake, realPm(fake)).runDue();
    expect(fake.sets.some((s) => s.status === "vacant")).toBe(false);
    expect(fake.sets.some((s) => s.status === "occupied")).toBe(true);
  });

  it("planning deja traite entre-temps (verrou revalide) : skipped, aucune ecriture bail", async () => {
    const fake = makeFakeDb([[row()], [LEASE], [{ id: 9 }], [{ status: "executed" }]]);
    const r = await makeCron(fake, realPm(fake)).runDue();
    expect(r).toMatchObject({ executed: 0, skipped: 1 });
    expect(fake.sets).toHaveLength(0);
  });

  it("multi-org : chaque ligne executee avec son organisation", async () => {
    const fake = makeFakeDb([
      [row({ id: 1, organizationId: 1, leaseId: 9 }), row({ id: 2, organizationId: 2, leaseId: 20 })],
      [LEASE],
      [{ ...LEASE, id: 20, organizationId: 2 }],
    ]);
    const pm = { executeTermination: jest.fn().mockResolvedValue({}) };
    const r = await makeCron(fake, pm).runDue();
    expect(r.executed).toBe(2);
    expect(pm.executeTermination.mock.calls.map(([a]) => [a.orgId, a.scheduleId, a.notifyTenant])).toEqual([
      [1, 1, false],
      [2, 2, false],
    ]);
  });

  it("bail plus actif : planning obsolete, pas d'execution", async () => {
    const fake = makeFakeDb([[row()], [{ ...LEASE, status: "ended" }]]);
    const pm = { executeTermination: jest.fn() };
    const r = await makeCron(fake, pm).runDue();
    expect(r).toMatchObject({ obsolete: 1, executed: 0 });
    expect(pm.executeTermination).not.toHaveBeenCalled();
    expect(fake.sets[0]).toMatchObject({ status: "obsolete" });
  });

  it("3e echec : log error (statut inchange)", async () => {
    const fake = makeFakeDb([[row({ attempts: 2 })], [LEASE]]);
    const pm = { executeTermination: jest.fn().mockRejectedValue(new Error("db down")) };
    const cron = makeCron(fake, pm);
    await cron.runDue();
    expect((cron as any).logger.error).toHaveBeenCalled();
    expect(fake.sets.some((s) => s.status)).toBe(false);
  });

  it("erreur : attempts+1 et last_error, un 2e run reessaie puis reussit", async () => {
    const fake = makeFakeDb([[row()], [LEASE], [row()], [LEASE]]);
    const pm = { executeTermination: jest.fn().mockRejectedValueOnce(new Error("db down")).mockResolvedValueOnce({}) };
    const cron = makeCron(fake, pm);
    const r1 = await cron.runDue();
    expect(r1.failed).toBe(1);
    expect(fake.sets[0]).toHaveProperty("attempts");
    expect(fake.sets[0].lastError).toContain("db down");
    const r2 = await cron.runDue();
    expect(r2.executed).toBe(1);
    expect(pm.executeTermination).toHaveBeenCalledTimes(2);
  });
});
