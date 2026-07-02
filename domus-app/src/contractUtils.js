// Utilitaires contrats Domus (aperçu, impression, libellés).
export const CONTRACT_STATUS = {
  draft: { label: "Brouillon", chip: "chip-ink", tone: "muted" },
  sent: { label: "Envoyé", chip: "chip-amber", tone: "warning" },
  viewed: { label: "Consulté", chip: "chip-iris", tone: "warning" },
  signed: { label: "Signé", chip: "chip-emerald", tone: "success" },
  expired: { label: "Expiré", chip: "chip-rose", tone: "muted" },
  deleted: { label: "Supprimé", chip: "chip-ink", tone: "muted" },
};

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
  status_changed: "Statut mis à jour",
  deleted: "Contrat retiré",
};

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

function contractContentHtml(value = "") {
  const content = String(value || "");
  return hasHtmlMarkup(content)
    ? content
    : `<pre class="plain-contract-content">${escapeHtml(content)}</pre>`;
}

function landlordPrintBlock(contract) {
  const company = contract?.companyInfo || {};
  const name = contract?.landlordName || company.companyName || "Bailleur";
  const sig = company.landlordSignature;
  if (sig) {
    return `<img class="signature-image" src="${sig}" alt="Signature bailleur" /><div class="signature-name">${escapeHtml(name)}</div>`;
  }
  return `<div class="typed-signature">${escapeHtml(name)}</div>`;
}

export function contractPrintHtml(contract) {
  const signedAt = formatSignedAt(contract?.signedAt);
  const meta = CONTRACT_STATUS[contract?.status] || { label: contract?.status };
  const tenantSignature = contract?.signatureData
    ? `<img class="signature-image" src="${contract.signatureData}" alt="Signature du locataire" />${
        contract?.signedAt ? `<div class="signature-name">Signé le : ${escapeHtml(formatSignedAt(contract.signedAt))}</div>` : ""
      }`
    : `<div class="signature-line">Signature non disponible</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contrat ${escapeHtml(contractRef(contract))}</title>
  <style>
    @page { size: A4; margin: 20mm 18mm; }
    * { box-sizing: border-box; }
    body {
      background: #ffffff;
      color: #1a1a1a;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 13px;
      line-height: 1.7;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img { max-width: 100%; }
    .print-actions { margin: 16px 0 28px; text-align: right; }
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
    .header {
      border-bottom: 1px solid #1a1a1a;
      margin-bottom: 8px;
      padding-bottom: 22px;
      text-align: center;
    }
    .header::after {
      border-bottom: 3px double #b08d3e;
      content: "";
      display: block;
      margin: 30px auto 0;
      width: 160px;
    }
    .eyebrow {
      color: #b08d3e;
      font-size: 11px;
      font-variant: small-caps;
      letter-spacing: .35em;
      text-transform: uppercase;
    }
    h1 {
      color: #1a1a1a;
      font-size: 30px;
      font-weight: normal;
      letter-spacing: .06em;
      margin: 12px 0 16px;
    }
    .meta {
      color: #57534e;
      font-size: 12px;
      font-style: italic;
      letter-spacing: .03em;
      line-height: 1.9;
    }
    .contract-content { color: #292524; font-size: 13px; line-height: 1.75; margin-top: 26px; }
    .contract-content p { margin: 0 0 12px; orphans: 3; text-align: justify; widows: 3; }
    .contract-content li { margin-bottom: 6px; orphans: 3; widows: 3; }
    .contract-content ul, .contract-content ol { margin: 0 0 14px; padding-left: 26px; }
    .contract-content h1, .contract-content h2, .contract-content h3, .contract-content h4 {
      break-after: avoid;
      color: #1a1a1a;
      font-weight: normal;
      letter-spacing: .05em;
      margin: 26px 0 10px;
      page-break-after: avoid;
    }
    .contract-content h1 { font-size: 20px; }
    .contract-content h2 { border-bottom: 1px solid #d6c39a; font-size: 16px; padding-bottom: 6px; }
    .contract-content h3 { font-size: 14px; font-variant: small-caps; letter-spacing: .1em; }
    .contract-content h4 { font-size: 13px; font-style: italic; }
    .contract-content table { border-collapse: collapse; margin: 0 0 14px; max-width: 100%; width: 100%; }
    .contract-content th, .contract-content td { border: 1px solid #d6d3d1; padding: 7px 10px; text-align: left; vertical-align: top; }
    .contract-content th { background: #faf7f0; font-variant: small-caps; letter-spacing: .06em; }
    .contract-content hr { border: 0; border-top: 1px solid #d6c39a; margin: 22px auto; width: 60%; }
    .plain-contract-content { font-family: Georgia, "Times New Roman", serif; font-size: 13px; line-height: 1.75; margin: 0; white-space: pre-wrap; }
    .signature { break-inside: avoid; margin-top: 44px; page-break-inside: avoid; padding-top: 24px; position: relative; }
    .signature::before {
      border-top: 3px double #b08d3e;
      content: "";
      display: block;
      left: 50%;
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      width: 160px;
    }
    .signature h2 {
      color: #57534e;
      font-size: 12px;
      font-variant: small-caps;
      font-weight: normal;
      letter-spacing: .22em;
      margin: 0 0 14px;
      text-transform: uppercase;
    }
    .signature-grid { display: grid; gap: 40px; grid-template-columns: 1fr 1fr; text-align: center; }
    .signature-image {
      background: #fff;
      border: 1px solid #d6c39a;
      max-height: 110px;
      max-width: 300px;
      padding: 10px;
    }
    .signature-name { color: #57534e; font-size: 11.5px; font-style: italic; letter-spacing: .04em; margin-top: 8px; }
    .signature-line { border-bottom: 1px solid #1a1a1a; color: #78716c; font-size: 11.5px; font-style: italic; min-width: 240px; padding: 34px 0 8px; }
    .signature p { color: #57534e; font-size: 11.5px; font-style: italic; letter-spacing: .04em; margin: 26px 0 0; text-align: center; }
    .typed-signature {
      border: 1px solid #d6c39a;
      background: #fff;
      display: inline-block;
      font-family: "Brush Script MT", "Segoe Script", cursive;
      font-size: 30px;
      min-width: 240px;
      padding: 20px 18px 12px;
    }
    @media print { .print-actions { display: none; } }
  </style>
</head>
<body>
  <div class="print-actions"><button onclick="window.print()">Imprimer / PDF</button></div>
  <div class="header">
    <div class="eyebrow">Contrat de bail</div>
    <h1>${escapeHtml(contractRef(contract))}</h1>
    <div class="meta">
      Locataire: ${escapeHtml(contract?.tenantName || "-")}<br />
      Courriel: ${escapeHtml(contract?.tenantEmail || "-")}<br />
      Statut: ${escapeHtml(meta.label || "-")}
    </div>
  </div>
  <div class="contract-content">${contractContentHtml(contract?.contractContent || "")}</div>
  <div class="signature">
    <div class="signature-grid">
      <div><h2>Signature du bailleur</h2>${landlordPrintBlock(contract)}</div>
      <div><h2>Signature du locataire</h2>${tenantSignature}</div>
    </div>
    <p>Signé le: ${escapeHtml(signedAt)}</p>
  </div>
</body>
</html>`;
}

export function openContractPrint(contract) {
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) {
    window.alert("Autorisez les fenêtres popup pour imprimer le contrat.");
    return;
  }
  win.document.open();
  win.document.write(contractPrintHtml(contract));
  win.document.close();
  win.focus();
}

export function signingUrlFromContract(contract, signingLinks = {}) {
  if (signingLinks[contract?.id]) return signingLinks[contract.id];
  if (contract?.signingUrl) return contract.signingUrl;
  const token = contract?.signerToken;
  if (!token || typeof window === "undefined") return "";
  return `${window.location.origin}/sign/${token}`;
}
