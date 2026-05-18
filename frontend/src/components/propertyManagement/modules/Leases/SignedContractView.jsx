// Read-only preview + PDF download for a signed contract.
// Opened when the user clicks "Voir contrat signé" or "Télécharger PDF"
// on a lease whose contract has been signed.

import { Button, Modal, message } from "antd";
import axios from "axios";
import jsPDF from "jspdf";
import moment from "moment";
import { Download, FileText, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

const landlordStampHtml = (contract) => {
  const company = contract.companyInfo || {};
  const name = company.companyName || contract.landlordName || "Le Bailleur";
  const dateRef = contract.sentAt || contract.createdAt;
  const dateStr = dateRef ? new Date(dateRef).toLocaleString("fr-FR") : "";
  if (company.landlordSignature) {
    return `
      <h3>Signature du bailleur</h3>
      <div class="signature-img"><img src="${company.landlordSignature}" alt="Signature bailleur" /></div>
      <div class="signed-on">${name}${dateStr ? ` · ${dateStr}` : ""}</div>`;
  }
  return `
      <h3>Signature du bailleur</h3>
      <div class="signature-stamp">
        <strong>Pour ${name}</strong>
        <span>✓ Signé électroniquement${dateStr ? ` le ${dateStr}` : ""}</span>
      </div>`;
};

const printableHtml = (contract) => `<!doctype html>
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
    <div class="eyebrow">Contrat de bail · ${contract.status === "signed" ? "Signé" : (contract.status || "-")}</div>
    <h1>Contrat #${contract.id}</h1>
    <div class="meta">
      Locataire&nbsp;: ${contract.tenantName || "-"}<br />
      ${contract.tenantEmail ? `Email&nbsp;: ${contract.tenantEmail}<br />` : ""}
      ${contract.signedAt ? `Signé le&nbsp;: ${new Date(contract.signedAt).toLocaleString("fr-FR")}` : ""}
    </div>
  </div>
  <div class="content">${(contract.contractContent || "Contenu du contrat indisponible.").replace(/</g, "&lt;")}</div>
  <div class="signatures">
    <div>
      <h3>Signature du locataire</h3>
      ${contract.signatureData
        ? `<div class="signature-img"><img src="${contract.signatureData}" alt="Signature locataire" /></div>
           ${contract.signedAt ? `<div class="signed-on">✓ Signé le ${new Date(contract.signedAt).toLocaleString("fr-FR")}</div>` : ""}`
        : `<div style="color:#a1a1aa;font-style:italic">Aucune signature enregistrée.</div>`}
    </div>
    <div>
      ${landlordStampHtml(contract)}
    </div>
  </div>
</body>
</html>`;

const downloadPdf = (contract) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  // Header
  pdf.setFontSize(11);
  pdf.setTextColor(113, 113, 122);
  pdf.text(`CONTRAT DE BAIL · ${contract.status === "signed" ? "SIGNÉ" : (contract.status || "").toUpperCase()}`, margin, margin);
  pdf.setFontSize(18);
  pdf.setTextColor(24, 24, 27);
  pdf.text(`Contrat #${contract.id}`, margin, margin + 8);
  pdf.setFontSize(11);
  pdf.setTextColor(82, 82, 91);
  let y = margin + 16;
  pdf.text(`Locataire : ${contract.tenantName || "-"}`, margin, y); y += 5;
  if (contract.tenantEmail) { pdf.text(`Email : ${contract.tenantEmail}`, margin, y); y += 5; }
  if (contract.signedAt) {
    pdf.text(`Signé le : ${new Date(contract.signedAt).toLocaleString("fr-FR")}`, margin, y);
    y += 5;
  }
  // Body
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
  // Signatures (tenant left, landlord right)
  if (y > pageHeight - margin - 70) { pdf.addPage(); y = margin; }
  y += 4;
  pdf.setDrawColor(228, 228, 231);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 6;

  const colWidth = (usableWidth - 8) / 2;
  const colX = [margin, margin + colWidth + 8];
  const sigStartY = y;

  // Left column — tenant
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
      pdf.text(`✓ Signé le ${new Date(contract.signedAt).toLocaleString("fr-FR")}`, colX[0], leftY);
      leftY += 5;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(161, 161, 170);
    pdf.text("Aucune signature enregistrée.", colX[0], leftY);
    leftY += 6;
  }

  // Right column — landlord (image if configured, else text stamp)
  pdf.setFontSize(11);
  pdf.setTextColor(82, 82, 91);
  pdf.text("Signature du bailleur", colX[1], sigStartY);
  let rightY = sigStartY + 4;
  const company = contract.companyInfo || {};
  const landlordName = company.companyName || contract.landlordName || "Le Bailleur";
  const dateRef = contract.sentAt || contract.createdAt;
  const dateStr = dateRef ? new Date(dateRef).toLocaleString("fr-FR") : null;
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
      pdf.text(`✓ ${dateStr}`, colX[1], rightY);
      rightY += 5;
    }
  } else {
    // Text stamp fallback (dashed box approximation)
    pdf.setDrawColor(79, 70, 229);
    pdf.setLineDashPattern([1.5, 1.5], 0);
    pdf.rect(colX[1], rightY, 70, 28);
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(10);
    pdf.setTextColor(67, 56, 202);
    pdf.text(`Pour ${landlordName}`, colX[1] + 3, rightY + 9);
    pdf.setFontSize(9);
    pdf.setTextColor(22, 163, 74);
    pdf.text("✓ Signé électroniquement", colX[1] + 3, rightY + 17);
    if (dateStr) pdf.text(dateStr, colX[1] + 3, rightY + 23);
    rightY += 32;
  }
  y = Math.max(leftY, rightY);
  const filename = `contrat-${contract.id}${contract.signedAt ? "-signe" : ""}.pdf`;
  pdf.save(filename);
  return filename;
};

const SignedContractView = ({ open, contractId, onClose }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contractId) return;
    setLoading(true);
    axios
      .get(`property-management/contracts/${contractId}`)
      .then(({ data }) => setContract(data?.data || data))
      .catch(() => message.error("Impossible de charger le contrat."))
      .finally(() => setLoading(false));
  }, [open, contractId]);

  useEffect(() => {
    if (!open) setContract(null);
  }, [open]);

  const handlePrint = () => {
    if (!contract) return;
    const win = window.open("", "_blank", "width=920,height=1100");
    if (!win) {
      message.error("Autorisez les popups pour ouvrir l'aperçu.");
      return;
    }
    win.document.open();
    win.document.write(printableHtml(contract));
    win.document.close();
    win.focus();
  };

  const handleDownload = () => {
    if (!contract) return;
    try {
      const name = downloadPdf(contract);
      message.success(`Téléchargé : ${name}`);
    } catch (e) {
      message.error("Échec de la génération PDF.");
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div className="immo-modal-title">
          <span className="immo-modal-title-icon brand"><FileText size={20} /></span>
          <div>
            <strong>Contrat signé{contract ? ` #${contract.id}` : ""}</strong>
            <span>
              {contract?.signedAt
                ? `Signé le ${moment(contract.signedAt).format("DD/MM/YYYY HH:mm")}`
                : "Aperçu lecture seule"}
            </span>
          </div>
        </div>
      }
      onCancel={onClose}
      footer={null}
      width={820}
      destroyOnClose
      closeIcon={<X size={18} />}
    >
      {loading && <p style={{ color: "#71717a" }}>Chargement…</p>}
      {!loading && contract && (
        <>
          <div className="immo-signed-contract">
            <div className="immo-signed-contract-meta">
              <div><strong>Locataire</strong><span>{contract.tenantName || "-"}</span></div>
              {contract.tenantEmail && <div><strong>Email</strong><span>{contract.tenantEmail}</span></div>}
              <div><strong>Statut</strong><span className="immo-pill success">{contract.status === "signed" ? "Signé" : (contract.status || "-")}</span></div>
            </div>
            <pre className="immo-signed-contract-body">
              {contract.contractContent || "Contenu du contrat indisponible."}
            </pre>
            <div className="immo-signed-contract-signatures">
              {/* Tenant */}
              {contract.signatureData ? (
                <div className="immo-signed-contract-signature">
                  <h3>Signature du locataire</h3>
                  <img src={contract.signatureData} alt="Signature locataire" />
                  {contract.signedAt && (
                    <small>✓ Signé le {moment(contract.signedAt).format("DD/MM/YYYY HH:mm")}</small>
                  )}
                </div>
              ) : (
                <div className="immo-signed-contract-signature unsigned">
                  <h3>Signature du locataire</h3>
                  Aucune signature enregistrée.
                </div>
              )}

              {/* Landlord — real image if configured in app_setting, else text stamp */}
              {contract.companyInfo?.landlordSignature ? (
                <div className="immo-signed-contract-signature">
                  <h3>Signature du bailleur</h3>
                  <img src={contract.companyInfo.landlordSignature} alt="Signature bailleur" />
                  <small>
                    {contract.companyInfo?.companyName || contract.landlordName || "Le Bailleur"}
                    {contract.sentAt && ` · ${moment(contract.sentAt).format("DD/MM/YYYY HH:mm")}`}
                  </small>
                </div>
              ) : (
                <div className="immo-signed-contract-signature landlord-stamp">
                  <h3>Signature du bailleur</h3>
                  <div className="stamp">
                    <strong>Pour {contract.companyInfo?.companyName || contract.landlordName || "Le Bailleur"}</strong>
                    <span>
                      ✓ Signé électroniquement
                      {contract.sentAt && ` le ${moment(contract.sentAt).format("DD/MM/YYYY HH:mm")}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="immo-modal-footer" style={{ marginTop: 16 }}>
            <Button onClick={onClose}>Fermer</Button>
            <div className="immo-modal-footer-right">
              <Button icon={<Printer size={16} />} onClick={handlePrint}>Imprimer</Button>
              <Button type="primary" icon={<Download size={16} />} onClick={handleDownload}>
                Télécharger PDF
              </Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default SignedContractView;
