import { BadRequestException, GoneException, NotFoundException } from "@nestjs/common";
import { ContractsService } from "./contracts.service";

// Signature electronique PAR locataire : envoi (1 lien/locataire), jetons,
// contrat signe seulement apres le dernier signataire, anciens liens, anti-course.

type Fake = {
  db: any;
  sets: any[];
  inserts: any[];
  selectQueue: any[][];
  updateQueue: number[];
};

function makeFakeDb(selectQueue: any[][] = [], updateQueue: number[] = []): Fake {
  const f: Fake = { db: null, sets: [], inserts: [], selectQueue, updateQueue };
  let insertId = 100;
  const chain = (resolve: () => unknown): any => {
    const p: any = new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") return (ok: any, ko: any) => Promise.resolve().then(resolve).then(ok, ko);
        return () => p;
      },
    });
    return p;
  };
  f.db = {
    select: () => chain(() => f.selectQueue.shift() ?? []),
    update: () => ({
      set: (v: any) => {
        f.sets.push(v);
        return chain(() => [{ affectedRows: f.updateQueue.length ? f.updateQueue.shift() : 1 }]);
      },
    }),
    insert: () => ({
      values: (v: any) => {
        f.inserts.push(v);
        return Promise.resolve([{ insertId: ++insertId }]);
      },
    }),
  };
  return f;
}

function makeService(fake: Fake) {
  const svc = Object.create(ContractsService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn() };
  svc.emails = { send: jest.fn().mockResolvedValue(undefined) };
  svc.sms = { sendSms: jest.fn().mockResolvedValue({ success: true }) };
  svc.ownerNotifications = {
    civilNameForTenant: jest.fn().mockResolvedValue(""),
    renderMessage: jest.fn(async (_e: string, _f: string, vars: any) => `Signez ${vars.url}`),
    fitOneSms: jest.fn((m: string) => m),
  };
  svc.tenantPortal = {
    appendPortalFooterToEmail: jest.fn(async (h: string) => h),
    appendPortalFooterToSms: jest.fn(async (m: string) => m),
  };
  svc.getCompanyInfo = jest.fn().mockResolvedValue({ companyName: "ACME" });
  svc.publishContractUpdate = jest.fn().mockResolvedValue(undefined);
  svc.log = jest.fn().mockResolvedValue(undefined);
  svc.getContract = jest.fn().mockResolvedValue({ id: 1, status: "x" });
  svc.deliverWelcomeMessage = jest.fn().mockResolvedValue(undefined);
  return svc;
}

const contractRow = (over: any = {}) => ({
  id: 1, organizationId: 5, leaseId: 9, status: "draft", tenantEmail: "main@x.cd",
  tenantName: "Jean", welcomeMessageSentAt: null, ...over,
});
const cand = (customerId: number, role: "principal" | "cotenant", name: string, email: string | null, phone: string | null) =>
  ({ customerId, role, name, email, phone });

describe("ContractsService.sendContract - signataires", () => {
  it("1 locataire : 1 lien, 1 email, 1 SMS, jeton NON recopie sur le contrat", async () => {
    const fake = makeFakeDb([[]]); // signataires existants = aucun
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow());
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([cand(7, "principal", "Jean", "main@x.cd", "+243810000001")]);

    const res = await svc.sendContract(1, 5);

    expect(svc.emails.send).toHaveBeenCalledTimes(1);
    expect(svc.sms.sendSms).toHaveBeenCalledTimes(1);
    expect(fake.inserts).toHaveLength(1);
    expect(fake.inserts[0].role).toBe("principal");
    expect(fake.inserts[0].signerToken).toBe(res.token);
    const contractSet = fake.sets.find((s) => s.status === "sent" && "signerToken" in s);
    // C1 : le jeton du principal n'est PAS recopie sur le contrat quand des signataires existent.
    expect(contractSet.signerToken).toBeNull();
    expect(res.unreachable).toEqual([]);
    expect(res.signingUrl).toContain(`/sign/${res.token}`);
    expect(svc.emails.send.mock.calls[0][0].html).toContain(res.token);
  });

  it("2 locataires : 2 liens distincts, 1 audit par signataire", async () => {
    const fake = makeFakeDb([[]]);
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow());
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([
      cand(7, "principal", "Jean", "main@x.cd", "+243810000001"),
      cand(8, "cotenant", "Marie", "marie@x.cd", "+243810000002"),
    ]);

    const res = await svc.sendContract(1, 5);

    expect(fake.inserts).toHaveLength(2);
    const [t1, t2] = fake.inserts.map((i) => i.signerToken);
    expect(t1).not.toBe(t2);
    expect(svc.emails.send).toHaveBeenCalledTimes(2);
    expect(svc.sms.sendSms).toHaveBeenCalledTimes(2);
    const htmls = svc.emails.send.mock.calls.map((c: any) => c[0].html);
    expect(htmls[0]).toContain(t1);
    expect(htmls[1]).toContain(t2);
    expect(res.token).toBe(t1); // contrat = jeton du principal
    const sentLogs = svc.log.mock.calls.filter((c: any[]) => c[2] === "sent");
    expect(sentLogs).toHaveLength(2);
    expect(sentLogs.every((c: any[]) => typeof c[6] === "number")).toBe(true);
    // pied de page portail propre a chaque locataire
    expect(svc.tenantPortal.appendPortalFooterToEmail.mock.calls.map((c: any[]) => c[1])).toEqual([7, 8]);
  });

  it("R2 : numero/email partages -> chaque signataire recoit SON lien (pas de dedoublonnage)", async () => {
    const fake = makeFakeDb([[]]);
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow({ tenantEmail: "Shared@X.cd" }));
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([
      cand(7, "principal", "Jean", "Shared@X.cd", "+243 81 000 0001"),
      cand(8, "cotenant", "Marie", "shared@x.cd", "0024381 0000001"),
    ]);

    await svc.sendContract(1, 5);

    expect(svc.emails.send).toHaveBeenCalledTimes(2);
    expect(svc.sms.sendSms).toHaveBeenCalledTimes(2);
    expect(fake.inserts).toHaveLength(2);
  });

  it("R2 : signataire sans email ni telephone -> liste unreachable", async () => {
    const svc = makeService(makeFakeDb([[]]));
    svc.requireContract = jest.fn().mockResolvedValue(contractRow());
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([
      cand(7, "principal", "Jean", "main@x.cd", "+243810000001"),
      cand(8, "cotenant", "Marie", null, null),
    ]);
    const res = await svc.sendContract(1, 5);
    expect(res.unreachable).toHaveLength(1);
    expect(res.unreachable[0]).toMatchObject({ name: "Marie", role: "cotenant" });
  });

  it("C1 : contrat ancien sans signataires -> repli, jeton garde sur le contrat", async () => {
    const fake = makeFakeDb([[]]);
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow());
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([]);
    const res = await svc.sendContract(1, 5);
    const contractSet = fake.sets.find((x) => x.status === "sent" && "signerToken" in x);
    expect(contractSet.signerToken).toBe(res.token);
  });

  it("M2 : sendContract refuse un contrat signed ou deleted (preuves intactes)", async () => {
    for (const status of ["signed", "deleted"]) {
      const fake = makeFakeDb([[]]);
      const svc = makeService(fake);
      svc.requireContract = jest.fn().mockResolvedValue(contractRow({ status }));
      svc.loadSigningCandidates = jest.fn().mockResolvedValue([cand(7, "principal", "Jean", "a@x.cd", null)]);
      await expect(svc.sendContract(1, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(fake.sets).toHaveLength(0);
      expect(fake.inserts).toHaveLength(0);
    }
  });

  it("R3 : contrat signe en concurrence pendant l'envoi -> 410, aucun lien envoye", async () => {
    const fake = makeFakeDb([[]], [0]); // l'UPDATE conditionnel du contrat ne touche aucune ligne
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow({ status: "sent" }));
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([cand(7, "principal", "Jean", "a@x.cd", "+243810000001")]);
    await expect(svc.sendContract(1, 5)).rejects.toBeInstanceOf(GoneException);
    expect(svc.emails.send).not.toHaveBeenCalled();
  });

  it("R4 : contrat remis en brouillon (anciens signataires) -> contenu regenere depuis le bail actuel", async () => {
    const fake = makeFakeDb([[{ id: 1 }], []]); // signataires precedents existent ; actifs = aucun
    const svc = makeService(fake);
    svc.requireContract = jest.fn().mockResolvedValue(contractRow({ status: "draft", tenantName: "Ancien", tenantEmail: "old@x.cd", contractContent: "OLD" }));
    svc.getLeaseDetails = jest.fn().mockResolvedValue({ tenantName: "Nouveau", tenantEmail: "new@x.cd" });
    svc.renderContent = jest.fn().mockResolvedValue("NEW CONTENT");
    svc.loadSigningCandidates = jest.fn().mockResolvedValue([cand(8, "principal", "Nouveau", "new@x.cd", null)]);
    await svc.sendContract(1, 5);
    const regen = fake.sets.find((x) => x.contractContent === "NEW CONTENT");
    expect(regen).toMatchObject({ tenantName: "Nouveau", tenantEmail: "new@x.cd" });
    expect(svc.emails.send.mock.calls[0][0].to).toBe("new@x.cd");
  });
});

describe("ContractsService.findByToken / getContractByToken", () => {
  it("ancien lien (jeton sur le contrat, sans signataires) reste valide", async () => {
    const legacy = contractRow({ status: "sent", signerToken: "old", signerTokenExpiry: new Date(Date.now() + 86400000) });
    // signataire par jeton : aucun ; contrat par jeton : legacy ; signataires actifs : aucun
    const fake = makeFakeDb([[], [legacy], []]);
    const svc = makeService(fake);
    const { contract, signer } = await svc.findByToken("old");
    expect(contract.id).toBe(1);
    expect(signer).toBeNull();
  });

  it("jeton inconnu -> 404 ; jeton signataire expire -> 410", async () => {
    const svc = makeService(makeFakeDb([[], []]));
    await expect(svc.findByToken("nope")).rejects.toBeInstanceOf(NotFoundException);

    const expired = { id: 3, contractId: 1, organizationId: 5, signerTokenExpiry: new Date(Date.now() - 1000) };
    const svc2 = makeService(makeFakeDb([[expired], [contractRow({ status: "sent" })]]));
    await expect(svc2.findByToken("t")).rejects.toBeInstanceOf(GoneException);
  });

  it("M1 : jeton signataire sur contrat draft/deleted -> refuse ; signed -> lecture seule autorisee", async () => {
    const signer = { id: 3, contractId: 1, organizationId: 5, signerTokenExpiry: null };
    for (const status of ["draft", "deleted"]) {
      const svc = makeService(makeFakeDb([[signer], [contractRow({ status })]]));
      await expect(svc.findByToken("t")).rejects.toBeInstanceOf(NotFoundException);
    }
    const svc = makeService(makeFakeDb([[signer], [contractRow({ status: "signed" })]]));
    await expect(svc.findByToken("t")).resolves.toMatchObject({ signer });
  });

  it("M1 : deleteContract desactive les signataires et efface leurs jetons", async () => {
    const fake = makeFakeDb([[{ id: 1, leaseId: 9 }]]);
    const svc = makeService(fake);
    await svc.deleteContract(1, 5);
    expect(fake.sets.some((x) => x.status === "deleted" && x.signerToken === null)).toBe(true);
    expect(fake.sets.some((x) => x.isActive === 0 && x.signerToken === null)).toBe(true);
  });

  it("M3 : listSigners / resendSigner refusent un bail hors perimetre du bien", async () => {
    const svc = makeService(makeFakeDb([[{ propertyId: 99 }], [{ propertyId: 99 }], [{ propertyId: 4 }]]));
    svc.requireContract = jest.fn().mockResolvedValue(contractRow({ status: "sent" }));
    svc.activeSigners = jest.fn().mockResolvedValue([]);
    await expect(svc.listSigners(1, 5, [4])).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.resendSigner(1, 2, 5, [4])).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.listSigners(1, 5, [4])).resolves.toMatchObject({ contractId: 1 });
    await expect(svc.listSigners(1, 5, "all")).resolves.toMatchObject({ contractId: 1 });
  });

  it("getContractByToken : marque viewed et expose signer + signataires sans jetons", async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake);
    const signer = { id: 3, status: "sent", signerName: "Marie", role: "cotenant" };
    svc.findByToken = jest.fn().mockResolvedValue({ contract: contractRow({ status: "sent" }), signer });
    svc.activeSigners = jest.fn().mockResolvedValue([
      { id: 2, signerName: "Jean", role: "principal", status: "signed", signerToken: "SECRET", position: 1 },
      { ...signer, signerToken: "SECRET2", position: 2 },
    ]);

    const res = await svc.getContractByToken("t", "1.1.1.1", "ua");

    expect(fake.sets.some((s) => s.status === "viewed")).toBe(true);
    expect(res.signer).toEqual({ id: 3, name: "Marie", role: "cotenant", status: "viewed" });
    expect(res.signers).toHaveLength(2);
    expect(JSON.stringify(res)).not.toContain("SECRET");
  });
});

describe("ContractsService.signContract - plusieurs signataires", () => {
  const dto: any = { signatureData: "data:image/png;base64,AAA" };
  const futur = new Date(Date.now() + 86400000);

  it("contrat signed seulement apres la 2e signature, bienvenue une seule fois", async () => {
    // 1re signature : il reste 1 signataire non signe
    const fake1 = makeFakeDb([[{ id: 3 }]]);
    const svc1 = makeService(fake1);
    svc1.findByToken = jest.fn().mockResolvedValue({
      contract: contractRow({ status: "sent" }),
      signer: { id: 2, status: "sent", role: "principal", signerName: "Jean", signerTokenExpiry: futur },
    });
    const pub = await svc1.signContract("t1", dto, "1.1.1.1", "ua");
    // C1 : reponse publique reduite, jamais la vue gestionnaire
    expect(Object.keys(pub).sort()).toEqual(["message", "signer", "signers", "signersSigned", "signersTotal", "status"]);
    expect(JSON.stringify(pub)).not.toMatch(/signerToken|auditLogs|landlordInfo|createdByName|email|phone/i);
    expect(svc1.getContract).not.toHaveBeenCalled();
    expect(pub.status).not.toBe("signed");
    expect(fake1.sets.some((s) => s.status === "signed" && "signedAt" in s && "signatureData" in s && !("method" in s))).toBe(false);
    expect(svc1.deliverWelcomeMessage).not.toHaveBeenCalled();

    // 2e signature : plus personne -> contrat signed avec la signature du principal
    const fake2 = makeFakeDb([[]], [1, 1, 1]);
    const svc2 = makeService(fake2);
    svc2.findByToken = jest.fn().mockResolvedValue({
      contract: contractRow({ status: "viewed" }),
      signer: { id: 3, status: "viewed", role: "cotenant", signerName: "Marie", signerTokenExpiry: futur },
    });
    svc2.activeSigners = jest.fn().mockResolvedValue([
      { id: 2, role: "principal", status: "signed", signatureData: "PRINCIPAL_SIG", signerIp: "9.9.9.9", signerUserAgent: "uaP" },
      { id: 3, role: "cotenant", status: "signed", signatureData: dto.signatureData },
    ]);
    const pub2 = await svc2.signContract("t2", dto, "2.2.2.2", "ua2");
    expect(pub2).toMatchObject({ status: "signed", signersSigned: 2, signersTotal: 2 });
    const contractSet = fake2.sets.find((s) => s.status === "signed" && s.signerToken === null && "signatureData" in s && "signerIp" in s && s.signatureData === "PRINCIPAL_SIG");
    expect(contractSet).toBeDefined();
    expect(contractSet.signerIp).toBe("9.9.9.9");
    expect(svc2.deliverWelcomeMessage).toHaveBeenCalledTimes(1);
  });

  it("double signature simultanee du meme signataire : la 2e est rejetee (410)", async () => {
    const fake = makeFakeDb([[]], [1, 0]); // 1er UPDATE gagne, 2e perd
    const svc = makeService(fake);
    const signer = { id: 2, status: "sent", role: "principal", signerName: "Jean", signerTokenExpiry: futur };
    svc.findByToken = jest.fn().mockResolvedValue({ contract: contractRow({ status: "sent" }), signer });
    svc.activeSigners = jest.fn().mockResolvedValue([{ ...signer, status: "signed", signatureData: "S" }]);

    const [a, b] = await Promise.allSettled([
      svc.signContract("t", dto, "ip", "ua"),
      svc.signContract("t", dto, "ip", "ua"),
    ]);
    expect([a.status, b.status].sort()).toEqual(["fulfilled", "rejected"]);
    const rejected = [a, b].find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(GoneException);
  });

  it("deux derniers signataires en course : contrat finalise et bienvenue une seule fois", async () => {
    // chaque appel : [update signataire=1, update contrat=1 puis 0]
    const fake = makeFakeDb([[], []], [1, 1, 1, 0]);
    const svc = makeService(fake);
    const mk = (id: number) => ({ id, status: "sent", role: id === 2 ? "principal" : "cotenant", signerName: "x", signerTokenExpiry: futur });
    let n = 0;
    svc.findByToken = jest.fn().mockImplementation(async () => ({ contract: contractRow({ status: "sent" }), signer: mk(2 + n++) }));
    svc.activeSigners = jest.fn().mockResolvedValue([{ id: 2, role: "principal", status: "signed", signatureData: "P" }]);

    await Promise.all([svc.signContract("a", dto, "ip", "ua"), svc.signContract("b", dto, "ip", "ua")]);
    expect(svc.deliverWelcomeMessage).toHaveBeenCalledTimes(1);
  });

  it("contrat ancien sans signataires : signature directe inchangee", async () => {
    const fake = makeFakeDb();
    const svc = makeService(fake);
    svc.findByToken = jest.fn().mockResolvedValue({ contract: contractRow({ status: "sent" }), signer: null });
    const pub = await svc.signContract("old", dto, "ip", "ua");
    expect(fake.sets[0]).toMatchObject({ status: "signed", signatureData: dto.signatureData, signerToken: null });
    expect(svc.deliverWelcomeMessage).toHaveBeenCalledTimes(1);
    // C1 : reponse publique reduite aussi pour l'ancien contrat
    expect(Object.keys(pub).sort()).toEqual(["message", "signer", "signers", "signersSigned", "signersTotal", "status"]);
    expect(svc.getContract).not.toHaveBeenCalled();
  });

  it("R9 : bienvenue deja reclamee (0 ligne touchee) -> pas d'envoi ; echec d'envoi -> claim libere", async () => {
    const fake = makeFakeDb([], [0]);
    const svc = makeService(fake);
    await svc.claimAndDeliverWelcome(contractRow(), 5);
    expect(svc.deliverWelcomeMessage).not.toHaveBeenCalled();

    const fake2 = makeFakeDb();
    const svc2 = makeService(fake2);
    svc2.deliverWelcomeMessage = jest.fn().mockRejectedValue(new Error("boom"));
    await svc2.claimAndDeliverWelcome(contractRow(), 5);
    expect(fake2.sets.map((x) => x.welcomeMessageSentAt === null)).toEqual([false, true]);
  });
});

describe("ContractsService.resetSignersForLease", () => {
  it("contrat envoye : signataires desactives, contrat en brouillon, audit signers_reset", async () => {
    const fake = makeFakeDb([[contractRow({ status: "sent" })]]);
    const svc = makeService(fake);
    const r = await svc.resetSignersForLease(9, 5);
    expect(r).toEqual({ reset: true, contractId: 1 });
    expect(fake.sets.some((s) => s.isActive === 0)).toBe(true);
    expect(fake.sets.some((s) => s.status === "draft")).toBe(true);
    expect(svc.log.mock.calls.some((c: any[]) => c[2] === "signers_reset")).toBe(true);
  });

  it("contrat signe : rien", async () => {
    const fake = makeFakeDb([[contractRow({ status: "signed" })]]);
    const svc = makeService(fake);
    expect(await svc.resetSignersForLease(9, 5)).toEqual({ reset: false, contractId: 1 });
    expect(fake.sets).toHaveLength(0);
  });
});
