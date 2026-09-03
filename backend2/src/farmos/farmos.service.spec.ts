import { FarmosService } from "./farmos.service";
import type { ImportAnimalsDto } from "./dto/farmos.dto";

// Workflows critiques FarmOS (COMP-P0-005).
// On teste la logique metier de importAnimals avec une DB Drizzle mockee :
//  - validation de l'espece (requise + valide),
//  - detection des doublons par external_id (dans le fichier ET en base),
//  - mode dryRun (aucune ecriture).

type ExistingRow = { externalId: string | null };

// Construit un mock minimal du builder Drizzle utilise par importAnimals.
// select().from().where() -> resout vers les external_id existants.
// insert().values() -> enregistre l'appel dans `inserted`.
function makeDbMock(existing: ExistingRow[]) {
  const inserted: any[] = [];
  const db: any = {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(existing),
      }),
    }),
    insert: () => ({
      values: (vals: any) => {
        inserted.push(vals);
        return Promise.resolve([{ insertId: inserted.length }]);
      },
    }),
  };
  return { db, inserted };
}

function makeService(existing: ExistingRow[]) {
  const { db, inserted } = makeDbMock(existing);
  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosService(db, {} as any, realtime, {} as any, {} as any, {} as any);
  return { service, inserted };
}

const ORG = 1;
const dto = (rows: any[], dryRun = false): ImportAnimalsDto => ({ rows, dryRun } as ImportAnimalsDto);

describe("FarmosService.importAnimals (P0-005)", () => {
  it("rejette une ligne sans espece", async () => {
    const { service, inserted } = makeService([]);
    const res: any = await service.importAnimals(dto([{ name: "Sans espece" }]), ORG);
    expect(res.inserted).toBe(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].field).toBe("species");
    expect(inserted).toHaveLength(0);
  });

  it("rejette une espece invalide", async () => {
    const { service } = makeService([]);
    const res: any = await service.importAnimals(dto([{ species: "dragon" }]), ORG);
    expect(res.inserted).toBe(0);
    expect(res.errors[0].field).toBe("species");
  });

  it("insere une ligne valide", async () => {
    const { service, inserted } = makeService([]);
    const res: any = await service.importAnimals(dto([{ species: "cow", external_id: "C-1", name: "Marguerite" }]), ORG);
    expect(res.inserted).toBe(1);
    expect(res.errors).toHaveLength(0);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ species: "cow", externalId: "C-1", organizationId: ORG });
  });

  it("ignore un doublon deja present en base (par external_id, insensible a la casse)", async () => {
    const { service, inserted } = makeService([{ externalId: "C-1" }]);
    const res: any = await service.importAnimals(dto([{ species: "cow", external_id: "c-1" }]), ORG);
    expect(res.inserted).toBe(0);
    expect(res.duplicates).toBe(1);
    expect(inserted).toHaveLength(0);
  });

  it("ignore les doublons internes au fichier", async () => {
    const { service, inserted } = makeService([]);
    const res: any = await service.importAnimals(dto([
      { species: "pig", external_id: "P-9" },
      { species: "pig", external_id: "P-9" },
    ]), ORG);
    expect(res.inserted).toBe(1);
    expect(res.duplicates).toBe(1);
    expect(inserted).toHaveLength(1);
  });

  it("dryRun n'ecrit rien mais compte les importables et doublons", async () => {
    const { service, inserted } = makeService([{ externalId: "C-1" }]);
    const res: any = await service.importAnimals(dto([
      { species: "cow", external_id: "C-2" },
      { species: "cow", external_id: "C-1" }, // doublon base
      { name: "no species" },                  // erreur
    ], true), ORG);
    expect(res.dryRun).toBe(true);
    expect(res.inserted).toBe(1);
    expect(res.duplicates).toBe(1);
    expect(res.errors).toHaveLength(1);
    expect(inserted).toHaveLength(0); // aucune ecriture en dryRun
  });
});
