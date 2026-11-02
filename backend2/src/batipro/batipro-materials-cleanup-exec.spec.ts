import { BadRequestException } from "@nestjs/common";
import { BatiproService } from "./batipro.service";

// tx factice : enregistre les UPDATE (table + valeurs) ; select -> file de reponses.
function setup(selectQueue: any[][]) {
  const updates: Array<{ table: any; values: any }> = [];
  const tx: any = {
    select: jest.fn(() => {
      const rows = selectQueue.shift() ?? [];
      const chain: any = { from: () => chain, where: () => chain, limit: () => Promise.resolve(rows), then: (r: any) => Promise.resolve(rows).then(r) };
      return chain;
    }),
    update: jest.fn((table: any) => ({
      set: (values: any) => ({ where: () => { updates.push({ table, values }); return Promise.resolve([{ affectedRows: 2 }]); } }),
    })),
  };
  const db: any = { transaction: jest.fn(async (fn: any) => fn(tx)) };
  const svc: any = new BatiproService(db, { publish: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  svc.materialsCleanupPreview = jest.fn().mockResolvedValue({
    toDeactivate: [{ id: 4, name: "Transport" }],
    duplicatesToMerge: [{ keep: { id: 1 }, merge: [{ id: 2 }] }],
  });
  return { svc, db, updates };
}

describe("materialsCleanupExecute", () => {
  it("refuse sans confirm:true, sans rien ecrire", async () => {
    const { svc, db } = setup([]);
    await expect(svc.materialsCleanupExecute({ confirm: false, ids: [4] }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("refuse un id hors dry-run", async () => {
    const { svc, db } = setup([]);
    await expect(svc.materialsCleanupExecute({ confirm: true, ids: [99] }, 1)).rejects.toThrow("absent de la liste");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("desactive (is_active=0, jamais delete) et convertit les lignes en service sans toucher aux montants", async () => {
    // select 1 : mouvements du materiau 4 -> aucun ; select 2 : nom du materiau
    const { svc, updates } = setup([[], [{ name: "Transport" }]]);
    const r = await svc.materialsCleanupExecute({ confirm: true, ids: [4] }, 1, 7);
    expect(r.deactivated).toEqual([4]);
    expect(r.linesConvertedToService).toBe(2);
    const lineUpdate = updates.find((u) => "lineType" in u.values)!;
    expect(lineUpdate.values).toMatchObject({ materialId: null, lineType: "service", serviceCategory: "transport" });
    for (const u of updates) for (const k of ["lineHt", "lineTtc", "unitPrice", "quantity"]) expect(u.values).not.toHaveProperty(k);
    expect(updates.some((u) => u.values.isActive === 0)).toBe(true);
  });

  it("garde le lien des lignes si le materiau a des mouvements", async () => {
    const { svc, updates } = setup([[{ id: 5 }]]);
    await svc.materialsCleanupExecute({ confirm: true, ids: [4] }, 1);
    expect(updates.some((u) => "lineType" in u.values)).toBe(false);
    expect(updates.some((u) => u.values.isActive === 0)).toBe(true);
  });

  it("fusion : reporte mouvements + lignes, cumule le stock, desactive le doublon", async () => {
    const { svc, updates } = setup([[{ id: 2, name: "Ciment (sac)", stock: "10.50", reserved: "1.00", isActive: 1 }]]);
    const r = await svc.materialsCleanupExecute({ confirm: true, merges: [{ keep_id: 1, merge_ids: [2] }] }, 1);
    expect(r.merged).toEqual([{ keepId: 1, mergedIds: [2] }]);
    const kinds = updates.map((u) => Object.keys(u.values).sort().join(","));
    expect(kinds).toContain("materialId,note"); // mouvements
    expect(kinds).toContain("materialId"); // lignes
    expect(kinds).toContain("reserved,stock"); // cumul sur le conserve
    const off = updates.find((u) => u.values.isActive === 0)!;
    expect(off.values).toMatchObject({ isActive: 0, stock: "0", reserved: "0" });
  });

  it("refuse une fusion non conforme au dry-run", async () => {
    const { svc } = setup([]);
    await expect(svc.materialsCleanupExecute({ confirm: true, merges: [{ keep_id: 1, merge_ids: [3] }] }, 1)).rejects.toThrow("Fusion non conforme");
  });
});
