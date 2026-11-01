// Domus — fenêtre d'impression des carnets : une barre de choix (cachée à l'impression)
// + un seul conteneur #book et une seule règle <style id="page-rule"> remplacés selon le
// format : Carnet de quittances | Relevé de compte | Carnet à remplir (A5 sur A4 paysage).
import { escapeHtml } from "./contractUtils.js";
import { STATEMENT_CSS, statementBodyHtml } from "./rentStatementUtils.js";
import { PAPER_BOOK_CSS, PAPER_INK_NOTES, defaultPaperYears, paperBookHtml } from "./rentPaperBookUtils.js";

export const PRINT_FORMATS = ["receipts", "statement", "paper"];

// Bail à durée déterminée → quittances ; sans date de fin → relevé de compte.
export function defaultFormat(lease) {
  return lease?.endDate ? "receipts" : "statement";
}

export const PAGE_RULES = {
  // Quittances : pas de size fixe (A4 ou Letter), marge 0 pour que 50vh = moitié de feuille.
  receipts: "@page { margin: 0; }",
  statement: "@page { size: A4 portrait; margin: 12mm; }",
  paper: "@page { size: A4 landscape; margin: 0; }",
  paperLetter: "@page { size: letter landscape; margin: 0; }",
  paperFull: "@page { size: A4 portrait; margin: 0; }",
  paperFullLetter: "@page { size: letter portrait; margin: 0; }",
};

export const SHELL_CSS = `
  body { margin: 0; background: #e9e9e4; }
  [hidden] { display: none !important; }
  #print-shell { position: sticky; top: 0; z-index: 10; background: #fff; color: #111; border-bottom: 1px solid #bbb; padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font: 14px Arial, Helvetica, sans-serif; }
  #print-shell label { display: flex; align-items: center; gap: 6px; min-height: 44px; }
  #print-shell select, #print-shell button { min-height: 44px; font: 14px Arial, Helvetica, sans-serif; padding: 6px 10px; }
  #print-shell input[type=checkbox] { width: 22px; height: 22px; }
  #print-shell button { background: #2f6e4e; color: #fff; border: 0; border-radius: 4px; font-weight: 700; cursor: pointer; }
  #print-shell button:disabled { background: #9aa59f; cursor: not-allowed; }
  #print-shell .note { flex-basis: 100%; font-size: 13px; color: #1d5c4d; font-weight: 700; }
  #print-shell .hint { flex-basis: 100%; font-size: 12.5px; color: #444; }
  @media print {
    #print-shell { display: none !important; }
    body { background: #fff; }
    #book { zoom: 1 !important; }
  }
`;

function shellBarHtml(format, years = 3) {
  const opt = (v, label, cur) => `<option value="${v}"${v === cur ? " selected" : ""}>${label}</option>`;
  return `
  <label>Format :
    <select id="ps-format">
      ${opt("receipts", "Carnet de quittances", format)}
      ${opt("statement", "Relevé de compte", format)}
      ${opt("paper", "Carnet à remplir", format)}
    </select></label>
  <span id="ps-paper" hidden style="display:contents">
    <label>Vue :
      <select id="ps-pass">
        <option value="coupe" selected>Cahier coupé A5 : recto, couper et poser dans l'ordre (papier normal)</option>
        <option value="pleine">Feuilles entières : rien à monter, on agrafe (papier normal)</option>
        <option value="simple">Cahier simple : recto, plier et empiler (papier normal)</option>
        <option value="plie-essai">Cahier plié : feuille d'essai (à faire d'abord)</option>
        <option value="plie">Cahier plié (recto-verso)</option>
        <option value="plie-r">Cahier plié à la main : rectos</option>
        <option value="plie-v">Cahier plié à la main : versos</option>
        <option value="complet">Cahier coupé (une impression, recto)</option>
        <option value="2">Passage 2 : pages à remplir</option>
        <option value="1">Passage 1 : couvertures et guide</option>
        <option value="cahier">Vue cahier (écran)</option>
      </select></label>
    <label>Papier :
      <select id="ps-size">
        <option value="a4">A4</option>
        <option value="letter">Letter (US)</option>
      </select></label>
    <label>Durée :
      <select id="ps-years">
        ${opt("2", "2 ans", String(years))}
        ${opt("3", "3 ans", String(years))}
      </select></label>
    <label>Encre :
      <select id="ps-ink">
        <option value="">Gris</option>
        <option value="ink-pale">Gris très pâle</option>
        <option value="ink-blue">Bleu pâle</option>
      </select></label>
    <label><input type="checkbox" id="ps-dup" checked /> Chaque page en 2 exemplaires</label>
  </span>
  <label id="ps-copy-wrap">Cahier :
    <select id="ps-copy">
      <option value="tenant">Du locataire</option>
      <option value="landlord">Du bailleur</option>
      <option value="both">Les deux (locataire puis bailleur)</option>
    </select></label>
  <button type="button" id="ps-print">Imprimer / Enregistrer en PDF</button>
  <span class="note" id="ps-ink-note" hidden></span>
  <span class="hint" id="ps-hint" hidden></span>`;
}

// Monte la barre + le contenu dans la fenêtre `win` déjà ouverte (window.open synchrone en amont).
// ctx : { lease, payments, qrDataUrl, receiptsHtml: () => string, receiptsCss, format? }
export function mountPrintShell(win, ctx) {
  const format = PRINT_FORMATS.includes(ctx.format) ? ctx.format : defaultFormat(ctx.lease);
  const title = `Carnet — ${escapeHtml(ctx.lease?.reference || `Bail ${ctx.lease?.id ?? ""}`)}`;
  const doc = win.document;
  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style id="shell-css">${SHELL_CSS}</style>
  <style id="formats-css">${ctx.receiptsCss || ""}
${STATEMENT_CSS}
${PAPER_BOOK_CSS}</style>
  <style id="page-rule">${PAGE_RULES[format]}</style>
</head>
<body>
  <div id="print-shell">${shellBarHtml(format, defaultPaperYears(ctx.lease))}</div>
  <div id="book"></div>
</body>
</html>`);
  doc.close();

  const $ = (id) => doc.getElementById(id);
  const state = { cache: {} };

  const fit = (fmt, pass) => {
    const book = $("book");
    if (!book) return;
    if (fmt !== "paper") { book.style.zoom = "1"; return; }
    const need = pass === "cahier" ? 600 : 1150;
    const z = Math.min(1, ((win.innerWidth || 1200) - 32) / need);
    book.style.zoom = String(Math.max(0.3, z));
  };

  const render = () => {
    const fmt = $("ps-format").value;
    const pass = $("ps-pass").value;
    const ink = $("ps-ink").value;
    const dup = $("ps-dup").checked;
    const years = Number($("ps-years").value);
    const copy = $("ps-copy").value;
    const size = $("ps-size").value;
    const folded = pass.startsWith("plie") || ["simple", "pleine", "coupe"].includes(pass);
    $("ps-copy-wrap").hidden = fmt === "statement" || (fmt === "paper" && (!folded || pass === "plie-essai"));
    $("ps-dup").parentElement.hidden = folded;
    let html;
    if (fmt === "statement") {
      html = state.cache.statement ||= statementBodyHtml(ctx.lease, ctx.payments, { qrDataUrl: ctx.qrDataUrl });
    } else if (fmt === "paper") {
      html = paperBookHtml(ctx.lease, { pass, ink, duplicate: dup, qrDataUrl: ctx.qrDataUrl, years, copy, paper: size });
    } else {
      html = state.cache[`receipts-${copy}`] ||= `<div class="rent-book">${ctx.receiptsHtml(copy)}</div>`;
    }
    $("book").innerHTML = html;
    $("page-rule").textContent = fmt !== "paper" ? PAGE_RULES[fmt]
      : pass === "pleine" ? (size === "letter" ? PAGE_RULES.paperFullLetter : PAGE_RULES.paperFull)
      : size === "letter" ? PAGE_RULES.paperLetter : PAGE_RULES.paper;
    $("ps-paper").hidden = fmt !== "paper";
    const note = $("ps-ink-note");
    note.hidden = fmt !== "paper";
    const landlordPages = copy !== "tenant" || ["complet", "2"].includes(pass);
    note.textContent = fmt === "paper"
      ? `Économie d'encre : ${PAPER_INK_NOTES[ink] || PAPER_INK_NOTES[""]}${landlordPages ? " Cahier du bailleur : imprimez en « Couleur » pour garder la trame de points roses (en « Niveaux de gris », elle sort grise)." : ""}`
      : "";
    const hint = $("ps-hint");
    const preview = fmt === "paper" && pass === "cahier";
    hint.hidden = !(fmt === "paper");
    hint.textContent = fmt === "paper"
      ? (preview ? "La vue cahier est un aperçu : choisissez « Cahier complet » ou un passage pour imprimer." : pass === "coupe" ? "Imprimer : A4 paysage, recto seulement, échelle 100 %, Marges : Aucune, En-têtes et pieds de page : décochés." : pass === "pleine" ? "Imprimer : A4 portrait, recto seulement, échelle 100 %, Marges : Aucune, En-têtes et pieds de page : décochés." : pass === "simple" ? "Imprimer : A4 paysage, recto seulement, échelle 100 %, Marges : Aucune, En-têtes et pieds de page : décochés." : pass === "plie" ? "Imprimer : A4 paysage, Recto verso, retourner sur le bord court, échelle 100 %, Marges : Aucune, En-têtes et pieds de page : décochés." : "Imprimer : A4 paysage, échelle 100 %, Marges : Aucune, En-têtes et pieds de page : décochés.")
      : "";
    if (size === "letter") hint.textContent = hint.textContent.replace("A4 paysage", "Letter paysage (papier Letter dans le bac)").replace("A4 portrait", "Letter portrait (papier Letter dans le bac)");
    $("ps-print").disabled = preview;
    doc.title = `${{ receipts: "Carnet de quittances", statement: "Relevé de compte", paper: "Carnet à remplir" }[fmt]} — ${ctx.lease?.reference || `Bail ${ctx.lease?.id ?? ""}`}`;
    fit(fmt, pass);
  };

  // Papier mémorisé (A4 / Letter) : simple confort, ignoré si le stockage est indisponible.
  try { const saved = win.localStorage.getItem("domus.paperSize"); if (saved === "a4" || saved === "letter") $("ps-size").value = saved; } catch { /* stockage indisponible */ }
  $("ps-size").addEventListener("change", () => { try { win.localStorage.setItem("domus.paperSize", $("ps-size").value); } catch { /* stockage indisponible */ } });
  ["ps-format", "ps-pass", "ps-size", "ps-copy", "ps-years", "ps-ink", "ps-dup"].forEach((id) => $(id).addEventListener("change", render));
  win.addEventListener("resize", () => fit($("ps-format").value, $("ps-pass").value));
  $("ps-print").addEventListener("click", async () => {
    try {
      // Polices chargées avant l'impression (sinon mise en page différente à l'aperçu).
      if (doc.fonts && doc.fonts.ready) await Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
    } catch { /* ignoré */ }
    try { win.focus(); win.print(); } catch { /* popup fermée */ }
  });
  render();
  return { render };
}
