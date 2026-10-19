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
  .paper .sheet { width: 297mm; height: 210mm; background: #fff; color: #222; display: grid; grid-template-columns: 1fr 1fr; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,.25); overflow: hidden; }
  .paper .sheet.dup .a5 { background: var(--pink); }
  .paper .sheet::after { content: "✂ couper ici"; position: absolute; left: 50%; top: 0; bottom: 0; border-left: .4pt dashed #777; font-size: 6pt; color: #777; padding: 1mm 0 0 1mm; }
  .paper .single { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
  .paper .single .a5 { box-shadow: 0 2px 8px rgba(0,0,0,.25); }
  .paper .single .a5.dup { background: var(--pink); }
  .paper .a5 { width: 148.5mm; height: 210mm; padding: 8mm 7mm 7mm 14mm; background: #fff; color: #222; position: relative; display: flex; flex-direction: column; gap: 2.4mm; overflow: hidden; }
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
  .paper td.due { font-weight: 700; white-space: nowrap; }
  .paper td.due small { display: block; font-weight: 400; font-size: 5.6pt; }
  .paper tr.rep td { border-top: .75pt solid var(--line); font-weight: 700; height: 6mm; background: none; font-size: 7pt; }
  .paper .via { display: grid; gap: .2mm; font-size: 5.8pt; line-height: 1.05; }
  .paper .via span { display: flex; align-items: center; gap: .7mm; white-space: nowrap; }
  .paper .via i { width: 2.4mm; height: 2.4mm; border: .5pt solid var(--line); flex: none; }
  .paper .via em { flex: 1; border-bottom: .4pt dotted var(--ink2); min-width: 4mm; height: 2.4mm; }
  .paper .cover { border: .5pt dotted var(--soft); padding: 6mm; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
  .paper .yrs { display: flex; gap: 1.5mm; font-weight: 400; font-size: 9pt; }
  .paper .yrs span { border: .4pt dotted var(--soft); color: #555; padding: .8mm 2mm; }
  .paper .calc { border: .5pt dotted var(--soft); padding: 2mm; font-family: "Courier New", monospace; font-size: 7pt; display: grid; gap: .6mm; }
  .paper ol { margin: 0; padding-left: 4mm; display: grid; gap: .6mm; font-size: 7pt; line-height: 1.3; }
  .paper .badge2 { justify-self: start; font-size: 7.5pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border: .5pt solid var(--soft); color: #555; padding: .8mm 2.5mm; }
  .paper .gs { display: grid; gap: .8mm; font-size: 7pt; line-height: 1.3; }
  .paper .gs > b { font-size: 7.6pt; }
  .paper .gs ul { margin: 0; padding-left: 4mm; display: grid; gap: .7mm; }
  .paper table.cols td { height: auto; padding-block: .8mm; font-size: 6.6pt; line-height: 1.25; vertical-align: top; }
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
    .paper { display: block; padding: 0; gap: 0; }
    .paper .intro, .paper .caption { display: none !important; }
    .paper .sheet { box-shadow: none; break-after: page; page-break-after: always; }
    .paper .sheet:last-child { break-after: auto; page-break-after: auto; }
    .paper .sheet.dup .a5 { background: #fff; }
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
    cahier: `<b>Deux cahiers A5 complets et identiques</b> : le <b>cahier blanc du locataire</b> (montré ici) et le <b>cahier rose du bailleur</b>, avec sa propre couverture « Exemplaire du bailleur ». Chacun contient : couverture, guide en 2 pages, exemple rempli, « Les deux cahiers », puis les ${P} pages à remplir. Une page rose est montrée en exemple sous la page Loyers de l'année 1.`,
    "1": `<b>Passage 1, 5 feuilles A4.</b> Feuille 1 en <b>carton</b> : les deux couvertures, à couper au milieu (une par cahier). Feuilles 2 et 3 en <b>papier normal, à imprimer 2 fois</b> (une fois par cahier) : le guide 1/2 et 2/2, puis l'exemple et « Les deux cahiers ». Ordre de chaque cahier : couverture, guide 1/2, guide 2/2, exemple, les deux cahiers, puis les ${P} pages autocopiantes. Pour le dos, un carton A5 vierge par cahier.`,
    "2": `<b>Passage 2, ${half} liasses A4 autocopiantes</b> (blanche puis rose), soit ${P} impressions. Coupez chaque liasse au milieu, puis <b>séparez les feuilles blanches et roses</b>. Avec les blanches : empilez les moitiés gauches (pages 1 à ${half}) sur les moitiés droites (pages ${half + 1} à ${P}), c'est le <b>cahier du locataire</b>. Faites pareil avec les roses : c'est le <b>cahier du bailleur</b>. Agrafez chaque cahier sur le bord gauche, au même endroit, pour que les pages se superposent bien.`,
  };
};

// ── HTML ────────────────────────────────────────────────────────────────────
const dots = () => `<span class="dots"></span>`;
const val = (v) => (v ? esc(v) : dots());
const lastDay = (y, m) => `${pad(new Date(y, m + 1, 0).getDate())}/${pad(m + 1)}/${y}`;

function slotsAndPages(L, lease, qrDataUrl, nYears = 3) {
  const years = buildLeaseYears(L.start, nYears);
  const P = 2 * nYears + 4; // conditions + (loyers, eau) × N + hausses/garantie + fin + notes
  const pRaise = P - 2, pEnd = P - 1, pNotes = P;
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
  const HOWTO = `<h2>Comment remplir ce carnet <small>guide 1/2 : les bases</small></h2>
      <div class="gs"><b>A. Avant d'écrire</b><ol>
        <li>Il y a <b>deux cahiers identiques</b> : le blanc pour le locataire, le rose pour le bailleur. Posez le cahier rose ouvert <b>sous</b> la même page du cahier blanc, puis le <b>carton</b> sous la page rose (voir la page « Les deux cahiers »).</li>
        <li>Écrivez au <b>stylo à bille</b>, en appuyant fort. Pas de feutre, pas de crayon, <b>pas de blanco</b>.</li>
        <li><b>Une ligne = un mois.</b> Le mois et le montant « À payer » sont déjà imprimés. Ne sautez jamais de ligne.</li>
      </ol></div>
      <div class="gs"><b>B. À chaque paiement, sur la page Loyers</b>
      <table class="cols"><colgroup><col style="width:24%"><col style="width:22%"><col></colgroup>
        <thead><tr><th>Colonne</th><th>Qui écrit</th><th>Quoi écrire</th></tr></thead><tbody>
        <tr><td><b>Payé le</b></td><td>Celui qui reçoit l'argent</td><td>La date du paiement : jour/mois (ex. 06/08).</td></tr>
        <tr><td><b>Montant payé</b></td><td>Celui qui reçoit l'argent</td><td>La somme reçue, <b>avec sa monnaie</b> : $ ou FC (ex. 400 $). En FC, ajoutez le taux du jour (ex. 1 120 000 FC · taux 2 800).</td></tr>
        <tr><td><b>Moyen</b></td><td>Celui qui reçoit l'argent</td><td>Cochez Espèces, Mobile M. (écrivez M-Pesa, Orange ou Airtel) ou Banque (écrivez le nom). Ajoutez la référence si vous l'avez.</td></tr>
        <tr><td><b>Signature de qui reçoit l'argent</b></td><td>Gestionnaire ou bailleur</td><td>Sa signature : elle prouve que le loyer du mois a été reçu en entier.</td></tr>
        <tr><td><b>Signature du locataire</b></td><td>Locataire</td><td>Sa signature : il est d'accord avec la ligne.</td></tr>
      </tbody></table></div>
      <div class="calc"><b>C. La règle : un mois = un paiement complet</b>
        <span>Le loyer du mois se paie <b>en une seule fois et en entier</b>, au plus tard à la fin du délai de grâce.</span>
        <span>La ligne n'est remplie et signée que lorsque le loyer complet est reçu.</span>
        <span>Une ligne vide veut dire : <b>mois non payé</b>.</span></div>
      ${foot("guide 1/2")}`;
  const HOWTO2 = `<h2>Comment remplir ce carnet <small>guide 2/2 : les cas particuliers</small></h2>
      <div class="gs"><b>D. Cas particuliers</b><ul>
        <li><b>Plusieurs mois payés d'avance :</b> remplissez chaque ligne payée, avec la même date et le loyer de ce mois, et signez chaque ligne.</li>
        <li><b>Mois non payé :</b> laissez la ligne vide. Quand le loyer en retard est payé en entier, remplissez sa ligne avec la vraie date de paiement.</li>
        <li><b>Hausse de loyer :</b> barrez le montant « À payer » imprimé, écrivez le nouveau à côté et paraphez tous les deux. Notez la hausse page ${pRaise}, avec les signatures.</li>
        <li><b>Eau, courant, travaux :</b> sur la page « Eau, courant et travaux » de la même année. Si des travaux du locataire sont déduits du loyer, écrivez-les aussi dans « Montant payé » avec le mot « Travaux ».</li>
        <li><b>Garantie :</b> tout complément, retenue ou remboursement s'écrit page ${pRaise}.</li>
        <li><b>Départ du locataire :</b> remplissez la page ${pEnd} (compte de sortie et clés).</li>
      </ul></div>
      <div class="gs"><b>E. Fin de l'année de bail (${lastDay(years[0][11].y, years[0][11].m).slice(0, 5)})</b><ol>
        <li>Comptez les lignes vides et écrivez les mois non payés en bas de la page.</li>
        <li>Signez le bilan tous les deux, cahiers superposés : la signature se copie aussi dans le cahier du bailleur.</li>
      </ol></div>
      <div class="gs"><b>F. Erreurs, photos, perte</b><ul>
        <li><b>Erreur :</b> barrez d'un seul trait, écrivez juste à côté, paraphez tous les deux. Expliquez la correction page ${pNotes}.</li>
        <li><b>Photo :</b> chaque mois, scannez le QR de la page et envoyez la photo. Domus en garde une copie.</li>
        <li><b>Carnet perdu ou abîmé :</b> prévenez ${lostWho}. Un carnet C2 est refait à partir de l'autre cahier et des photos, et ce carnet C1 est annulé.</li>
      </ul></div>
      ${qr("Votre compte en ligne : paiements, mois payés, reçus.")}
      ${foot("guide 2/2")}`;

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
        <colgroup><col style="width:15%"><col style="width:10%"><col style="width:11%"><col style="width:17%"><col style="width:21%"><col style="width:13%"><col style="width:13%"></colgroup>
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
  const TWO = `<h2>Les deux cahiers <small>un pour le locataire, un pour le bailleur</small></h2>
      <div class="gs"><b>Qui garde quoi</b><ul>
        <li>Le <b>cahier blanc</b> reste chez le <b>locataire</b>.</li>
        <li>Le <b>cahier rose</b> reste chez le <b>bailleur</b> ou le gestionnaire. C'est la copie exacte du cahier blanc.</li>
      </ul></div>
      <div class="gs"><b>À chaque paiement</b><ol>
        <li>Celui qui reçoit l'argent apporte le cahier rose.</li>
        <li>Ouvrez les deux cahiers à la <b>même page</b> : même numéro en bas de page.</li>
        <li>Glissez le cahier rose ouvert <b>juste sous</b> la page blanche. Alignez bien les bords, agrafes contre agrafes.</li>
        <li>Glissez le <b>carton</b> sous la page rose, pour ne pas marquer les pages suivantes.</li>
        <li>Écrivez et signez sur la page blanche, au stylo à bille en appuyant : tout se copie sur le rose.</li>
        <li>Avant de refermer, vérifiez que la copie est lisible sur le rose.</li>
      </ol></div>
      <div class="box"><span class="lbl">Si les deux cahiers ne sont pas ensemble</span><span class="note">Écrivez dans le cahier présent. Recopiez la ligne à la main dans l'autre cahier dès que possible, et faites-la signer par les deux.</span></div>
      ${foot("les deux cahiers")}`;

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
        <div class="kv"><span class="lbl">Délai de grâce</span><span class="pre">${val(L.grace)}</span></div>
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
        <colgroup><col style="width:15%"><col style="width:10%"><col style="width:11%"><col style="width:17%"><col style="width:21%"><col style="width:13%"><col style="width:13%"></colgroup>
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
        <tr><td>Garantie détenue</td><td></td></tr><tr><td>− Loyers restant dus</td><td></td></tr><tr><td>− Eau, courant restant dus</td><td></td></tr>
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

  return { COVER, COVER_B, HOWTO, HOWTO2, EXAMPLE, TWO, SLOTS };
}

// pass : "1" (couvertures + guide) | "2" (liasses autocopiantes) | "cahier" (vue écran page par page).
// ink : "" | "ink-pale" | "ink-blue". duplicate : imprime aussi le 2e exemplaire
// (feuilles guide « bis » au passage 1, feuilles roses au passage 2).
// years : 2 | 3 (durée du carnet, défaut defaultPaperYears(lease)).
export function paperBookHtml(lease, { pass = "2", ink = "", duplicate = true, qrDataUrl = null, years } = {}) {
  const n = normYears(years ?? defaultPaperYears(lease));
  const L = paperBookModel(lease);
  const { COVER, COVER_B, HOWTO, HOWTO2, EXAMPLE, TWO, SLOTS } = slotsAndPages(L, lease, qrDataUrl, n);
  const INTRO = introFor(n);
  const tag = (d) => `<span class="tag">${d ? "Cahier du bailleur" : "Cahier du locataire"}</span>`;
  const a5 = (html, d, cls = "") => `<div class="a5 ${cls}">${d === null ? "" : tag(d)}${html}</div>`;
  const sheet = (l, r, cls = "") => `<div class="sheet ${cls}">${l}${r}</div>`;
  let out = "";
  if (pass === "cahier") {
    out = `<p class="print-msg">Choisissez Passage 1 ou Passage 2 pour imprimer.</p><div class="single">${a5(COVER, null, "covpage")}${a5(COVER_B, null, "covpage")}${a5(HOWTO, null, "covpage")}${a5(HOWTO2, null, "covpage")}${a5(EXAMPLE, null, "covpage")}${a5(TWO, null, "covpage")}${SLOTS.map((s, i) => a5(s, false) + (i === 1 ? a5(s, true, "dup") : "")).join("")}</div>`;
  } else if (pass === "1") {
    const guide = sheet(a5(HOWTO, null, "covpage"), a5(HOWTO2, null, "covpage"));
    const example = sheet(a5(EXAMPLE, null, "covpage"), a5(TWO, null, "covpage"));
    out = `<div class="caption">Feuille 1 · carton · 1 fois</div>${sheet(a5(COVER, null, "covpage"), a5(COVER_B, null, "covpage"))}`
      + `<div class="caption">Feuille 2 · papier normal${duplicate ? " · 2 fois" : ""}</div>${guide}`
      + (duplicate ? `<div class="caption">Feuille 2 bis · 2e exemplaire</div>${guide}` : "")
      + `<div class="caption">Feuille 3 · papier normal${duplicate ? " · 2 fois" : ""}</div>${example}`
      + (duplicate ? `<div class="caption">Feuille 3 bis · 2e exemplaire</div>${example}` : "");
  } else {
    imposeCutStack(SLOTS.length).forEach(([l, r], i) => {
      (duplicate ? [false, true] : [false]).forEach((d) => {
        out += `<div class="caption">Liasse ${i + 1} · feuille ${d ? "rose (duplicata)" : "blanche (original)"} · pages ${l + 1} et ${r + 1}</div>`;
        out += sheet(a5(SLOTS[l], d), a5(SLOTS[r], d), d ? "dup" : "");
      });
    });
  }
  const intro = INTRO[pass] || INTRO["2"];
  return `<div class="paper ${esc(ink || "")}"><p class="intro">${intro}</p>${out}</div>`;
}
