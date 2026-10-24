import { describe, expect, it } from "vitest";
import {
  auditDetails, auditEventLabel, auditIsSigned, contractDraftMark, contractDraftMarkScreen, contractPrintBody, contractStatusMeta, contractWatermark,
  hasSignedScan, isPaperSigned, isProofMissing,
} from "./contractUtils.js";

describe("isPaperSigned / hasSignedScan", () => {
  it("scan attaché sur contrat signé = papier", () => {
    const c = { status: "signed", signedDocumentId: 12, signers: [] };
    expect(isPaperSigned(c)).toBe(true);
    expect(hasSignedScan(c)).toBe(true);
  });
  it("signataire en méthode paper sans scan = papier, sans scan", () => {
    const c = { status: "signed", signedDocumentId: null, signers: [{ method: "paper" }] };
    expect(isPaperSigned(c)).toBe(true);
    expect(hasSignedScan(c)).toBe(false);
    expect(isProofMissing(c)).toBe(true);
  });
  it("signature électronique : pas papier, preuve présente", () => {
    const c = { status: "signed", signatureData: "data:image/png;base64,xx", signers: [{ method: "electronic" }] };
    expect(isPaperSigned(c)).toBe(false);
    expect(isProofMissing(c)).toBe(false);
    expect(contractStatusMeta(c).label).toBe("Signé");
  });
  it("brouillon : ni papier ni preuve manquante", () => {
    const c = { status: "draft", signedDocumentId: 3 };
    expect(isPaperSigned(c)).toBe(false);
    expect(isProofMissing(c)).toBe(false);
  });
  it("chip « Signé (papier) »", () => {
    expect(contractStatusMeta({ status: "signed", signedDocumentId: 1 }).label).toBe("Signé (papier)");
  });
});

describe("filigrane", () => {
  it("brouillon / envoyé : jamais de filigrane imprimé, PROJET seulement à l'écran", () => {
    for (const status of ["draft", "sent", "viewed"]) {
      expect(contractWatermark({ status })).toBe("");
      expect(contractDraftMark({ status })).toBe("PROJET – non signé");
    }
    const screen = contractPrintBody({ status: "draft" });
    expect(screen).toContain("contract-watermark screen-only");
    expect(contractPrintBody({ status: "draft" }, { forScreen: false })).not.toContain("contract-watermark");
  });
  it("version générée d'un bail papier = NON SIGNÉ", () => {
    expect(contractWatermark({ status: "signed", signedDocumentId: 1 }, true)).toBe("NON SIGNÉ");
  });
  it("signé électroniquement = aucun filigrane", () => {
    const c = { status: "signed", signatureData: "data:image/png;base64,xx", signers: [{ method: "electronic" }] };
    expect(contractWatermark(c, false)).toBe("");
    expect(contractPrintBody(c)).not.toContain("contract-watermark");
  });
  it("grille de signatures papier", () => {
    expect(contractPrintBody({ status: "signed", signedDocumentId: 1 }, { generated: true })).toContain("Signé sur papier (voir scan)");
  });
});

describe("audit", () => {
  it("signed_paper et scan_replaced", () => {
    expect(auditEventLabel({ event: "signed_paper" })).toBe("Signé sur papier (scan importé)");
    expect(auditEventLabel({ event: "scan_replaced" })).toBe("Scan signé remplacé");
    expect(auditIsSigned({ event: "signed_paper" })).toBe(true);
  });
  it("anciennes lignes : signed + « Signature papier » = papier", () => {
    const log = { event: "signed", details: "Signature papier importée par X" };
    expect(auditEventLabel(log)).toBe("Signé sur papier (scan importé)");
    expect(auditEventLabel({ event: "signed", details: "Signed by A" })).toBe("Signé électroniquement");
  });
  it("détail anglais traduit", () => {
    expect(auditDetails({ details: "Contract created for lease #42" })).toBe("Contrat généré pour le bail n°42");
    expect(auditDetails({ details: "autre" })).toBe("autre");
  });
});

describe("auditDetails - anciens textes normalisés", () => {
  it("traduit/accentue les anciens textes", () => {
    expect(auditDetails({ details: "Signature papier importee par Jean" })).toBe("Signature papier importée par Jean");
    expect(auditDetails({ details: "Message de bienvenue envoye : a@b.c" })).toBe("Message de bienvenue envoyé : a@b.c");
    expect(auditDetails({ details: 'Template changed to "Bail A"' })).toBe('Modèle changé : "Bail A"');
    expect(auditDetails({ details: "Signed by Marie" })).toBe("Signé par Marie");
    expect(auditDetails({ details: "Sent to x@y.z / SMS +243" })).toBe("Envoyé à x@y.z / SMS +243");
    expect(auditDetails({ details: "Sent to no email (email en echec)" })).toBe("Envoyé à aucun e-mail (e-mail en échec)");
  });
  it("scan_removed et textes déjà français inchangés", () => {
    expect(auditEventLabel({ event: "scan_removed" })).toBe("Scan de preuve supprimé");
    expect(auditDetails({ details: "Signé par Marie" })).toBe("Signé par Marie");
  });
});

describe("preuve manquante / mention écran", () => {
  it("statut « Preuve manquante » sur un contrat complet, pas sur un résumé de liste", () => {
    expect(contractStatusMeta({ status: "signed", signatureData: null, signedDocumentId: null, signers: [] }).label).toBe("Preuve manquante");
    expect(contractStatusMeta({ status: "signed", signedDocumentId: null }).label).toBe("Signé");
  });
  it("résumé de liste : hasSignatureData décide de « Preuve manquante »", () => {
    expect(contractStatusMeta({ status: "signed", signedDocumentId: null, hasSignatureData: false }).label).toBe("Preuve manquante");
    expect(contractStatusMeta({ status: "signed", signedDocumentId: null, hasSignatureData: true }).label).toBe("Signé");
    expect(contractStatusMeta({ status: "signed", signedDocumentId: 5, hasSignatureData: false }).label).toBe("Signé (papier)");
  });
  it("mention PROJET pour brouillon / envoyé / vu seulement", () => {
    for (const status of ["draft", "sent", "viewed"]) expect(contractDraftMarkScreen({ status })).toBe("PROJET – non signé");
    expect(contractDraftMarkScreen({ status: "signed" })).toBe("");
  });
});
