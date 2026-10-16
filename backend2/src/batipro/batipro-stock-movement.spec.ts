import { BadRequestException } from "@nestjs/common";
import { BatiproService } from "./batipro.service";

// Sortie de stock : refus si quantite > restant du chantier.
function setup(stock: any[]) {
  const insertChain: any = { values: jest.fn().mockReturnValue({ $returningId: jest.fn().mockResolvedValue([{ id: 7 }]) }) };
  const db: any = { insert: jest.fn().mockReturnValue(insertChain) };
  const svc: any = new BatiproService(db, { publish: jest.fn() } as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  svc.getProject = jest.fn().mockResolvedValue({});
  svc.getMaterial = jest.fn().mockResolvedValue({});
  svc.getPhase = jest.fn().mockResolvedValue({});
  svc.materialsWithProjectStock = jest.fn().mockResolvedValue(stock);
  svc.publish = jest.fn().mockResolvedValue(undefined);
  svc.getStockMovement = jest.fn().mockResolvedValue({ id: 7 });
  return { svc, db };
}

describe("BatiproService.createStockMovement - controle de stock", () => {
  it("refuse une sortie superieure au restant", async () => {
    const { svc, db } = setup([{ id: 3, unit: "sac", remaining: 5 }]);
    await expect(svc.createStockMovement({ project_id: 1, material_id: 3, quantity: 6 }, 1))
      .rejects.toThrow("Stock insuffisant : 5 sac restant(s)");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("refuse un materiau jamais recu sur le chantier", async () => {
    const { svc } = setup([]);
    await expect(svc.createStockMovement({ project_id: 1, material_id: 3, quantity: 1 }, 1))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepte une sortie egale au restant", async () => {
    const { svc, db } = setup([{ id: 3, unit: "sac", remaining: 5 }]);
    await expect(svc.createStockMovement({ project_id: 1, material_id: 3, quantity: 5 }, 1)).resolves.toEqual({ id: 7 });
    expect(db.insert).toHaveBeenCalled();
  });
});
