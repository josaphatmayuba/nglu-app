// Read-only preview + PDF download for a signed contract.
// Opened when the user clicks "Voir contrat signé" or "Télécharger PDF"
// on a lease whose contract has been signed.

import { Button, Modal, message } from "antd";
import axios from "axios";
import jsPDF from "jspdf";
import moment from "moment";
import { Download, FileText, Printer, X } from "lucide-react";
import { useEffect, useState } from "react";

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
    .signature-section { border-top: 1px solid #d4d4d8; padding-top: 18px; }
    .signature-section h3 { font-size: 13px; letter-spacing: .05em; margin: 0 0 8px; text-transform: uppercase; color: #52525b; }
    .signature-img { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; max-width: 360px; padding: 8px; }
    .signature-img img { display: block; max-width: 100%; height: auto; }
    .signed-on { color: #16a34a; font-size: 13px; font-weight: 600; margin-top: 8px; }
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
  ${contract.signatureData ? `
  <div class="signature-section">
    <h3>Signature du locataire</h3>
    <div class="signature-img"><img src="${contract.signatureData}" alt="Signature" /></div>
    ${contract.signedAt ? `<div class="signed-on">✓ Signé le ${new Date(contract.signedAt).toLocaleString("fr-FR")}</div>` : ""}
  </div>` : ""}
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
  // Signature
  if (contract.signatureData) {
    if (y > pageHeight - margin - 60) { pdf.addPage(); y = margin; }
    y += 4;
    pdf.setDrawColor(228, 228, 231);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
    pdf.setFontSize(11);
    pdf.setTextColor(82, 82, 91);
    pdf.text("Signature du locataire", margin, y);
    y += 4;
    try {
      pdf.addImage(contract.signatureData, "PNG", margin, y, 80, 30);
      y += 32;
    } catch (e) {
      pdf.setFontSize(9);
      pdf.setTextColor(220, 38, 38);
      pdf.text("[Impossible d'inclure l'image de signature]", margin, y);
      y += 5;
    }
    if (contract.signedAt) {
      pdf.setFontSize(10);
      pdf.setTextColor(22, 163, 74);
      pdf.text(`Signé le ${new Date(contract.signedAt).toLocaleString("fr-FR")}`, margin, y);
    }
  }
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
            {contract.signatureData ? (
              <div className="immo-signed-contract-signature">
                <h3>Signature du locataire</h3>
                <img src={contract.signatureData} alt="Signature" />
                {contract.signedAt && (
                  <small>✓ Signé le {moment(contract.signedAt).format("DD/MM/YYYY HH:mm")}</small>
                )}
              </div>
            ) : (
              <div className="immo-signed-contract-signature unsigned">
                Aucune signature enregistrée.
              </div>
            )}
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
