// Domus — Relevé de compte du locataire (impression A4 portrait).
// Fonctions PURES + HTML échappé. Source des échéances :
//   - bail flagué (allocationLedger) : lease.dues = source de vérité (restes + imputations) ;
//   - sinon buildFullRentSchedule() (prorata / échéancier / historique).
// Soldes TOUJOURS par devise (jamais de mélange $ / FC).
import { escapeHtml } from "./contractUtils.js";
import { buildFullRentSchedule, fmtDateShort, fmtPeriodShort, monthLabel, moneyAfter } from "./rentBookUtils.js";
import { classifyDue, normalizeGrace } from "./overdue.js";

const MC = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const day10 = (v) => String(v || "").slice(0, 10);
const EPS = 0.005;

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Jours entre deux AAAA-MM-JJ (b - a), en UTC pour éviter tout décalage d'heure d'été.
export function dayDiff(a, b) {
  const pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(a || ""));
  const pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(b || ""));
  if (!pa || !pb) return 0;
  return Math.round((Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 864e5);
}

function monthShort(key) {
  const m = /^(\d{4})-(\d{2})/.exec(String(key || ""));
  return m ? `${MC[Number(m[2]) - 1]} ${m[1]}` : "";
}

function clampDay(key, day) {
  const m = /^(\d{4})-(\d{2})/.exec(key);
  if (!m) return `${key}-01`;
  const dim = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  return `${key}-${String(Math.min(Math.max(1, day || 1), dim)).padStart(2, "0")}`;
}

// Paiements encaissés (hors lignes « échéance » et annulés).
export function collectPayments(lease, payments) {
  const sym0 = lease?.currencySymbol || "CDF";
  return (payments || [])
    .filter((p) => p && p.status === "paid" && p.rowKind !== "due")
    .map((p) => ({
      id: p.id ?? null,
      date: day10(p.paymentDate),
      amount: Number(p.amount) || 0,
      symbol: p.currencySymbol || sym0,
      method: p.method || "",
      reference: p.reference || "",
    }));
}

// Échéances normalisées : { key, dueDate, amount, left, paidOn, symbol, note, allocations }.
export function collectDues(lease, payments) {
  const sym0 = lease?.currencySymbol || "CDF";
  if (lease?.allocationLedger === true && Array.isArray(lease.dues) && lease.dues.length) {
    const byId = new Map((payments || []).map((p) => [String(p.id), p]));
    return lease.dues
      .filter((d) => d && d.status !== false && d.dueStatus !== "voided" && d.periodStart)
      .map((d) => {
        const amount = Number(d.amount) || 0;
        const rest = Number(d.remaining ?? (amount - Number(d.amountPaid || 0)));
        const settled = d.dueStatus === "paid" || rest <= EPS;
        const allocations = (d.allocations || []).map((a) => ({
          paymentId: a.paymentId,
          amount: Number(a.amount) || 0,
          date: day10(a.paymentDate || byId.get(String(a.paymentId))?.paymentDate),
        }));
        const dates = allocations.map((a) => a.date).filter(Boolean).sort();
        const ps = day10(d.periodStart);
        const partial = ps.slice(8, 10) !== "01" && d.periodEnd && day10(d.periodEnd).slice(0, 7) === ps.slice(0, 7);
        return {
          key: ps.slice(0, 7),
          dueDate: day10(d.dueDate || d.periodStart),
          amount,
          left: settled ? 0 : Math.max(0, rest),
          settled,
          paidOn: settled && dates.length ? dates[dates.length - 1] : null,
          symbol: sym0,
          note: partial ? fmtPeriodShort(d.periodStart, d.periodEnd) : "",
          allocations,
        };
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
  const dueDay = Number(lease?.book?.dueDay) || Number(/^\d{4}-\d{2}-(\d{2})/.exec(String(lease?.startDate || ""))?.[1]) || 1;
  const lines = buildFullRentSchedule(lease, payments || []);
  // Prorata : le montant dû est celui de l'échéancier (400 × 13/31 = 167,74), pas le montant
  // payé (170) ; le trop/moins payé se reporte sur les échéances suivantes (même calcul que la carte).
  const schedAmount = new Map((Array.isArray(lease?.schedule) ? lease.schedule : []).map((e) => [day10(e.periodStart), Number(e.amount) || 0]));
  const dues = lines
    .filter((l) => l && l.status !== "voided" && l.status !== false && (l.rentMonth || l.periodStart))
    .map((l) => {
      const key = l.rentMonth || day10(l.periodStart).slice(0, 7);
      const isPaid = l.status === "paid";
      const dueDate = l.dueDate
        ? day10(l.dueDate)
        : l.periodStart
          ? day10(l.periodStart)
          : clampDay(key, dueDay); // jamais paymentDate : la ligne factice d'un mois non payé est datée du 1er
      return {
        key,
        dueDate,
        amount: schedAmount.get(day10(l.periodStart)) ?? (Number(l.amount) || 0),
        left: isPaid ? 0 : Math.max(0, Number(l.remaining ?? l.amount) || 0),
        settled: isPaid,
        paidOn: isPaid ? day10(l.paymentDate) : null,
        symbol: l.currencySymbol || sym0,
        note: l.isProrata && l.prorataDays != null ? `${l.prorataDays} jours, prorata` : "",
        paymentId: isPaid ? l.id ?? null : null,
        allocations: [],
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!schedAmount.size) return dues;
  // Reste par échéance = total payé (devise du bail) réparti dans l'ordre des échéances.
  let pool = collectPayments(lease, payments).filter((p) => p.symbol === sym0).reduce((s, p) => s + p.amount, 0);
  return dues.map((d) => {
    if (d.symbol !== sym0) return d;
    const take = Math.min(pool, d.amount);
    pool -= take;
    const left = Math.round((d.amount - take) * 100) / 100;
    return d.settled ? d : { ...d, left: left > EPS ? left : 0 };
  });
}

// Statut de la frise : temps | retard | avance | du | avenir (avec délai de grâce).
export function dueStatus(d, todayStr, graceDays) {
  const grace = normalizeGrace(graceDays) ?? 0;
  if (d.dueDate > todayStr) return d.left > EPS ? "avenir" : "avance";
  if (d.left > EPS) return "du";
  if (!d.paidOn) return "temps";
  if (d.paidOn < d.dueDate) return "avance";
  return dayDiff(d.dueDate, d.paidOn) <= grace ? "temps" : "retard";
}

const addTo = (map, sym, n) => { map[sym] = (map[sym] || 0) + n; };

export function buildStatement(lease, payments, { today } = {}) {
  const todayStr = typeof today === "string" ? today.slice(0, 10) : todayKey(today instanceof Date ? today : new Date());
  const graceDays = lease?.book?.graceDays;
  const dues = collectDues(lease, payments);
  const pays = collectPayments(lease, payments);
  const months = dues.map((d) => ({ ...d, status: dueStatus(d, todayStr, graceDays) }));

  // Mois couverts par chaque paiement.
  const cover = new Map();
  const push = (pid, text) => { const k = String(pid); cover.set(k, [...(cover.get(k) || []), text]); };
  months.forEach((d) => {
    if (d.allocations?.length) {
      d.allocations.forEach((a) => {
        const partial = a.amount + EPS < d.amount;
        push(a.paymentId, `${monthShort(d.key)}${partial ? ` (${moneyAfter(a.amount, d.symbol)} sur ${moneyAfter(d.amount, d.symbol)})` : ""}`);
      });
    } else if (d.paymentId != null) {
      push(d.paymentId, monthShort(d.key));
    }
  });

  const order = { due: 0, pay: 1 };
  // Paiement sans date : compte dans le solde mais n'ouvre aucune section d'annee.
  const undated = pays.filter((p) => !p.date);
  const events = [
    ...months.filter((d) => d.dueDate && d.dueDate <= todayStr).map((d) => ({ k: "due", date: d.dueDate, symbol: d.symbol, amount: d.amount, d })),
    ...pays.filter((p) => p.date).map((p) => ({ k: "pay", date: p.date, symbol: p.symbol, amount: p.amount, p, covers: cover.get(String(p.id)) || [] })),
  ].sort((a, b) => a.date.localeCompare(b.date) || order[a.k] - order[b.k]);

  const balances = {};
  const totalPaid = {};
  undated.forEach((p) => { addTo(balances, p.symbol, p.amount); addTo(totalPaid, p.symbol, p.amount); });
  const byYear = new Map();
  events.forEach((e) => {
    const y = e.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, { year: y, opening: {}, rows: [], dueSum: {}, paySum: {}, closing: {} });
    const yr = byYear.get(y);
    if (!yr.rows.length) yr.opening = { ...balances };
    addTo(balances, e.symbol, e.k === "due" ? -e.amount : e.amount);
    if (e.k === "due") addTo(yr.dueSum, e.symbol, e.amount);
    else { addTo(yr.paySum, e.symbol, e.amount); addTo(totalPaid, e.symbol, e.amount); }
    yr.rows.push({ ...e, balance: balances[e.symbol], symbol: e.symbol });
    yr.closing = { ...balances };
  });
  const years = [...byYear.values()].sort((a, b) => a.year.localeCompare(b.year)).map((yr) => {
    const inYear = months.filter((d) => d.dueDate.startsWith(yr.year) && d.dueDate <= todayStr);
    return {
      ...yr,
      monthsDue: inYear.length,
      monthsOnTime: inYear.filter((d) => d.status === "temps" || d.status === "avance").length,
    };
  });

  const nextDue = months.find((d) => d.dueDate > todayStr && d.left > EPS) || null;
  const entries = Object.entries(balances).filter(([, v]) => Math.abs(v) > EPS);
  const kind = entries.some(([, v]) => v < 0) ? "due" : entries.length ? "adv" : "ok";
  // « En retard » seulement si une echeance impayee depasse sa date + delai de grace ; sinon « Du ».
  const grace = normalizeGrace(graceDays) ?? 0;
  const isLate = (sym) => months.some((d) => d.symbol === sym && d.left > EPS && d.dueDate <= todayStr && dayDiff(d.dueDate, todayStr) > grace);
  const label = kind === "ok"
    ? "À jour"
    : entries.map(([s, v]) => (v < 0 ? `${isLate(s) ? "En retard" : "Dû"} : ${moneyAfter(-v, s)}` : `Avance : ${moneyAfter(v, s)}`)).join(" · ");

  const frise = [];
  months.forEach((d) => {
    const y = d.key.slice(0, 4);
    let g = frise.find((x) => x.year === y);
    if (!g) { g = { year: y, months: [] }; frise.push(g); }
    g.months.push(d);
  });

  return { today: todayStr, graceDays: normalizeGrace(graceDays) ?? 0, months, frise, years, balances, totalPaid, situation: { kind, label }, nextDue };
}

// ── HTML ────────────────────────────────────────────────────────────────────
const balTag = (b, sym) => (b < -EPS
  ? `<span class="bal du">${escapeHtml(moneyAfter(-b, sym))} dû</span>`
  : b > EPS ? `<span class="bal adv">${escapeHtml(moneyAfter(b, sym))} d'avance</span>` : `<span class="bal ok">À jour</span>`);

const sumsText = (map, sym0) => {
  const e = Object.entries(map || {});
  return e.length ? e.map(([s, v]) => moneyAfter(v, s)).join(" + ") : moneyAfter(0, sym0);
};
const openingText = (map) => {
  const e = Object.entries(map || {}).filter(([, v]) => Math.abs(v) > EPS);
  return e.length ? e.map(([s, v]) => (v < 0 ? `${moneyAfter(-v, s)} dû` : `${moneyAfter(v, s)} d'avance`)).join(" + ") : "0";
};
const closingTags = (map, fallbackSym) => {
  const e = Object.entries(map || {});
  return e.length ? e.map(([s, v]) => balTag(v, s)).join(" ") : balTag(0, fallbackSym);
};

const STATUS_TIP = { temps: "payé à temps", retard: "payé en retard", avance: "payé d'avance", du: "dû", avenir: "à venir" };

export const STATEMENT_CSS = `
  .stmt { color: #1a1f2c; font-family: 'Source Sans 3', Arial, sans-serif; font-size: 11.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; padding: 16px; max-width: 920px; margin: 0 auto; }
  .stmt * { box-sizing: border-box; }
  .stmt h1, .stmt h2, .stmt h3 { margin: 0; font-family: 'Fraunces', Georgia, serif; }
  .stmt .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; border-bottom: 2px solid #2147b0; padding-bottom: 8px; margin-bottom: 10px; }
  .stmt .eyebrow { font-weight: 700; letter-spacing: .12em; text-transform: uppercase; font-size: 10px; color: #2147b0; }
  .stmt h1 { font-size: 20px; }
  .stmt .meta { display: flex; flex-wrap: wrap; gap: 2px 14px; color: #5d6579; font-size: 11px; }
  .stmt .qr { text-align: center; font-size: 8px; color: #5d6579; flex: none; }
  .stmt .qr img { display: block; }
  .stmt .tag { font-weight: 700; font-size: 10px; text-transform: uppercase; border: 1.2px solid #2147b0; color: #2147b0; padding: 1px 6px; border-radius: 3px; }
  .stmt .box { border: 1px solid #dde1ea; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; break-inside: avoid; }
  .stmt .status { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 18px; }
  .stmt .status .main { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; }
  .stmt .big { font-weight: 800; font-size: 22px; }
  .stmt .big.ok { color: #18794e; } .stmt .big.due { color: #b42330; } .stmt .big.adv { color: #2147b0; }
  .stmt .muted { color: #5d6579; }
  .stmt .kv span { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em; color: #5d6579; font-weight: 700; }
  .stmt .kv strong { font-size: 13px; }
  .stmt .frise { display: flex; flex-wrap: wrap; gap: 8px 14px; }
  .stmt .yr-label { font-weight: 800; font-size: 11px; margin-bottom: 3px; }
  .stmt .months { display: flex; flex-wrap: wrap; gap: 3px; }
  .stmt .mo { width: 54px; text-align: center; font-size: 9px; color: #5d6579; }
  .stmt .dot { width: 50px; height: 24px; white-space: nowrap; border-radius: 5px; display: grid; place-items: center; font-size: 8.5px; font-weight: 700; border: 1.6px solid transparent; overflow: hidden; }
  .stmt .s-temps .dot { background: #dcf2e6; color: #18794e; border-color: #18794e; }
  .stmt .s-retard .dot { background: #fbead2; color: #b45309; border-color: #b45309; }
  .stmt .s-avance .dot { background: #e3e9fa; color: #2147b0; border-color: #2147b0; }
  .stmt .s-du .dot { background: #f9dfe1; color: #b42330; border-color: #b42330; }
  .stmt .s-avenir .dot { color: #9aa1b2; border: 1.6px dashed #9aa1b2; }
  .stmt .legend { display: flex; flex-wrap: wrap; gap: 3px 12px; font-size: 10px; color: #5d6579; margin-top: 6px; }
  .stmt .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; border: 1.6px solid; vertical-align: -1px; }
  .stmt .deposit { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 18px; }
  .stmt .deposit h3 { grid-column: 1 / -1; font-size: 13px; }
  .stmt .deposit p { grid-column: 1 / -1; margin: 0; color: #5d6579; font-size: 10.5px; }
  .stmt .year { margin-top: 14px; }
  .stmt .year-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 16px; margin-bottom: 4px; break-after: avoid; }
  .stmt .year-head h2 { font-size: 18px; }
  .stmt .sums { display: flex; flex-wrap: wrap; gap: 2px 14px; color: #5d6579; font-size: 10.5px; }
  .stmt .sums b { color: #1a1f2c; }
  .stmt .tbl { overflow-x: auto; border: 1px solid #dde1ea; border-radius: 6px; }
  .stmt table { border-collapse: collapse; width: 100%; font-size: 11px; min-width: 520px; }
  .stmt thead { display: table-header-group; }
  .stmt th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: .07em; color: #5d6579; padding: 5px 8px; border-bottom: 1px solid #dde1ea; }
  .stmt th.r, .stmt td.r { text-align: right; }
  .stmt td { padding: 4px 8px; border-bottom: 1px solid #eceef3; vertical-align: top; }
  .stmt tr { break-inside: avoid; page-break-inside: avoid; }
  .stmt td.date { white-space: nowrap; color: #5d6579; }
  .stmt td.amt { white-space: nowrap; }
  .stmt td.pay { color: #18794e; font-weight: 700; }
  .stmt td.op small { display: block; color: #5d6579; font-size: 10px; }
  .stmt tr.report td, .stmt tr.close td { background: #f3f4f7; }
  .stmt .bal { font-weight: 700; font-size: 10.5px; white-space: nowrap; padding: 1px 6px; border-radius: 4px; display: inline-block; margin-left: 2px; }
  .stmt .bal.du { background: #f9dfe1; color: #b42330; } .stmt .bal.ok { background: #dcf2e6; color: #18794e; } .stmt .bal.adv { background: #e3e9fa; color: #2147b0; }
  .stmt .close-box { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: flex-end; justify-content: space-between; }
  .stmt .sig { display: flex; gap: 18px; font-size: 10px; color: #5d6579; }
  .stmt .sig span { border-bottom: 1px solid #5d6579; padding-bottom: 22px; min-width: 110px; }
  .stmt .notes { margin: 6px 0 0; padding-left: 16px; color: #5d6579; font-size: 10.5px; }
`;

function tenantNameOf(lease) {
  return [lease?.tenantFirstName, lease?.tenantLastName].filter(Boolean).join(" ") || lease?.book?.companyName || lease?.companyName || "—";
}

function depositHtml(lease) {
  const b = lease?.book || {};
  const rec = b.depositReceived;
  if (!rec && !(Number(b.depositContract) > 0)) return "";
  const sym = rec?.currencySymbol || lease.currencySymbol || "CDF";
  const kv = (l, v) => `<div class="kv"><span>${l}</span><strong>${escapeHtml(v)}</strong></div>`;
  return `<section class="box deposit" aria-label="Garantie">
    <h3>Garantie locative <span class="tag" style="border-color:#5d6579;color:#5d6579">conservée à part</span></h3>
    ${Number(b.depositContract) > 0 ? kv("Montant du contrat", moneyAfter(b.depositContract, lease.currencySymbol || "CDF") + (b.depositMonths ? ` (${b.depositMonths} mois)` : "")) : ""}
    ${rec ? kv("Montant reçu", moneyAfter(rec.amount, sym)) : kv("Montant reçu", "non enregistré")}
    ${rec?.date ? kv("Reçue le", fmtDateShort(rec.date)) : ""}
    <p>La garantie n'entre jamais dans le solde des loyers. Elle sert seulement à l'arrêté final, au départ du locataire.</p>
  </section>`;
}

export function statementBodyHtml(lease, payments, { qrDataUrl, today } = {}) {
  const st = buildStatement(lease, payments, { today });
  const sym0 = lease?.currencySymbol || "CDF";
  const dwelling = [lease?.propertyAddress || lease?.propertyName, lease?.unitName ? `Apt. ${lease.unitName}` : null].filter(Boolean).join(" — ");
  const friseHtml = st.frise.map((g) => `<div><div class="yr-label">${escapeHtml(g.year)}</div><div class="months">${g.months.map((d) => {
    const late = d.status === "du" && classifyDue(d.dueDate, st.graceDays, new Date(`${st.today}T12:00:00`)) === "late";
    const tip = `${monthLabel(`${d.key}-01`)} · ${moneyAfter(d.amount, d.symbol)} · ${d.status === "du" ? `${moneyAfter(d.left, d.symbol)} dû${late ? " (en retard)" : ""}` : d.status === "retard" && d.paidOn ? `payé le ${fmtDateShort(d.paidOn)}` : STATUS_TIP[d.status]}`;
    return `<div class="mo s-${d.status}" title="${escapeHtml(tip)}"><div class="dot">${escapeHtml(moneyAfter(d.amount, d.symbol))}</div>${escapeHtml(MC[Number(d.key.slice(5, 7)) - 1] || "")}</div>`;
  }).join("")}</div></div>`).join("");

  const yearsHtml = st.years.length ? st.years.map((yr, i) => {
    const isCurrent = yr.year === st.today.slice(0, 4);
    const rows = yr.rows.map((e) => {
      if (e.k === "due") {
        const d = e.d;
        return `<tr><td class="date">${fmtDateShort(e.date)}</td><td class="op"><b>Loyer ${escapeHtml(monthLabel(`${d.key}-01`))}</b>${d.note ? `<small>${escapeHtml(d.note)}</small>` : ""}</td><td class="amt r">${escapeHtml(moneyAfter(e.amount, e.symbol))}</td><td></td><td class="r">${balTag(e.balance, e.symbol)}</td></tr>`;
      }
      const p = e.p;
      const detail = [p.reference && `Réf. ${p.reference}`, p.method, e.covers.length && `couvre ${e.covers.join(", ")}`].filter(Boolean).join(" · ");
      return `<tr><td class="date">${fmtDateShort(e.date)}</td><td class="op"><b>Paiement reçu</b>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</td><td></td><td class="amt pay r">${escapeHtml(moneyAfter(e.amount, e.symbol))}</td><td class="r">${balTag(e.balance, e.symbol)}</td></tr>`;
    }).join("");
    const report = i > 0 ? `<tr class="report"><td class="date">${fmtDateShort(`${yr.year}-01-01`)}</td><td class="op"><b>Report de ${Number(yr.year) - 1}</b></td><td></td><td></td><td class="r">${Object.keys(yr.opening).length ? Object.entries(yr.opening).map(([s, v]) => balTag(v, s)).join(" ") : balTag(0, sym0)}</td></tr>` : "";
    const closeDate = isCurrent ? st.today : `${yr.year}-12-31`;
    const close = `<tr class="close"><td class="date">${fmtDateShort(closeDate)}</td><td colspan="4"><div class="close-box"><div><b>Arrêté de compte ${escapeHtml(yr.year)}${isCurrent ? " (en cours)" : ""}</b> · solde à reporter ${closingTags(yr.closing, sym0)}</div><div class="sig"><span>Bailleur</span><span>Locataire</span></div></div></td></tr>`;
    return `<section class="year"><div class="year-head"><h2>${escapeHtml(yr.year)}</h2><div class="sums">
      ${i > 0 ? `<span>Report <b>${escapeHtml(openingText(yr.opening))}</b></span>` : ""}
      <span>Loyers dus <b>${escapeHtml(sumsText(yr.dueSum, sym0))}</b></span><span>Payé <b>${escapeHtml(sumsText(yr.paySum, sym0))}</b></span>
      <span>À temps <b>${yr.monthsOnTime}/${yr.monthsDue} mois</b></span></div></div>
      <div class="tbl"><table><thead><tr><th>Date</th><th>Opération</th><th class="r">Dû</th><th class="r">Payé</th><th class="r">Solde</th></tr></thead><tbody>${report}${rows}${close}</tbody></table></div></section>`;
  }).join("") : `<p class="muted">Aucune opération à ce jour.</p>`;

  const next = st.nextDue;
  return `<div class="stmt">
  <header class="head">
    <div>
      <div class="eyebrow">Relevé de compte locataire</div>
      <h1>${escapeHtml(tenantNameOf(lease))}</h1>
      <div class="meta"><span>Bail ${escapeHtml(lease?.reference || `#${lease?.id ?? ""}`)}</span>${dwelling ? `<span>${escapeHtml(dwelling)}</span>` : ""}<span>Entrée ${fmtDateShort(lease?.startDate)}</span><span>Loyer ${escapeHtml(moneyAfter(lease?.rentAmount, sym0))} / mois</span></div>
    </div>
    <div style="display:grid;gap:6px;justify-items:end"><span class="tag">${lease?.endDate ? `Jusqu'au ${fmtDateShort(lease.endDate)}` : "Sans date de fin"}</span>
    ${qrDataUrl ? `<div class="qr"><img src="${qrDataUrl}" width="64" height="64" alt="QR portail" />Version en ligne</div>` : ""}</div>
  </header>
  <section class="box status" aria-label="Situation">
    <div class="main"><span class="big ${st.situation.kind}">${escapeHtml(st.situation.label)}</span><span class="muted">au ${fmtDateShort(st.today)}</span></div>
    <div class="kv"><span>Prochaine échéance</span><strong>${next ? `${fmtDateShort(next.dueDate)} · ${escapeHtml(moneyAfter(next.left, next.symbol))}` : "—"}</strong></div>
    <div class="kv"><span>Total payé depuis l'entrée</span><strong>${escapeHtml(sumsText(st.totalPaid, sym0))}</strong></div>
  </section>
  <section class="box" aria-label="Frise des mois">
    <h3 style="font-size:13px;margin-bottom:6px">Mois par mois</h3>
    <div class="frise">${friseHtml}</div>
    <div class="legend">
      <span><i style="background:#dcf2e6;border-color:#18794e"></i>Payé à temps</span>
      <span><i style="background:#fbead2;border-color:#b45309"></i>Payé en retard</span>
      <span><i style="background:#e3e9fa;border-color:#2147b0"></i>Payé d'avance</span>
      <span><i style="background:#f9dfe1;border-color:#b42330"></i>Dû</span>
      <span><i style="border:1.6px dashed #9aa1b2"></i>À venir</span>
      <span>Délai de grâce : ${st.graceDays} jour${st.graceDays > 1 ? "s" : ""}</span>
    </div>
  </section>
  ${depositHtml(lease)}
  ${yearsHtml}
  <ul class="notes">
    <li>Chaque mois crée une ligne « Loyer dû » à sa date d'échéance ; chaque paiement crée une ligne « Paiement reçu » avec son moyen et les mois couverts.</li>
    <li>La colonne Solde dit ce que le locataire doit, ou l'avance qu'il a versée. Les soldes sont tenus séparément pour chaque devise.</li>
    <li>Chaque année est clôturée par un arrêté de compte signé des deux parties ; le solde passe sur l'année suivante.</li>
  </ul>
</div>`;
}
