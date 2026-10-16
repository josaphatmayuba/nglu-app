// Domus — bail « 1 mois = 1 echeance = ses paiements » (lease.allocationLedger).
// Logique PURE : construit les champs de la carte de loyer DIRECTEMENT depuis
// lease.dues (backend). Les baux non flagges gardent le chemin historique.
import { daysPastDue, dueKind, normalizeGrace, parseLocalDay } from "./overdue.js";

export const isDuesLease = (lease) => Boolean(lease && lease.allocationLedger === true && Array.isArray(lease.dues));

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const day10 = (v) => String(v || "").slice(0, 10);
const dayDate = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export const activeDues = (lease) =>
  (lease?.dues || []).filter((d) => d && d.status !== false && d.dueStatus !== "voided" && d.periodStart)
    .slice().sort((a, b) => day10(a.periodStart).localeCompare(day10(b.periodStart)));

// Avance (credit) : nombre, ou objet { amount }.
export const creditOf = (lease) => {
  const c = lease?.credit;
  return r2(c && typeof c === "object" ? c.amount : c);
};

export const dueRemaining = (d) => r2(d?.remaining ?? (Number(d?.amount || 0) - Number(d?.amountPaid || 0)));

// Date d'echeance d'une ligne (repli : debut de periode).
export const dueDay = (d) => d?.dueDate ?? d?.periodStart;

// Echue = jour J inclus (serveur : dueDate <= aujourd'hui).
export const isDueEchu = (d, now = new Date()) => (daysPastDue(dueDay(d), now) ?? -1) >= 0;

// Champs de carte (memes noms que buildLeaseCards) + frise par echeance.
export function duesCardFields(lease, now = new Date()) {
  const dues = activeDues(lease);
  const kinds = dues.map((d) => dueKind(d, lease.graceDays, now));
  const months = dues.map((d) => dayDate(d.periodStart));
  const fills = dues.map((d, i) => {
    const a = Number(d.amount) || 0;
    return kinds[i] === "paid" ? 100 : a > 0 ? Math.max(0, Math.min(100, Math.round((Number(d.amountPaid) || 0) / a * 100))) : 0;
  });
  // Echu = jour J de l'echeance inclus (meme regle que le serveur : dueDate <= aujourd'hui).
  const isEchu = (d) => isDueEchu(d, now);
  const unpaidEchu = dues.filter((d, i) => kinds[i] !== "paid" && isEchu(d));
  // Reste a payer : source unique = lease.totalDue du serveur ; repli sur le calcul local.
  const serverTotal = lease?.totalDue;
  const balance = serverTotal != null && serverTotal !== "" && Number.isFinite(Number(serverTotal))
    ? r2(serverTotal)
    : r2(unpaidEchu.reduce((s, d) => s + dueRemaining(d), 0));
  const lateCount = kinds.filter((k) => k === "late").length;
  const paidCount = kinds.filter((k) => k === "paid").length;
  const credit = creditOf(lease);
  const hasOpen = kinds.some((k) => k === "due" || k === "cur" || k === "partial" || k === "late");
  const status = lateCount > 0 ? "late" : balance > 0.005 || kinds.includes("cur") ? "pending" : "ok";
  const totalPaid = r2(dues.reduce((s, d) => s + (Number(d.amountPaid) || 0), 0));
  const totalDue = r2(dues.filter((d) => isEchu(d) || kinds[dues.indexOf(d)] === "cur").reduce((s, d) => s + (Number(d.amount) || 0), 0));
  // Dernier mois solde (fin de periode) pour « Couvert jusqu'a ».
  const lastPaid = dues.filter((d, i) => kinds[i] === "paid").pop();
  const futurePaid = dues.filter((d, i) => kinds[i] === "paid" && !isEchu(d)).length;
  // Total = periodes du bail (debut/fin inclus) : les mois futurs non encore generes
  // s'affichent « a venir » (comme le legacy). Bail sans fin : pas de remplissage.
  // Periodes mensuelles du bail : fin exclusive = lendemain de endDate (07-15 -> 07-14 = 12).
  const sm = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(lease?.startDate || ""));
  const em = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(lease?.endDate || ""));
  let leaseMonths = 0;
  if (sm && em) {
    const ex = new Date(Number(em[1]), Number(em[2]) - 1, Number(em[3]) + 1);
    leaseMonths = (ex.getFullYear() - Number(sm[1])) * 12 + (ex.getMonth() + 1 - Number(sm[2])) + (ex.getDate() > Number(sm[3]) ? 1 : 0);
  }
  const lastMonth = months[months.length - 1];
  if (lastMonth && leaseMonths > kinds.length) {
    const base = kinds.length;
    for (let k = base; k < leaseMonths; k += 1) {
      kinds.push("future");
      fills.push(0);
      months.push(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + (k - base + 1), 1));
    }
  }
  const ld = lateDueSplit(dues, kinds, lease?.graceDays, now);
  return {
    dues, kinds, months, fills, paidCount, lateCount, hasOpen,
    lateAmount: ld.late, dueAmount: ld.due, graceUntil: ld.graceUntil,
    monthsCovered: paidCount,
    monthsCoveredFloat: paidCount,
    monthsDue: Math.max(1, dues.filter((d) => isEchu(d)).length + (kinds.includes("cur") ? 1 : 0)),
    totalDue, balance, credit, status, totalPaid,
    monthsBehind: unpaidEchu.length,
    monthsAhead: futurePaid,
    coveredUntil: lastPaid ? dayDate(lastPaid.periodEnd) || dayDate(lastPaid.periodStart) : null,
  };
}

// Montant cumule restant du jusqu'a l'echeance d'indice i (plus anciennes incluses).
export function cumulativeRemaining(dues, i) {
  let s = 0;
  for (let k = 0; k <= i && k < dues.length; k += 1) s += dueRemaining(dues[k]);
  return r2(s);
}

// Echeances imputees par un paiement : [{ due, amount }].
export function allocationsOfPayment(dues, paymentId) {
  const out = [];
  (dues || []).forEach((d) => (d.allocations || []).forEach((a) => {
    if (String(a.paymentId) === String(paymentId)) out.push({ due: d, amount: Number(a.amount) || 0 });
  }));
  return out;
}

// Avertissement (sans blocage) : un mois futur est paye alors qu'un plus ancien est en retard.
export function futureBeforeLate(dues, picked, graceDays, now = new Date()) {
  const kinds = new Map(dues.map((d) => [d.id, dueKind(d, graceDays, now)]));
  const sel = dues.filter((d) => picked.has(d.id) && (Number(picked.get(d.id)) || 0) > 0);
  const maxSel = sel.map((d) => day10(d.periodStart)).sort().pop();
  if (!maxSel) return false;
  const future = sel.some((d) => !isDueEchu(d, now) && kinds.get(d.id) !== "cur");
  if (!future) return false;
  return dues.some((d) => kinds.get(d.id) === "late" && !(picked.get(d.id) > 0) && day10(d.periodStart) < maxSel);
}

// Date limite de grace = echeance + graceDays (null si graceDays inconnu).
export function graceUntilOf(dueDate, graceDays) {
  const g = normalizeGrace(graceDays);
  const d = parseLocalDay(dueDate);
  if (g === null || g < 0 || !d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + g);
}

// Retard / Du (bail flagge) : retard = reste des echeances « late » ; du = reste des
// echeances echues (ou mois courant) encore dans la grace. graceUntil = fin de grace
// de la plus ancienne echeance « du ».
export function lateDueSplit(dues, kinds, graceDays, now = new Date()) {
  let late = 0;
  let due = 0;
  let graceUntil = null;
  dues.forEach((d, i) => {
    const k = kinds[i];
    if (k === "paid" || k === "future") return;
    const rest = dueRemaining(d);
    if (k === "late") { late += rest; return; }
    if (!isDueEchu(d, now)) return;
    due += rest;
    if (graceUntil === null && rest > 0.005) graceUntil = graceUntilOf(dueDay(d), graceDays);
  });
  return { late: r2(late), due: r2(due), graceUntil };
}

// Bail historique : retard = reste cumule jusqu'au dernier mois « late » de la frise
// (les paiements remplissent les mois du plus ancien au plus recent), borne par le solde ;
// du = solde - retard. cumDue(i) = cumul exigible jusqu'au mois i inclus.
export function legacyLateDue({ kinds, balance, totalPaid, cumDue }) {
  const lastLate = kinds.lastIndexOf("late");
  const bal = Math.max(0, Number(balance) || 0);
  const late = lastLate < 0 ? 0 : Math.min(bal, Math.max(0, r2(cumDue(lastLate) - (Number(totalPaid) || 0))));
  return { late: r2(late), due: r2(Math.max(0, bal - late)) };
}

// Montants d'un mois de la frise d'un bail flagge. prorata = periode plus courte que le loyer plein.
export function monthAmounts(dueFrise, i, rent) {
  const d = dueFrise?.dues?.[i];
  if (!d) return { amount: r2(rent), paid: 0, prorata: false, hasDue: false };
  const amount = r2(d.amount);
  const full = Number(rent) || 0;
  return { amount, paid: r2(d.amountPaid), prorata: full > 0 && amount > 0.005 && amount < full - 0.005, hasDue: true };
}
