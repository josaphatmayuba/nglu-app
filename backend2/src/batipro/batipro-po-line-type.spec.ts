import { BatiproService } from "./batipro.service";
import { buildMaterialCleanupPreview, duplicateKey, suggestCleanName } from "./material-cleanup.util";

function setup() {
  const db: any = { select: jest.fn().mockReturnValue({ from: () => ({ where: () => Promise.resolve([{ id: 1, name: "Ciment" }]) }) }) };
  const svc: any = new BatiproService(db, { publish: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  svc.createMaterial = jest.fn().mockResolvedValue({ id: 99 });
  return svc;
}

describe("BC : un service ne cree pas de materiau", () => {
  it("ligne service => aucun createMaterial, material_id retire", async () => {
    const svc = setup();
    const lines: any[] = [
      { designation: "Honoraires ingenieur", line_type: "service" },
      { designation: "Transport", material_id: 5, line_type: "service" },
      { designation: "Manutention ciment" },
    ];
    await svc.resolveMaterialIdsForPurchaseOrder(lines, 1);
    expect(svc.createMaterial).not.toHaveBeenCalled();
    expect(lines.every((l) => l.line_type === "service" && !l.material_id)).toBe(true);
  });

  it("ligne materiau => rattache l existant ou cree", async () => {
    const svc = setup();
    const lines: any[] = [{ designation: "ciment", line_type: "material" }, { designation: "Briques", line_type: "material" }];
    await svc.resolveMaterialIdsForPurchaseOrder(lines, 1);
    expect(lines[0].material_id).toBe(1);
    expect(lines[1].material_id).toBe(99);
    expect(svc.createMaterial).toHaveBeenCalledTimes(1);
  });
});

describe("dry-run nettoyage materiaux", () => {
  const m = (id: number, name: string, extra: any = {}) => ({ id, name, unit: "unite", stock: 0, minStock: 0, reserved: 0, movementCount: 0, lineCount: 1, ...extra });
  it("classe services, doublons et noms sales", () => {
    const r = buildMaterialCleanupPreview([
      m(1, "Ciment", { movementCount: 3 }), m(2, "Ciment (sac)"), m(3, "Fer a beton"),
      m(4, "Avance honoraires ingenieur"), m(5, "Manutention sable"), m(6, "Facture M.B SARL"), m(7, "Transport et repas"),
      m(8, "Gravier 12/03/2026"),
    ]);
    expect(r.toDeactivate.map((x) => x.id).sort()).toEqual([4, 5, 6, 7]);
    expect(r.duplicatesToMerge).toHaveLength(1);
    expect(r.duplicatesToMerge[0].keep.id).toBe(1);
    expect(r.duplicatesToMerge[0].merge.map((x) => x.id)).toEqual([2]);
    expect(r.namesToClean).toEqual([{ id: 8, name: "Gravier 12/03/2026", suggested: "Gravier" }]);
  });
  it("utilitaires", () => {
    expect(duplicateKey("Ciment (sac)")).toBe(duplicateKey("ciment"));
    expect(suggestCleanName("Sable")).toBeNull();
  });
});
