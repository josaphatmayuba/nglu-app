import jsPDF from "jspdf";
import { CONTRACT_PRINT_CSS, contractPrintBody, escapeHtml } from "./contractUtils.js";

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR");
};

export const landlordSignatureHtml = (contract) => {
  const company = contract?.companyInfo || {};
  const name = company.companyName || contract?.landlordName || "Le Bailleur";
  const dateRef = contract?.sentAt || contract?.createdAt;
  const dateStr = formatDateTime(dateRef);

  if (company.landlordSignature) {
    return `
      <h3>Signature du bailleur</h3>
      <div class="signature-img"><img src="${company.landlordSignature}" alt="Signature bailleur" /></div>
      <div class="signed-on">${escapeHtml(name)}${dateStr ? ` - ${escapeHtml(dateStr)}` : ""}</div>`;
  }

  return `
      <h3>Signature du bailleur</h3>
      <div class="signature-stamp">
        <strong>Pour ${escapeHtml(name)}</strong>
        <span>Signature electronique${dateStr ? ` le ${escapeHtml(dateStr)}` : ""}</span>
      </div>`;
};

export const contractSignaturesHtml = (contract) => `
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

// Rend le contrat (m\u00eame design que la vue imprimable) et le t\u00e9l\u00e9charge automatiquement en PDF.
export const downloadSignedContractPdf = async (contract) => {
  const pageWidthPx = 794; // A4 \u00e0 96dpi
  // jsPDF clone l'\u00e9l\u00e9ment source avec ses styles inline : l'h\u00f4te doit rester neutre
  // (aucun offset), c'est le wrapper non clon\u00e9 qui le sort de l'\u00e9cran.
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-12000px;top:0;z-index:-1;";
  const host = document.createElement("div");
  host.style.cssText = `width:${pageWidthPx}px;background:#fff;`;
  host.innerHTML = `<style>${CONTRACT_PRINT_CSS}</style><div class="contract-doc">${contractPrintBody(contract)}</div>`;
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
