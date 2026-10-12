import jsPDF from "jspdf";
import { CONTRACT_PRINT_CSS, contractPrintBody, escapeHtml, landlordSignatureOf } from "./contractUtils.js";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR");
};

export const landlordSignatureHtml = (contract) => {
  const company = contract?.companyInfo || {};
  const landlordInfo = contract?.landlordInfo || {};
  const name = landlordInfo.name || contract?.landlordName || company.landlordName || company.companyName || "Le Bailleur";
  const signature = landlordSignatureOf(contract);
  const dateRef = contract?.sentAt || contract?.createdAt;
  const dateStr = formatDateTime(dateRef);

  if (signature) {
    return `
      <h3>Signature du bailleur</h3>
      <div class="signature-img"><img src="${signature}" alt="Signature bailleur" /></div>
      <div class="signed-on">${escapeHtml(name)}${dateStr ? ` - ${escapeHtml(dateStr)}` : ""}</div>`;
  }

  return `
      <h3>Signature du bailleur</h3>
      <div class="signature-stamp">
        <strong>Pour ${escapeHtml(name)}</strong>
        <span>Signature electronique${dateStr ? ` le ${escapeHtml(dateStr)}` : ""}</span>
      </div>`;
};

const tenantSignatureBlockHtml = (sigData, signedAt, name) => `
    <div>
      <h3>Signature du locataire</h3>
      ${name ? `<div class="signed-on">${escapeHtml(name)}</div>` : ""}
      ${
        sigData
          ? `<div class="signature-body"><div class="signature-img"><img src="${sigData}" alt="Signature locataire" /></div></div>
             <div class="signed-on">${signedAt ? `Date de signature : ${escapeHtml(formatDateTime(signedAt))}` : "Date de signature : —"}</div>`
          : `<div class="signature-body"><div class="signature-empty">Aucune signature locataire enregistree.</div></div>`
      }
    </div>`;

export const contractSignaturesHtml = (contract) => {
  const signers = Array.isArray(contract?.signers) ? contract.signers : [];
  if (signers.length < 2) return legacyContractSignaturesHtml(contract);
  return `
  <div class="domus-contract-signatures">
    ${signers.map((s) => tenantSignatureBlockHtml(s.signatureData, s.signedAt, s.name)).join("")}
    <div>${landlordSignatureHtml(contract)}</div>
  </div>`;
};

const legacyContractSignaturesHtml = (contract) => `
  <div class="domus-contract-signatures">
    <div>
      <h3>Signature du locataire</h3>
      ${
        contract?.signatureData
          ? `<div class="signature-body"><div class="signature-img"><img src="${contract.signatureData}" alt="Signature locataire" /></div></div>
             <div class="signed-on">${contract.signedAt ? `Date de signature : ${escapeHtml(formatDateTime(contract.signedAt))}` : "Date de signature : —"}</div>`
          : `<div class="signature-body"><div class="signature-empty">Aucune signature locataire enregistree.</div></div>`
      }
    </div>
    <div>${landlordSignatureHtml(contract)}</div>
  </div>`;

// jsPDF n'embarque que les polices standard (Times, encodage WinAnsi) : tout caract\u00e8re hors
// WinAnsi sort en charabia ("1 650,00" avec espace fine U+202F -> "1 /650,00", puces \u25e6 -> "%\u00e6").
// On les remplace par leur \u00e9quivalent s\u00fbr avant le rendu.
const PDF_CHAR_MAP = [
  [/[\u202f\u2009\u2007\u2002\u2003\u2008\u200a]/g, " "],
  [/[\u200b-\u200d\ufeff\u2060]/g, ""],
  [/[\u25e6\u25aa\u25cf\u25cb\u2023\u2043\u2219\u00b7]/g, "\u2022"],
  [/[\u2010\u2011\u2012\u2212]/g, "-"],
  [/\u2264/g, "<="],
  [/\u2265/g, ">="],
];
const WINANSI_EXTRA = "\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178";

export const sanitizeForPdf = (text) => {
  let out = String(text);
  for (const [re, to] of PDF_CHAR_MAP) out = out.replace(re, to);
  // Tout ce qui reste hors Latin-1 / WinAnsi est remplac\u00e9 par "?" plut\u00f4t que par du charabia.
  return out.replace(/[^\u0000-\u00ff]/g, (c) => (WINANSI_EXTRA.includes(c) ? c : "?"));
};

const sanitizeTextNodes = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const clean = sanitizeForPdf(node.nodeValue);
    if (clean !== node.nodeValue) node.nodeValue = clean;
  }
};

// Surcharges PDF : polices aux m\u00e9triques identiques \u00e0 Times (sinon espaces/lettres d\u00e9cal\u00e9s),
// pas d'espacement de lettres ni de petites capitales (positionnement mot \u00e0 mot impr\u00e9cis),
// puces simples \u00e0 tous les niveaux de liste.
const PDF_OVERRIDE_CSS = `
  .contract-doc, .contract-doc * { font-family: "Times New Roman", Times, serif !important; letter-spacing: 0 !important; font-variant: normal !important; }
  .contract-doc .contract-content .article-heading, .contract-doc .contract-content .doc-title { letter-spacing: .06em !important; }
  .contract-doc ul, .contract-doc ul ul, .contract-doc ul ul ul { list-style-type: disc !important; }
  .contract-doc ol ul, .contract-doc ol ol ul { list-style-type: disc !important; }
`;

// Rend le contrat (m\u00eame design que la vue imprimable) et le t\u00e9l\u00e9charge automatiquement en PDF.
export const downloadSignedContractPdf = async (contract) => {
  const pageWidthPx = 794; // A4 \u00e0 96dpi
  // jsPDF clone l'\u00e9l\u00e9ment source avec ses styles inline : l'h\u00f4te doit rester neutre
  // (aucun offset), c'est le wrapper non clon\u00e9 qui le sort de l'\u00e9cran.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-12000px;top:0;z-index:-1;";
  const host = document.createElement("div");
  host.style.cssText = `width:${pageWidthPx}px;background:#fff;`;
  host.innerHTML = `<style>${CONTRACT_PRINT_CSS}${PDF_OVERRIDE_CSS}</style><div class="contract-doc">${contractPrintBody(contract)}</div>`;
  sanitizeTextNodes(host);
  wrapper.appendChild(host);
  document.body.appendChild(wrapper);
  try {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidthPt = pdf.internal.pageSize.getWidth(); // 595pt
    const marginPt = 51; // ~18mm
    await pdf.html(host, {
      autoPaging: "text",
      margin: [57, marginPt, 57, marginPt],
      width: pageWidthPt - marginPt * 2,
      windowWidth: pageWidthPx,
    });
    const filename = `contrat-${contract.id}${contract.signedAt ? "-signe" : ""}.pdf`;
    pdf.save(filename);
    return filename;
  } finally {
    wrapper.remove();
  }
};
