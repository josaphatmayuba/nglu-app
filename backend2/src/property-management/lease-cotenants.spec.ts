import { ContractsService } from "./contracts.service";
import { PropertyManagementService } from "./property-management.service";

// 1 a N locataires par bail : rendu du contrat (Preneur/Preneurs, un bloc de
// signature par personne, majuscules, echappement HTML) et synchronisation des
// colocataires (dedoublonnage, exclusion du principal, soft delete, reactivation).

function makeContracts() {
  return Object.create(ContractsService.prototype) as any;
}

function lease(coTenants: any[] = [], tenantName = "Jean Mukendi"): any {
  return {
    leaseId: 1, tenantId: 7, startDate: "2026-01-01", endDate: "2026-12-31",
    rentAmount: "100", securityDeposit: "200", tenantName,
    tenantAddress: "1 av. Test", tenantPhone: "+243810000000", tenantEmail: "a@b.cd",
    tenantIdDocumentType: "Passeport", tenantIdNumber: "P123",
    ownerId: null, coTenants,
  };
}
const company: any = { companyName: "ACME", landlordName: "paul bailleur", address: "x", phone: "1", email: "e@e.e", landlordSignature: null, landlordPhone: "1" };
const co = (id: number, name: string) => ({ id, name, address: "Rue " + id, phone: "+2438" + id, email: `c${id}@x.cd`, idDocumentType: null, idNumber: null });
const count = (s: string, sub: string) => s.split(sub).length - 1;

describe("ContractsService.generateContent - co-locataires", () => {
  it("1 locataire : libelle singulier, 1 signature, noms en majuscules", () => {
    const html = makeContracts().generateContent(lease(), company);
    expect(html).toContain("Le Preneur (Locataire)");
    expect(html).not.toContain("Les Preneurs");
    expect(count(html, "Le Preneur (Locataire)")).toBe(2); // bloc parties + signature
    expect(html).toContain("JEAN MUKENDI");
    expect(html).toContain("PAUL BAILLEUR");
    expect(html).not.toContain("Jean Mukendi");
  });

  it("2 locataires : Les Preneurs + une signature chacun", () => {
    const html = makeContracts().generateContent(lease([co(8, "Marie Kasa")]), company);
    expect(html).toContain("Les Preneurs (Locataires)");
    expect(count(html, "Le Preneur (Locataire)")).toBe(2); // 2 signatures
    expect(html).toContain("JEAN MUKENDI");
    expect(html).toContain("MARIE KASA");
  });

  it("4 locataires : 4 blocs de signature et 4 identites", () => {
    const html = makeContracts().generateContent(
      lease([co(8, "A One"), co(9, "B Two"), co(10, "C Three")]), company);
    expect(html).toContain("Les Preneurs (Locataires)");
    expect(count(html, "Le Preneur (Locataire)")).toBe(4);
    for (const n of ["JEAN MUKENDI", "A ONE", "B TWO", "C THREE"]) expect(count(html, n)).toBe(2);
  });

  it("echappe le HTML des noms de co-locataires", () => {
    const html = makeContracts().generateContent(lease([co(8, "<script>x</script>")]), company);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;SCRIPT&gt;X&lt;/SCRIPT&gt;");
  });

  it("coTenants absent (ancien LeaseDetails) : se comporte comme 1 locataire", () => {
    const l = lease(); delete l.coTenants;
    const html = makeContracts().generateContent(l, company);
    expect(html).toContain("Le Preneur (Locataire)");
  });
});

describe("PropertyManagementService.syncLeaseCoTenants", () => {
  function setup(existing: any[]) {
    const updates: any[] = [];
    const inserts: any[] = [];
    const db: any = {
      select: () => ({ from: () => ({ where: async () => existing }) }),
      update: () => ({ set: (vals: any) => ({ where: async () => { updates.push(vals); } }) }),
      insert: () => ({ values: async (v: any) => { inserts.push(v); } }),
    };
    const svc = Object.create(PropertyManagementService.prototype) as any;
    svc.db = db;
    svc.findTenant = jest.fn().mockResolvedValue({});
    return { svc, updates, inserts };
  }

  it("dedoublonne, exclut le principal, insere avec positions", async () => {
    const { svc, inserts, updates } = setup([]);
    await svc.syncLeaseCoTenants(1, 7, [8, 8, 7, 9, 0], 1);
    expect(svc.findTenant).toHaveBeenCalledTimes(2);
    expect(inserts.map((i) => [i.customerId, i.position])).toEqual([[8, 1], [9, 2]]);
    expect(updates).toHaveLength(0);
  });

  it("soft delete des retires (isActive=0, jamais de DELETE)", async () => {
    const { svc, updates, inserts } = setup([{ id: 1, customerId: 8, isActive: 1 }, { id: 2, customerId: 9, isActive: 1 }]);
    expect(svc.db.delete).toBeUndefined();
    await svc.syncLeaseCoTenants(1, 7, [9], 1);
    expect(updates.find((u) => u.isActive === 0)).toBeTruthy();
    expect(updates.filter((u) => u.isActive === 0)).toHaveLength(1);
    expect(updates.find((u) => u.isActive === 1 && u.position === 1)).toBeTruthy();
    expect(inserts).toHaveLength(0);
  });

  it("reactive une ligne inactive au lieu de la reinserer", async () => {
    const { svc, updates, inserts } = setup([{ id: 5, customerId: 8, isActive: 0 }]);
    await svc.syncLeaseCoTenants(1, 7, [8], 1);
    expect(inserts).toHaveLength(0);
    expect(updates[0]).toMatchObject({ isActive: 1, position: 1 });
  });

  it("un principal passe en co-locataire est desactive", async () => {
    const { svc, updates } = setup([{ id: 5, customerId: 7, isActive: 1 }]);
    await svc.syncLeaseCoTenants(1, 7, [], 1);
    expect(updates[0]).toMatchObject({ isActive: 0 });
  });
});
