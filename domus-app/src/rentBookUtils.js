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
export function amountToWordsFr(amount, currencySymbol = "CDF") {
  const value = Number(amount || 0);
  const intPart = Math.trunc(Math.abs(value));
  const cents = Math.round((Math.abs(value) - intPart) * 100);
  const symbol = currencySymbol || "CDF";
  const currencyWord = /usd|\$/i.test(symbol)
    ? "dollars américains"
    : /cdf|fc/i.test(symbol)
      ? "francs congolais"
      : symbol.trim();
  const base = `${integerToWordsFr(intPart)} ${currencyWord}`;
  return cents > 0 ? `${base} et ${cents}/100` : base;
}

// ── Carnet complet : une quittance par mois du bail, du mois de début au
// mois de fin (ou, bail à durée indéterminée, jusqu'au dernier paiement
// connu sinon 12 mois) — pas seulement les mois où un paiement existe déjà
// en base. Les mois sans paiement réel sont rendus "en attente" (à remplir
// à la main au moment du paiement), fusionnés avec les paiements réels
// quand ils existent pour ce mois. ──────────────────────────────────────
export function buildFullRentSchedule(lease, payments) {
  const start = /^(\d{4})-(\d{2})/.exec(String(lease?.startDate || ""));
  if (!start) return payments; // pas de date de début exploitable : fallback paiements réels

  const byMonth = new Map();
  for (const p of payments) {
    const key = /^(\d{4})-(\d{2})/.exec(String(p.paymentDate || ""))?.[0];
    if (key) byMonth.set(key, p);
  }

  const startIdx = Number(start[1]) * 12 + (Number(start[2]) - 1);
  const end = /^(\d{4})-(\d{2})/.exec(String(lease?.endDate || ""));
  let endIdx;
  if (end) {
    endIdx = Number(end[1]) * 12 + (Number(end[2]) - 1);
  } else {
    // Bail à durée indéterminée : couvrir au moins jusqu'au dernier paiement
    // connu, sinon 12 mois par défaut à partir du début.
    const lastPaid = payments.reduce((max, p) => {
      const key = /^(\d{4})-(\d{2})/.exec(String(p.paymentDate || ""));
      if (!key) return max;
      const idx = Number(key[1]) * 12 + (Number(key[2]) - 1);
      return idx > max ? idx : max;
    }, startIdx);
    endIdx = Math.max(lastPaid, startIdx + 11);
  }

  const schedule = [];
  for (let idx = startIdx; idx <= endIdx; idx += 1) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const existing = byMonth.get(key);
    if (existing) {
      schedule.push(existing);
    } else {
      schedule.push({
        paymentDate: `${key}-01`,
        amount: lease.rentAmount,
        currencySymbol: lease.currencySymbol || "CDF",
        status: "pending",
        method: null,
        receivedBy: null,
      });
    }
  }
  return schedule;
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
  .rent-book { background: #f7f5f0; color: #1f2a24; font-family: 'Source Sans 3', Arial, sans-serif; font-size: 12.5px; line-height: 1.55; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rent-book * { box-sizing: border-box; }
  .rent-book .print-actions { margin: 16px 0 24px; text-align: right; }
  .rent-book .print-actions button { background: #2f6e4e; border: none; color: #fff; cursor: pointer; font-family: 'Source Sans 3', Arial, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .1em; padding: 10px 20px; border-radius: 4px; text-transform: uppercase; }
  .rent-book .cover { break-after: page; page-break-after: always; background: #fff; border: 1px solid #c9c2b2; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .rent-book .cover-header { background: #2f6e4e; color: #fff; padding: 22px 26px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .rent-book .cover-header h1 { font-family: 'Fraunces', Georgia, serif; font-size: 19px; margin: 0 0 4px; letter-spacing: .02em; font-weight: 700; }
  .rent-book .cover-header .ref { color: #e4ede6; opacity: .9; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }
  .rent-book .cover-header .qr { text-align: center; flex: none; }
  .rent-book .cover-header .qr img { background: #fff; padding: 6px; border-radius: 4px; display: block; }
  .rent-book .cover-header .qr span { display: block; color: #fff; opacity: .9; font-size: 9px; text-transform: uppercase; letter-spacing: .07em; max-width: 110px; margin-top: 6px; font-family: 'Source Sans 3', Arial, sans-serif; }
  .rent-book .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
  .rent-book .cover-grid .cell { padding: 14px 24px; border-top: 1px solid #c9c2b2; }
  .rent-book .cover-grid .cell span { display: block; color: #5a655d; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 4px; }
  .rent-book .cover-grid .cell strong { font-size: 13.5px; font-weight: 600; }
  .rent-book .dash { flex: 1; border-top: 1px dashed #b7afa0; }
  .rent-book .receipts-title { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #5a655d; margin: 22px 0 10px; font-weight: 600; white-space: nowrap; }
  .rent-book .cut-line { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; color: #9a9385; font-size: 11px; }
  .rent-book .receipt-wrap { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14px; }
  .rent-book .receipt { background: #fff; border: 1px solid #c9c2b2; border-radius: 4px; position: relative; box-shadow: 0 1px 2px rgba(0,0,0,.06); overflow: hidden; }
  .rent-book .receipt-head { display: flex; justify-content: space-between; align-items: center; background: #eef0ea; border-bottom: 1px solid #c9c2b2; padding: 12px 18px; }
  .rent-book .receipt-head .num { font-family: 'Fraunces', Georgia, serif; font-weight: 700; letter-spacing: .02em; color: #1f2a24; font-size: 15px; display: block; }
  .rent-book .receipt-head .period { font-size: 11px; color: #5a655d; display: block; margin-top: 2px; letter-spacing: .02em; }
  .rent-book .receipt-head .status { font-size: 10.5px; font-weight: 600; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }
  .rent-book .receipt-head .status::before { content: "●"; margin-right: 5px; font-size: 8px; }
  .rent-book .receipt-head .status.paid { background: #e4ede6; color: #2f6e4e; }
  .rent-book .receipt-head .status.pending { background: #f3e8d2; color: #b8862f; }
  .rent-book .receipt-row { display: flex; justify-content: space-between; font-size: 12px; padding: 14px 18px 0; }
  .rent-book .receipt-row span:first-child { color: #5a655d; font-size: 10px; text-transform: uppercase; letter-spacing: .07em; display: block; margin-bottom: 6px; }
  .rent-book .receipt-row span:last-child { font-size: 13.5px; font-weight: 600; border-top: 1px solid #e3ddce; display: block; padding-top: 6px; }
  .rent-book .receipt-amount { margin: 14px 18px; padding: 16px 18px; background: #e4ede6; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .rent-book .receipt-amount strong { font-family: 'Fraunces', Georgia, serif; font-size: 22px; color: #2f6e4e; font-weight: 600; white-space: nowrap; }
  .rent-book .receipt-amount .words { font-style: italic; font-weight: 400; color: #5a655d; font-size: 11.5px; text-align: right; }
  .rent-book .receipt-sign { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 18px 18px; }
  .rent-book .receipt-sign .box span { display: block; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: #5a655d; margin-bottom: 6px; }
  .rent-book .receipt-sign .box .line { height: 48px; border: 1px dashed #c9c2b2; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
  .rent-book .receipt-sign .box .line span { margin: 0; font-size: 10.5px; font-style: italic; text-transform: none; letter-spacing: 0; color: #a39d8e; }
  .rent-book .footer { break-before: page; page-break-before: always; background: #eef0ea; border: 1px solid #c9c2b2; border-radius: 4px; padding: 16px 24px; margin-top: 10px; }
  .rent-book .footer h2 { font-family: 'Fraunces', Georgia, serif; font-size: 13px; letter-spacing: .04em; margin: 0 0 10px; }
  .rent-book .footer-totals { display: flex; gap: 20px; flex-wrap: wrap; margin: 0 0 14px; }
  .rent-book .footer-totals .box { background: #fff; border: 1px solid #c9c2b2; border-radius: 4px; padding: 12px 16px; min-width: 180px; }
  .rent-book .footer-totals .box span { display: block; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #5a655d; }
  .rent-book .footer-totals .box strong { font-family: 'Fraunces', Georgia, serif; font-size: 16px; }
  .rent-book .footer-totals .box .due { color: #b8862f; }
  .rent-book .footer-meta { font-size: 10.5px; color: #5a655d; }
  @media print { .rent-book { background: #fff; } .rent-book .print-actions { display: none; } }
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

function receiptHtml(payment, index) {
  const isPaid = payment.status === "paid";
  const amountWords = amountToWordsFr(payment.amount, payment.currencySymbol);
  const headerLine = isPaid
    ? `${escapeHtml(monthLabel(payment.paymentDate))} · Payée le ${fmtDateShort(payment.paymentDate)}`
    : `${escapeHtml(monthLabel(payment.paymentDate))} · En attente de paiement`;
  const cutLine = index > 0
    ? `<div class="cut-line"><span class="dash"></span>&#9986; Détacher ici<span class="dash"></span></div>`
    : "";
  return `
  <div class="receipt-wrap">
  ${cutLine}
  <div class="receipt">
    <div class="receipt-head">
      <div>
        <span class="num">Quittance n° ${String(index + 1).padStart(4, "0")}</span>
        <span class="period">${headerLine}</span>
      </div>
      <span class="status ${isPaid ? "paid" : "pending"}">${isPaid ? "Payé" : "En attente"}</span>
    </div>
    ${isPaid
      ? `<div class="receipt-row"><span>Moyen de paiement</span><span>${escapeHtml(payment.method || "—")}</span></div>
         <div class="receipt-row"><span>Perçu par</span><span>${escapeHtml(payment.receivedBy || "—")}</span></div>`
      : `<div class="receipt-row"><span>Moyen de paiement</span><span>—</span></div>
         <div class="receipt-row"><span>Perçu par</span><span>—</span></div>`
    }
    <div class="receipt-amount">
      <strong>${escapeHtml(moneyExact(payment.amount, payment.currencySymbol || "CDF"))}</strong>
      <span class="words">${escapeHtml(amountWords)}${isPaid ? "" : " (dû)"}</span>
    </div>
    <div class="receipt-sign">
      <div class="box"><span>Signature du locataire</span><div class="line"><span>Signature + nom du locataire</span></div></div>
      <div class="box"><span>Signature du percepteur</span><div class="line"><span>Signature + nom de la personne qui perçoit</span></div></div>
    </div>
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
  const schedule = buildFullRentSchedule(lease, payments);
  return `
  ${coverHtml(lease, qrDataUrl)}
  <div class="receipts-title">Quittances du carnet<span class="dash"></span></div>
  ${schedule.map((p, i) => receiptHtml(lease, p, i)).join("")}
  ${footerHtml(lease, schedule)}`;
}

export function rentBookPrintHtml(lease, payments, qrDataUrl) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Carnet de quittances — ${escapeHtml(lease.reference || `Bail ${lease.id}`)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
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
// portalUrl : lien du portail locataire DE CE BAIL (token réel, renvoyé par
// GET .../rent-book), pas window.location.origin — un QR pointant sur la
// racine du site ne menait nulle part d'utile pour le locataire qui scanne.
export async function openRentBookPrint(lease, payments, portalUrl, { onError } = {}) {
  const win = window.open("", "_blank", "width=920,height=1100");
  if (!win) {
    const msg = "Autorisez les fenêtres popup pour imprimer le carnet de quittances.";
    if (onError) onError(msg); else window.alert(msg);
    return;
  }
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
