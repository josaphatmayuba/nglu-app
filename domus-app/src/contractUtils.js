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
    @page { margin: 18mm; }
    body { color: #111827; font-family: Arial, sans-serif; margin: 0; }
    .header { border-bottom: 2px solid #111827; margin-bottom: 24px; padding-bottom: 16px; }
    .eyebrow { color: #6b7280; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 26px; margin: 6px 0 8px; }
    .meta { color: #4b5563; font-size: 13px; line-height: 1.5; }
    .contract-content { color: #1f2937; font-size: 14px; line-height: 1.65; }
    .plain-contract-content { font-family: "Courier New", monospace; font-size: 13px; white-space: pre-wrap; }
    .signature { border-top: 1px solid #d1d5db; margin-top: 34px; padding-top: 18px; }
    .signature-grid { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; }
    .signature-image { border: 1px solid #d1d5db; max-height: 120px; max-width: 320px; padding: 8px; }
    .signature-line { border-bottom: 1px solid #111827; color: #6b7280; min-width: 280px; padding: 28px 0 8px; }
    .typed-signature { border: 1px solid #d1d5db; display: inline-block; font-family: "Brush Script MT", cursive; font-size: 30px; min-width: 240px; padding: 20px 18px 12px; }
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
