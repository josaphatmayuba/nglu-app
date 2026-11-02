import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BatiproService } from "./batipro.service";
import { RestockMaterialDto } from "./dto/batipro.dto";

// Chaine select thenable : chaque select() consomme le prochain resultat de la file.
function selectChain(results: any[]) {
  return () => {
    const next = results.shift() ?? [];
    const chain: any = {};
    for (const m of ["from", "innerJoin", "leftJoin", "where", "groupBy", "orderBy"]) chain[m] = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockResolvedValue(next);
    chain.then = (res: any, rej: any) => Promise.resolve(next).then(res, rej);
    return chain;
  };
}

function setup(opts: { selects?: any[]; updateResult?: any; updateThrows?: boolean } = {}) {
  const selects = opts.selects ?? [];
  const inserts: any[] = [];
  const updates: any[] = [];
  const mk = () => ({
    select: jest.fn().mockImplementation(selectChain(selects)),
    insert: jest.fn().mockImplementation(() => ({
      values: jest.fn().mockImplementation((v: any) => {
        inserts.push(v);
        return { $returningId: jest.fn().mockResolvedValue([{ id: 99 }]), then: (r: any) => Promise.resolve([{}]).then(r) };
      }),
    })),
    update: jest.fn().mockImplementation(() => ({
      set: jest.fn().mockImplementation((v: any) => {
        updates.push(v);
        return {
          where: jest.fn().mockImplementation(() => {
            if (opts.updateThrows) return Promise.reject(new Error("boom"));
            return Promise.resolve(opts.updateResult ?? [{ affectedRows: 1 }]);
          }),
        };
      }),
    })),
  });
  const db: any = mk();
  db.transaction = jest.fn().mockImplementation(async (cb: any) => cb(db));
  const svc: any = new BatiproService(db, { publish: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  return { svc, db, inserts, updates };
}

const chunkHas = (sqlObj: any, value: any) => (sqlObj?.queryChunks ?? []).some((c: any) => c === value);

describe("RestockMaterialDto", () => {
  const check = async (o: any) => validate(plainToInstance(RestockMaterialDto, o));
  it("refuse 0, negatif, > 3 decimales, > max", async () => {
    expect((await check({ quantity: 0, note: "x" })).length).toBe(1);
    expect((await check({ quantity: -5, note: "x" })).length).toBe(1);
    expect((await check({ quantity: 1.2345, note: "x" })).length).toBe(1);
    expect((await check({ quantity: 1000001, note: "x" })).length).toBe(1);
  });
  it("accepte 2.5, project_id et note", async () => {
    expect(await check({ quantity: 2.5, project_id: 3, note: "x" })).toHaveLength(0);
  });
  it("refuse une note absente ou vide (emplacement obligatoire)", async () => {
    expect((await check({ quantity: 2.5 })).length).toBe(1);
    expect((await check({ quantity: 2.5, note: "  " })).length).toBe(1);
  });
});

describe("BatiproService.restockMaterial", () => {
  it("840 + 50 : increment SQL (jamais float JS), mouvement adjustment general", async () => {
    const { svc, db, inserts, updates } = setup();
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5, stock: "890.00" });
    svc.getStockMovement = jest.fn().mockResolvedValue({ id: 99 });
    const res = await svc.restockMaterial(5, { quantity: 50 }, 1, 8);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(inserts[0]).toMatchObject({ movementType: "adjustment", quantity: "50", projectId: null, documentId: null, materialId: 5, createdBy: 8 });
    expect(chunkHas(updates[0].stock, 50)).toBe(true);
    expect(res).toEqual({ material: { id: 5, stock: "890.00" }, movement: { id: 99 } });
  });
  it("2.5 transmis tel quel en SQL", async () => {
    const { svc, inserts, updates } = setup();
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5 });
    svc.getStockMovement = jest.fn().mockResolvedValue({ id: 99 });
    await svc.restockMaterial(5, { quantity: 2.5 }, 1);
    expect(inserts[0].quantity).toBe("2.5");
    expect(chunkHas(updates[0].stock, 2.5)).toBe(true);
  });
  it("chantier fourni : project_id porte par le mouvement, chantier verifie", async () => {
    const { svc, inserts } = setup();
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5 });
    svc.getProject = jest.fn().mockResolvedValue({ id: 3 });
    svc.getStockMovement = jest.fn().mockResolvedValue({ id: 99 });
    await svc.restockMaterial(5, { quantity: 1, project_id: 3 }, 1);
    expect(svc.getProject).toHaveBeenCalledWith(3, 1);
    expect(inserts[0].projectId).toBe(3);
  });
  it("materiau d'une autre org / inactif -> 404, rien d'ecrit", async () => {
    const { svc, db } = setup({ selects: [[]] });
    await expect(svc.restockMaterial(5, { quantity: 1 }, 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("chantier d'une autre org -> 404", async () => {
    const { svc, db } = setup();
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5 });
    svc.getProject = jest.fn().mockRejectedValue(new NotFoundException());
    await expect(svc.restockMaterial(5, { quantity: 1, project_id: 9 }, 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("echec de l'increment : erreur propagee dans la transaction, pas de publish", async () => {
    const { svc } = setup({ updateThrows: true });
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5 });
    await expect(svc.restockMaterial(5, { quantity: 1 }, 1)).rejects.toThrow("boom");
    expect(svc.publish).not.toHaveBeenCalled();
  });
});

const poDoc = (lines: any[], status = "confirmed") => ({
  id: 10, type: "purchase_order", status, projectId: 4, number: "BC-1", lines,
});

describe("BatiproService.receivePurchaseOrder / cancelReceipt - stock global", () => {
  it("reception : mouvement 'reception' avec project_id du BC + stock += quantite", async () => {
    const { svc, inserts, updates } = setup({ selects: [[{ id: 1, quantity: "10", receivedQuantity: "4" }]] });
    const doc = poDoc([{ id: 1, isActive: 1, materialId: 5, designation: "Ciment", quantity: "10", receivedQuantity: "0" }]);
    svc.getDocument = jest.fn().mockResolvedValue(doc);
    await svc.receivePurchaseOrder(10, { lines: [{ line_id: 1, quantity: 4 }] }, 1, 8);
    expect(inserts[0]).toMatchObject({ movementType: "reception", projectId: 4, materialId: 5, documentId: 10, quantity: "4" });
    expect(updates.some((u) => chunkHas(u.stock, 4))).toBe(true);
  });
  it("reception d'une ligne sans materialId (service) -> 400, aucune ecriture", async () => {
    const { svc, db } = setup();
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([{ id: 2, isActive: 1, materialId: null, designation: "Main d'oeuvre", quantity: "1", receivedQuantity: "0" }]));
    await expect(svc.receivePurchaseOrder(10, { lines: [{ line_id: 2, quantity: 1 }] }, 1)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("annulation : stock decremente, mouvement desactive", async () => {
    const mv = { id: 7, documentId: 10, materialId: 5, projectId: 4, quantity: "4.000", movementType: "reception" };
    const { svc, updates } = setup({ selects: [[mv], [{ remaining: "4.000" }], [{ id: 1 }], []] });
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([]));
    await svc.cancelReceipt(10, 7, 1);
    expect(updates.some((u) => u.isActive === 0)).toBe(true);
    expect(updates.some((u) => u.stock && chunkHas(u.stock, 4))).toBe(true);
  });
  it("annulation refusee si le stock a deja ete consomme sur le chantier", async () => {
    const mv = { id: 7, documentId: 10, materialId: 5, projectId: 4, quantity: "4.000", movementType: "reception" };
    const { svc, updates } = setup({ selects: [[mv], [{ remaining: "1.000" }]] });
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([]));
    await expect(svc.cancelReceipt(10, 7, 1)).rejects.toThrow("Stock déjà consommé : annulez d'abord la consommation.");
    expect(updates).toHaveLength(0);
  });
  it("annulation refusee (jamais sous 0) si le stock general est insuffisant", async () => {
    const mv = { id: 7, documentId: 10, materialId: 5, projectId: 4, quantity: "4.000", movementType: "reception" };
    const { svc } = setup({ selects: [[mv], [{ remaining: "4.000" }]], updateResult: [{ affectedRows: 0 }] });
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([]));
    await expect(svc.cancelReceipt(10, 7, 1)).rejects.toThrow("Stock général insuffisant");
  });
});

describe("BatiproService.createStockMovement - decremente le stock global", () => {
  it("consommation : mouvement + stock decremente (plancher 0) dans une transaction", async () => {
    const { svc, db, inserts, updates } = setup();
    svc.getProject = jest.fn().mockResolvedValue({});
    svc.getMaterial = jest.fn().mockResolvedValue({});
    svc.materialsWithProjectStock = jest.fn().mockResolvedValue([{ id: 5, unit: "sac", remaining: 10 }]);
    svc.getStockMovement = jest.fn().mockResolvedValue({ id: 99 });
    await svc.createStockMovement({ project_id: 4, material_id: 5, quantity: 3 }, 1);
    expect(db.transaction).toHaveBeenCalled();
    expect(inserts[0]).toMatchObject({ movementType: "consumption", quantity: "3" });
    expect(chunkHas(updates[0].stock, 3)).toBe(true);
  });
});

describe("BatiproService.updateDocument - BC recu non modifiable", () => {
  const input: any = { lines: [{ designation: "x", quantity: 1, unit_price: 1 }] };
  it.each(["received", "partially_received"])("statut %s -> 400", async (status) => {
    const { svc } = setup();
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([], status));
    await expect(svc.updateDocument(10, input, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
  it("mouvement de reception actif -> 400", async () => {
    const { svc } = setup({ selects: [[{ id: 3 }]] });
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([], "confirmed"));
    await expect(svc.updateDocument(10, input, 1)).rejects.toThrow("déjà été réceptionné");
  });
});

describe("BatiproService.confirmPurchaseOrder - already_delivered", () => {
  it("receptionne les lignes Materiau restantes", async () => {
    const { svc } = setup();
    const doc = poDoc([
      { id: 1, isActive: 1, materialId: 5, quantity: "10", receivedQuantity: "0" },
      { id: 2, isActive: 1, materialId: null, quantity: "1", receivedQuantity: "0" },
    ], "sent");
    svc.getDocument = jest.fn().mockResolvedValue(doc);
    svc.receivePurchaseOrder = jest.fn().mockResolvedValue({});
    await svc.confirmPurchaseOrder(10, { already_delivered: true }, 1, 8);
    expect(svc.receivePurchaseOrder).toHaveBeenCalledWith(10, expect.objectContaining({ lines: [{ line_id: 1, quantity: 10 }] }), 1, 8);
  });
  it("sans already_delivered : aucune reception", async () => {
    const { svc } = setup();
    svc.getDocument = jest.fn().mockResolvedValue(poDoc([{ id: 1, isActive: 1, materialId: 5, quantity: "10", receivedQuantity: "0" }], "sent"));
    svc.receivePurchaseOrder = jest.fn();
    await svc.confirmPurchaseOrder(10, {}, 1);
    expect(svc.receivePurchaseOrder).not.toHaveBeenCalled();
  });
});

describe("BatiproService materiaux - doublons et inventaire", () => {
  it("createMaterial doublon -> 409 avec existingId et unit", async () => {
    const { svc } = setup({ selects: [[{ id: 12, name: "Ciment", unit: "sac" }]] });
    try {
      await svc.createMaterial({ name: " CIMENT " }, 1);
      throw new Error("attendu 409");
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      expect(e.getResponse()).toMatchObject({ existingId: 12, unit: "sac" });
      expect(e.message).toContain("existe déjà");
    }
  });
  it("renommage en doublon -> 409", async () => {
    const { svc } = setup({ selects: [[{ id: 12, name: "Ciment", unit: "sac" }]] });
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5, stock: "0" });
    await expect(svc.updateMaterial(5, { name: "ciment " }, 1)).rejects.toBeInstanceOf(ConflictException);
  });
  it("changement de stock 840 -> 890 = mouvement 'Inventaire' +50, stock non ecrit directement", async () => {
    const { svc, inserts, updates } = setup({ selects: [[]] });
    svc.getMaterial = jest.fn().mockResolvedValue({ id: 5, stock: "840.00" });
    await svc.updateMaterial(5, { name: "Ciment", stock: 890 }, 1, 8);
    expect(inserts[0]).toMatchObject({ movementType: "adjustment", quantity: "50", note: "Inventaire", projectId: null });
    expect(updates.every((u) => typeof u.stock !== "string")).toBe(true);
    expect(updates.some((u) => chunkHas(u.stock, 50))).toBe(true);
  });
});

describe("BatiproService.materialsStockByProject", () => {
  it("2 chantiers + stock general, totaux org", async () => {
    const base = { material_id: "5", material_name: "Ciment", unit: "sac" };
    const rows = [
      { ...base, project_id: null, project_name: null, project_location: null, project_client: null, project_manager: null, received: "0.000", consumed: "0.000", adjusted: "840.000", remaining: "840.000" },
      { ...base, project_id: "1", project_name: "Villa A", project_location: "Kin", project_client: "C1", project_manager: "M1", received: "100.000", consumed: "40.000", adjusted: "0.000", remaining: "60.000" },
      { ...base, project_id: "2", project_name: "Villa B", project_location: null, project_client: null, project_manager: null, received: "20.500", consumed: "0.000", adjusted: "0.000", remaining: "20.500" },
    ];
    const { svc } = setup({ selects: [rows, [{ ...base, stock: "920.50" }]] });
    const res = await svc.materialsStockByProject(1);
    expect(res.items).toHaveLength(3);
    expect(res.items[0]).toMatchObject({ project_id: null, project_name: "Stock général", project_location: null, project_client: null, project_manager: null, remaining: "840.000" });
    expect(res.items[1]).toMatchObject({ project_id: 1, project_name: "Villa A", project_location: "Kin", project_client: "C1", project_manager: "M1", received: "100.000", consumed: "40.000", remaining: "60.000" });
    expect(res.items[2]).toMatchObject({ project_id: 2, received: "20.500", remaining: "20.500" });
    expect(res.totals).toEqual([{ material_id: 5, material_name: "Ciment", unit: "sac", stock: "920.50" }]);
  });
});
