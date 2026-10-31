import { ContractsService } from "./contracts.service";

// Tous les locataires du bail apparaissent dans le contrat (defaut + modele) et
// recoivent la confirmation de signature.

function svc() {
  const s = Object.create(ContractsService.prototype) as any;
  s.resolveLandlord = () => ({ name: "Bailleur SA", address: "1 rue X", phone: "+243810", email: "b@x.cd", source: "settings" });
  return s;
}

const lease = (coTenants: any[] = []): any => ({
  reference: "B-1", startDate: "2026-01-01", endDate: "2026-12-31", rentAmount: "500", securityDeposit: "1000",
  currencySymbol: "$", currencyCode: "USD", terms: null, moveInMeterReading: null, signingCity: "Kinshasa",
  propertyName: "Immeuble", propertyType: "apartment", propertyAddress: "10 av. Y", propertyCity: "Kinshasa",
  unitName: "A1", unitType: "apartment", tenantName: "Jean Mukendi", tenantAddress: "Gombe", tenantPhone: "+243811",
  tenantEmail: "j@x.cd", tenantIdDocumentType: "Passeport", tenantIdNumber: "P1", coTenants,
});
const co = (id: number, name: string) => ({ id, name, address: "Lemba", phone: `+24382${id}`, email: `${id}@x.cd`, idDocumentType: "CNI", idNumber: `N${id}` });
const company: any = { companyName: "ACME", landlordName: null, landlordPhone: null, phone: null, email: null };

describe("contrat par defaut - pluriel", () => {
  it("1 locataire : texte singulier, pas de clause de solidarite", () => {
    const html: string = svc().generateContent(lease(), company);
    expect(html).toContain("Le Preneur (Locataire)");
    expect(html).toContain("donne en location au Preneur le bien");
    expect(html).toContain("Le Preneur verse ce jour");
    expect(html).toContain("Le Preneur prend à sa charge");
    expect(html).toContain("le Preneur rendra le bien");
    expect(html).toContain("le Preneur s&rsquo;engage à payer");
    expect(html).toContain("le locataire est présumé");
    expect(html).not.toContain("solidairement");
    expect(html).not.toContain("Preneurs");
  });

  it("3 locataires : tous les noms, pluriel coherent, clause de solidarite", () => {
    const html: string = svc().generateContent(lease([co(2, "Marie Kasa"), co(3, "Paul Ilunga")]), company);
    for (const n of ["JEAN MUKENDI", "MARIE KASA", "PAUL ILUNGA"]) expect(html).toContain(n);
    expect(html).toContain("Les Preneurs (Locataires)");
    expect(html).toContain("aux Preneurs le bien");
    expect(html).toContain("Les Preneurs versent ce jour");
    expect(html).toContain("Les Preneurs prennent à leur charge");
    expect(html).toContain("les Preneurs rendront");
    expect(html).toContain("les Preneurs s&rsquo;engagent");
    expect(html).toContain("les locataires sont présumés");
    expect(html).toContain("Les Preneurs sont tenus solidairement et indivisiblement de toutes les obligations du présent bail.");
    expect(html).not.toContain("Le Preneur verse");
  });
});

describe("contrat par defaut - bail sans caution", () => {
  it("caution 0 ou vide : clause 'Aucune garantie locative'", () => {
    for (const dep of ["0", "", null]) {
      const html: string = svc().generateContent({ ...lease(), securityDeposit: dep }, company);
      expect(html).toContain("Aucune garantie locative");
      expect(html).not.toContain("verse ce jour une garantie");
    }
  });
});

describe("contrat modele - variables", () => {
  it("1 locataire : variable inchangee", () => {
    const v = svc().buildVariables(lease(), company);
    expect(v["NOM COMPLET DU PRENEUR"]).toBe("JEAN MUKENDI");
    expect(v["TÉLÉPHONES DES PRENEURS"]).toBe("+243811");
  });

  it("3 locataires : noms joints en MAJUSCULES + variables agregees", () => {
    const v = svc().buildVariables(lease([co(2, "Marie Kasa"), co(3, "Paul Ilunga")]), company);
    expect(v["NOM COMPLET DU PRENEUR"]).toBe("JEAN MUKENDI, MARIE KASA et PAUL ILUNGA");
    expect(v["ADRESSE DU PRENEUR"]).toBe("Gombe");
    expect(v["EMAILS DES PRENEURS"]).toBe("j@x.cd ; 2@x.cd ; 3@x.cd");
    expect(v["PIÈCES D'IDENTITÉ DES PRENEURS"]).toBe("Passeport P1 ; CNI N2 ; CNI N3");
  });
});

describe("deliverWelcomeMessage - tous les locataires", () => {
  function welcomeSvc(coTenants: any[]) {
    const s = Object.create(ContractsService.prototype) as any;
    const tpl: any[] = [];
    s.db = {
      select: () => { const p: any = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? (ok: any) => Promise.resolve(tpl).then(ok) : () => p) }); return p; },
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    };
    s.logger = { warn: jest.fn() };
    s.sms = { sendSms: jest.fn().mockResolvedValue({ success: true }) };
    s.ownerNotifications = {
      civilNameForTenant: jest.fn().mockResolvedValue(""),
      propertyContactVars: jest.fn().mockResolvedValue({ contacts: "", ownerContact: "", managerContact: "" }),
      fitOneSms: jest.fn((m: string) => m),
    };
    s.tenantPortal = {
      appendPortalFooterToEmail: jest.fn(async (h: string) => h),
      appendPortalFooterToSms: jest.fn(async (m: string) => m),
    };
    s.getLeaseDetails = jest.fn().mockResolvedValue({ ...lease(coTenants), tenantId: 7 });
    s.getCompanyInfo = jest.fn().mockResolvedValue(company);
    s.sendEmail = jest.fn().mockResolvedValue(undefined);
    s.publishContractUpdate = jest.fn().mockResolvedValue(undefined);
    s.log = jest.fn().mockResolvedValue(undefined);
    return s;
  }
  const contract = { id: 1, leaseId: 9, tenantEmail: "j@x.cd", tenantName: "Jean" };

  it("1 locataire : 1 email + 1 SMS", async () => {
    const s = welcomeSvc([]);
    const r = await s.deliverWelcomeMessage(contract, 5);
    expect(s.sendEmail).toHaveBeenCalledTimes(1);
    expect(s.sms.sendSms).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ emailSent: true, smsSent: true });
  });

  it("2 destinataires, chacun avec son pied de page ; doublon ignore ; echec = warning", async () => {
    const s = welcomeSvc([co(8, "Marie Kasa"), { ...co(9, "Doublon"), email: "J@X.cd", phone: "+243 811" }]);
    s.sendEmail.mockImplementation(async (to: string) => { if (to === "8@x.cd") throw new Error("smtp"); });
    const r = await s.deliverWelcomeMessage(contract, 5);
    // principal + Marie (echec email -> warning) ; Doublon dedoublonne
    expect(s.sendEmail.mock.calls.map((c: any[]) => c[0])).toEqual(["j@x.cd", "8@x.cd"]);
    expect(s.sms.sendSms.mock.calls.map((c: any[]) => c[0].phone)).toEqual(["+243811", "+243828"]);
    expect(s.tenantPortal.appendPortalFooterToEmail.mock.calls.map((c: any[]) => c[1])).toEqual([7, 8]);
    expect(s.tenantPortal.appendPortalFooterToSms.mock.calls.map((c: any[]) => c[1])).toEqual([7, 8]);
    expect(s.logger.warn).toHaveBeenCalled();
    expect(r).toMatchObject({ emailSent: true, smsSent: true });
  });
});
