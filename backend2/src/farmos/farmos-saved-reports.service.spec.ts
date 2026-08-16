import { FarmosService } from "./farmos.service";

// Workflow : rapports custom sauvegardés (COMP-P2-017, couvert par P0-005).
// createSavedReport (config + createdBy), deleteSavedReport (soft delete, 404 si absent).

function makeService(existingRow: any = null) {
  const inserts: any[] = [];
  const updates: any[] = [];
  const db: any = {
    insert: () => ({ values: (vals: any) => { inserts.push(vals); return { $returningId: () => Promise.resolve([{ id: 1 }]) }; } }),
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(existingRow ? [existingRow] : []) }) }) }),
    update: () => ({ set: (vals: any) => ({ where: () => { updates.push(vals); return Promise.resolve(); } }) }),
  };
  const realtime: any = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
  const service = new FarmosService(db, {} as any, realtime, {} as any, {} as any, {} as any);
  return { service, inserts, updates };
}

const ORG = 1;
const USER = 9;

describe("FarmosService saved reports (P2-017)", () => {
  it("createSavedReport persiste nom, base_type, config et créateur", async () => {
    const { service, inserts } = makeService();
    await service.createSavedReport({ name: "Inventaire bovins", base_type: "inventory", config: { filters: { species: "cow" } } }, ORG, USER);
    expect(inserts[0]).toMatchObject({
      organizationId: ORG, name: "Inventaire bovins", baseType: "inventory", createdBy: USER,
    });
    expect(inserts[0].config).toEqual({ filters: { species: "cow" } });
  });

  it("createSavedReport accepte une config absente (null)", async () => {
    const { service, inserts } = makeService();
    await service.createSavedReport({ name: "R", base_type: "mortality" }, ORG, USER);
    expect(inserts[0].config).toBeNull();
  });

  it("deleteSavedReport fait un soft delete (is_active=0)", async () => {
    const { service, updates } = makeService({ id: 1 });
    await service.deleteSavedReport(1, ORG);
    expect(updates[0].isActive).toBe(0);
  });

  it("deleteSavedReport lève une erreur si le rapport n'existe pas", async () => {
    const { service } = makeService(null);
    await expect(service.deleteSavedReport(999, ORG)).rejects.toThrow();
  });
});
