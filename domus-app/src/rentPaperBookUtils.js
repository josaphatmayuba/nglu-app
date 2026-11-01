// Domus — Carnet de loyer « à remplir à la main » (A5 sur A4 paysage, 2 cahiers
// identiques blanc/rose en papier autocopiant). Porté de qa/domus/carnet-a5-imprimable.html
// avec les vraies données du bail (GET /leases/:id/rent-book -> lease.book).
// Règles : pas de colonne « Reste », pas de report, 1 mois = 1 paiement complet ;
// champs inconnus = pointillés à remplir ; « Durée : 2 ans » ou « 3 ans » (jamais « indéterminée »).
import { escapeHtml } from "./contractUtils.js";
import { decodeCurrencyText } from "./data.js";
import { fmtDateShort, moneyAfter } from "./rentBookUtils.js";
import { dayDiff } from "./rentStatementUtils.js";

const esc = escapeHtml;
const MF = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const MS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const day10 = (v) => String(v || "").slice(0, 10);
const pad = (n) => String(n).padStart(2, "0");

// ── Fonctions pures ─────────────────────────────────────────────────────────

// N années de bail de 12 mois à partir du mois d'entrée (ex. juil. → juin).
export function buildLeaseYears(startDate, count = 3) {
  const m = /^(\d{4})-(\d{2})/.exec(String(startDate || ""));
  const now = new Date();
  const startY = m ? Number(m[1]) : now.getFullYear();
  const startM = m ? Number(m[2]) - 1 : now.getMonth();
  return Array.from({ length: count }, (_, k) => Array.from({ length: 12 }, (_, i) => {
    const idx = startM + i + 12 * k;
    return { y: startY + Math.floor(idx / 12), m: idx % 12 };
  }));
}

// Premier mois au prorata { amount, days } d'après l'échéancier (prorata) ou les échéances
// (bail flagué) ; null si le 1er mois est complet ou si l'on ne sait pas.
export function firstMonthProrata(lease) {
  if (lease?.allocationLedger === true && Array.isArray(lease.dues) && lease.dues.length) {
    const first = lease.dues
      .filter((d) => d && d.status !== false && d.dueStatus !== "voided" && d.periodStart)
      .slice()
      .sort((a, b) => day10(a.periodStart).localeCompare(day10(b.periodStart)))[0];
    if (!first) return null;
    const ps = day10(first.periodStart);
    const pe = day10(first.periodEnd);
    if (!pe || ps.slice(8, 10) === "01" || pe.slice(0, 7) !== ps.slice(0, 7)) return null;
    return { amount: Number(first.amount) || 0, days: dayDiff(ps, pe) + 1 };
  }
  const e = Array.isArray(lease?.schedule) ? lease.schedule[0] : null;
  if (e && e.prorated && Number(e.days) > 0) return { amount: Number(e.amount) || 0, days: Number(e.days) };
  return null;
}

// Imposition « coupe et empile » : feuille i = page i à gauche, page i + n/2 à droite (indices 0-based).
export function imposeCutStack(pageCount = 10) {
  const half = Math.floor(pageCount / 2);
  return Array.from({ length: half }, (_, i) => [i, i + half]);
}

// Durée du carnet par défaut : bail à date de fin de 2 ans ou moins → 2 ans ; sinon (ou sans fin) → 3 ans.
export function defaultPaperYears(lease) {
  const a = /^(\d{4})-(\d{2})/.exec(String(lease?.startDate || ""));
  const b = /^(\d{4})-(\d{2})/.exec(String(lease?.endDate || ""));
  if (!a || !b) return 3;
  const months = (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
  return months <= 24 ? 2 : 3;
}
const normYears = (n) => (Number(n) === 2 ? 2 : 3);

// Imposition livret (plié au milieu, feuilles emboîtées, agrafé dans le pli), recto-verso.
// pageCount multiple de 4. Feuille k : recto = [N-1-2k, 2k] (gauche, droite), verso = [2k+1, N-2-2k] (indices 0-based).
export function imposeBooklet(pageCount = 16) {
  const n = Math.ceil(pageCount / 4) * 4;
  return Array.from({ length: n / 4 }, (_, k) => ({ recto: [n - 1 - 2 * k, 2 * k], verso: [2 * k + 1, n - 2 - 2 * k] }));
}

// Bail en FC/CDF → « Le $ est accepté… » ; sinon « Le FC est accepté… ».
export function conditionsSentence(symbol) {
  const cur = decodeCurrencyText(symbol || "CDF").trim() || "CDF";
  const other = /^(FC|CDF)$/i.test(cur) ? "$" : "FC";
  return `Payable en ${cur}. Le ${other} est accepté au taux du jour.`;
}

const MARITAL = { married: "Marié(e)", single: "Célibataire", common_law: "Union libre", divorced: "Divorcé(e)", widowed: "Veuf(ve)" };

// Modèle de données du carnet (null = inconnu → pointillés au rendu).
export function paperBookModel(lease) {
  const b = lease?.book || {};
  const symbol = lease?.currencySymbol || "CDF";
  const cur = decodeCurrencyText(symbol).trim() || "CDF";
  const rent = Number(lease?.rentAmount) || 0;
  const ref = lease?.reference || `BAIL-${lease?.id ?? ""}`;
  const isCompany = b.tenantType === "company";
  const personal = [lease?.tenantFirstName, lease?.tenantLastName].filter(Boolean).join(" ");
  const delegates = Array.isArray(b.delegates) ? b.delegates.filter((d) => d && d.name) : [];
  const managerLine = delegates.map((d) => [d.name, d.phone].filter(Boolean).join(" · ")).join(" / ");
  const dep = b.depositReceived || null;
  const contract = Number(b.depositContract) > 0 ? Number(b.depositContract) : null;
  let deposit = null;
  if (contract != null) {
    deposit = `${moneyAfter(contract, symbol)}${b.depositMonths ? ` (${b.depositMonths} mois)` : ""}`;
    if (dep && Math.abs(Number(dep.amount) - contract) > 0.005) deposit += ` · reçue : ${moneyAfter(dep.amount, dep.currencySymbol || symbol)}`;
  } else if (dep) {
    deposit = `reçue : ${moneyAfter(dep.amount, dep.currencySymbol || symbol)}`;
  }
  const dueDay = Number(b.dueDay) > 0 ? Number(b.dueDay) : null;
  const pm = b.orgPaymentMethods;
  return {
    carnet: `${ref}-C1`,
    ref,
    start: lease?.startDate || null,
    cur,
    symbol,
    rent,
    tenant: (isCompany ? b.companyName || personal : personal) || b.companyName || null,
    tenantPhone: lease?.tenantPhone || null,
    tenantProvince: b.tenantProvince || null,
    tenantMarital: b.tenantMaritalStatus ? MARITAL[b.tenantMaritalStatus] || b.tenantMaritalStatus : null,
    tenantPostName: b.tenantPostName || null,
    owner: b.landlordName || lease?.ownerName || null,
    ownerPhone: b.landlordPhone || lease?.ownerPhone || lease?.ownerPhone2 || null,
    address: [lease?.propertyAddress || lease?.propertyName, lease?.unitName ? `Apt. ${lease.unitName}` : null].filter(Boolean).join(" · ") || null,
    dueDay: dueDay ? (dueDay === 1 ? "1er du mois" : `${dueDay} du mois`) : null,
    grace: b.graceDays != null && Number.isFinite(Number(b.graceDays)) ? `${Number(b.graceDays)} jour${Number(b.graceDays) > 1 ? "s" : ""}` : null,
    deposit,
    depositReceived: dep ? { amount: Number(dep.amount), date: dep.date || null, symbol: dep.currencySymbol || symbol } : null,
    depositMonths: b.depositMonths ?? null,
    notice: b.noticeMonths != null ? `${b.noticeMonths} mois` : null,
    occupants: b.occupants != null ? `${b.occupants} personne${b.occupants > 1 ? "s" : ""}` : null,
    firstMonth: firstMonthProrata(lease),
    delegates,
    managerLine: managerLine || null,
    managerNames: delegates.map((d) => d.name).join(", ") || null,
    orgPaymentMethods: Array.isArray(pm) && pm.length ? pm.map(String) : null,
  };
}

// ── CSS (porté de la maquette, scopé sous .paper) ───────────────────────────
export const PAPER_BOOK_CSS = `
  .paper { --ink2: #333; --title: #8c8c8c; --line: #6b6b6b; --soft: #9a9a9a; --pink: #fde8eb; --muted: #4d5a54; font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #222; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: grid; justify-content: center; gap: 14px; padding: 12px 16px 40px; }
  .paper * { box-sizing: border-box; }
  .paper .intro { max-width: 900px; margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
  .paper .intro b { color: #17211d; }
  .paper .print-msg { display: none; }
  .paper .caption { font-size: 12px; color: var(--muted); font-weight: 700; margin-bottom: -8px; }
  .paper { --sheet-w: 297mm; --sheet-h: 210mm; --half-w: 148.5mm; }
  .paper.letter { --sheet-w: 279.4mm; --sheet-h: 215.9mm; --half-w: 139.7mm; }
  .paper .sheet { width: var(--sheet-w); height: var(--sheet-h); background: #fff; color: #222; display: grid; grid-template-columns: 1fr 1fr; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,.25); overflow: hidden; }
  /* Exemplaire du bailleur : trame de points roses (0,3 mm tous les 1,5 mm, ~2 % d'encre) ; cases des tableaux blanches pour écrire. */
  .paper .sheet.dup .a5, .paper .a5.dup { background-color: #fff; background-image: radial-gradient(circle, #e391a3 .15mm, transparent .17mm); background-size: 1.5mm 1.5mm; }
  .paper .sheet.dup .a5 table, .paper .a5.dup table { background: #fff; }
  .paper .sheet.fold::after { content: "plier ici"; }
  .paper .sheet.fold .a5:first-child { padding: 8mm 14mm 7mm 7mm; }
  /* Ligne de coupe au milieu exact du papier choisi (A4 : 148,5 mm ; Letter : 139,7 mm du bord gauche). */
  .paper .sheet.cut::after { left: 50%; border-left: .6pt dashed #555; }
  .paper .sheet.cut .bk { right: 4mm; }
  .paper .sheet.cut .foot span:last-child { display: none; }
  .paper .sheet.full { width: 210mm; height: 297mm; display: block; }
  .paper.letter .sheet.full { width: 215.9mm; height: 279.4mm; }
  .paper .sheet.full::after { display: none; }
  .paper .sheet.full .a5 { zoom: 1.414; }
  .paper.letter .sheet.full .a5 { zoom: 1.33; width: 148.5mm; height: 210mm; margin: 0 auto; }
  .paper .sheet.full .a5 { width: 148.5mm; height: 210mm; }
  .paper .sheet.full .bk { right: 4mm; }
  .paper .sheet.full .foot span:last-child { display: none; }
  .paper .sheet.fold .foot span:last-child { display: none; } /* un seul numéro : celui du cahier (.bk) */
  .paper .bk { position: absolute; bottom: 1.2mm; font-size: 11pt; font-weight: 700; color: #555; font-variant-numeric: tabular-nums; }
  .paper .sheet.fold .a5:first-child .bk { left: 4mm; } .paper .sheet.fold .a5:last-child .bk { right: 4mm; }
  .paper .fl { position: absolute; bottom: 1.6mm; font-size: 5.8pt; color: #777; }
  .paper .sheet.fold .a5:first-child .fl { right: 3mm; } .paper .sheet.fold .a5:last-child .fl { left: 3mm; }
  .paper .essai { display: grid; align-content: center; gap: 5mm; height: 100%; text-align: center; font-size: 13pt; }
  .paper .essai b { font-size: 26pt; }
  .paper .sheet::after { content: "✂ couper ici"; position: absolute; left: 50%; top: 0; bottom: 0; border-left: .4pt dashed #777; font-size: 6pt; color: #777; padding: 1mm 0 0 1mm; }
  .paper .single { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .paper .single .a5 { box-shadow: 0 2px 8px rgba(0,0,0,.25); }
  .paper .a5 { width: var(--half-w); height: var(--sheet-h); padding: 8mm 7mm 7mm 14mm; background: #fff; color: #222; position: relative; display: flex; flex-direction: column; gap: 2.4mm; overflow: hidden; }
  .paper .tag { position: absolute; top: 3mm; right: 7mm; font-size: 6pt; font-weight: 400; letter-spacing: .05em; text-transform: uppercase; border: .4pt solid var(--soft); color: #555; padding: .4mm 1.4mm; }
  .paper .foot { margin-top: auto; display: flex; justify-content: space-between; font-size: 6pt; color: var(--ink2); border-top: .4pt dotted #999; padding-top: 1mm; }
  .paper h1 { font-size: 30pt; line-height: .95; margin: 0; font-weight: 400; color: transparent; -webkit-text-stroke: .5pt #777; }
  .paper h2 { font-size: 11pt; margin: 0; color: #4a4a4a; padding-right: 30mm; line-height: 1.15; }
  .paper h2 small { display: block; font-size: 7pt; font-weight: 400; color: var(--ink2); }
  .paper .lbl { font-size: 6.5pt; font-weight: 700; color: var(--ink2); }
  .paper .pre { font-weight: 700; color: #333; }
  .paper .kv { display: grid; gap: .3mm; }
  .paper .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 3mm; }
  .paper .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2mm 3mm; }
  .paper .box { border: .5pt solid var(--soft); padding: 2mm; display: grid; gap: 1.2mm; }
  .paper .note { font-size: 6.5pt; color: #222; margin: 0; line-height: 1.3; }
  .paper .wl { border-bottom: .5pt dotted #555; height: 6mm; }
  .paper .dots { display: inline-block; min-width: 22mm; border-bottom: .5pt dotted #555; height: 1.1em; vertical-align: bottom; }
  .paper .sig { border: .5pt solid var(--soft); height: 12mm; padding: .6mm 1.4mm; font-size: 6.5pt; display: flex; flex-direction: column; justify-content: space-between; }
  .paper .sig span:last-child { border-top: .4pt dotted var(--ink2); font-size: 6pt; color: var(--ink2); }
  .paper .qrrow { display: flex; gap: 3mm; align-items: center; font-size: 7pt; }
  .paper .qr { width: 18mm; height: 18mm; border: .4pt dotted var(--soft); display: grid; place-items: center; font-size: 5.5pt; text-align: center; color: #444; flex: none; }
  .paper .qr img { width: 100%; height: 100%; display: block; }
  .paper table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 7.5pt; }
  .paper th, .paper td { border: .5pt solid var(--line); padding: .4mm .9mm; text-align: left; vertical-align: middle; overflow: hidden; }
  .paper th { font-size: 6.2pt; line-height: 1.1; border-bottom-width: .75pt; }
  .paper th small { display: block; font-weight: 400; font-size: 5.6pt; color: var(--ink2); }
  .paper td { height: 8.6mm; }
  .paper td.m { color: #333; font-weight: 700; font-size: 7.5pt; white-space: nowrap; }
  .paper td.m small { display: block; font-weight: 400; font-size: 5.8pt; color: var(--ink2); }
  .paper td.due { font-weight: 700; white-space: normal; overflow-wrap: anywhere; line-height: 1.15; }
  .paper td.due small { display: block; font-weight: 400; font-size: 5.6pt; }
  .paper tr.rep td { border-top: .75pt solid var(--line); font-weight: 700; height: 6mm; background: none; font-size: 7pt; }
  .paper .via { display: grid; gap: .2mm; font-size: 5.8pt; line-height: 1.05; }
  .paper .via span { display: flex; align-items: center; gap: .7mm; white-space: nowrap; }
  .paper .via i { width: 2.4mm; height: 2.4mm; border: .5pt solid var(--line); flex: none; }
  .paper .via em { flex: 1; border-bottom: .4pt dotted var(--ink2); min-width: 4mm; height: 2.4mm; }
  .paper .cover { border: .5pt dotted var(--soft); padding: 6mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .paper .yrs { display: flex; gap: 1.5mm; font-weight: 400; font-size: 9pt; }
  .paper .yrs span { border: .4pt dotted var(--soft); color: #555; padding: .8mm 2mm; }
  .paper .qrrow.sm .qr { width: 11mm; height: 11mm; }
  .paper .calc { border: .5pt dashed var(--soft); padding: 1.6mm 2mm; font-family: "Courier New", monospace; font-size: 7.6pt; line-height: 1.25; display: grid; gap: .6mm; }
  .paper ol { margin: 0; padding-left: 4mm; display: grid; gap: .6mm; font-size: 7pt; line-height: 1.3; }
  .paper .badge2 { justify-self: start; font-size: 7.5pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border: .5pt solid var(--soft); color: #555; padding: .8mm 2.5mm; }
  .paper .gs { display: grid; gap: .8mm; font-size: 8.3pt; line-height: 1.3; }
  .paper .gs > b { font-size: 8.3pt; letter-spacing: .03em; }
  .paper .gs2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; align-items: start; }
  .paper .gs2 .gs { gap: 1mm; }
  .paper .gs ul { margin: 0; padding-left: 4mm; display: grid; gap: .7mm; }
  .paper table.cols td { height: auto; padding-block: .8mm; font-size: 7.6pt; line-height: 1.2; vertical-align: top; }
  .paper .pen { font-family: "Segoe Print", "Comic Sans MS", "Bradley Hand", cursive; color: #1f3fa8; font-size: 7pt; line-height: 1; }
  .paper .via i.on { position: relative; }
  .paper .via i.on::after { content: "x"; position: absolute; inset: -1.3mm 0 0 .3mm; font-family: "Segoe Print", "Comic Sans MS", cursive; color: #1f3fa8; font-size: 8pt; }
  .paper .numk { display: inline-grid; place-items: center; width: 3.6mm; height: 3.6mm; border-radius: 50%; border: .5pt solid var(--soft); font-size: 5.6pt; font-weight: 700; color: #444; vertical-align: middle; }
  .paper ol.legend { list-style: none; padding: 0; font-size: 6.8pt; gap: 1.1mm; }
  .paper ol.legend li { display: grid; grid-template-columns: 4.5mm 1fr; gap: 1mm; align-items: start; }
  /* Choix d'encre : seuls traits, cadres et titres changent ; le texte reste gris foncé. */
  .paper.ink-pale { --line: #a8a8a8; --soft: #c6c6c6; }
  .paper.ink-pale h1 { -webkit-text-stroke-color: #aaa; }
  .paper.ink-pale h2 { color: #777; }
  .paper.ink-pale .tag, .paper.ink-pale .yrs span { color: #888; }
  .paper.ink-pale .wl, .paper.ink-pale .dots { border-bottom-color: #aaa; }
  .paper.ink-blue { --line: #8fb4e3; --soft: #b9d0ef; }
  .paper.ink-blue h1 { -webkit-text-stroke-color: #6f9bd6; }
  .paper.ink-blue h2 { color: #3f6fae; }
  .paper.ink-blue .tag, .paper.ink-blue .yrs span { color: #4f7bbb; }
  .paper.ink-blue .wl, .paper.ink-blue .via em, .paper.ink-blue .dots { border-bottom-color: #8fb4e3; }
  .paper.ink-blue .sig span:last-child, .paper.ink-blue .foot { border-top-color: #8fb4e3; }
  .paper.ink-pale .badge2 { color: #888; border-color: #c6c6c6; }
  .paper.ink-blue .badge2 { color: #4f7bbb; border-color: #b9d0ef; }
  .paper.ink-pale .covpage, .paper.ink-pale .covpage .pre, .paper.ink-pale .covpage .lbl, .paper.ink-pale .covpage .note, .paper.ink-pale .covpage .foot { color: #8a8a8a; }
  .paper.ink-pale .covpage .duree { -webkit-text-stroke-color: #aaa !important; }
  .paper.ink-pale .covpage .qr { color: #aaa; border-color: #c6c6c6; }
  .paper.ink-blue .covpage, .paper.ink-blue .covpage .pre, .paper.ink-blue .covpage .lbl, .paper.ink-blue .covpage .note, .paper.ink-blue .covpage .foot { color: #4f7bbb; }
  .paper.ink-blue .covpage .duree { -webkit-text-stroke-color: #6f9bd6 !important; }
  .paper.ink-blue .covpage .qr { color: #6f9bd6; border-color: #b9d0ef; }
  .paper.ink-blue .covpage .calc b, .paper.ink-blue .covpage .step b { color: #3f6fae; }
  @media print {
    /* Feuille = page réellement imprimée (vw/vh) : la ligne de coupe/pli reste au milieu du papier, même si le navigateur ajoute des marges égales. */
    .paper .sheet.cut, .paper .sheet.fold { width: 100vw; height: 100vh; }
    .paper .sheet.cut .a5, .paper .sheet.fold .a5 { width: 50vw; height: 100vh; }
    .paper { display: block; padding: 0; gap: 0; }
    .paper .intro, .paper .caption { display: none !important; }
    .paper .sheet { box-shadow: none; break-after: page; page-break-after: always; }
    .paper .sheet:last-child { break-after: auto; page-break-after: auto; }
    .paper .single { display: none; }
    .paper .print-msg { display: block; font-size: 16pt; padding: 20mm; }
  }
`;

export const PAPER_INK_NOTES = {
  "": "Imprimez en « Niveaux de gris » : traits et titres en gris, faits avec l'encre noire.",
  "ink-pale": "Imprimez en « Niveaux de gris » : traits et titres très pâles, donc très peu d'encre noire.",
  "ink-blue": "Imprimez en mode COULEUR (pas « Niveaux de gris », sinon le bleu redevient gris) : traits et titres faits avec l'encre couleur, le noir sert seulement au texte.",
};

const introFor = (n) => {
  const P = 2 * n + 4; const half = P / 2;
  return {
    cahier: `<b>Deux cahiers A5 complets et identiques</b> : le <b>cahier blanc du locataire</b> (montré ici) et le <b>cahier du bailleur</b> (trame de points roses), avec sa propre couverture « Exemplaire du bailleur ». Chacun contient : couverture, guide en 1 page (avec « Les deux cahiers »), exemple rempli, puis les ${P} pages à remplir. Une page du bailleur est montrée en exemple sous la page Loyers de l'année 1.`,
    "1": `<b>Passage 1, 3 feuilles A4.</b> Feuille 1 en <b>carton</b> : les deux couvertures, à couper au milieu (une par cahier). Feuille 2 en <b>papier normal, à imprimer 2 fois</b> (une fois par cahier) : le guide et l'exemple. Ordre de chaque cahier : couverture, guide, exemple, puis les ${P} pages à remplir. Pour le dos, un carton A5 vierge par cahier.`,
    coupe: `<b>Cahier coupé A5, ${(P + 4) / 2} feuilles, au recto seulement, sur papier normal.</b> Chaque feuille porte 2 pages : la feuille 1 = pages 1 et 2, la feuille 2 = pages 3 et 4, etc. 1) <b>Coupez chaque feuille sur la ligne pointillée</b>, au milieu du papier. Dans la fenêtre d'impression : papier A4 ou Letter, Marges « Aucune », En-têtes et pieds de page décochés, Échelle 100 %. 2) <b>Posez les morceaux dans l'ordre</b> : le morceau de gauche, puis celui de droite, puis la feuille suivante ; les grands numéros en bas doivent se suivre de 1 à ${P + 4}. 3) <b>Agrafez sur le bord gauche</b> (2 agrafes). Imprimez le cahier du locataire, puis celui du bailleur (choix « Cahier »).`,
    pleine: `<b>Feuilles entières, ${P + 4} feuilles, au recto seulement, sur papier normal.</b> Une page du carnet = une feuille entière, en portrait. Rien à plier, rien à couper : les feuilles sortent dans l'ordre (1, 2, 3…). Agrafez-les sur le <b>bord gauche</b> (2 agrafes) ou dans le coin en haut à gauche. Imprimez le cahier du locataire, puis celui du bailleur (choix « Cahier »).`,
    simple: `<b>Cahier simple, ${(P + 4) / 2} feuilles A4, au recto seulement, sur papier normal.</b> Pas de recto-verso, pas de coupe. 1) <b>Pliez chaque feuille en deux</b>, l'impression à l'extérieur : la page de droite devant, celle de gauche derrière. 2) <b>Empilez les feuilles pliées dans l'ordre</b> : feuille 1 dessus, puis 2, 3… jusqu'à ${(P + 4) / 2} dessous, tous les plis du même côté (à gauche). 3) <b>Agrafez le long du pli</b>, à 5 mm du bord (2 ou 3 agrafes). Les numéros de page en bas doivent se suivre de 1 à ${P + 4}. Imprimez le cahier du locataire, puis celui du bailleur (choix « Cahier »).`,
    "plie-essai": `<b>Feuille d'essai.</b> Imprimez-la d'abord sur une feuille de papier normal, avec les réglages que vous utiliserez pour le cahier : <b>Recto verso</b>, <b>retourner sur le bord court</b>, échelle 100 %. Retournez la feuille : vous saurez tout de suite si le réglage est bon, avant d'imprimer le cahier.`,
    plie: `<b>Cahier plié, ${Math.ceil((P + 4) / 4)} feuilles A4 en recto-verso.</b> Papier blanc normal pour les deux cahiers (choix « Cahier ») : celui du bailleur sort avec une trame de points roses. Dans la fenêtre d'impression : <b>Recto verso</b>, <b>retourner sur le bord court</b>, échelle 100 %. Chaque page porte son numéro dans le cahier (en bas, côté extérieur) et, près du pli, « Feuille 1 · côté A ». Ensuite : <b>pliez chaque feuille en deux</b>, côté A à l'extérieur. Glissez la feuille ${Math.ceil((P + 4) / 4)} pliée dans la feuille ${Math.ceil((P + 4) / 4) - 1}, et ainsi de suite jusqu'à la <b>feuille 1</b>, qui est à l'extérieur avec la couverture devant. Vérifiez que les numéros se suivent de 1 à ${Math.ceil((P + 4) / 4) * 4}, puis mettez <b>2 agrafes dans le pli</b>. Avant le vrai cahier, faites la « feuille d'essai » sur du papier normal.`,
    "plie-r": `<b>Cahier plié, recto-verso à la main : étape 1, les rectos.</b> Imprimez ces ${Math.ceil((P + 4) / 4)} feuilles (locataire puis bailleur). Remettez ensuite le paquet dans le bac, côté imprimé dessus ou dessous selon votre imprimante, puis choisissez « Cahier plié : versos ». Faites d'abord un essai avec une feuille de papier normal.`,
    "plie-v": `<b>Cahier plié, recto-verso à la main : étape 2, les versos.</b> Imprimez sur le dos des feuilles déjà imprimées, dans le même ordre. Ensuite : séparez les feuilles du locataire (blanches) et du bailleur (à points roses), empilez chaque cahier dans l'ordre, pliez au milieu et agrafez dans le pli.`,
    complet: `<b>Cahier complet en une seule impression, ${(P + 4) / 2} feuilles A4</b>, sur papier blanc, cahier du locataire puis cahier du bailleur (à points roses), soit ${P + 4} impressions. Coupez chaque feuille au milieu, puis <b>séparez les moitiés blanches et celles à points roses</b>. Avec les blanches : posez la pile des moitiés gauches (pages 1 à ${(P + 4) / 2}) sur la pile des moitiés droites (pages ${(P + 4) / 2 + 1} à ${P + 4}), c'est le <b>cahier du locataire</b>, de la couverture au dos. Faites pareil avec celles à points roses : c'est le <b>cahier du bailleur</b>. Agrafez chaque cahier sur le bord gauche, au même endroit.`,
    "2": `<b>Passage 2, ${half} feuilles A4</b> (locataire puis bailleur), soit ${P} impressions. Coupez chaque feuille au milieu, puis <b>séparez les feuilles blanches et celles à points roses</b>. Avec les blanches : empilez les moitiés gauches (pages 1 à ${half}) sur les moitiés droites (pages ${half + 1} à ${P}), c'est le <b>cahier du locataire</b>. Faites pareil avec celles à points roses : c'est le <b>cahier du bailleur</b>. Agrafez chaque cahier sur le bord gauche, au même endroit, pour que les pages se superposent bien.`,
  };
};

// ── HTML ────────────────────────────────────────────────────────────────────
const dots = () => `<span class="dots"></span>`;
const val = (v) => (v ? esc(v) : dots());
const lastDay = (y, m) => `${pad(new Date(y, m + 1, 0).getDate())}/${pad(m + 1)}/${y}`;

function slotsAndPages(L, lease, qrDataUrl, nYears = 3, noCopy = false, offset = 0) {
  const years = buildLeaseYears(L.start, nYears);
  const P = 2 * nYears + 4; // conditions + (loyers, eau) × N + hausses/garantie + fin + notes
  // offset : pages placées avant « Conditions » dans le cahier relié (couverture, guide, exemple = 3).
  const pRaise = P - 2 + offset, pEnd = P - 1 + offset, pNotes = P + offset;
  const sm = years[0][0].m;
  const startY = years[0][0].y;
  const endCell = years[nYears - 1][11];
  const fm = L.firstMonth;
  const money = (n) => esc(moneyAfter(n, L.symbol));
  const sig = (a, b) => `<div class="sig"><span>${a}</span><span>${b}</span></div>`;
  const foot = (n) => `<div class="foot"><span>Carnet ${esc(L.carnet)} · Bail ${esc(L.ref)}</span><span>${n}</span></div>`;
  const qrBox = qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" alt="QR Domus" /></div>` : `<div class="qr">QR<br>Domus</div>`;
  const qr = (t) => `<div class="qrrow">${qrBox}<span>${t}</span></div>`;
  const via = `<div class="via"><span><i></i>Espèces</span><span><i></i>Mobile M. <em></em></span><span><i></i>Banque <em></em></span></div>`;
  const empty = (n, c) => Array.from({ length: n }, () => `<tr>${"<td></td>".repeat(c)}</tr>`).join("");
  const manager = L.managerLine;

  const coverFor = (who) => `<div class="cover">
      <div style="display:grid;gap:3.5mm"><span class="lbl">Carnet n° ${esc(L.carnet)}</span><h1>Carnet<br>de loyer</h1>
      <div class="duree" style="font-size:12pt;font-weight:400;color:transparent;-webkit-text-stroke:.4pt #777">Durée : ${nYears} ans</div>
      <div class="yrs"><span>${MS[sm]} ${startY}</span><span>→</span><span>${MS[endCell.m]} ${endCell.y}</span></div>
      <div class="badge2">Exemplaire du ${who}</div></div>
      <div style="display:grid;gap:2.5mm;border-top:.5pt solid var(--soft);padding-top:3mm">
        <div class="kv"><span class="lbl">Locataire</span><span class="pre" style="font-size:9.5pt">${val(L.tenant)}</span></div>
        <div class="kv"><span class="lbl">Logement</span><span class="pre">${val(L.address)}</span></div>
        <div class="kv"><span class="lbl">Bail</span><span class="pre">${esc(L.ref)} · entrée le ${L.start ? fmtDateShort(L.start) : dots()}</span></div>
        ${manager ? `<div class="kv"><span class="lbl">Gestionnaire</span><span class="pre">${esc(manager)}</span></div>` : ""}
      </div></div>${foot("couverture")}`;
  const COVER = coverFor("locataire");
  const COVER_B = coverFor("bailleur");

  const lostWho = manager ? `le gestionnaire (${esc(manager)})` : "le bailleur";
  // Guide unique (1 page A5) : bases, cas particuliers, fin d'année, erreurs et « Les deux cahiers ».
  const GUIDE = `<h2>Comment remplir ce carnet<small>À lire avant le premier paiement</small></h2>
      <div class="gs"><b>LES DEUX CAHIERS</b><ul>
        ${noCopy
          ? `<li>Deux cahiers <b>identiques</b> : le <b>locataire</b> garde le sien ; le <b>bailleur</b> ou le gestionnaire garde l'autre, reconnaissable à sa <b>trame de points roses</b>.</li>
        <li><b>À chaque paiement :</b> ouvrez les deux à la <b>même page</b> (même numéro en bas), écrivez <b>la même ligne</b> dans les deux, signez tous les deux <b>dans les deux cahiers</b>, puis comparez.</li>
        <li><b>Un seul cahier présent :</b> écrivez dedans, recopiez dans l'autre et faites signer dès que possible.</li>`
          : `<li>Deux cahiers <b>identiques</b> : le <b>blanc</b> reste chez le <b>locataire</b> ; le <b>rose</b>, chez le <b>bailleur</b> ou le gestionnaire.</li>
        <li><b>À chaque paiement :</b> ouvrez les deux à la <b>même page</b>, glissez le rose <b>juste sous</b> le blanc (agrafes contre agrafes), le <b>carton</b> sous le rose ; écrivez et signez sur le blanc en appuyant : tout se copie. Vérifiez la copie.</li>
        <li><b>Un seul cahier présent :</b> écrivez dedans, recopiez à la main dans l'autre et faites signer dès que possible.</li>`}
      </ul></div>
      <div class="gs"><b>ÉCRIRE UNE LIGNE DE LOYER</b>
      <span><b>Stylo à bille</b> seulement${noCopy ? "" : ", en appuyant fort"} : pas de feutre, de crayon ni de <b>blanco</b>. <b>Une ligne = un mois</b>, ne sautez jamais de ligne ; le mois et « À payer » sont déjà imprimés.</span>
      <table class="cols"><colgroup><col style="width:24%"><col style="width:20%"><col></colgroup>
        <thead><tr><th>Colonne</th><th>Qui écrit</th><th>Quoi</th></tr></thead><tbody>
        <tr><td><b>Payé le</b></td><td>Celui qui reçoit</td><td>Jour/mois (ex. 06/08).</td></tr>
        <tr><td><b>Montant payé</b></td><td>Celui qui reçoit</td><td>La somme avec sa <b>monnaie</b> ($ ou FC), ex. 400 $. En FC, ajoutez le <b>taux</b> du jour (ex. 1 120 000 FC · taux 2 800).</td></tr>
        <tr><td><b>Moyen</b></td><td>Celui qui reçoit</td><td>Cochez Espèces, Mobile M. (M-Pesa, Orange, Airtel) ou Banque (nom) ; référence si connue.</td></tr>
        <tr><td><b>Signature de qui reçoit l'argent</b></td><td>Gestionnaire ou bailleur</td><td>Le loyer du mois est reçu en entier.</td></tr>
        <tr><td><b>Signature du locataire</b></td><td>Locataire</td><td>Il est d'accord avec la ligne.</td></tr>
      </tbody></table></div>
      <div class="calc"><b>La règle :</b><span>un mois = un paiement complet, en une fois, au plus tard à la date prévue au bail. La ligne n'est remplie et signée qu'alors. <b>Ligne vide = mois non payé.</b></span></div>
      <div class="gs2">
        <div class="gs"><b>CAS PARTICULIERS</b><ul>
          <li><b>Mois d'avance :</b> une ligne par mois, même date, chacune signée.</li>
          <li><b>Retard :</b> ligne vide ; payé en entier, remplissez-la avec la vraie date.</li>
          <li><b>Hausse :</b> barrez « À payer », écrivez le nouveau, paraphez à deux, notez-la page ${pRaise}.</li>
          <li><b>Eau, courant, travaux :</b> page « Eau, courant et travaux » de l'année ; travaux déduits : aussi dans « Montant payé » avec « Travaux ».</li>
          <li><b>Garantie :</b> page ${pRaise}. <b>Départ :</b> page ${pEnd}.</li>
        </ul></div>
        <div class="gs"><b>FIN D'ANNÉE (${lastDay(years[0][11].y, years[0][11].m).slice(0, 5)})</b><ul>
          <li>Comptez les lignes vides, écrivez les mois non payés en bas, signez le bilan à deux${noCopy ? ", dans les deux cahiers" : " (la signature se copie)"}.</li></ul>
          <b>ERREUR, PHOTO, PERTE</b><ul>
          <li><b>Erreur :</b> un trait, écrivez à côté, paraphez à deux, expliquez page ${pNotes}.</li>
          <li><b>Photo :</b> chaque mois, scannez le QR de la page et envoyez-la.</li>
          <li><b>Perte :</b> prévenez ${lostWho} ; un carnet C2 est refait depuis l'autre cahier et les photos, C1 est annulé.</li>
        </ul></div>
      </div>
      <div class="qrrow sm">${qrBox}<span>Votre compte en ligne : paiements, mois payés, reçus.</span></div>
      ${foot("guide")}`;

  // Exemple rempli : 6 premiers mois du bail, montants dans la devise du bail.
  const pe = (t) => `<span class="pen">${t}</span>`;
  const vx = (k, t = "") => `<div class="via"><span><i class="${k === "E" ? "on" : ""}"></i>Espèces</span><span><i class="${k === "M" ? "on" : ""}"></i>Mobile M. <em>${k === "M" ? pe(t) : ""}</em></span><span><i class="${k === "B" ? "on" : ""}"></i>Banque <em>${k === "B" ? pe(t) : ""}</em></span></div>`;
  const rent = L.rent || 400;
  const pr = fm ? fm.amount : rent;
  const prDays = fm ? fm.days : 13;
  const exM = years[0].slice(0, 6);
  const nextM = (i) => pad(((exM[i].m + 1) % 12) + 1);
  const fxCur = /^(FC|CDF)$/i.test(L.cur) ? "$" : "FC";
  const fxRate = 2800;
  const fxAmount = fxCur === "FC"
    ? `${(rent * fxRate).toLocaleString("fr-FR")} FC`
    : `${(Math.round((rent / fxRate) * 100) / 100).toLocaleString("fr-FR")} $`;
  const EXR = [
    [MF[exM[0].m], money(pr), `06/${nextM(0)}`, money(pr), vx("M", "M-Pesa"), "1"],
    [MF[exM[1].m], money(rent), `09/${nextM(1)}`, money(rent), vx("E"), ""],
    [MF[exM[2].m], money(rent), "", "", vx(""), "2"],
    [MF[exM[3].m], money(rent), `05/${nextM(3)}`, `${fxAmount}<br>taux ${fxRate.toLocaleString("fr-FR")}`, vx("B", "Rawbank"), "3"],
    [MF[exM[4].m], money(rent), `28/${pad(exM[4].m + 1)}`, money(rent), vx("M", "Orange"), "4"],
    [MF[exM[5].m], money(rent), `28/${pad(exM[4].m + 1)}`, money(rent), vx("M", "Orange"), "4"],
  ];
  const EXAMPLE = `<h2>Exemple d'une page remplie <small>année 1, ${MF[exM[0].m].toLowerCase()} à ${MF[exM[5].m].toLowerCase()}</small></h2>
      <table>
        <colgroup><col style="width:17%"><col style="width:14%"><col style="width:9%"><col style="width:15%"><col style="width:19%"><col style="width:13%"><col style="width:13%"></colgroup>
        <thead><tr><th>Mois</th><th>À payer</th><th>Payé le</th><th>Montant payé</th><th>Moyen</th><th>Signature de qui reçoit l'argent</th><th>Signature du locataire</th></tr></thead>
        <tbody>
          ${EXR.map((r) => `<tr><td class="m">${r[0]}${r[5] ? ` <span class="numk">${r[5]}</span>` : ""}</td><td class="due">${r[1]}</td><td>${r[2] ? pe(r[2]) : ""}</td><td>${r[3] ? pe(r[3]) : ""}</td><td>${r[4]}</td><td>${r[2] ? pe("~ K.") : ""}</td><td>${r[2] ? pe("~ D.") : ""}</td></tr>`).join("")}
        </tbody></table>
      <ol class="legend">
        <li><span class="numk">1</span><span><b>${MF[exM[0].m]}</b>${fm ? `, mois au prorata (${prDays} jours = ${money(pr)})` : ""} : payé en entier par M-Pesa. La ligne est signée.</span></li>
        <li><span class="numk">2</span><span><b>${MF[exM[2].m]}</b> : pas encore payé, la ligne reste <b>vide</b>. Elle sera remplie le jour où ${money(rent)} seront payés en entier.</span></li>
        <li><span class="numk">3</span><span><b>${MF[exM[3].m]}</b> payé en ${fxCur} à la banque : ${fxAmount} au taux d'exemple de ${fxRate.toLocaleString("fr-FR")} (le taux réel est celui du jour) = ${money(rent)}.</span></li>
        <li><span class="numk">4</span><span><b>${MF[exM[4].m]} et ${MF[exM[5].m].toLowerCase()}</b> payés d'avance le même jour par Orange : chaque ligne est remplie et signée.</span></li>
      </ol>
      <div class="kv"><span class="lbl">Mois non payés au bilan</span><span class="pen">${MF[exM[2].m]}</span></div>
      ${foot("exemple")}`;

  // Où payer : délégués (nom · tél) + pointillés pour Mobile Money / Banque tant que non renseignés.
  const mobileBank = L.orgPaymentMethods
    ? esc(L.orgPaymentMethods.join(" · "))
    : `Mobile Money ${dots()} · Banque ${dots()}`;
  const cash = L.delegates.length
    ? `Espèces chez le gestionnaire (${esc(L.managerLine)}), contre signature dans ce carnet`
    : "Espèces au bailleur, contre signature dans ce carnet";
  const payWhere = `${mobileBank} · ${cash}`;

  const tenantExtra = [
    `Post-nom ${val(L.tenantPostName)}`,
    `Province ${val(L.tenantProvince)}`,
    L.tenantMarital ? esc(L.tenantMarital) : "",
  ].filter(Boolean).join(" · ");

  const SLOTS = [];
  SLOTS.push(`<h2>Conditions du bail <small>imprimé par Domus</small></h2>
      <div class="g2"><div class="kv"><span class="lbl">Bailleur</span><span class="pre">${val(L.owner)}</span><span>${val(L.ownerPhone)}</span></div>
      <div class="kv"><span class="lbl">Locataire</span><span class="pre">${val(L.tenant)}</span><span>${val(L.tenantPhone)}</span><span class="note">${tenantExtra}</span></div></div>
      ${manager ? `<div class="box"><span class="lbl">Gestionnaire</span><span class="pre">${esc(manager)}</span><span class="note">Délégué Domus : encaisse les loyers et signe ce carnet</span></div>` : ""}
      <div class="box"><div class="g3">
        <div class="kv"><span class="lbl">Loyer</span><span class="pre">${money(L.rent)} / mois</span></div>
        <div class="kv"><span class="lbl">À payer le</span><span class="pre">${val(L.dueDay)}</span></div>
        <div class="kv"><span class="lbl">Garantie</span><span class="pre">${val(L.deposit)}</span></div>
        <div class="kv"><span class="lbl">Préavis</span><span class="pre">${val(L.notice)}</span></div>
        <div class="kv"><span class="lbl">Occupants</span><span class="pre">${val(L.occupants)}</span></div>
      </div><span class="note">${esc(conditionsSentence(L.symbol))} Sous-location interdite sans accord écrit. État des lieux d'entrée le ${L.start ? fmtDateShort(L.start) : dots()}.${fm ? ` 1er mois au prorata : ${prDays} jours = ${money(pr)}.` : ""}</span></div>
      <div class="box"><span class="lbl">Où payer</span><span class="note pre">${payWhere}</span></div>
      <div class="g2">${sig("Le bailleur", "Signature")}${sig("Le locataire", "Signature")}${manager ? sig("Le gestionnaire", "Signature et cachet") : ""}${sig("1er témoin", "Nom et téléphone")}${sig("2e témoin", "Nom et téléphone")}</div>
      <div class="g2"><div class="sig" style="height:18mm"><span>Vu par le chef de quartier (cachet, facultatif)</span><span></span></div>
      <div style="display:grid;gap:1mm"><div class="kv"><span class="lbl">Fait à</span><div class="wl"></div></div><div class="kv"><span class="lbl">Le</span><div class="wl"></div></div></div></div>
      ${foot(`1/${P}`)}`);
  years.forEach((months, k) => {
    const last = months[11];
    const lastLabel = lastDay(last.y, last.m);
    const rows = months.map(({ y, m }, i) => {
      const due = k === 0 && i === 0 && fm ? `${money(fm.amount)}<small>${fm.days} j</small>` : money(L.rent);
      return `<tr><td class="m">${MF[m]}<small>${y}</small></td><td class="due">${due}</td><td></td><td></td><td>${via}</td><td></td><td></td></tr>`;
    }).join("");
    const range = `${MS[months[0].m]} ${months[0].y} → ${MS[last.m]} ${last.y}`;
    SLOTS.push(`<h2>Loyers, année ${k + 1} du bail <small>${range}</small></h2>
      <table>
        <colgroup><col style="width:13%"><col style="width:14%"><col style="width:10%"><col style="width:16%"><col style="width:21%"><col style="width:13%"><col style="width:13%"></colgroup>
        <thead><tr><th>Mois</th><th>À payer</th><th>Payé le</th><th>Montant payé<small>écrire $ ou FC (+ taux)</small></th><th>Moyen</th><th>Signature de qui reçoit l'argent</th><th>Signature du locataire</th></tr></thead>
        <tbody>
          ${rows}
        </tbody></table>
      <div class="kv"><span class="lbl">Mois non payés au ${lastLabel}</span><div class="wl"></div></div>
      <div class="g2">${sig(`Bilan au ${lastLabel} · bailleur`, "Signature")}${sig(`Bilan au ${lastLabel} · locataire`, "Signature")}</div>
      ${qr("Scannez pour envoyer la photo de cette page à Domus.")}
      ${foot(`${2 + k * 2}/${P}`)}`);
    SLOTS.push(`<h2>Eau, courant et travaux, année ${k + 1} <small>${range}</small></h2>
      <table><colgroup><col style="width:13%"><col style="width:17%"><col style="width:14%"><col style="width:13%"><col style="width:15%"><col style="width:14%"><col style="width:14%"></colgroup>
      <thead><tr><th>Date</th><th>Nature</th><th>Montant</th><th>Payé par</th><th>Déduit du loyer ?</th><th>Signature de qui reçoit l'argent</th><th>Signature du locataire</th></tr></thead><tbody>${empty(13, 7)}</tbody></table>
      <p class="note">Nature : eau (REGIDESO), courant (SNEL) ou travaux. Travaux déduits du loyer : écrivez-les aussi sur la page Loyers, dans « Montant payé ».</p>
      <div class="g2"><div class="kv"><span class="lbl">Total eau et courant</span><div class="wl"></div></div><div class="kv"><span class="lbl">Travaux restant à déduire</span><div class="wl"></div></div></div>
      ${qr("Scannez pour envoyer la photo de cette page à Domus.")}
      ${foot(`${3 + k * 2}/${P}`)}`);
  });
  const depRow = L.depositReceived
    ? `<tr><td class="pre">${L.depositReceived.date ? fmtDateShort(L.depositReceived.date) : ""}</td><td class="pre">Reçue${L.depositMonths ? ` (${L.depositMonths} mois)` : ""}</td><td class="pre">${esc(moneyAfter(L.depositReceived.amount, L.depositReceived.symbol))}</td><td class="pre">${esc(moneyAfter(L.depositReceived.amount, L.depositReceived.symbol))}</td><td></td></tr>${empty(6, 5)}`
    : empty(7, 5);
  SLOTS.push(`<h2>Hausses de loyer</h2>
      <table><thead><tr><th>À partir du</th><th>Ancien loyer</th><th>Nouveau loyer</th><th>Prévenu le</th><th>Signatures</th></tr></thead><tbody>${empty(4, 5)}</tbody></table>
      <h2 style="margin-top:2mm">Garantie</h2>
      <table><thead><tr><th>Date</th><th>Mouvement</th><th>Montant</th><th>Total</th><th>Signatures</th></tr></thead>
      <tbody>${depRow}</tbody></table>
      <p class="note">Mouvements : reçue, complément, retenue (dégâts, impayés), restitution.</p>
      ${foot(`${pRaise}/${P}`)}`);
  SLOTS.push(`<h2>Fin du bail et départ</h2>
      <div class="g2"><div class="kv"><span class="lbl">Préavis donné le</span><div class="wl"></div></div><div class="kv"><span class="lbl">Sortie le</span><div class="wl"></div></div></div>
      <table><colgroup><col style="width:70%"><col></colgroup><thead><tr><th>Compte de sortie</th><th>Montant</th></tr></thead><tbody>
        <tr><td>Garantie détenue</td><td></td></tr><tr><td>− Loyers restant dus (payés par la caution)</td><td></td></tr><tr><td>− Eau, courant restant dus</td><td></td></tr>
        <tr><td>− Réparations (état des lieux de sortie)</td><td></td></tr><tr><td>+ Travaux du locataire non déduits</td><td></td></tr>
        <tr class="rep"><td>= À rendre au locataire (ou à payer par lui)</td><td></td></tr></tbody></table>
      <div class="kv"><span class="lbl">Clés rendues : nombre et date</span><div class="wl"></div></div>
      <div class="g2">${sig("Le bailleur", "Signature")}${sig("Le locataire", "Signature")}</div>
      ${qr("Scannez pour envoyer cette page et clôturer le bail dans Domus.")}
      ${foot(`${pEnd}/${P}`)}`);
  SLOTS.push(`<h2>Corrections et notes</h2>
      <p class="note">Toute correction faite dans le carnet est expliquée ici, datée et signée par les deux.</p>
      <table><colgroup><col style="width:16%"><col style="width:11%"><col><col style="width:22%"></colgroup>
      <thead><tr><th>Date</th><th>Page</th><th>Ce qui a été corrigé, et pourquoi</th><th>Signatures</th></tr></thead><tbody>${empty(16, 4)}</tbody></table>
      ${foot(`${pNotes}/${P}`)}`);

  const BACK = `<h2>Dos du carnet</h2>
      <p class="note">Gardez ce carnet au sec, avec l'autre cahier à portée de main pour chaque paiement.</p>
      ${qr("Votre compte en ligne : paiements, mois payés, reçus.")}
      ${foot("dos")}`;

  const NOTES = `<h2>Notes</h2>
      <table><colgroup><col style="width:18%"><col><col style="width:24%"></colgroup>
      <thead><tr><th>Date</th><th>Note</th><th>Signatures</th></tr></thead><tbody>${empty(17, 3)}</tbody></table>
      ${foot("notes")}`;

  return { COVER, COVER_B, GUIDE, EXAMPLE, SLOTS, BACK, NOTES };
}

// pass : "coupe" (A5 coupé, recto, pages dans l'ordre, sans copie, défaut) | "pleine" (1 page = 1 feuille portrait, recto, sans copie) | "simple" (recto seul, feuilles pliées puis empilées, sans copie) | "plie" (livret plié recto-verso) | "plie-r" / "plie-v" (recto-verso à la main) | "complet" (tout le cahier, coupé) | "1" (couvertures + guide) | "2" (liasses autocopiantes) | "cahier" (vue écran page par page).
// ink : "" | "ink-pale" | "ink-blue". duplicate : imprime aussi le 2e exemplaire
// (feuilles guide « bis » au passage 1, feuilles roses au passage 2).
// years : 2 | 3 (durée du carnet, défaut defaultPaperYears(lease)).
// paper : "a4" | "letter" (feuille, moitiés et ligne de pliage aux dimensions du papier).
export function paperBookHtml(lease, { pass = "coupe", ink = "", duplicate = true, qrDataUrl = null, years, copy = "tenant", paper = "a4" } = {}) {
  const n = normYears(years ?? defaultPaperYears(lease));
  const L = paperBookModel(lease);
  const { COVER, COVER_B, GUIDE, EXAMPLE, SLOTS, BACK, NOTES } = slotsAndPages(L, lease, qrDataUrl, n, true, ["simple", "pleine", "coupe"].includes(pass) || pass.startsWith("plie") ? 3 : 0);
  const INTRO = introFor(n);
  const tag = (d) => `<span class="tag">${d ? "Cahier du bailleur" : "Cahier du locataire"}</span>`;
  const a5 = (html, d, cls = "") => `<div class="a5 ${cls}">${d === null ? "" : tag(d)}${html}</div>`;
  const sheet = (l, r, cls = "") => `<div class="sheet ${cls}">${l}${r}</div>`;
  let out = "";
  if (pass === "cahier") {
    out = `<p class="print-msg">Choisissez « Cahier complet » ou un passage pour imprimer.</p><div class="single">${a5(COVER, null, "covpage")}${a5(COVER_B, null, "covpage dup")}${a5(GUIDE, null, "covpage")}${a5(EXAMPLE, null, "covpage")}${SLOTS.map((s, i) => a5(s, false) + (i === 1 ? a5(s, true, "dup") : "")).join("")}</div>`;
  } else if (pass === "coupe") {
    // Cahier coupé A5 : recto seul, feuille i = pages 2i+1 (gauche) et 2i+2 (droite) ; on coupe et on pose les morceaux dans l'ordre.
    const book = (d) => [[d ? COVER_B : COVER, null, "covpage"], [GUIDE, null, "covpage"], [EXAMPLE, null, "covpage"], ...SLOTS.map((x) => [x, d, ""]), [BACK, null, "covpage"]];
    const colors = copy === "landlord" ? [true] : copy === "both" ? [false, true] : [false];
    colors.forEach((d) => {
      const B = book(d);
      for (let i = 0; i < B.length / 2; i++) {
        const l = 2 * i, r = 2 * i + 1;
        out += `<div class="caption">Feuille ${i + 1} / ${B.length / 2} · cahier du ${d ? "bailleur" : "locataire"} · pages ${l + 1} et ${r + 1}</div>`;
        out += sheet(a5(`${B[l][0]}<span class="bk">${l + 1}</span>`, B[l][1], B[l][2]), a5(`${B[r][0]}<span class="bk">${r + 1}</span>`, B[r][1], B[r][2]), `cut${d ? " dup" : ""}`);
      }
    });
  } else if (pass === "pleine") {
    // Feuilles entières : 1 page du carnet = 1 feuille portrait, recto seul, dans l'ordre ; on agrafe, rien à monter.
    const book = (d) => [[d ? COVER_B : COVER, null, "covpage"], [GUIDE, null, "covpage"], [EXAMPLE, null, "covpage"], ...SLOTS.map((x) => [x, d, ""]), [BACK, null, "covpage"]];
    const colors = copy === "landlord" ? [true] : copy === "both" ? [false, true] : [false];
    colors.forEach((d) => {
      const B = book(d);
      B.forEach(([html, tg, cls], i) => {
        out += `<div class="caption">Feuille ${i + 1} / ${B.length} · cahier du ${d ? "bailleur" : "locataire"}</div>`;
        out += `<div class="sheet full${d ? " dup" : ""}">${a5(`${html}<span class="bk">${i + 1}</span>`, tg, cls)}</div>`;
      });
    });
  } else if (pass === "simple") {
    // Cahier simple : recto seul, chaque feuille pliée en deux (impression dehors) = 1 feuillet ; feuillets empilés, agrafés au pli.
    // Feuille i : gauche = page 2i+2 (dos du feuillet), droite = page 2i+1 (devant). Cahier du bailleur : trame de points roses.
    const book = (d) => [[d ? COVER_B : COVER, null, "covpage"], [GUIDE, null, "covpage"], [EXAMPLE, null, "covpage"], ...SLOTS.map((x) => [x, d, ""]), [BACK, null, "covpage"]];
    const colors = copy === "landlord" ? [true] : copy === "both" ? [false, true] : [false];
    const N = book(false).length;
    const mark = (html, num, i) => `${html}<span class="bk">${num}</span><span class="fl">Feuille ${i + 1}</span>`;
    colors.forEach((d) => {
      const B = book(d);
      for (let i = 0; i < N / 2; i++) {
        const l = 2 * i + 1, r = 2 * i;
        out += `<div class="caption">Feuille ${i + 1} / ${N / 2} · cahier du ${d ? "bailleur" : "locataire"} · devant : page ${r + 1}, derrière : page ${l + 1}</div>`;
        out += sheet(a5(mark(B[l][0], l + 1, i), B[l][1], B[l][2]), a5(mark(B[r][0], r + 1, i), B[r][1], B[r][2]), `fold${d ? " dup" : ""}`);
      }
    });
  } else if (pass === "plie" || pass === "plie-r" || pass === "plie-v") {
    // Livret plié recto-verso ; pages « Notes » ajoutées avant le dos pour atteindre un multiple de 4.
    const book = (d) => {
      const b = [[d ? COVER_B : COVER, null, "covpage"], [GUIDE, null, "covpage"], [EXAMPLE, null, "covpage"], ...SLOTS.map((x) => [x, d, ""])];
      while ((b.length + 1) % 4) b.push([NOTES, d, ""]);
      return [...b, [BACK, null, "covpage"]];
    };
    const sides = pass === "plie-r" ? ["recto"] : pass === "plie-v" ? ["verso"] : ["recto", "verso"];
    // copy : "tenant" (papier blanc) | "landlord" (trame de points roses) | "both" (locataire, puis bailleur).
    const colors = copy === "landlord" ? [true] : copy === "both" ? [false, true] : [false];
    const N = book(false).length;
    // Repères imprimés : vrai numéro de page du cahier + « Feuille i · côté A/B » près du pli.
    const mark = (html, num, i, side) => `${html}<span class="bk">${num}</span><span class="fl">Feuille ${i + 1} · côté ${side === "recto" ? "A" : "B"}</span>`;
    colors.forEach((d) => {
      const B = book(d);
      imposeBooklet(N).forEach((sh, i) => {
        sides.forEach((side) => {
          const [l, r] = sh[side];
          out += `<div class="caption">Feuille ${i + 1} / ${N / 4} · ${d ? "à points roses (cahier du bailleur)" : "blanche (cahier du locataire)"} · côté ${side === "recto" ? "A" : "B"} · pages ${l + 1} et ${r + 1}</div>`;
          out += sheet(a5(mark(B[l][0], l + 1, i, side), B[l][1], B[l][2]), a5(mark(B[r][0], r + 1, i, side), B[r][1], B[r][2]), `fold${d ? " dup" : ""}`);
        });
      });
    });
  } else if (pass === "plie-essai") {
    // Feuille d'essai recto-verso sur papier normal : vérifie le sens du retournement avant l'autocopiant.
    const box = (t) => `<div class="essai">${t}</div>`;
    out += `<div class="caption">Feuille d'essai · côté A</div>` + sheet(a5(box("<b>Côté A</b><span>gauche</span>"), null, "covpage"), a5(box("<b>Côté A · page 1</b><span>Retournez la feuille comme une page de livre, de droite à gauche.</span><span>Derrière ce texte, vous devez lire « C'est bon », dans le bon sens.</span>"), null, "covpage"), "fold");
    out += `<div class="caption">Feuille d'essai · côté B</div>` + sheet(a5(box("<b>C'est bon</b><span>Le recto-verso est bien réglé : imprimez le cahier avec les mêmes réglages.</span>"), null, "covpage"), a5(box("<b>Pas bon</b><span>Si vous lisez ceci derrière la page 1, ou si « C'est bon » est à l'envers : changez « Retourner sur le bord court » pour « bord long » (ou l'inverse), puis refaites l'essai.</span>"), null, "covpage"), "fold");
  } else if (pass === "complet") {
    // Tout le cahier, couverture -> dos, en imposition « coupe et empile » ; feuille à points roses = couverture du bailleur.
    const book = (d) => [[d ? COVER_B : COVER, null, "covpage"], [GUIDE, null, "covpage"], [EXAMPLE, null, "covpage"], ...SLOTS.map((x) => [x, d, ""]), [BACK, null, "covpage"]];
    const count = book(false).length;
    imposeCutStack(count).forEach(([l, r], i) => {
      (duplicate ? [false, true] : [false]).forEach((d) => {
        const B = book(d);
        out += `<div class="caption">Feuille ${i + 1} · ${d ? "à points roses (cahier du bailleur)" : "blanche (cahier du locataire)"} · pages ${l + 1} et ${r + 1}</div>`;
        out += sheet(a5(B[l][0], B[l][1], B[l][2]), a5(B[r][0], B[r][1], B[r][2]), d ? "dup" : "");
      });
    });
  } else if (pass === "1") {
    const guide = sheet(a5(GUIDE, null, "covpage"), a5(EXAMPLE, null, "covpage"));
    out = `<div class="caption">Feuille 1 · carton · 1 fois</div>${sheet(a5(COVER, null, "covpage"), a5(COVER_B, null, "covpage dup"))}`
      + `<div class="caption">Feuille 2 · papier normal${duplicate ? " · 2 fois" : ""}</div>${guide}`
      + (duplicate ? `<div class="caption">Feuille 2 bis · 2e exemplaire (cahier du bailleur, à points roses)</div>${sheet(a5(GUIDE, null, "covpage"), a5(EXAMPLE, null, "covpage"), "dup")}` : "");
  } else {
    imposeCutStack(SLOTS.length).forEach(([l, r], i) => {
      (duplicate ? [false, true] : [false]).forEach((d) => {
        out += `<div class="caption">Liasse ${i + 1} · feuille ${d ? "à points roses (bailleur)" : "blanche (locataire)"} · pages ${l + 1} et ${r + 1}</div>`;
        out += sheet(a5(SLOTS[l], d), a5(SLOTS[r], d), d ? "dup" : "");
      });
    });
  }
  const intro = INTRO[pass] || INTRO["2"];
  return `<div class="paper ${esc(ink || "")}${paper === "letter" ? " letter" : ""}"><p class="intro">${intro}</p>${out}</div>`;
}
