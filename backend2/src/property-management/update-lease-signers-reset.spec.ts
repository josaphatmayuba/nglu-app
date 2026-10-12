import { PropertyManagementController } from "./property-management.controller";

describe("PropertyManagementController.updateLease - reset des signataires", () => {
  const build = (before: number[], after: number[]) => {
    const pm: any = {
      leaseTenantIds: jest.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after),
      updateLease: jest.fn().mockResolvedValue({ ok: true }),
    };
    const contracts: any = { resetSignersForLease: jest.fn().mockResolvedValue(undefined) };
    const ctrl = new (PropertyManagementController as any)(pm, contracts, {}, {}, {}, {}, {});
    return { ctrl, pm, contracts };
  };
  const scope: any = {};

  it("sauvegarde sans champ de parties : pas de lecture ni de reset", async () => {
    const { ctrl, pm, contracts } = build([1, 2], [1, 2]);
    const r = await ctrl.updateLease(5, { notes: "x" }, 1, scope);
    expect(r).toEqual({ ok: true });
    expect(pm.leaseTenantIds).not.toHaveBeenCalled();
    expect(contracts.resetSignersForLease).not.toHaveBeenCalled();
  });

  it("coTenantIds renvoyes identiques : pas de reset", async () => {
    const { ctrl, contracts } = build([1, 2], [1, 2]);
    await ctrl.updateLease(5, { coTenantIds: [2] }, 1, scope);
    expect(contracts.resetSignersForLease).not.toHaveBeenCalled();
  });

  it("parties modifiees : reset une fois", async () => {
    const { ctrl, contracts } = build([1, 2], [1, 2, 3]);
    await ctrl.updateLease(5, { coTenantIds: [2, 3] }, 1, scope);
    expect(contracts.resetSignersForLease).toHaveBeenCalledTimes(1);
    expect(contracts.resetSignersForLease).toHaveBeenCalledWith(5, 1);
  });
});
