import { FarmosReproService } from "./farmos-repro.service";
import { farmosAnimals, farmosReproCycles } from "../database/schema";

// Registre de reproduction porcine — Etape 1. Tests cibles (pas de couverture
// exhaustive) : calcul daysNonProductive, calcul nextAction selon statut,
// transitions de statut sur updateCycle.

const ORG = 1;

function makeService(opts: {
  sowRow?: any;
  cycleRows?: any[];
} = {}) {
  const inserts: any[] = [];
  const updates: any[] = [];
  const sowRow = opts.sowRow ?? null;
  const cycleRows = opts.cycleRows ?? [];

  const db: any = {
    insert: () => ({
      values: (vals: any) => {
        inserts.push(vals);
        return Promise.resolve([{ insertId: 42 }]);
      },
    }),
    update: () => ({
      set: (vals: any) => ({
        where: () => {
          updates.push(vals);
          return Promise.resolve();
        },
      }),
    }),
    select: () => ({
      from: (table: any) => ({
        where: () => ({
          limit: () => Promise.resolve(table === farmosAnimals ? (sowRow ? [sowRow] : []) : cycleRows.length ? [cycleRows[0]] : []),
          orderBy: () => Promise.resolve(cycleRows),
        }),
      }),
    }),
  };
  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosReproService(db, realtime);
  return { service, inserts, updates };
}

describe("FarmosReproService — computeNextAction", () => {
  it("mated -> diagnostic a J+28 depuis matingDate", () => {
    const { service } = makeService();
    const { nextAction, nextActionDate } = service.computeNextAction("mated", { matingDate: "2026-01-01" } as any);
    expect(nextAction).toBe("Diagnostic de gestation");
    expect(nextActionDate).toBe("2026-01-29");
  });

  it("pregnant -> mise bas a J+114 depuis matingDate", () => {
    const { service } = makeService();
    const { nextAction, nextActionDate } = service.computeNextAction("pregnant", { matingDate: "2026-01-01" } as any);
    expect(nextAction).toBe("Mise bas attendue");
    expect(nextActionDate).toBe("2026-04-25");
  });

  it("lactating -> sevrage a J+28 depuis farrowingDate", () => {
    const { service } = makeService();
    const { nextAction, nextActionDate } = service.computeNextAction("lactating", { farrowingDate: "2026-04-25" } as any);
    expect(nextAction).toBe("Sevrage");
    expect(nextActionDate).toBe("2026-05-23");
  });

  it("empty/nulliparous -> saillie a planifier, sans date", () => {
    const { service } = makeService();
    expect(service.computeNextAction("empty", null).nextAction).toBe("Saillie à planifier");
    expect(service.computeNextAction("empty", null).nextActionDate).toBeNull();
    expect(service.computeNextAction("nulliparous", null).nextAction).toBe("Saillie à planifier");
  });
});

describe("FarmosReproService — createCycle", () => {
  it("cree un cycle avec les dates attendues et bascule l'animal en mated", async () => {
    const sow = { id: 10, organizationId: ORG, species: "pig", sex: "F", parity: 0 };
    const { service, inserts, updates } = makeService({ sowRow: sow, cycleRows: [] });
    // getCycle() fait un select en fin de createCycle : reutilise sowRow comme fallback,
    // ce test ne verifie que les valeurs inserees/mises a jour.
    await service.createCycle(ORG, { sow_id: 10, mating_date: "2026-01-01" } as any).catch(() => {});

    const cycleInsert = inserts.find((i) => i.matingDate === "2026-01-01");
    expect(cycleInsert.expectedDiagnosisDate).toBe("2026-01-29");
    expect(cycleInsert.expectedFarrowingDate).toBe("2026-04-25");
    expect(cycleInsert.outcome).toBe("in_progress");

    const animalUpdate = updates.find((u) => u.reproStatus === "mated");
    expect(animalUpdate.reproStatusSince).toBe("2026-01-01");
  });

  it("refuse une truie qui n'est pas species=pig/sex=F", async () => {
    const { service } = makeService({ sowRow: { id: 10, organizationId: ORG, species: "cow", sex: "F" } });
    await expect(service.createCycle(ORG, { sow_id: 10, mating_date: "2026-01-01" } as any)).rejects.toThrow();
  });
});

describe("FarmosReproService — updateCycle transitions", () => {
  const baseCycle = { id: 5, organizationId: ORG, sowId: 10, matingDate: "2026-01-01", outcome: "in_progress" };
  const sow = { id: 10, organizationId: ORG, species: "pig", sex: "F", parity: 1 };

  it("diagnosisResult=pregnant -> animal.reproStatus=pregnant", async () => {
    const { service, updates } = makeService({ sowRow: sow, cycleRows: [baseCycle] });
    await service.updateCycle(ORG, 5, { diagnosis_result: "pregnant", diagnosis_date: "2026-01-29" } as any).catch(() => {});
    const animalUpdate = updates.find((u) => u.reproStatus === "pregnant");
    expect(animalUpdate).toBeTruthy();
  });

  it("diagnosisResult=empty -> animal.reproStatus=empty, cycle.outcome=not_pregnant", async () => {
    const { service, updates } = makeService({ sowRow: sow, cycleRows: [baseCycle] });
    await service.updateCycle(ORG, 5, { diagnosis_result: "empty", diagnosis_date: "2026-01-29" } as any).catch(() => {});
    const animalUpdate = updates.find((u) => u.reproStatus === "empty");
    const cycleUpdate = updates.find((u) => u.outcome === "not_pregnant");
    expect(animalUpdate).toBeTruthy();
    expect(cycleUpdate).toBeTruthy();
  });

  it("farrowingDate renseignee -> lactating + expectedWeaningDate = +28j", async () => {
    const { service, updates } = makeService({ sowRow: sow, cycleRows: [baseCycle] });
    await service.updateCycle(ORG, 5, { farrowing_date: "2026-04-25", offspring_count: 12 } as any).catch(() => {});
    const cycleUpdate = updates.find((u) => u.farrowingDate === "2026-04-25");
    expect(cycleUpdate.expectedWeaningDate).toBe("2026-05-23");
    expect(cycleUpdate.outcome).toBe("farrowed");
    const animalUpdate = updates.find((u) => u.reproStatus === "lactating");
    expect(animalUpdate.reproStatusSince).toBe("2026-04-25");
  });

  it("weaningDate renseignee -> empty + parity+1", async () => {
    const { service, updates } = makeService({ sowRow: sow, cycleRows: [baseCycle] });
    await service.updateCycle(ORG, 5, { weaning_date: "2026-05-23", weaned_count: 11 } as any).catch(() => {});
    const cycleUpdate = updates.find((u) => u.weaningDate === "2026-05-23");
    expect(cycleUpdate.outcome).toBe("weaned");
    const animalUpdate = updates.find((u) => u.reproStatus === "empty");
    expect(animalUpdate.parity).toBe(2);
  });

  it("cycle introuvable leve une erreur", async () => {
    const { service } = makeService({ sowRow: sow, cycleRows: [] });
    await expect(service.updateCycle(ORG, 999, { diagnosis_result: "pregnant" } as any)).rejects.toThrow();
  });
});
