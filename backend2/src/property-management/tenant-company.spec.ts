import { ConflictException, NotFoundException } from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ContractsService } from "./contracts.service";
import { CreateTenantDto } from "./dto/property-management.dto";
import { PropertyManagementService } from "./property-management.service";

jest.setTimeout(60000); // 1er appel froid (bcrypt + imports) lent sur disque OneDrive

// Locataire entreprise : creation sans champs personne, update partiel base sur
// le type existant, 409 au changement de type avec bail actif, isolation org
// des dossiers d'inscription, contrat avec mentions societe.

function chain(resolve: () => unknown): any {
  const p: any = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
      return () => p;
    },
  });
  return p;
}

function makeService(selectQueue: any[][] = []) {
  const inserts: Array<{ values: any }> = [];
  const sets: any[] = [];
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const tx = {
    insert: () => ({
      values: (v: any) => {
        inserts.push({ values: v });
        return Promise.resolve([{ insertId: 55 }]);
      },
    }),
  };
  const db: any = {
    select: () => chain(() => selectQueue.shift() ?? []),
    update: () => ({
      set: (v: any) => {
        sets.push(v);
        return chain(() => [{ affectedRows: 1 }]);
      },
    }),
    insert: () => ({
      values: (v: any) => {
        inserts.push({ values: v });
        return Promise.resolve([{ insertId: 77 }]);
      },
    }),
    transaction: async (fn: any) => fn(tx),
  };
  const svc = Object.create(PropertyManagementService.prototype) as any;
  svc.db = db;
  svc.logger = { log: jest.fn(), warn: jest.fn() };
  svc.audit = audit;
  svc.getTenantRole = jest.fn().mockResolvedValue({ id: 3 });
  svc.findTenant = jest.fn().mockResolvedValue({ id: 55 });
  svc.tenantPortal = { generateTenantPortalLink: jest.fn().mockResolvedValue({}) };
  svc.sendTenantCreatedSms = jest.fn().mockResolvedValue(undefined);
  svc.ownerNotifications = { notifyTenantCreated: jest.fn().mockResolvedValue(undefined) };
  return { svc, inserts, sets, audit };
}

const companyInput: any = {
  tenant_type: "company",
  company_name: "Societe Congo SARL",
  legal_form: "SARL",
  rccm: "CD/KIN/RCCM/21-B-00123",
  tax_id: "A1234567B",
  representative_name: "Jean Dupont",
  representative_title: "Directeur general",
  representative_phone: "0810000000",
  phone: "+243810000001",
  address: "Siege Gombe",
};

describe("createTenantRecord - entreprise", () => {
  it("cree une societe sans birth_date/lastName, username issu de la raison sociale", async () => {
    const { svc: svc2, inserts: ins2 } = makeService();
    await svc2.createTenantRecord(companyInput, 1, 9);
    const customer = ins2[0].values;
    const detail = ins2[1].values;
    expect(customer.firstName).toBe("Societe Congo SARL");
    expect(customer.lastName).toBeNull();
    expect(detail.tenantType).toBe("company");
    expect(detail.companyName).toBe("Societe Congo SARL");
    expect(detail.birthDate).toBeUndefined();
    expect(detail.sex).toBeUndefined();
    expect(detail.representativePhone).toBe("+243810000000");
  });

  it("username fallback sans telephone ni email = raison sociale, jamais 'nullnull'", async () => {
    const { svc, inserts } = makeService();
    await svc.createTenantRecord({ ...companyInput, phone: "" }, 1);
    expect(inserts[0].values.username).toBe("Societe Congo SARL");
  });

  it("refuse une societe sans representant", async () => {
    const { svc } = makeService();
    await expect(svc.createTenantRecord({ ...companyInput, representative_name: " " }, 1)).rejects.toThrow(/representant/);
  });

  it("trace la creation des identifiants legaux via AuditService", async () => {
    const { svc, audit } = makeService();
    await svc.createTenantRecord(companyInput, 1, 9);
    const actions = audit.log.mock.calls.map((c: any[]) => c[0]);
    expect(actions).toContain("domus.tenant.legal_identity_change");
  });
});

describe("DTO CreateTenantDto - validation conditionnelle", () => {
  it("accepte une societe sans champs personne", async () => {
    const dto = plainToInstance(CreateTenantDto, {
      tenant_type: "company",
      company_name: "Societe X",
      representative_name: "Jean",
      phone: "+243810000000",
      rccm: "CD/KIN/RCCM/21-B-1",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("une personne reste soumise aux champs requis", async () => {
    const dto = plainToInstance(CreateTenantDto, { phone: "+243810000000" });
    const props = (await validate(dto)).map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(["firstName", "lastName", "birth_date", "sex"]));
  });

  it("societe sans company_name rejetee", async () => {
    const dto = plainToInstance(CreateTenantDto, { tenant_type: "company", phone: "+243810000000" });
    const props = (await validate(dto)).map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(["company_name", "representative_name"]));
  });
});

describe("validatedTenantPayload - onboarding", () => {
  const svc = () => Object.create(PropertyManagementService.prototype) as any;
  const company = {
    tenant_type: "company",
    company_name: " Societe Congo SARL ",
    representative_name: "Jean Dupont",
    phone: "+243810000001",
    company_address: "Siege Gombe",
  };

  it("entreprise valide sans birth_date/sex/etat civil, sans defauts personne", () => {
    const out = svc().validatedTenantPayload(company, "+243810000001");
    expect(out.tenant_type).toBe("company");
    expect(out.company_name).toBe("Societe Congo SARL");
    expect(out.address).toBe("Siege Gombe");
    expect(out.birth_date).toBeUndefined();
    expect(out.monthly_pay).toBeUndefined();
    expect(out.origin_province).toBeUndefined();
  });

  it("entreprise sans company_name -> 400", () => {
    expect(() => svc().validatedTenantPayload({ ...company, company_name: "" }, "+243810000001")).toThrow(/company_name/);
  });

  it("entreprise : telephone different du lien -> 400", () => {
    expect(() => svc().validatedTenantPayload(company, "+243810000009")).toThrow(/ne correspond pas/);
  });

  it("personne inchangee : champs requis personne toujours exiges", () => {
    expect(() => svc().validatedTenantPayload({ phone: "+243810000001" }, "+243810000001")).toThrow(
      /Missing required tenant fields: firstName, lastName, address, birth_date/,
    );
  });

  it("normalise representative_phone", () => {
    const out = svc().normalizeOnboardingPhones({ representative_phone: "0810000000" }, { lenient: true });
    expect(out.representative_phone).toBe("+243810000000");
  });
});

describe("updateTenant - societe", () => {
  it("update partiel d'une societe existante : lastName reste null, pas de valeur fictive", async () => {
    const { svc, sets } = makeService([
      [{ id: 5, firstName: "Societe X", lastName: null }], // customers
      [{ id: 1, tenantType: "company", companyName: "Societe X", representativeName: "Jean", rccm: "A1", taxId: null, companyNationalId: null }],
    ]);
    await svc.updateTenant(5, { rccm: "CD/KIN/RCCM/21-B-9" } as any, 1, 9);
    expect(sets.some((s) => s.rccm === "CD/KIN/RCCM/21-B-9")).toBe(true);
    // firstName/lastName non reecrits (pas de company_name fourni, lastName deja null)
    expect(sets[0].firstName).toBeUndefined();
    expect(sets[0].lastName).toBeUndefined();
  });

  it("renommer la societe met a jour firstName et force lastName=null", async () => {
    const { svc, sets } = makeService([
      [{ id: 5, firstName: "Societe X", lastName: null }],
      [{ id: 1, tenantType: "company", companyName: "Societe X", representativeName: "Jean", rccm: null, taxId: null, companyNationalId: null }],
    ]);
    await svc.updateTenant(5, { company_name: "Societe Y" } as any, 1);
    expect(sets[0].firstName).toBe("Societe Y");
    expect(sets[0].lastName).toBeNull();
  });

  it("changement de type avec bail actif sans confirmation -> 409", async () => {
    const { svc } = makeService([
      [{ id: 5, firstName: "Jean", lastName: "Mukendi" }],
      [{ id: 1, tenantType: "individual", companyName: null, representativeName: null, rccm: null, taxId: null, companyNationalId: null }],
      [{ id: 99 }], // bail actif
    ]);
    const err: any = await svc
      .updateTenant(5, { tenant_type: "company", company_name: "Societe Y", representative_name: "Jean" } as any, 1)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().code).toBe("TENANT_TYPE_CHANGE_REQUIRES_CONFIRMATION");
  });

  it("changement de type confirme -> accepte et trace", async () => {
    const { svc, audit } = makeService([
      [{ id: 5, firstName: "Jean", lastName: "Mukendi" }],
      [{ id: 1, tenantType: "individual", companyName: null, representativeName: null, rccm: null, taxId: null, companyNationalId: null }],
      [{ id: 99 }],
    ]);
    await svc.updateTenant(
      5,
      { tenant_type: "company", company_name: "Societe Y", representative_name: "Jean", confirm_type_change: true } as any,
      1,
      9,
    );
    expect(audit.log.mock.calls.map((c: any[]) => c[0])).toContain("domus.tenant.type_change");
  });
});

describe("findOnboarding - isolation par organisation", () => {
  it("un dossier d'une autre organisation -> NotFound", async () => {
    const { svc } = makeService([[]]); // le filtre organization_id ne renvoie rien
    await expect(svc.findOnboarding(10, 2)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("le dossier de l'organisation est retourne", async () => {
    const { svc } = makeService([[{ id: 10, organizationId: 1 }]]);
    await expect(svc.findOnboarding(10, 1)).resolves.toMatchObject({ id: 10 });
  });
});

describe("contrat - locataire entreprise", () => {
  const contracts = () => Object.create(ContractsService.prototype) as any;
  const lease: any = {
    leaseId: 1, tenantId: 7, startDate: "2026-01-01", endDate: "2026-12-31", rentAmount: "100", securityDeposit: "200",
    tenantName: "Societe Congo SARL", tenantAddress: "Siege", tenantPhone: "+243810000000", tenantEmail: "a@b.cd",
    tenantIdDocumentType: null, tenantIdNumber: null, ownerId: null, coTenants: [],
    tenantType: "company", tenantLegalForm: "SARL", tenantRccm: "CD/KIN/RCCM/21-B-1", tenantCompanyNationalId: "01-123",
    tenantTaxId: "A123", tenantCompanyAddress: "1 av. Siege", tenantRepresentativeName: "Jean Dupont",
    tenantRepresentativeTitle: "Directeur",
  };
  const co: any = { companyName: "ACME", landlordName: "bailleur", address: "x", phone: "1", email: "e@e.e", landlordSignature: null, landlordPhone: "1" };

  it("variable de designation : societe, forme, RCCM, Id.Nat, NIF, siege, representant, qualite", () => {
    const vars = contracts().buildVariables(lease, co);
    const d = vars["DÉSIGNATION COMPLÈTE DU PRENEUR"];
    expect(d).toContain("Société SOCIETE CONGO SARL");
    expect(d).toContain("RCCM n° CD/KIN/RCCM/21-B-1");
    expect(d).toContain("Id.Nat n° 01-123");
    expect(d).toContain("NIF n° A123");
    expect(d).toContain("représentée par Jean Dupont, en sa qualité de Directeur");
  });

  it("contrat par defaut : representant = signataire", () => {
    const html = contracts().generateContent(lease, co);
    expect(html).toContain("Représentée par Jean Dupont, en sa qualité de Directeur");
    expect(html).toContain("JEAN DUPONT");
  });
});
