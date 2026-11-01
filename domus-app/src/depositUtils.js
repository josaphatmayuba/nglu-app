// Domus — caution imputée sur les loyers impayés à la sortie : fonctions PURES.
// Les montants ne sont JAMAIS arrondis à 0 décimale : on travaille en centimes
// uniquement pour neutraliser le bruit des flottants (0.1 + 0.2).

export const DEPOSIT_METHOD = "deposit";
export const PAID_BY_DEPOSIT_LABEL = "Payée par la caution";
export const PAID_BY_DEPOSIT_PDF_LABEL = "Réglé par imputation de la caution";

export const isDepositMethod = (method) => String(method || "").trim().toLowerCase() === DEPOSIT_METHOD;

// Libellé d'un moyen de paiement : « deposit » devient « Payée par la caution ».
export const paymentMethodLabel = (method) => (isDepositMethod(method) ? PAID_BY_DEPOSIT_LABEL : method);

// Total « encaissé » : exclut les loyers réglés par la caution (aucun flux de caisse).
export const cashPayments = (payments) => (payments || []).filter((p) => !isDepositMethod(p?.method));

const cents = (n) => Math.round((Number(n) || 0) * 100);
const fromCents = (c) => c / 100;

// Chiffres de la restitution : restitué = détenue − imputée sur loyers − retenue.
// La retenue est plafonnée au disponible (détenue − imputée), jamais négative.
export function depositFigures({ amount, rentApplied = 0, deduction = 0 } = {}) {
  const held = cents(amount);
  const applied = Math.min(Math.max(0, cents(rentApplied)), held);
  const available = held - applied;
  const ded = Math.min(Math.max(0, cents(deduction)), available);
  return {
    held: fromCents(held),
    rentApplied: fromCents(applied),
    available: fromCents(available),
    deduction: fromCents(ded),
    refund: fromCents(available - ded),
  };
}

// Part imputée d'une caution, quelle que soit la source (liste cautions ou aperçu de résiliation).
export const rentAppliedOf = (deposit) => Number(deposit?.rentAppliedAmount ?? deposit?.rentApplied ?? 0) || 0;

// Montant avec devise, 2 décimales exactes. Sans devise connue : tiret (jamais un nombre nu ni « $ » en dur).
export function fmtWithCurrency(n, symbol) {
  const s = String(symbol || "").trim();
  if (!s) return "—";
  return `${s} ${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Répartition FIFO (échéance la plus ancienne d'abord) d'un montant sur des échéances
// { id, periodStart, remaining }. Miroir de planDepositApplication côté API (affichage seulement :
// l'API recalcule et fait foi). Retourne [{ dueId, periodStart, amount, remainingAfter }].
export function fifoDistribution(dues, amount) {
  let rest = cents(amount);
  const sorted = (dues || []).slice().sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)) || Number(a.id) - Number(b.id));
  const out = [];
  for (const d of sorted) {
    if (rest <= 0) break;
    const room = cents(d.remaining);
    const part = Math.min(room, rest);
    if (part <= 0) continue;
    rest -= part;
    out.push({ dueId: Number(d.id), periodStart: d.periodStart, amount: fromCents(part), remainingAfter: fromCents(room - part) });
  }
  return out;
}

// Mode « Choisir les mois » : seules les échéances cochées reçoivent le montant (plus ancienne d'abord).
export function manualAllocations(dues, checkedIds, amount) {
  const set = new Set((checkedIds || []).map(Number));
  return fifoDistribution((dues || []).filter((d) => set.has(Number(d.id))), amount);
}

// Total restant dû des échéances cochées, plafonné au disponible.
export function manualCap(dues, checkedIds, available) {
  const set = new Set((checkedIds || []).map(Number));
  const sum = (dues || []).filter((d) => set.has(Number(d.id))).reduce((s, d) => s + cents(d.remaining), 0);
  return fromCents(Math.min(sum, cents(available)));
}

// Montant saisi valide : > 0, au plus 2 décimales, <= plafond.
export function isValidApplyAmount(value, max) {
  const s = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return false;
  const n = Number(s);
  return n > 0 && cents(n) <= cents(max);
}
