import { BadRequestException, ConflictException, GoneException } from "@nestjs/common";
import { ContractsService } from "./contracts.service";

// markSignedManually : import papier, remplacement du scan (replace=true), anti-course, refus e-signature.

function makeFakeDb(selectQueue: any[][], updateQueue: number[] = []) {
  const f: any = { sets: [] as any[], inserts: [] as any[], selectQueue, updateQueue };
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

function makeService(fake: any) {
  const svc = Object.create(ContractsService.prototype) as any;
  svc.db = fake.db;
  svc.logger = { warn: jest.fn() };
  svc.objectStorage = {
    putDocument: jest.fn().mockResolvedValue({ bucket: "b", objectKey: "k", mimeType: "application/pdf", sizeBytes: 10 }),
  };
  svc.publishContractUpdate = jest.fn().mockResolvedValue(undefined);
  svc.log = jest.fn().mockResolvedValue(undefined);
  svc.getContract = jest.fn().mockResolvedValue({ id: 1, status: "signed" });
  svc.claimAndDeliverWelcome = jest.fn().mockResolvedValue(undefined);
  return svc;
}

const row = (over: any = {}) => ({
  id: 1, organizationId: 5, leaseId: 9, status: "signed", signedDocumentId: 5, signatureData: null,
  tenantEmail: null, tenantName: "Jean", ...over,
});
const existingDoc = { originalName: "ancien.pdf", sizeBytes: 99 };
const newFile = { originalname: "nouveau.pdf", size: 10, mimetype: "application/pdf" };

describe("ContractsService.markSignedManually - remplacement du scan", () => {
  it("swap gagne : ancien document archive, audit scan_replaced, pas de bienvenue, replaced:true", async () => {
    const fake = makeFakeDb([[row()], [existingDoc]]);
    const svc = makeService(fake);
    const res = await svc.markSignedManually(1, newFile, 5, 3, true);
    expect(res.replaced).toBe(true);
    expect(fake.sets.some((s: any) => s.signedDocumentId === 101)).toBe(true);
    expect(fake.sets.some((s: any) => s.isActive === 0)).toBe(true);
    expect(svc.log).toHaveBeenCalledWith(1, 5, "scan_replaced", null, null, expect.stringContaining("nouveau.pdf"));
    expect(svc.claimAndDeliverWelcome).not.toHaveBeenCalled();
  });

  it("swap perdu face a un autre remplacement : document archive + ConflictException", async () => {
    const fake = makeFakeDb([[row()], [existingDoc], [{ signedDocumentId: 7 }]], [0]);
    const svc = makeService(fake);
    await expect(svc.markSignedManually(1, newFile, 5, 3, true)).rejects.toBeInstanceOf(ConflictException);
    expect(fake.sets.some((s: any) => s.isActive === 0)).toBe(true);
    expect(svc.log).not.toHaveBeenCalled();
  });

  it("scan detache pendant le remplacement : rabat sur l'import (signed_paper)", async () => {
    const fake = makeFakeDb([[row()], [existingDoc], [{ signedDocumentId: null }]], [0, 1, 1]);
    const svc = makeService(fake);
    await svc.markSignedManually(1, newFile, 5, undefined, true);
    expect(svc.log).toHaveBeenCalledWith(1, 5, "signed_paper", null, null, expect.any(String));
  });

  it("rabattement qui echoue aussi : ConflictException", async () => {
    const fake = makeFakeDb([[row()], [existingDoc], [{ signedDocumentId: null }]], [0, 0]);
    const svc = makeService(fake);
    await expect(svc.markSignedManually(1, newFile, 5, undefined, true)).rejects.toBeInstanceOf(ConflictException);
    expect(svc.log).not.toHaveBeenCalled();
  });

  it("replace sans scan : BadRequestException", async () => {
    const fake = makeFakeDb([[row({ signedDocumentId: null })]]);
    const svc = makeService(fake);
    await expect(svc.markSignedManually(1, newFile, 5, 3, true)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("meme fichier que le scan actuel : replaced:false, rien n'est stocke", async () => {
    const same = { originalname: "ancien.pdf", size: 99, mimetype: "application/pdf" };
    const fake = makeFakeDb([[row()], [existingDoc]]);
    const svc = makeService(fake);
    const res = await svc.markSignedManually(1, same, 5, 3, true);
    expect(res.replaced).toBe(false);
    expect(svc.objectStorage.putDocument).not.toHaveBeenCalled();
    expect(svc.log).not.toHaveBeenCalled();
  });

  it("sans replace, scan deja present et fichier different : GoneException", async () => {
    const fake = makeFakeDb([[row()], [existingDoc]]);
    const svc = makeService(fake);
    await expect(svc.markSignedManually(1, newFile, 5, 3, false)).rejects.toBeInstanceOf(GoneException);
  });

  it("contrat signe electroniquement : import papier refuse", async () => {
    const fake = makeFakeDb([[row({ signedDocumentId: null, signatureData: "data:image/png;base64,xx" })]]);
    const svc = makeService(fake);
    await expect(svc.markSignedManually(1, newFile, 5, 3, false)).rejects.toThrow("Contrat déjà signé électroniquement.");
    expect(svc.objectStorage.putDocument).not.toHaveBeenCalled();
  });

  it("ré-import d'un scan détaché : la date de signature d'origine est conservée", async () => {
    const fake = makeFakeDb([[row({ signedDocumentId: null, signedAt: new Date("2026-01-05") })]]);
    const svc = makeService(fake);
    await svc.markSignedManually(1, newFile, 5, 3, false);
    const claim = fake.sets.find((s: any) => s.signedDocumentId === 101 && s.status === "signed");
    expect(claim).toBeDefined();
    expect("signedAt" in claim).toBe(false);
  });

  it("premier import : signedAt posé", async () => {
    const fake = makeFakeDb([[row({ status: "sent", signedDocumentId: null, signedAt: null })]]);
    const svc = makeService(fake);
    await svc.markSignedManually(1, newFile, 5, 3, false);
    const claim = fake.sets.find((s: any) => s.status === "signed" && s.signedDocumentId === 101);
    expect("signedAt" in claim).toBe(true);
  });
});
