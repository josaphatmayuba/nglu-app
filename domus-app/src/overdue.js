// Retard de loyer : logique PURE (sans React), source unique cote front.
// Regle (identique au backend, lease-overdue.ts) :
//   - "echue"     = date d'echeance passee et non couverte ;
//   - "en retard" = date d'echeance + delai de grace (reglage org
//                   rentOverdueGraceDays) STRICTEMENT depassee.
// Le flag calcule par le backend (isOverdue) est prioritaire ; sinon on
// applique la regle date + graceDays ; sinon l'ancienne regle (date passee).

import { parseDomusDate } from "./dateRange.jsx";

const DAY_MS = 86400000;

// AAAA-MM-JJ lu en JOUR LOCAL (parseDomusDate, midi local) ; accepte aussi un Date.
export function parseLocalDay(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return parseDomusDate(value);
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Jours entiers ecoules depuis `dueDate` (negatif = a venir), en jours locaux.
export function daysPastDue(dueDate, now = new Date()) {
  const due = parseLocalDay(dueDate);
  if (!due) return null;
  return Math.round((startOfDay(now).getTime() - startOfDay(due).getTime()) / DAY_MS);
}

export function normalizeGrace(graceDays) {
  const n = Number(graceDays);
  return graceDays != null && graceDays !== "" && Number.isFinite(n) && n >= 0 ? n : null;
}

// Classe une echeance non couverte : "upcoming" (a venir / jour J),
// "due" (echue dans la grace), "late" (au-dela de la grace).
// Sans graceDays : toute echeance passee est "late" (ancienne regle).
export function classifyDue(dueDate, graceDays, now = new Date()) {
  const past = daysPastDue(dueDate, now);
  if (past === null || past <= 0) return "upcoming";
  const g = normalizeGrace(graceDays);
  if (g === null) return "late";
  return past > g ? "late" : "due";
}

// Paiement/echeance 'pending' en retard. Flag backend (isOverdue) prioritaire.
export function isPaymentOverdue(payment, graceDays, now = new Date()) {
  if (!payment || payment.status === "paid") return false;
  if (typeof payment.isOverdue === "boolean") return payment.isOverdue;
  const g = graceDays ?? payment.graceDays;
  return classifyDue(payment.paymentDate, g, now) === "late";
}

// Statut de la carte d'un bail : "late" | "pending" | "ok".
// `balance` = solde restant du (deja calcule par l'ecran, non modifie ici).
export function leaseCardStatus(lease, balance, now = new Date()) {
  if (lease && typeof lease.isOverdue === "boolean") {
    if (lease.isOverdue) return "late";
    return balance > 0.005 ? "pending" : "ok";
  }
  const g = lease ? lease.graceDays : null;
  const dueDate = lease && (lease.nextDueDate || lease.nextInvoiceDate);
  if (balance > 0.005 && dueDate && normalizeGrace(g) !== null) {
    return classifyDue(dueDate, g, now) === "late" ? "late" : "pending";
  }
  // Ancienne regle : solde du et echeance passee = retard.
  if (balance > 0.005) {
    const past = dueDate ? daysPastDue(dueDate, now) : null;
    return past !== null && past > 0 ? "late" : "pending";
  }
  return "ok";
}

// Pastille "Prochain loyer" : kind = overdue | due | soon | upcoming | none.
// `days` = jours (positif) de retard / d'echeance depassee, ou jours restants.
export function dueChipFor(lease, dueDate, now = new Date()) {
  const past = daysPastDue(dueDate, now);
  // Flag backend prioritaire : "en retard" seulement si le bail l'est (grace depassee).
  if (lease && lease.isOverdue === true) {
    return { kind: "overdue", days: Number(lease.overdueDays) > 0 ? Number(lease.overdueDays) : Math.max(0, past || 0) };
  }
  if (past === null) return { kind: "none", days: 0 };
  if (past <= 0) return { kind: past >= -7 ? "soon" : "upcoming", days: -past };
  if (lease && lease.isOverdue === false) return { kind: "due", days: past };
  return { kind: classifyDue(dueDate, lease && lease.graceDays, now) === "late" ? "overdue" : "due", days: past };
}

// Date d'echeance de la periode mensuelle i (0 = debut du bail), clamp fin de mois, jour local.
// civil=true (bail au prorata, mensuel) : meme regle que le backend (lease-schedule.ts),
// 1re echeance = date de debut puis le 1er de chaque mois.
export function dueDateForMonth(startDate, i, civil = false) {
  const s = parseLocalDay(startDate);
  if (!s) return null;
  if (civil && i >= 1) return new Date(s.getFullYear(), s.getMonth() + i, 1, 12);
  const d = new Date(s.getFullYear(), s.getMonth() + i, 1, 12);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(s.getDate(), last));
  return d;
}

// Frise des loyers : un etat par mois (paid | partial | late | due | cur | future)
// et le nombre de mois en retard, calcules par la MEME regle (compteur == cases rouges).
// rows : lignes de periode (periodStart) du bail au prorata, si disponibles.
// Sans graceDays (backend pas a jour / PWA en cache) : ancienne classification.
export function friseKinds({ startDate, graceDays, prorata = false, periodStarts = null, totalMonths, monthsDue, monthsCoveredFloat = 0, now = new Date() }) {
  const kinds = [];
  let lateCount = 0;
  // Echeances reelles indexees par mois civil (AAAA-MM) : les lignes de periode ne
  // commencent pas forcement au 1er mois du bail (ex. juil/aout payes sans periode),
  // un acces par rang decalerait les echeances et rendrait un mois en retard « courant ».
  const startD = parseLocalDay(startDate);
  const byMonth = new Map();
  (periodStarts || []).forEach((p) => { if (p) byMonth.set(String(p).slice(0, 7), p); });
  for (let i = 0; i < totalMonths; i++) {
    const fill = Math.max(0, Math.min(1, (monthsCoveredFloat || 0) - i));
    if (fill >= 0.999) { kinds.push("paid"); continue; }
    if (i >= monthsDue) { kinds.push(fill > 0 ? "partial" : "future"); continue; }
    let cls;
    if (normalizeGrace(graceDays) === null) {
      cls = i < monthsDue - 1 ? "late" : "cur";
    } else {
      const mk = startD ? (() => { const m = new Date(startD.getFullYear(), startD.getMonth() + i, 1); return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`; })() : null;
      const due = prorata && mk && byMonth.has(mk) ? byMonth.get(mk) : dueDateForMonth(startDate, i, prorata);
      cls = classifyDue(due, graceDays, now);
    }
    if (cls === "late") lateCount += 1;
    // Un mois echeance + grace depasse et non solde (meme partiellement paye) reste « late » ;
    // dans la grace ou mois courant, un paiement partiel garde la case « partial ».
    kinds.push(cls === "late" ? "late" : fill > 0 ? "partial" : cls === "due" ? "due" : "cur");
  }
  return { kinds, lateCount };
}

// Compte les echeances non couvertes en retard (au-dela de la grace).
export function countLateDues(dueDates, graceDays, now = new Date()) {
  return dueDates.reduce((n, d) => n + (classifyDue(d, graceDays, now) === "late" ? 1 : 0), 0);
}
