import jsPDF from "jspdf";

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
  <title>Contrat #${contract.id}</title>
  <style>
    body { color: #18181b; font-family: Arial, sans-serif; margin: 24mm; line-height: 1.55; }
    .head { border-bottom: 2px solid #18181b; margin-bottom: 24px; padding-bottom: 14px; }
    .eyebrow { color: #71717a; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
    h1 { font-size: 22px; margin: 6px 0 4px; }
    .meta { color: #52525b; font-size: 13px; }
    .content { white-space: pre-wrap; margin: 18px 0 30px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-top: 1px solid #d4d4d8; padding-top: 18px; }
    .signatures > div { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 14px; text-align: center; }
    .signatures h3 { font-size: 13px; letter-spacing: .05em; margin: 0 0 10px; text-transform: uppercase; color: #52525b; }
    .signature-img { background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; display: inline-block; padding: 8px; }
    .signature-img img { display: block; max-width: 260px; height: auto; }
    .signed-on { color: #16a34a; font-size: 13px; font-weight: 600; margin-top: 8px; }
    .signature-stamp { background: #fff; border: 2px dashed #4f46e5; border-radius: 10px; color: #4338ca; padding: 18px; }
    .signature-stamp strong { display: block; font-size: 14px; margin-bottom: 6px; }
    .signature-stamp span { color: #16a34a; display: block; font-size: 12px; font-weight: 600; }
    @media print { body { margin: 18mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:14px"><button onclick="window.print()" style="background:#4f46e5;border:0;border-radius:8px;color:#fff;cursor:pointer;padding:9px 14px">Imprimer / Enregistrer PDF</button></div>
  <div class="head">
    <div class="eyebrow">Contrat de bail - ${contract.status === "signed" ? "Signe" : escapeHtml(contract.status || "-")}</div>
    <h1>Contrat #${contract.id}</h1>
    <div class="meta">
      Locataire&nbsp;: ${escapeHtml(contract.tenantName || "-")}<br />
      ${contract.tenantEmail ? `Email&nbsp;: ${escapeHtml(contract.tenantEmail)}<br />` : ""}
      ${contract.signedAt ? `Signe le&nbsp;: ${escapeHtml(formatDateTime(contract.signedAt))}` : ""}
    </div>
  </div>
  <div class="content">${escapeHtml(contract.contractContent || "Contenu du contrat indisponible.")}</div>
  <div class="signatures">
    <div>
      <h3>Signature du locataire</h3>
      ${contract.signatureData
        ? `<div class="signature-img"><img src="${contract.signatureData}" alt="Signature locataire" /></div>
           ${contract.signedAt ? `<div class="signed-on">Signe le ${escapeHtml(formatDateTime(contract.signedAt))}</div>` : ""}`
        : `<div style="color:#a1a1aa;font-style:italic">Aucune signature enregistree.</div>`}
    </div>
    <div>
      ${landlordSignatureHtml(contract)}
    </div>
  </div>
</body>
</html>`;

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
  if (contract.signedAt) {
    pdf.text(`Signe le : ${formatDateTime(contract.signedAt)}`, margin, y);
    y += 5;
  }

  y += 4;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(24, 24, 27);
  const lines = pdf.splitTextToSize(contract.contractContent || "Contenu du contrat indisponible.", usableWidth);
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
    } catch (e) {
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
  const dateRef = contract.sentAt || contract.createdAt;
  const dateStr = formatDateTime(dateRef);
  if (company.landlordSignature) {
    try {
      pdf.addImage(company.landlordSignature, "PNG", colX[1], rightY, 70, 28);
      rightY += 30;
    } catch (e) {
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
    rightY += 32;
  }

  y = Math.max(leftY, rightY);
  const filename = `contrat-${contract.id}${contract.signedAt ? "-signe" : ""}.pdf`;
  pdf.save(filename);
  return filename;
};
