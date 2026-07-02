import jsPDF from "jspdf";
import { CONTRACT_PRINT_CSS, contractPrintBody } from "./contractPrintTemplate";

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("fr-FR") : "");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const landlordSignatureHtml = (contract) => {
  const company = contract.companyInfo || {};
  const name = company.companyName || contract.landlordName || "Le Bailleur";
  const dateRef = contract.sentAt || contract.createdAt;
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

export const printableSignedContractHtml = (contract) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contrat ${contract.id}</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    body { margin: 0; }
${CONTRACT_PRINT_CSS}
    @media print { .print-actions { display: none; } }
  </style>
</head>
<body class="contract-doc">
${contractPrintBody(contract)}
</body>
</html>`;

// Rend le contrat (même design que la vue imprimable Domus) et le télécharge en PDF.
export const downloadSignedContractPdf = async (contract) => {
  const pageWidthPx = 794; // A4 à 96dpi
  // jsPDF clone l'élément source avec ses styles inline : l'hôte doit rester neutre
  // (aucun offset), c'est le wrapper non cloné qui le sort de l'écran.
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
