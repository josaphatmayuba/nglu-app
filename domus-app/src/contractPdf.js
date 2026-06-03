import jsPDF from "jspdf";
import { escapeHtml } from "./contractUtils.js";

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

export const downloadSignedContractPdf = (contract) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  pdf.setFontSize(11);
  pdf.setTextColor(113, 113, 122);
  pdf.text(`CONTRAT DE BAIL - ${contract.status === "signed" ? "SIGNE" : (contract.status || "").toUpperCase()}`, margin, margin);
  pdf.setFontSize(18);
  pdf.setTextColor(24, 24, 27);
  pdf.text(`Contrat #${contract.id}`, margin, margin + 8);
  pdf.setFontSize(11);
  pdf.setTextColor(82, 82, 91);
  let y = margin + 16;
  pdf.text(`Locataire : ${contract.tenantName || "-"}`, margin, y); y += 5;
  if (contract.tenantEmail) { pdf.text(`Email : ${contract.tenantEmail}`, margin, y); y += 5; }
  if (contract.signedAt) { pdf.text(`Signe le : ${formatDateTime(contract.signedAt)}`, margin, y); y += 5; }

  y += 4;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(24, 24, 27);
  const plainContent = contractHtmlToText(contract.contractContent || "Contenu du contrat indisponible.");
  const lines = pdf.splitTextToSize(plainContent, usableWidth);
  for (const line of lines) {
    if (y > pageHeight - margin - 50) { pdf.addPage(); y = margin; }
    pdf.text(line, margin, y);
    y += 4.5;
  }

  if (y > pageHeight - margin - 70) { pdf.addPage(); y = margin; }
  y += 4;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  const colWidth = (usableWidth - 8) / 2;
  const colX = [margin, margin + colWidth + 8];
  const sigStartY = y;

  pdf.setFontSize(11);
  pdf.setTextColor(82, 82, 91);
  pdf.text("Signature du locataire", colX[0], sigStartY);
  let leftY = sigStartY + 4;
  if (contract.signatureData) {
    try {
      pdf.addImage(contract.signatureData, "PNG", colX[0], leftY, 70, 28);
      leftY += 30;
    } catch {
      pdf.setFontSize(9);
      pdf.setTextColor(220, 38, 38);
      pdf.text("[Image signature illisible]", colX[0], leftY);
      leftY += 6;
    }
    if (contract.signedAt) {
      pdf.setFontSize(10);
      pdf.setTextColor(22, 163, 74);
      pdf.text(`Signe le ${formatDateTime(contract.signedAt)}`, colX[0], leftY);
      leftY += 5;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(161, 161, 170);
    pdf.text("Aucune signature enregistree.", colX[0], leftY);
    leftY += 6;
  }

  pdf.setFontSize(11);
  pdf.setTextColor(82, 82, 91);
  pdf.text("Signature du bailleur", colX[1], sigStartY);
  let rightY = sigStartY + 4;
  const company = contract.companyInfo || {};
  const landlordName = company.companyName || contract.landlordName || "Le Bailleur";
  const dateStr = formatDateTime(contract.sentAt || contract.createdAt);
  if (company.landlordSignature) {
    try {
      pdf.addImage(company.landlordSignature, "PNG", colX[1], rightY, 70, 28);
      rightY += 30;
    } catch {
      pdf.setFontSize(9);
      pdf.setTextColor(220, 38, 38);
      pdf.text("[Image signature bailleur illisible]", colX[1], rightY);
      rightY += 6;
    }
    pdf.setFontSize(10);
    pdf.setTextColor(24, 24, 27);
    pdf.text(landlordName, colX[1], rightY); rightY += 5;
    if (dateStr) {
      pdf.setTextColor(22, 163, 74);
      pdf.text(dateStr, colX[1], rightY);
      rightY += 5;
    }
  } else {
    pdf.setDrawColor(79, 70, 229);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.rect(colX[1], rightY, 70, 28);
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(10);
    pdf.setTextColor(67, 56, 202);
    pdf.text(`Pour ${landlordName}`, colX[1] + 3, rightY + 9);
    pdf.setFontSize(9);
    pdf.setTextColor(22, 163, 74);
    pdf.text("Signature electronique", colX[1] + 3, rightY + 17);
    if (dateStr) pdf.text(dateStr, colX[1] + 3, rightY + 23);
  }

  const filename = `contrat-${contract.id}${contract.signedAt ? "-signe" : ""}.pdf`;
  pdf.save(filename);
  return filename;
};

function contractHtmlToText(value) {
  const source = String(value || "");
  const withBlocks = source
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|section|article|h[1-6]|li|tr)\s*>/gi, "\n")
    .replace(/<\s*\/?\s*(td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  const decoded = decodeHtmlEntities(withBlocks);
  return decoded
    .replace(/[\u00a0\u202f\u2007]/g, " ")
    .replace(/[ \t]*\/[ \t]*(?=\d{3}(?:\D|$))/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value) {
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}
