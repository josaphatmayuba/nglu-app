// Domus — Loyer au prorata (opt-in par bail, lease.rentProrationEnabled).
// Helpers d'affichage partages. Tous tolerants : si les champs additifs du
// backend (isProrata, periodStart, nextDueAmount...) sont absents, ils
// renvoient null/false et l'ecran garde son comportement historique.
import { getLang, tf } from "./i18n.js";
import { moneyExact } from "./data.js";

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Option active sur ce bail ? (false pour un ancien backend : champ absent)
export const isProrationLease = (lease) => Boolean(lease && lease.rentProrationEnabled);

// Ligne de paiement a periode prorata ?
export const isProrataRow = (p) => Boolean(p && p.isProrata === true && num(p.prorataDays) !== null && num(p.periodDays) !== null);

// Montant de la prochaine echeance (bail prorata uniquement), sinon null.
export function nextDueAmountOf(lease) {
  return isProrationLease(lease) ? num(lease.nextDueAmount) : null;
}
export function nextDueDateOf(lease) {
  return isProrationLease(lease) && lease.nextDueDate ? lease.nextDueDate : null;
}

function parseLocal(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// « 11 → 30 sept. 2027 » (ou « 11 sept. → 10 oct. 2027 » si mois differents).
export function formatPeriod(start, end) {
  const s = parseLocal(start);
  const e = parseLocal(end);
  if (!s || !e) return "";
  const loc = getLang() === "en" ? "en-GB" : "fr-FR";
  const mon = (d) => d.toLocaleDateString(loc, { month: "short" });
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${s.getDate()} → ${e.getDate()} ${mon(e)} ${e.getFullYear()}`;
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.getDate()} ${mon(s)}${sameYear ? "" : ` ${s.getFullYear()}`} → ${e.getDate()} ${mon(e)} ${e.getFullYear()}`;
}

// « Prorata · 20 j / 30 » (badge compact des listes).
export function prorataBadgeText(p) {
  if (!isProrataRow(p)) return "";
  return tf("Prorata · {d} j / {p}", { d: p.prorataDays, p: p.periodDays });
}

// « 550,00 $ × 20 / 30 = 366,67 $ » ; null si le loyer plein est inconnu.
export function prorataCalcText(p, fullAmount, symbol) {
  if (!isProrataRow(p)) return null;
  const full = num(fullAmount ?? p.fullAmount);
  const amount = num(p.amount);
  if (full === null || amount === null) return null;
  return `${moneyExact(full, symbol)} × ${p.prorataDays} / ${p.periodDays} = ${moneyExact(amount, symbol)}`;
}

// Ligne prorata de l'echeance a regler (premiere non payee par periodStart).
export function nextUnpaidProrataRow(list) {
  const rows = (Array.isArray(list) ? list : [])
    .filter((p) => p.status === "pending" && p.periodStart)
    .sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)));
  return rows[0] || null;
}

// Nombre de periodes (mensuel : mois civils ; autres : ancrees sur le jour de debut) deja
// commencees a `today` (0 avant le debut). Pas de plafond : l'appelant ne
// l'utilise que pour combler des lignes absentes.
export function startedPeriods(lease, today = new Date()) {
  const s = parseLocal(lease?.startDate);
  if (!s) return 0;
  if (String(lease?.billingCycle || "monthly").toLowerCase() === "monthly" || !lease?.billingCycle) {
    // Mensuel : mois civils (1re periode partielle = date de debut, puis chaque 1er du mois).
    if (today < s) return 0;
    return (today.getFullYear() - s.getFullYear()) * 12 + (today.getMonth() - s.getMonth()) + 1;
  }
  let n = (today.getFullYear() - s.getFullYear()) * 12 + (today.getMonth() - s.getMonth());
  if (today.getDate() < s.getDate()) n -= 1;
  n = Math.max(0, n) + (today >= s ? 1 : 0);
  return n;
}
