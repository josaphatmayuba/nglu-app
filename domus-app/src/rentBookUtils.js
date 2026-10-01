// Domus — Carnet de quittances du locataire (PDF imprimable A4 par bail).
// Même pattern que contractUtils.js : HTML échappé + fenêtre d'impression
// (window.open + win.print()), pas de jsPDF ici (document long, pagination
// native du navigateur avec @page/break-inside plus fiable qu'un rendu jsPDF).
import QRCode from "qrcode";
import { escapeHtml } from "./contractUtils.js";
import { money, moneyExact } from "./data.js";

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function fmtDateLong(value) {
  if (!value) return "—";
  // Dates DB en "YYYY-MM-DD" (pas d'heure) : parser en local pour éviter le
  // décalage UTC d'un jour à l'ouest de Greenwich (même piège que tenant-portal-public.jsx).
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(value) {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function monthLabel(value) {
  if (!value) return "—";
  const m = /^(\d{4})-(\d{2})/.exec(String(value));
  if (!m) return fmtDateLong(value);
  const monthIdx = Number(m[2]) - 1;
  return `${MONTHS_FR[monthIdx] || ""} ${m[1]}`.trim();
}

// ── Montant en toutes lettres (français) ─────────────────────────────────
const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const TEENS = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function twoDigitsToWords(n) {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const tenIdx = Math.floor(n / 10);
  const unit = n % 10;
  if (tenIdx === 7 || tenIdx === 9) {
    // soixante-dix (70-79) / quatre-vingt-dix (90-99)
    return `${TENS[tenIdx]}-${TEENS[unit]}`;
  }
  let word = TENS[tenIdx];
  if (unit === 0) {
    return tenIdx === 8 ? `${word}s` : word;
  }
  if (unit === 1 && tenIdx !== 8) return `${word}-et-un`;
  return `${word}-${UNITS[unit]}`;
}

function threeDigitsToWords(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let word = "";
  if (hundreds > 0) {
    word += hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
    if (rest === 0 && hundreds > 1) word += "s";
    if (rest > 0) word += " ";
  }
  if (rest > 0) word += twoDigitsToWords(rest);
  return word;
}

// Entier -> toutes lettres (français), jusqu'au milliard. Suffisant pour des
// montants de loyer (francs congolais compris, qui peuvent compter en millions).
export function integerToWordsFr(value) {
  let n = Math.round(Math.abs(Number(value) || 0));
  if (n === 0) return "zéro";
  const parts = [];
  const billions = Math.floor(n / 1_000_000_000);
  n %= 1_000_000_000;
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const units = n;

  if (billions > 0) parts.push(`${billions === 1 ? "un" : threeDigitsToWords(billions)} milliard${billions > 1 ? "s" : ""}`);
  if (millions > 0) parts.push(`${millions === 1 ? "un" : threeDigitsToWords(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${threeDigitsToWords(thousands)} mille`);
  if (units > 0) parts.push(threeDigitsToWords(units));

  return parts.join(" ").trim();
}

// Montant + devise en toutes lettres, ex: "cent cinquante dollars américains".
// On reste volontairement simple (pas de gestion des centimes en lettres,
// rares sur des loyers) : la partie décimale est indiquée en chiffres si présente.
export function amountToWordsFr(amount, currencySymbol = "") {
  const value = Number(amount || 0);
  const intPart = Math.trunc(Math.abs(value));
  const cents = Math.round((Math.abs(value) - intPart) * 100);
  const currencyWord = /usd|\$/i.test(currencySymbol || "")
    ? "dollars américains"
    : /cdf|fc/i.test(currencySymbol || "")
      ? "francs congolais"
      : (currencySymbol || "unités").trim();
  const base = `${integerToWordsFr(intPart)} ${currencyWord}`;
  return cents > 0 ? `${base} et ${cents}/100` : base;
}

// ── Numéro de quittance : séquence calculée sur les paiements du bail,
// triés chronologiquement — pas besoin de le stocker en DB. ────────────────
export function receiptNumber(lease, index) {
  const ref = (lease?.reference || `BAIL-${lease?.id ?? ""}`).toString().replace(/\s+/g, "");
  return `${ref}-Q${String(index + 1).padStart(3, "0")}`;
}

// ── Totaux payés / restant dû, groupés par devise (ne JAMAIS mélanger
// USD/CDF si le bail a vu plusieurs devises au fil du temps). ──────────────
export function totalsByCurrency(payments) {
  const byCurrency = new Map();
  for (const p of payments) {
    const symbol = p.currencySymbol || "CDF";
    const entry = byCurrency.get(symbol) || { paid: 0, pending: 0, symbol };
    const amount = Number(p.amount || 0);
    if (p.status === "paid") entry.paid += amount;
    else entry.pending += amount;
    byCurrency.set(symbol, entry);
  }
  return Array.from(byCurrency.values());
}

function fullAddressLine(lease) {
  const base = lease?.propertyAddress || lease?.propertyName || "";
  const unit = lease?.unitName;
  return [base, unit ? `Apt. ${unit}` : null].filter(Boolean).join(" — ");
}

export async function buildRentBookQrDataUrl(portalUrl) {
  try {
    return await QRCode.toDataURL(portalUrl, { width: 130, margin: 1 });
  } catch {
    return null;
  }
}

export const RENT_BOOK_PRINT_CSS = `
  .rent-book { background: #fff; color: #1a1a1a; font-family: Georgia, "Times New Roman", serif; font-size: 12.5px; line-height: 1.55; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rent-book * { box-sizing: border-box; }
  .rent-book .print-actions { margin: 16px 0 24px; text-align: right; }
  .rent-book .print-actions button { background: #1a1a1a; border: 1px solid #b08d3e; color: #f6f1e7; cursor: pointer; font-family: Georgia, serif; font-size: 12px; letter-spacing: .12em; padding: 9px 22px; text-transform: uppercase; }
  .rent-book .cover { break-after: page; page-break-after: always; }
  .rent-book .cover-header { background: #1a1a1a; color: #f6f1e7; padding: 22px 26px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .rent-book .cover-header h1 { font-size: 19px; margin: 0 0 4px; letter-spacing: .04em; }
  .rent-book .cover-header .ref { color: #d6c39a; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
  .rent-book .cover-header .qr { text-align: center; flex: none; }
  .rent-book .cover-header .qr img { background: #fff; padding: 6px; border-radius: 4px; display: block; }
  .rent-book .cover-header .qr span { display: block; color: #f6f1e7; font-size: 9.5px; max-width: 120px; margin-top: 6px; font-family: Arial, sans-serif; }
  .rent-book .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #d6d3d1; border-top: none; }
  .rent-book .cover-grid .cell { padding: 14px 18px; border-top: 1px solid #d6d3d1; border-right: 1px solid #d6d3d1; }
  .rent-book .cover-grid .cell:nth-child(2n) { border-right: none; }
  .rent-book .cover-grid .cell span { display: block; color: #78716c; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px; }
  .rent-book .cover-grid .cell strong { font-size: 13.5px; font-weight: normal; }
  .rent-book .receipts-title { text-align: center; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: #78716c; margin: 0 0 18px; }
  .rent-book .receipt { break-inside: avoid; page-break-inside: avoid; border: 1px solid #d6c39a; margin-bottom: 16px; padding: 14px 18px; position: relative; }
  .rent-book .receipt-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #e7e2d6; padding-bottom: 8px; margin-bottom: 10px; }
  .rent-book .receipt-head .num { font-variant: small-caps; letter-spacing: .08em; color: #b08d3e; font-size: 11px; }
  .rent-book .receipt-head .period { font-size: 14px; }
  .rent-book .receipt-head .status { font-size: 10.5px; padding: 2px 8px; border-radius: 10px; }
  .rent-book .receipt-head .status.paid { background: #ecfdf5; color: #047857; }
  .rent-book .receipt-head .status.pending { background: #fff7ed; color: #c2410c; }
  .rent-book .receipt-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
  .rent-book .receipt-row span:first-child { color: #78716c; }
  .rent-book .receipt-amount { margin: 10px 0 4px; font-size: 13.5px; }
  .rent-book .receipt-amount .words { font-style: italic; color: #57534e; font-size: 11.5px; }
  .rent-book .receipt-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
  .rent-book .receipt-sign .box { text-align: center; }
  .rent-book .receipt-sign .box span { display: block; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #78716c; margin-bottom: 26px; }
  .rent-book .receipt-sign .box .line { border-bottom: 1px solid #1a1a1a; }
  .rent-book .footer { break-before: page; page-break-before: always; padding-top: 4px; }
  .rent-book .footer h2 { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; border-bottom: 1px solid #d6c39a; padding-bottom: 6px; }
  .rent-book .footer-totals { display: flex; gap: 20px; flex-wrap: wrap; margin: 12px 0 20px; }
  .rent-book .footer-totals .box { border: 1px solid #d6d3d1; padding: 12px 16px; min-width: 180px; }
  .rent-book .footer-totals .box span { display: block; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #78716c; }
  .rent-book .footer-totals .box strong { font-size: 15px; }
  .rent-book .footer-totals .box .due { color: #be123c; }
  .rent-book .footer-meta { font-size: 11px; color: #78716c; margin-top: 24px; }
  @media print { .rent-book .print-actions { display: none; } }
`;

function coverHtml(lease, qrDataUrl) {
  return `
  <div class="cover">
    <div class="cover-header">
      <div>
        <h1>${escapeHtml(lease.propertyName || "Bien")}</h1>
        <div class="ref">Bail ${escapeHtml(lease.reference || `#${lease.id}`)}</div>
      </div>
      ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" width="90" height="90" alt="QR portail" /><span>Scanner pour envoyer la preuve de paiement</span></div>` : ""}
    </div>
    <div class="cover-grid">
      <div class="cell"><span>Locataire</span><strong>${escapeHtml([lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "—")}</strong></div>
      <div class="cell"><span>Contact</span><strong>${escapeHtml(lease.tenantPhone || "—")}</strong></div>
      <div class="cell"><span>Adresse</span><strong>${escapeHtml(fullAddressLine(lease) || "—")}</strong></div>
      <div class="cell"><span>Durée du bail</span><strong>${fmtDateLong(lease.startDate)} → ${lease.endDate ? fmtDateLong(lease.endDate) : "indéterminée"}</strong></div>
      <div class="cell"><span>Loyer mensuel</span><strong>${escapeHtml(money(lease.rentAmount, lease.currencySymbol || "CDF"))}</strong></div>
      <div class="cell"><span>Propriétaire</span><strong>${escapeHtml(lease.ownerName || "—")}</strong></div>
      <div class="cell"><span>Gestionnaire</span><strong>${escapeHtml(lease.organizationName || "—")}</strong></div>
    </div>
  </div>`;
}

function receiptHtml(lease, payment, index) {
  const isPaid = payment.status === "paid";
  const amountWords = amountToWordsFr(payment.amount, payment.currencySymbol);
  return `
  <div class="receipt">
    <div class="receipt-head">
      <span class="num">Quittance ${escapeHtml(receiptNumber(lease, index))}</span>
      <span class="period">${escapeHtml(monthLabel(payment.paymentDate))}</span>
      <span class="status ${isPaid ? "paid" : "pending"}">${isPaid ? `Payé le ${fmtDateShort(payment.paymentDate)}` : "En attente"}</span>
    </div>
    ${isPaid
      ? `<div class="receipt-row"><span>Moyen de paiement</span><span>${escapeHtml(payment.method || "—")}</span></div>
         <div class="receipt-row"><span>Perçu par</span><span>${escapeHtml(payment.receivedBy || "—")}</span></div>`
      : `<div class="receipt-row"><span colspan="2">À remplir par le percepteur</span></div>`
    }
    <div class="receipt-amount">
      <strong>${escapeHtml(moneyExact(payment.amount, payment.currencySymbol || "CDF"))}</strong><br />
      <span class="words">${escapeHtml(amountWords)}${isPaid ? "" : " (dû)"}</span>
    </div>
    <div class="receipt-sign">
      <div class="box"><span>Signature du locataire</span><div class="line"></div></div>
      <div class="box"><span>Signature du percepteur</span><div class="line"></div></div>
    </div>
  </div>`;
}

function footerHtml(lease, payments) {
  const totals = totalsByCurrency(payments);
  const today = fmtDateShort(new Date().toISOString().slice(0, 10));
  const bookRef = `${lease.reference || `BAIL-${lease.id}`}-${today.replace(/\//g, "")}`;
  return `
  <div class="footer">
    <h2>Récapitulatif</h2>
    <div class="footer-totals">
      ${totals.map((t) => `
        <div class="box">
          <span>Total payé (${escapeHtml(t.symbol)})</span><strong>${escapeHtml(moneyExact(t.paid, t.symbol))}</strong><br />
          <span style="margin-top:8px;">Restant dû (${escapeHtml(t.symbol)})</span><strong class="due">${escapeHtml(moneyExact(t.pending, t.symbol))}</strong>
        </div>
      `).join("")}
    </div>
    <div class="footer-meta">
      Document généré le ${today} — Référence carnet : ${escapeHtml(bookRef)}
    </div>
  </div>`;
}

export function rentBookPrintBody(lease, payments, qrDataUrl) {
  return `
  ${coverHtml(lease, qrDataUrl)}
  <div class="receipts-title">Quittances de loyer</div>
  ${payments.map((p, i) => receiptHtml(lease, p, i)).join("")}
  ${footerHtml(lease, payments)}`;
}

export function rentBookPrintHtml(lease, payments, qrDataUrl) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Carnet de quittances — ${escapeHtml(lease.reference || `Bail ${lease.id}`)}</title>
  <style>
    @page { size: A4; margin: 14mm 14mm; }
    body { margin: 0; }
${RENT_BOOK_PRINT_CSS}
  </style>
</head>
<body class="rent-book">
  <div class="print-actions"><button type="button">Imprimer / Enregistrer en PDF</button></div>
${rentBookPrintBody(lease, payments, qrDataUrl)}
</body>
</html>`;
}

// Ouvre une fenêtre d'impression avec le carnet de quittances du bail
// (même pattern que openContractPrint dans contractUtils.js).
export async function openRentBookPrint(lease, payments, { onError } = {}) {
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) {
    const msg = "Autorisez les fenêtres popup pour imprimer le carnet de quittances.";
    if (onError) onError(msg); else window.alert(msg);
    return;
  }
  const portalUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrDataUrl = portalUrl ? await buildRentBookQrDataUrl(portalUrl) : null;
  win.document.open();
  win.document.write(rentBookPrintHtml(lease, payments, qrDataUrl));
  win.document.close();
  win.focus();
  const triggerPrint = () => {
    try { win.focus(); win.print(); } catch { /* popup fermée */ }
  };
  const btn = win.document.querySelector(".print-actions button");
  if (btn) btn.addEventListener("click", triggerPrint);
}
