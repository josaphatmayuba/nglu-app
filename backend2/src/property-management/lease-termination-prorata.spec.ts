import { PropertyManagementService } from "./property-management.service";
import {
  computeLeaseTotalDue,
  computeTerminationCharge,
  anchoredExitPeriod,
  exitMonthProration,
  planTerminationProration,
} from "./lease-proration";

// Resiliation au prorata : regle = montant x jours occupes (debut de periode -> sortie incluse) / jours
// de la periode, arrondi au centime (jamais a l'unite). fullPeriod=true = comportement historique.

const row = (over: any = {}) => ({
  id: 1, periodStart: "2026-06-01", periodEnd: "2026-06-30", paymentDate: "2026-06-01", amount: 300, taxAmount: null, ...over,
});

describe("planTerminationProration (pur)", () => {
  it("milieu de mois : 300 x 12/30 = 120.00", () => {
    const p = planTerminationProration([row()], "2026-06-12", "monthly", 2)!;
    expect(p).toMatchObject({ rowId: 1, occupiedDays: 12, periodDays: 30, initialAmount: 300, amount: 120 });
  });

  it("jour du debut de periode : 1 jour facture, pas le mois entier", () => {
    const p = planTerminationProration([row()], "2026-06-01", "monthly", 2)!;
    expect(p).toMatchObject({ occupiedDays: 1, periodDays: 30, amount: 10 });
  });

  it("dernier jour de la periode : rien a ajuster", () => {
    expect(planTerminationProration([row()], "2026-06-30", "monthly", 2)).toBeNull();
  });

  it("mois de 31 et 28 jours, centimes jamais arrondis a l'unite", () => {
    const jul = planTerminationProration([row({ periodStart: "2026-07-01", periodEnd: "2026-07-31", amount: 100 })], "2026-07-10", "monthly", 2)!;
    expect(jul).toMatchObject({ occupiedDays: 10, periodDays: 31, amount: 32.26 });
    const feb = planTerminationProration([row({ periodStart: "2026-02-01", periodEnd: "2026-02-28", amount: 280 })], "2026-02-14", "monthly", 2)!;
    expect(feb).toMatchObject({ occupiedDays: 14, periodDays: 28, amount: 140 });
  });

  it("taxe par bail proratisee comme le montant", () => {
    const p = planTerminationProration([row({ amount: 348, taxAmount: 48 })], "2026-06-15", "monthly", 2)!;
    expect(p.amount).toBe(174);
    expect(p.tax).toBe(24);
  });

  it("premiere periode partielle : prorata sur les jours de la ligne", () => {
    const p = planTerminationProration([row({ periodStart: "2026-06-15", periodEnd: "2026-06-30", amount: 160 })], "2026-06-22", "monthly", 2)!;
    expect(p).toMatchObject({ occupiedDays: 8, periodDays: 16, amount: 80 });
  });

  it("choisit la ligne qui contient la date, ignore les suivantes", () => {
    const rows = [
      row({ id: 1 }),
      row({ id: 2, periodStart: "2026-07-01", periodEnd: "2026-07-31", paymentDate: "2026-07-01" }),
    ];
    expect(planTerminationProration(rows, "2026-06-12", "monthly", 2)!.rowId).toBe(1);
    expect(planTerminationProration([rows[1]], "2026-06-12", "monthly", 2)).toBeNull();
  });
});

describe("mois de sortie : total du et charge (coherence anciens debiteurs / apercu caution, bug #80)", () => {
  const lease = { startDate: "2025-01-01", rentAmount: 300, status: "ended", terminationDate: "2025-09-16", endDate: "2025-09-16" };
  const now = new Date("2026-11-01T00:00:00Z");

  it("periode complete : 9 mois x 300 ; prorata : 8 x 300 + 300 x 16/30", () => {
    expect(computeLeaseTotalDue({ ...lease, terminationFullPeriod: 1 }, 0, 2, now)).toBe(2700);
    expect(computeLeaseTotalDue({ ...lease, terminationFullPeriod: 0 }, 0, 2, now)).toBe(2560);
    expect(computeLeaseTotalDue(lease, 0, 2, now)).toBe(2700); // colonne absente = historique
  });

  it("charge a la sortie = meme valeur que le total du sans versement", () => {
    expect(computeTerminationCharge({ ...lease, terminationFullPeriod: 0 }, "2025-09-16", 2)).toBe(2560);
    expect(computeTerminationCharge({ ...lease, terminationFullPeriod: 1 }, "2025-09-16", 2)).toBe(2700);
  });

  it("sortie le dernier jour du mois : pas de rabais", () => {
    expect(exitMonthProration({ startDate: "2025-01-01", terminationFullPeriod: 0 }, "2025-09-30", 300, 2)).toBeNull();
  });
});

// ─── executeTermination avec base factice ─────────────────────────────────────

function makeFakeDb(selectQueue: any[][]) {
  const f: any = { sets: [] as any[], selectQueue };
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
    insert: () => ({ values: () => Promise.resolve([{ insertId: 5 }]) }),
    update: () => ({ set: (v: any) => { f.sets.push(v); return chain(() => [{ affectedRows: 1 }]); } }),
  };
  api.transaction = async (cb: any) => cb(api);
  f.db = api;
  return f;
}

function makeService(fake: any) {
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn() };
  svc.publishLeaseUpdate = jest.fn().mockResolvedValue(undefined);
  svc.findLease = jest.fn().mockResolvedValue({ id: 9 });
  svc.currencyDecimals = jest.fn().mockResolvedValue(2);
  svc.leaseAllocations = { rebuildLeaseAllocations: jest.fn().mockResolvedValue(undefined) };
  return svc;
}

const LEASE = {
  id: 9, organizationId: 1, propertyId: 4, unitId: 7, status: "active", startDate: "2026-05-01", endDate: null,
  billingCycle: "monthly", rentAmount: "300.00", currencyId: 1,
};
const pending = { id: 21, status: "pending", periodStart: "2026-06-01", periodEnd: "2026-06-30", paymentDate: "2026-06-01", amount: "300.00", taxAmount: null, amountPaid: "0" };

describe("executeTermination - prorata", () => {
  it("par defaut (prorata) : echeance de la periode reduite a 120.00 avec trace dans les notes", async () => {
    const fake = makeFakeDb([[pending], [], [], [{ amount: "300.00" }]]);
    const svc = makeService(fake);
    const res = await svc.executeTermination({ lease: LEASE, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: false });
    const upd = fake.sets.find((s: any) => s.amount !== undefined);
    expect(upd.amount).toBe("120.00");
    expect(res.proration).toMatchObject({ occupiedDays: 12, periodDays: 30, initialAmount: 300, amount: 120, reduction: 180 });
    expect(fake.sets.find((s: any) => s.status === "ended")).toMatchObject({ terminationFullPeriod: 0 });
    // non flagge : verse 300 (paid) - charge (2 mois: 600 - 180 = 420) => aucun trop-percu
    expect(res.overpaid).toBe(0);
  });

  it("fullPeriod=true : aucun ajustement (comportement historique)", async () => {
    const fake = makeFakeDb([[], []]);
    const svc = makeService(fake);
    const res = await svc.executeTermination({ lease: LEASE, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: true });
    expect(fake.sets.some((s: any) => s.amount !== undefined)).toBe(false);
    expect(fake.sets.find((s: any) => s.status === "ended")).toMatchObject({ terminationFullPeriod: 1 });
    expect(res.proration).toBeNull();
    expect(res.overpaid).toBe(0);
  });

  it("non flagge, deja paye en entier : trop-percu rapporte (credit locataire)", async () => {
    const fake = makeFakeDb([[], [], [], [{ amount: "300.00" }, { amount: "300.00" }]]);
    const svc = makeService(fake);
    const res = await svc.executeTermination({ lease: LEASE, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: false });
    expect(res.overpaid).toBe(180);
  });

  it("bail flagge, echeance soldee : montant reduit, registre reconstruit, trop-percu = part imputee en trop", async () => {
    const settled = { ...pending, status: "settled", amountPaid: "300.00" };
    const fake = makeFakeDb([[], [settled], [], []]);
    const svc = makeService(fake);
    const res = await svc.executeTermination({
      lease: { ...LEASE, allocationLedgerAt: new Date() }, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: false,
    });
    expect(fake.sets.find((s: any) => s.amount === "120.00")).toBeDefined();
    expect(svc.leaseAllocations.rebuildLeaseAllocations).toHaveBeenCalled();
    expect(res.overpaid).toBe(180);
  });
});

describe("periode de sortie ancree sur le bail (debut le 15, trimestriel) - 4 calculs coherents", () => {
  const monthly15 = { startDate: "2025-01-15", billingCycle: "monthly", rentAmount: 300, status: "ended", terminationDate: "2025-09-10", endDate: "2025-09-10", terminationFullPeriod: 0 };
  const quarterly = { startDate: "2025-01-01", billingCycle: "quarterly", rentAmount: 900, status: "ended", terminationDate: "2025-05-10", endDate: "2025-05-10", terminationFullPeriod: 0 };
  const now = new Date("2026-11-01T00:00:00Z");

  it("debut le 15 : periode 15/08-14/09 (31 j), 27 jours occupes, 8 periodes", () => {
    expect(anchoredExitPeriod("2025-01-15", "monthly", "2025-09-10")).toMatchObject({ k: 7, periodStart: "2025-08-15", periodEnd: "2025-09-14", periodDays: 31, occupiedDays: 27 });
    // 8 x 300 - (300 - 261.29) = 2361.29
    expect(computeTerminationCharge(monthly15, "2025-09-10", 2)).toBe(2361.29);
    expect(computeLeaseTotalDue(monthly15, 0, 2, now)).toBe(2361.29);
  });

  it("trimestriel : periode 01/04-30/06 (91 j), 40 jours occupes", () => {
    expect(anchoredExitPeriod("2025-01-01", "quarterly", "2025-05-10")).toMatchObject({ k: 1, periodStart: "2025-04-01", periodEnd: "2025-06-30", periodDays: 91, occupiedDays: 40 });
    // 2 x 900 - (900 - 395.60) = 1295.60
    expect(computeTerminationCharge(quarterly, "2025-05-10", 2)).toBe(1295.6);
    expect(computeLeaseTotalDue(quarterly, 0, 2, now)).toBe(1295.6);
  });

  it("noticeDueLines (apercu caution) = meme total que le total du, sans versement", async () => {
    for (const lease of [monthly15, quarterly]) {
      const fake = makeFakeDb([[], []]);
      const svc = makeService(fake);
      const { lines } = await svc.noticeDueLines({ ...lease, id: 9, currencyId: 1 }, 9, 1);
      const sum = Math.round(lines.reduce((s: number, l: any) => s + l.amount, 0) * 100) / 100;
      expect(sum).toBe(computeLeaseTotalDue(lease, 0, 2, now));
    }
  });

  it("noticeDueLines : les lignes overdue ne comptent pas comme versees", async () => {
    const fake = makeFakeDb([[
      { amount: "300.00", status: "overdue", rowKind: null },
      { amount: "300.00", status: "paid", rowKind: null },
      { amount: "300.00", status: "paid", rowKind: "due" },
    ], []]);
    const svc = makeService(fake);
    const { lines } = await svc.noticeDueLines({ ...monthly15, id: 9, currencyId: 1 }, 9, 1);
    const remaining = Math.round(lines.reduce((s: number, l: any) => s + l.remaining, 0) * 100) / 100;
    expect(remaining).toBe(2061.29); // 2361.29 - 300 (un seul vrai versement)
  });
});

describe("bail au prorata par conception (rentProrationEnabled)", () => {
  it("fullPeriod=true demande : ignore, prorata force, aucun trop-percu fantome", async () => {
    const fake = makeFakeDb([[], [], [], []]);
    const svc = makeService(fake);
    const res = await svc.executeTermination({
      lease: { ...LEASE, rentProrationEnabled: 1 }, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: true,
    });
    expect(res.fullPeriod).toBe(false);
    expect(fake.sets.find((s: any) => s.status === "ended")).toMatchObject({ terminationFullPeriod: 0 });
    expect(res.overpaid).toBe(0);
  });

  it("devise a 0 decimale : prorata et notes restent a 2 decimales", async () => {
    const fake = makeFakeDb([[pending], [], [], []]);
    const svc = makeService(fake);
    svc.currencyDecimals = jest.fn().mockResolvedValue(0);
    await svc.executeTermination({ lease: LEASE, day: "2026-06-12", reason: "Depart", orgId: 1, notifyTenant: false, fullPeriod: false });
    expect(fake.sets.find((s: any) => s.amount !== undefined).amount).toBe("120.00");
  });
});
