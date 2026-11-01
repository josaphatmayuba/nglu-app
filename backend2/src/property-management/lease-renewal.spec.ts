import { BadRequestException } from "@nestjs/common";
import { ContractsService } from "./contracts.service";

jest.mock("./lease-overdue", () => ({
  loadLeaseTotalDue: jest.fn(),
  resolveCurrencySymbol: jest.fn().mockResolvedValue("$"),
}));
import { loadLeaseTotalDue } from "./lease-overdue";

// Renouvellement de bail : copie des conditions (bug #85), surcharges, garde-fous.

type Fake = { db: any; inserts: any[]; sets: any[]; selectQueue: any[][] };

function makeFakeDb(selectQueue: any[][]): Fake {
  const f: Fake = { db: null, inserts: [], sets: [], selectQueue };
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
    insert: () => ({ values: (v: any) => { f.inserts.push(v); return Promise.resolve([{ insertId: 77 }]); } }),
    update: () => ({ set: (v: any) => { f.sets.push(v); return chain(() => [{ affectedRows: 1 }]); } }),
  };
  api.transaction = async (cb: any) => cb(api);
  f.db = api;
  return f;
}

const OLD = {
  id: 9, organizationId: 1, reference: "B-9", propertyId: 4, unitId: 7, tenantId: 3,
  currencyId: 16, startDate: "2026-01-01", endDate: "2026-12-31", billingCycle: "quarterly",
  rentAmount: "500.00", securityDeposit: "1000.00", terms: "T", signingCity: "Kin",
  taxName: "TVA", taxType: "percent", taxValue: "16.0000", taxApplyMode: "auto",
  rentProrationEnabled: 1, allocationLedgerAt: new Date("2026-02-01"),
};

// Ordre des select : bail, devise, chevauchement, [cautions], colocataires.
function setup(opts: { deposits?: any[]; dueValue?: number; withDepositQuery?: boolean; overlap?: any[] } = {}) {
  (loadLeaseTotalDue as jest.Mock).mockResolvedValue({ value: opts.dueValue ?? 0, text: "10 $" });
  const queue: any[][] = [[OLD], [{ symbol: "$", code: "USD" }], opts.overlap ?? []];
  if (opts.withDepositQuery) queue.push(opts.deposits ?? []);
  queue.push([]); // colocataires
  const fake = makeFakeDb(queue);
  const svc = Object.create(ContractsService.prototype) as any;
  svc.db = fake.db;
  svc.createContract = jest.fn().mockResolvedValue({ id: 1 });
  return { fake, svc };
}

describe("ContractsService.renewLease", () => {
  it("copie par defaut devise, taxe, prorata, cycle, loyer, registre d'imputation", async () => {
    const { fake, svc } = setup();
    await svc.renewLease(9, {}, 1, 5);
    const v = fake.inserts[0];
    expect(v.currencyId).toBe(16);
    expect(v.taxName).toBe("TVA");
    expect(v.taxType).toBe("percent");
    expect(v.taxValue).toBe("16.0000");
    expect(v.taxApplyMode).toBe("auto");
    expect(v.rentProrationEnabled).toBe(1);
    expect(v.billingCycle).toBe("quarterly");
    expect(v.rentAmount).toBe("500.00");
    expect(v.securityDeposit).toBe("1000.00");
    expect(v.allocationLedgerAt).toBeTruthy();
    expect(v.terminationDate).toBeUndefined();
    expect(v.startDate).toBe("2027-01-01");
    expect(v.nextInvoiceDate).toBe("2027-01-01");
  });

  it("surcharge du loyer en 2 decimales exactes et des conditions", async () => {
    const { fake, svc } = setup();
    await svc.renewLease(9, { rentAmount: 612.5, billingCycle: "monthly", taxApplyMode: "never", rentProrationEnabled: false }, 1);
    const v = fake.inserts[0];
    expect(v.rentAmount).toBe("612.50");
    expect(v.billingCycle).toBe("monthly");
    expect(v.taxApplyMode).toBe("never");
    expect(v.rentProrationEnabled).toBe(0);
  });

  it("prorata actif : nextInvoiceDate jamais avant startDate", async () => {
    const { fake, svc } = setup();
    await svc.renewLease(9, { startDate: "2027-02-01", endDate: "2028-01-31", nextInvoiceDate: "2026-12-01" }, 1);
    expect(fake.inserts[0].nextInvoiceDate).toBe("2027-02-01");
  });

  it("refuse endDate <= startDate", async () => {
    const { fake, svc } = setup();
    await expect(svc.renewLease(9, { startDate: "2027-01-01", endDate: "2027-01-01" }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.inserts).toHaveLength(0);
  });

  it("refuse un debut avant la fin de l'ancien bail", async () => {
    const { fake, svc } = setup();
    await expect(svc.renewLease(9, { startDate: "2026-06-01", endDate: "2027-06-01" }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.inserts).toHaveLength(0);
  });

  it("refuse si un autre bail actif couvre l'unite", async () => {
    const { fake, svc } = setup({ overlap: [{ id: 12 }] });
    await expect(svc.renewLease(9, {}, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.inserts).toHaveLength(0);
  });

  it("refuse une caution inferieure au montant detenu, accepte une hausse", async () => {
    const held = [{ amount: "1000.00", rentApplied: "100.00" }];
    const a = setup({ withDepositQuery: true, deposits: held });
    await expect(a.svc.renewLease(9, { securityDeposit: 800 }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(a.fake.inserts).toHaveLength(0);
    const b = setup({ withDepositQuery: true, deposits: held });
    await b.svc.renewLease(9, { securityDeposit: 1500 }, 1);
    expect(b.fake.inserts[0].securityDeposit).toBe("1500.00");
  });

  it("refuse si arrieres", async () => {
    const { fake, svc } = setup({ dueValue: 50 });
    await expect(svc.renewLease(9, {}, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(fake.inserts).toHaveLength(0);
  });
});
