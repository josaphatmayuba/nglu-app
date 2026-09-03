import { FarmosService } from "./farmos.service";

// Workflow critique : import CSV de pesées (COMP-P2-014, couvert par P0-005).
// - résolution de l'animal par external_id (insensible casse) ou id interne
// - validation ligne par ligne (animal trouvé, date, poids > 0)
// - dryRun = aucune écriture
// - MAJ du poids courant avec la pesée la plus récente

// Animaux actifs simulés en base pour l'org.
function makeService(animals: Array<{ id: number; externalId: string | null }>) {
  const inserts: any[] = [];
  const updates: any[] = [];
  const db: any = {
    select: () => ({ from: () => ({ where: () => Promise.resolve(animals) }) }),
    insert: () => ({ values: (vals: any) => { inserts.push(vals); return Promise.resolve([{ insertId: inserts.length }]); } }),
    update: () => ({ set: (vals: any) => ({ where: () => { updates.push(vals); return Promise.resolve(); } }) }),
  };
  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosService(db, {} as any, realtime, {} as any, {} as any, {} as any);
  return { service, inserts, updates };
}

const ORG = 1;
const dto = (rows: any[], dryRun = false) => ({ rows, dryRun });

describe("FarmosService.importWeighings (P2-014)", () => {
  it("résout l'animal par external_id (insensible à la casse) et insère", async () => {
    const { service, inserts } = makeService([{ id: 5, externalId: "C-1" }]);
    const res: any = await service.importWeighings(dto([{ external_id: "c-1", weigh_date: "2026-06-10", weight: 300 }]), ORG);
    expect(res.inserted).toBe(1);
    expect(inserts[0]).toMatchObject({ animalId: 5, weight: "300" });
  });

  it("résout par id interne si fourni", async () => {
    const { service, inserts } = makeService([{ id: 7, externalId: null }]);
    const res: any = await service.importWeighings(dto([{ animal_id: 7, weigh_date: "2026-06-10", weight: 50 }]), ORG);
    expect(res.inserted).toBe(1);
    expect(inserts[0].animalId).toBe(7);
  });

  it("erreur si l'animal est introuvable", async () => {
    const { service, inserts } = makeService([{ id: 5, externalId: "C-1" }]);
    const res: any = await service.importWeighings(dto([{ external_id: "INCONNU", weigh_date: "2026-06-10", weight: 300 }]), ORG);
    expect(res.inserted).toBe(0);
    expect(res.errors[0].field).toBe("animal");
    expect(inserts).toHaveLength(0);
  });

  it("erreur si poids invalide (<= 0)", async () => {
    const { service } = makeService([{ id: 5, externalId: "C-1" }]);
    const res: any = await service.importWeighings(dto([{ external_id: "C-1", weigh_date: "2026-06-10", weight: 0 }]), ORG);
    expect(res.inserted).toBe(0);
    expect(res.errors[0].field).toBe("weight");
  });

  it("dryRun n'écrit rien mais compte les lignes valides", async () => {
    const { service, inserts, updates } = makeService([{ id: 5, externalId: "C-1" }]);
    const res: any = await service.importWeighings(dto([{ external_id: "C-1", weigh_date: "2026-06-10", weight: 300 }], true), ORG);
    expect(res.dryRun).toBe(true);
    expect(res.inserted).toBe(1);
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("met à jour le poids courant avec la pesée la plus récente", async () => {
    const { service, updates } = makeService([{ id: 5, externalId: "C-1" }]);
    await service.importWeighings(dto([
      { external_id: "C-1", weigh_date: "2026-06-01", weight: 280 },
      { external_id: "C-1", weigh_date: "2026-06-15", weight: 310 },
    ]), ORG);
    // Une seule MAJ du poids courant, avec la valeur de la pesée la plus récente.
    expect(updates).toHaveLength(1);
    expect(updates[0].weight).toBe("310");
  });
});
