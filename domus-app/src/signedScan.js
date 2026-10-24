// Actions sur le scan du bail signé à la main (fichier protégé par JWT : fetch + blob, jamais de token dans l'URL).
import { api } from "./api.js";
import { t } from "./i18n.js";

const REVOKE_DELAY_MS = 60000;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

// WebView Capacitor : window.open / blob dans un onglet ne fonctionne pas pour un PDF -> ProofModal.
export const isNativePlatform = () => typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());

// PDF (ou type inconnu) sur mobile natif : ouvrir / imprimer / telecharger via la ProofModal existante.
export function scanNeedsProofModal(contract) {
  if (!isNativePlatform()) return false;
  const doc = contract?.signedDocument;
  return !doc?.mimeType || isPdfType(doc.mimeType, doc.originalName);
}

export const scanPath = (contract) => `/leases/documents/${contract.signedDocumentId}/file`;

export const isPdfType = (type = "", name = "") => /pdf/i.test(type) || /\.pdf$/i.test(name);
export const isImageType = (type = "") => /^image\/(jpeg|png|webp)/.test(type);

export function scanFileName(contract, type = "") {
  const doc = contract?.signedDocument;
  if (doc?.originalName) return doc.originalName;
  const ext = EXT[type] || EXT[doc?.mimeType] || "pdf";
  return `contrat-signe-${contract?.id ?? ""}.${ext}`;
}

export function formatBytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  if (v < 1024 * 1024) return `${Math.max(1, Math.round(v / 1024))} ko`;
  return `${(v / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

const revokeLater = (url) => setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);

const popupMsg = () => t("Autorisez les fenêtres popup pour imprimer le contrat.");

// Imprimer le scan : image = popup contenant l'image puis print() ; PDF = ouvert dans un onglet
// (impression depuis la visionneuse du navigateur). Fenêtre ouverte AVANT l'await (anti-popup-blocker).
export async function printSignedScan(contract, { onError } = {}) {
  const win = window.open("", "_blank");
  if (!win) {
    if (onError) onError(popupMsg()); else window.alert(popupMsg());
    return;
  }
  try {
    const blob = await api.fetchAuthenticatedBlob(scanPath(contract));
    const url = URL.createObjectURL(blob);
    revokeLater(url);
    if (isPdfType(blob.type, contract?.signedDocument?.originalName)) {
      win.location = url;
      return;
    }
    const doc = win.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t("Contrat signé")}</title><style>@page{margin:10mm}body{margin:0}img{display:block;max-width:100%;margin:0 auto}</style></head><body></body></html>`);
    doc.close();
    const img = doc.createElement("img");
    img.alt = t("Contrat signé");
    img.onload = () => { try { win.focus(); win.print(); } catch { /* popup fermée */ } };
    img.src = url;
    doc.body.appendChild(img);
  } catch (e) {
    win.close();
    if (onError) onError(e?.message || t("Impossible de charger le contrat signé.")); else throw e;
  }
}

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  revokeLater(url);
}

export async function downloadSignedScan(contract) {
  const blob = await api.fetchAuthenticatedBlob(scanPath(contract));
  const name = scanFileName(contract, blob.type);
  saveBlob(blob, name);
  return name;
}
