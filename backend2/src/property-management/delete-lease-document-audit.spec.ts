import { PropertyManagementService } from "./property-management.service";

// deleteLeaseDocument : le contrat qui référence le document perd sa preuve => audit scan_removed.
describe("PropertyManagementService.deleteLeaseDocument - audit scan_removed", () => {
  function setup(linked: Array<{ id: number }>) {
    const inserts: any[] = [];
    const chain = (resolve: () => unknown): any =>
      new Proxy(function () {}, {
        get: (_t, prop) => (prop === "then" ? (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko) : () => chain(resolve)),
      });
    const svc = Object.create(PropertyManagementService.prototype) as any;
    svc.findLeaseDocument = jest.fn().mockResolvedValue({ id: 7, objectKey: "k" });
    svc.objectStorage = { deleteObject: jest.fn().mockResolvedValue(undefined) };
    svc.realtimeData = { publishDataUpdated: jest.fn().mockResolvedValue(undefined) };
    svc.db = {
      update: () => ({ set: () => chain(() => [{ affectedRows: 1 }]) }),
      select: () => chain(() => linked),
      insert: () => ({ values: (v: any) => { inserts.push(v); return Promise.resolve([{ insertId: 1 }]); } }),
    };
    return { svc, inserts };
  }

  it("logue scan_removed sur chaque contrat lié", async () => {
    const { svc, inserts } = setup([{ id: 3 }]);
    await svc.deleteLeaseDocument(7, 5);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ organizationId: 5, contractId: 3, event: "scan_removed", details: "Scan de preuve supprimé" });
  });

  it("aucun contrat lié : pas d'audit", async () => {
    const { svc, inserts } = setup([]);
    await svc.deleteLeaseDocument(7, 5);
    expect(inserts).toHaveLength(0);
  });
});
