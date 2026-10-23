// Utilitaires contrats Domus (aperçu, impression, libellés).
import { t } from "./i18n.js";
export const CONTRACT_STATUS = {
  draft: { label: "Brouillon", chip: "chip-ink", tone: "muted" },
  sent: { label: "Envoyé", chip: "chip-amber", tone: "warning" },
  viewed: { label: "Consulté", chip: "chip-iris", tone: "warning" },
  signed: { label: "Signé", chip: "chip-emerald", tone: "success" },
  expired: { label: "Expiré", chip: "chip-rose", tone: "muted" },
  deleted: { label: "Supprimé", chip: "chip-ink", tone: "muted" },
};

// Signé sur papier : le scan importé fait foi (signers en méthode « paper » ou scan attaché).
export function hasSignedScan(c) {
  return Boolean(c?.signedDocumentId);
}

export function isPaperSigned(c) {
  if (!c || c.status !== "signed") return false;
  if (c.signedDocumentId) return true;
  return Array.isArray(c.signers) && c.signers.some((s) => s?.method === "paper");
}

// Signé mais sans aucune preuve : ni scan actif, ni signature électronique.
export function isProofMissing(c) {
  if (!c || c.status !== "signed" || c.signedDocumentId) return false;
  const paper = Array.isArray(c.signers) && c.signers.some((s) => s?.method === "paper");
  return !c.signatureData || paper;
}

// Méta de statut (libellé + chip) : « Signé (papier) » pour un bail signé à la main.
export function contractStatusMeta(c) {
  const base = CONTRACT_STATUS[c?.status] || CONTRACT_STATUS.draft;
  // Résumés de liste sans signatureData : on ne peut pas conclure à une preuve manquante.
  if (c && "signatureData" in c && isProofMissing(c)) return { ...base, label: t("Preuve manquante"), chip: "chip-amber" };
  return isPaperSigned(c) ? { ...base, label: t("Signé (papier)") } : base;
}

export const TEMPLATE_TYPE_LABEL = {
  residential: "Bail résidentiel",
  commercial: "Bail commercial",
  furnished_short: "Bail meublé court séjour",
};

export const AUDIT_EVENT_LABEL = {
  created: "Contrat généré",
  sent: "Envoyé pour signature",
  viewed: "Consulté par le locataire",
  signed: "Signé électroniquement",
  signed_paper: "Signé sur papier (scan importé)",
  scan_replaced: "Scan signé remplacé",
  scan_removed: "Scan de preuve supprimé",
  welcome_sent: "Message de bienvenue envoyé",
  template_changed: "Modèle de bail modifié",
  status_changed: "Statut mis à jour",
  deleted: "Contrat retiré",
};

// Libellé d'un event d'audit ; anciennes lignes : « signed » + détail « Signature papier… » = papier.
export function auditEventLabel(log) {
  const ev = log?.event;
  if (ev === "signed" && String(log?.details || "").startsWith("Signature papier")) return AUDIT_EVENT_LABEL.signed_paper;
  return AUDIT_EVENT_LABEL[ev] || ev;
}

export function auditIsSigned(log) {
  return log?.event === "signed" || log?.event === "signed_paper" || auditEventLabel(log) === AUDIT_EVENT_LABEL.signed_paper;
}

// Détail d'audit : anciennes lignes créées en anglais traduites.
export function auditDetails(log) {
  const d = String(log?.details || "");
  const m = d.match(/^Contract created for lease #(\d+)/);
  if (m) return `Contrat généré pour le bail n°${m[1]}`;
  const tpl = d.match(/^Template changed to "(.*)"$/);
  if (tpl) return `Modèle changé : "${tpl[1]}"`;
  const signedBy = d.match(/^Signed by (.+)$/);
  if (signedBy) return `Signé par ${signedBy[1] === "tenant" ? "locataire" : signedBy[1]}`;
  const sentTo = d.match(/^Sent to (.+)$/);
  if (sentTo) return `Envoyé à ${sentTo[1].replace(/^no email/, "aucun e-mail").replace(/\(email en echec\)/, "(e-mail en échec)")}`;
  const resentTo = d.match(/^Resent to (.+)$/);
  if (resentTo) return `Renvoyé à ${resentTo[1].replace(/^no email/, "aucun e-mail")}`;
  return d
    .replace(/Signature papier importee/g, "Signature papier importée")
    .replace(/Message de bienvenue envoye/g, "Message de bienvenue envoyé");
}

export function contractRef(contract) {
  if (!contract?.id) return "—";
  const year = contract.createdAt ? new Date(contract.createdAt).getFullYear() : new Date().getFullYear();
  return `CTR-${year}-${String(contract.id).padStart(3, "0")}`;
}

export function hasHtmlMarkup(value = "") {
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatSignedAt(value) {
  if (!value) return "Non signé";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non signé";
  return date.toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatAuditWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// Décoration purement visuelle : ajoute des classes CSS sur les lignes remarquables
// (titre, ARTICLE N, "Fait à ...") sans modifier un seul caractère du texte.
function decorateContractContent(html) {
  return String(html)
    .replace(
      /<p(?![^>]*class=)([^>]*)>(\s*(?:<(?:strong|b)>\s*)?CONTRAT DE BAIL)/i,
      '<p$1 class="doc-title">$2',
    )
    .replace(
      /<p(?![^>]*class=)([^>]*)>(\s*(?:<(?:strong|b)>\s*)?ARTICLE\s+\d+\s*:)/gi,
      '<p$1 class="article-heading">$2',
    )
    .replace(
      /<p(?![^>]*class=)([^>]*)>(\s*Fait à\s)/i,
      '<p$1 class="closing-line">$2',
    );
}

// Rend un contrat en texte brut ligne par ligne avec les mêmes classes de décoration
// (titre, ARTICLE N, "Fait à ...") — le texte reste strictement identique.
function plainContractHtml(content) {
  const lines = String(content).replace(/\r\n/g, "\n").split("\n");
  let titleDone = false;
  const blocks = lines.map((line) => {
    if (!line.trim()) return "";
    const text = escapeHtml(line);
    if (!titleDone && /^\s*CONTRAT\b/i.test(line)) {
      titleDone = true;
      return `<div class="doc-title">${text}</div>`;
    }
    if (/^\s*ARTICLE\s+\d+\s*:/i.test(line)) return `<div class="article-heading">${text}</div>`;
    if (/^\s*Fait à\s/i.test(line)) return `<div class="closing-line">${text}</div>`;
    if (/^\s*(LE\s+)?(BAILLEUR|PRENEUR)\b[^:]*:/i.test(line)) return `<div class="party-line">${text}</div>`;
    return `<div class="para">${text}</div>`;
  });
  return `<div class="plain-contract-content">${blocks.join("")}</div>`;
}

function contractContentHtml(value = "") {
  const content = String(value || "");
  return hasHtmlMarkup(content)
    ? decorateContractContent(content)
    : plainContractHtml(content);
}

// Une signature enregistrée quasi vide (point, image 1x1) ne compte pas comme signature.
export function isRealSignature(sig) {
  return typeof sig === "string" && sig.startsWith("data:image") && sig.length > 600;
}

// Signature du bailleur du contrat : uniquement celle du PROPRIETAIRE du bail
// (la signature générique des Réglages n'est plus utilisée). Vide = non signé d'avance.
export function landlordSignatureOf(contract) {
  const sig = contract?.landlordInfo?.signature;
  return isRealSignature(sig) ? sig : null;
}

// Locataire entreprise : champs societe + representant lus a plat sur le contrat/bail
// (ou sur contract.tenant / contract.lease si l'API les imbrique). null pour un particulier.
export function companyTenantOf(src) {
  const c = src || {};
  const cand = [c, c.tenant, c.lease].find((x) => x && x.tenantType === "company");
  return cand || null;
}

// Bloc « preneur » entreprise : parties vides omises.
// « {companyName}, {legalForm}, RCCM {rccm}, Id.Nat {companyNationalId}, NIF {taxId},
//   siege {companyAddress}, representee par {representativeName}, en sa qualite de {representativeTitle} »
export function companyPreneurText(src) {
  const c = companyTenantOf(src);
  if (!c) return "";
  const head = [
    c.companyName,
    c.legalForm,
    c.rccm && `RCCM ${c.rccm}`,
    c.companyNationalId && `Id.Nat ${c.companyNationalId}`,
    c.taxId && `NIF ${c.taxId}`,
    c.companyAddress && `siège ${c.companyAddress}`,
  ].filter((v) => String(v || "").trim()).join(", ");
  const rep = c.representativeName
    ? `représentée par ${c.representativeName}${c.representativeTitle ? `, en sa qualité de ${c.representativeTitle}` : ""}`
    : "";
  return [head, rep].filter(Boolean).join(", ");
}

function landlordPrintBlock(contract, withSignature = true) {
  const company = contract?.companyInfo || {};
  const landlordInfo = contract?.landlordInfo || {};
  const name = landlordInfo.name || contract?.landlordName || company.landlordName || company.companyName || "Bailleur";
  const sig = withSignature ? landlordSignatureOf(contract) : null;
  if (sig) {
    return `<img class="signature-image" src="${sig}" alt="Signature bailleur" /><div class="signature-name">${escapeHtml(name)}</div>`;
  }
  return `<div class="signature-line"></div><div class="signature-name">${escapeHtml(name)}</div>`;
}

export const CONTRACT_PRINT_CSS = `
    .contract-doc {
      background: #ffffff;
      color: #1a1a1a;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .contract-doc * { box-sizing: border-box; }
    .contract-doc img { max-width: 100%; }
    .print-actions { margin: 10px 0 14px; text-align: right; }
    .print-actions button {
      background: #1a1a1a;
      border: 1px solid #b08d3e;
      color: #f6f1e7;
      cursor: pointer;
      font-family: Georgia, serif;
      font-size: 12px;
      letter-spacing: .12em;
      padding: 9px 22px;
      text-transform: uppercase;
    }
    .contract-doc .header { margin: 0 0 2px; text-align: right; }
    .contract-doc .doc-ref { color: #8a7a55; font-size: 9px; letter-spacing: .08em; line-height: 1.2; }
    .contract-doc .contract-content { color: #292524; font-size: 12px; line-height: 1.5; margin-top: 12px; }
    .contract-doc .contract-content p { margin: 0 0 7px; orphans: 3; text-align: justify; widows: 3; }
    .contract-doc .contract-content li { margin-bottom: 6px; orphans: 3; widows: 3; }
    .contract-doc .contract-content ul, .contract-doc .contract-content ol { margin: 0 0 14px; padding-left: 26px; }
    .contract-doc .contract-content h1, .contract-doc .contract-content h2, .contract-doc .contract-content h3, .contract-doc .contract-content h4 {
      break-after: avoid;
      color: #1a1a1a;
      font-weight: normal;
      letter-spacing: .05em;
      margin: 26px 0 10px;
      page-break-after: avoid;
    }
    .contract-doc .contract-content h1 { font-size: 20px; }
    .contract-doc .contract-content h2 { border-bottom: 1px solid #d6c39a; font-size: 16px; padding-bottom: 6px; }
    .contract-doc .contract-content h3 { font-size: 14px; font-variant: small-caps; letter-spacing: .1em; }
    .contract-doc .contract-content h4 { font-size: 13px; font-style: italic; }
    .contract-doc .contract-content table { border-collapse: collapse; margin: 0 0 14px; max-width: 100%; width: 100%; }
    .contract-doc .contract-content th, .contract-doc .contract-content td { border: 1px solid #d6d3d1; padding: 7px 10px; text-align: left; vertical-align: top; }
    .contract-doc .contract-content th { background: #faf7f0; font-variant: small-caps; letter-spacing: .06em; }
    .contract-doc .contract-content hr { border: 0; border-top: 1px solid #d6c39a; margin: 22px auto; width: 60%; }
    .contract-doc .contract-content .para { margin: 0 0 7px; orphans: 3; text-align: justify; widows: 3; }
    .contract-doc .contract-content .doc-title {
      border-bottom: 3px double #b08d3e;
      color: #1a1a1a;
      font-size: 21px;
      font-weight: normal;
      letter-spacing: .16em;
      margin: 4px auto 16px;
      padding-bottom: 8px;
      text-align: center;
      text-transform: uppercase;
      width: fit-content;
    }
    .contract-doc .contract-content .article-heading {
      break-after: avoid;
      color: #1a1a1a;
      font-size: 14.5px;
      font-variant: small-caps;
      font-weight: bold;
      letter-spacing: .14em;
      margin: 16px 0 6px;
      page-break-after: avoid;
      text-align: center;
    }
    .contract-doc .contract-content .article-heading::before {
      border-top: 1px solid #b08d3e;
      content: "";
      display: block;
      margin: 0 auto 12px;
      width: 56px;
    }
    .contract-doc .contract-content .closing-line {
      font-style: italic;
      margin-top: 34px;
      text-align: center;
    }
    .contract-doc .contract-content .party-line {
      background: #faf7f0;
      border-left: 2px solid #b08d3e;
      margin: 0 0 12px;
      padding: 8px 14px;
    }
    .contract-doc .plain-contract-content { font-family: Georgia, "Times New Roman", serif; font-size: 12px; line-height: 1.5; margin: 0; }
    .contract-doc .signature { break-inside: avoid; margin-top: 22px; page-break-inside: avoid; padding-top: 14px; position: relative; }
    .contract-doc .signature::before {
      border-top: 3px double #b08d3e;
      content: "";
      display: block;
      left: 50%;
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      width: 160px;
    }
    .contract-doc .signature h2 {
      color: #57534e;
      font-size: 12px;
      font-variant: small-caps;
      font-weight: normal;
      letter-spacing: .22em;
      margin: 0 0 14px;
      text-transform: uppercase;
    }
    .contract-doc .signature-grid { display: grid; gap: 40px; grid-template-columns: 1fr 1fr; row-gap: 28px; text-align: center; }
    .contract-doc .signature-grid > div { break-inside: avoid; }
    .contract-doc .signature-image {
      background: #fff;
      border: 1px solid #d6c39a;
      max-height: 80px;
      max-width: 300px;
      padding: 10px;
    }
    .contract-doc .signature-name { color: #57534e; font-size: 11.5px; font-style: italic; letter-spacing: .04em; margin-top: 8px; }
    .contract-doc .signature-date { color: #57534e; font-size: 11.5px; font-style: italic; letter-spacing: .04em; margin-top: 10px; }
    .contract-doc .signature-paper { border: 1px solid #d6c39a; display: inline-block; font-style: italic; min-width: 240px; padding: 22px 18px; }
    .contract-doc .contract-watermark {
      color: rgba(0, 0, 0, 0.08);
      font-size: 84px;
      font-weight: bold;
      left: 0;
      letter-spacing: .08em;
      pointer-events: none;
      position: fixed;
      right: 0;
      text-align: center;
      text-transform: uppercase;
      top: 38%;
      transform: rotate(-30deg);
      white-space: nowrap;
      z-index: 0;
    }
    @media print { .contract-doc .contract-watermark.screen-only { display: none; } }
    .contract-doc .signature-line { border-bottom: 1px solid #1a1a1a; display: inline-block; min-width: 240px; padding: 34px 0 8px; }
    .contract-doc .signature p { color: #57534e; font-size: 11.5px; font-style: italic; letter-spacing: .04em; margin: 26px 0 0; text-align: center; }
    .contract-doc .typed-signature {
      border: 1px solid #d6c39a;
      background: #fff;
      display: inline-block;
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 30px;
      min-width: 240px;
      padding: 20px 18px 12px;
    }
`;

const SIG_DOTS = "..............................";

// Grille des deux signatures. withSignatures=false : emplacements vides, à signer à la main.
function signatureGridHtml(contract, withSignatures = true) {
  const landlordSig = withSignatures ? landlordSignatureOf(contract) : null;
  const landlordDate = landlordSig && (contract?.sentAt || contract?.createdAt)
    ? escapeHtml(formatSignedAt(contract.sentAt || contract.createdAt))
    : SIG_DOTS;
  const hasTenantSig = withSignatures && contract?.signatureData;
  const paper = isPaperSigned(contract);
  const tenantDate = (hasTenantSig || paper) && contract?.signedAt ? escapeHtml(formatSignedAt(contract.signedAt)) : SIG_DOTS;
  const tenantSignature = hasTenantSig
    ? `<img class="signature-image" src="${contract.signatureData}" alt="Signature du locataire" />`
    : paper
      ? `<div class="signature-paper">Signé sur papier (voir scan)</div>`
      : `<div class="signature-line"></div>`;
  const landlordBlock = `<div>
        <h2>Signature du bailleur</h2>${landlordPrintBlock(contract, withSignatures)}
        <div class="signature-date">Signé le : ${landlordDate}</div>
      </div>`;

  // Locataire entreprise : le signataire est le representant legal.
  const companyTenant = companyTenantOf(contract);
  const tenantSignerName = companyTenant?.representativeName || contract?.tenantName;
  const tenantQuality = companyTenant
    ? `<div class="signature-name">Pour ${escapeHtml(companyTenant.companyName || "")}${companyTenant.representativeTitle ? `, ${escapeHtml(companyTenant.representativeTitle)}` : ""}</div>`
    : "";

  // Bail multi-locataires (2 a 4) : un bloc de signature par locataire.
  const signers = Array.isArray(contract?.printTenants) ? contract.printTenants : [];
  if (signers.length >= 2) {
    const tenantBlocks = signers.map((s) => {
      const sig = withSignatures && isRealSignature(s.signatureData) ? s.signatureData : null;
      const paperSigned = !sig && isPaperSigned(contract);
      const date = (sig || paperSigned) && s.signedAt ? escapeHtml(formatSignedAt(s.signedAt)) : SIG_DOTS;
      return `<div>
        <h2>Signature du locataire</h2>${sig
          ? `<img class="signature-image" src="${sig}" alt="Signature du locataire" />`
          : paperSigned
            ? `<div class="signature-paper">Signé sur papier (voir scan)</div>`
            : `<div class="signature-line"></div>`}
        <div class="signature-name">${escapeHtml(s.name || "")}</div>
        <div class="signature-date">Signé le : ${date}</div>
      </div>`;
    });
    return `<div class="signature-grid">${landlordBlock}${tenantBlocks.join("")}</div>`;
  }

  return `<div class="signature-grid">
      ${landlordBlock}
      <div>
        <h2>Signature du locataire</h2>${tenantSignature}
        ${tenantSignerName ? `<div class="signature-name">${escapeHtml(String(tenantSignerName).toLocaleUpperCase("fr"))}</div>` : ""}
        ${tenantQuality}
        <div class="signature-date">Signé le : ${tenantDate}</div>
      </div>
    </div>`;
}

// Filigrane imprimé (impression + PDF) : uniquement « NON SIGNÉ » pour la version générée (generated=true)
// d'un bail déjà signé sur papier. Un brouillon imprimé pour signature manuscrite puis scanné ne porte JAMAIS de filigrane.
export function contractWatermark(contract, generated = false) {
  if (generated && (isPaperSigned(contract) || isProofMissing(contract))) return "NON SIGNÉ";
  return "";
}

// Mention « PROJET – non signé » : affichage ÉCRAN seulement (masquée à l'impression, absente du PDF).
export function contractDraftMark(contract) {
  return contract?.status !== "signed" ? "PROJET – non signé" : "";
}

// Mention « PROJET – non signé » visible dans la modale de l'app (écran seulement, jamais imprimée).
export function contractDraftMarkScreen(contract) {
  return ["draft", "sent", "viewed"].includes(contract?.status) ? "PROJET – non signé" : "";
}

export function contractPrintBody(contract, { generated = false, forScreen = true } = {}) {
  const wm = contractWatermark(contract, generated);
  const draft = forScreen && !wm ? contractDraftMark(contract) : "";
  return `${wm ? `<div class="contract-watermark" aria-hidden="true">${escapeHtml(wm)}</div>` : ""}${draft ? `<div class="contract-watermark screen-only" aria-hidden="true">${escapeHtml(draft)}</div>` : ""}
  <div class="header">
    <div class="doc-ref">${escapeHtml(contractRef(contract))}</div>
  </div>
  <div class="contract-content">${contractContentHtml(contract?.contractContent || "")}</div>
  <div class="signature">${signatureGridHtml(contract)}</div>`;
}

export function contractPrintHtml(contract, opts = {}) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contrat ${escapeHtml(contractRef(contract))}</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    body { margin: 0; }
${CONTRACT_PRINT_CSS}
    .print-actions label { font-family: Arial, sans-serif; font-size: 12px; margin-right: 14px; }
    @media print { .print-actions { display: none; } }
  </style>
</head>
<body class="contract-doc">
  <div class="print-actions">${landlordSignatureOf(contract) || contract?.signatureData ? '<label><input type="checkbox" id="sig-toggle" checked /> Inclure les signatures électroniques (décochez pour signer à la main)</label> ' : ""}<button type="button">Imprimer / PDF</button></div>
${contractPrintBody(contract, opts)}
</body>
</html>`;
}

export function openContractPrint(contract, { autoPrint = true, onError, generated = false } = {}) {
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) {
    const msg = "Autorisez les fenêtres popup pour imprimer le contrat.";
    if (onError) onError(msg); else window.alert(msg);
    return;
  }
  win.document.open();
  win.document.write(contractPrintHtml(contract, { generated }));
  win.document.close();
  win.focus();
  // La popup about:blank hérite de la CSP de l'app : pas de onclick inline, on pilote depuis l'opener.
  const triggerPrint = () => {
    try { win.focus(); win.print(); } catch { /* popup fermée */ }
  };
  const btn = win.document.querySelector(".print-actions button");
  if (btn) btn.addEventListener("click", triggerPrint);
  const toggle = win.document.getElementById("sig-toggle");
  const sigBox = win.document.querySelector(".signature");
  if (toggle && sigBox) {
    toggle.addEventListener("change", () => { sigBox.innerHTML = signatureGridHtml(contract, toggle.checked); });
  }
  if (autoPrint && !toggle) {
    if (win.document.readyState === "complete") setTimeout(triggerPrint, 250);
    else win.addEventListener("load", () => setTimeout(triggerPrint, 250));
  }
}

export function signingUrlFromContract(contract, signingLinks = {}) {
  if (signingLinks[contract?.id]) return signingLinks[contract.id];
  if (contract?.signingUrl) return contract.signingUrl;
  const token = contract?.signerToken;
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/sign/${token}`;
}
