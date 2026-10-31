// Taux de change fige par document BatiPro : logique PURE (testable sans base).
//
// Sens du taux : fxRate = X signifie "1 unite de la devise du CHANTIER = X unites
// de la devise du DOCUMENT" (ex. chantier USD, BC en CDF, fxRate = 2800).
// Contre-valeur (en devise chantier) = montant document / fxRate.
//
// Regles d'arrondi (explicites) :
//  - Tout se calcule en CENTIMES entiers, avec BigInt (aucun flottant, aucune
//    division par un taux converti en number).
//  - La contre-valeur est arrondie AU CENTIME, demi vers le haut (half-up), sur
//    le taux EXACTEMENT stocke (decimal(18,6), 6 decimales).
//  - Chaque reglement est converti separement a SON taux ; le cumul des
//    contre-valeurs (deja arrondies au centime) est ce qu'on stocke.

export const FX_SCALE = 6;
const FX_UNIT = 10n ** BigInt(FX_SCALE);

// Parse un taux (number ou string decimal) en entier mis a l'echelle 1e6.
// null si invalide, <= 0, ou avec plus de 6 decimales (on ne tronque jamais).
export function parseFxRate(v: string | number | null | undefined): bigint | null {
  if (v == null || v === "") return null;
  let s: string;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return null;
    s = v.toFixed(FX_SCALE + 3);
    // Verifie qu'aucune decimale significative n'existe au-dela de 6.
    if (Math.abs(Number(s) - Number(v.toFixed(FX_SCALE))) > 1e-9) return null;
    s = v.toFixed(FX_SCALE);
  } else {
    s = v.trim();
  }
  const m = /^(\d{1,12})(?:\.(\d{1,}))?$/.exec(s);
  if (!m) return null;
  const frac = m[2] ?? "";
  if (frac.length > FX_SCALE && /[1-9]/.test(frac.slice(FX_SCALE))) return null;
  const scaled = BigInt(m[1]) * FX_UNIT + BigInt((frac + "000000").slice(0, FX_SCALE));
  return scaled > 0n ? scaled : null;
}

// Taux mis a l'echelle -> chaine decimale a 6 decimales (valeur stockee en DB).
export function fxRateToString(scaled: bigint): string {
  const int = scaled / FX_UNIT;
  const frac = (scaled % FX_UNIT).toString().padStart(FX_SCALE, "0");
  return `${int}.${frac}`;
}

// Taux mis a l'echelle -> number (uniquement pour transmettre au ledger).
export function fxRateToNumber(scaled: bigint): number {
  return Number(fxRateToString(scaled));
}

// Contre-valeur en centimes (devise chantier) d'un montant en centimes (devise
// document) : round_half_up(docCents * 1e6 / rate). Montants >= 0.
export function convertToProjectCents(docCents: number, rate: bigint): number {
  if (!docCents) return 0;
  const num = BigInt(Math.round(docCents)) * FX_UNIT;
  const q = (num * 2n + rate) / (rate * 2n);
  return Number(q);
}

// Inverse un taux decimal (chaine DB, n'importe quelle echelle <= 18) vers
// l'echelle 1e6, arrondi demi vers le haut : calcule sur la valeur EXACTE
// stockee (jamais sur un number). null si invalide.
export function invertDecimalRate(decimal: string | number | null | undefined): bigint | null {
  if (decimal == null) return null;
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(decimal).trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  const scaled = BigInt(m[1] + frac); // valeur * 10^frac.length
  if (scaled <= 0n) return null;
  const pow = 10n ** BigInt(frac.length);
  // 1 / (scaled/pow) * 1e6 = pow * 1e6 / scaled
  const num = pow * FX_UNIT;
  const q = (num * 2n + scaled) / (scaled * 2n);
  return q > 0n ? q : null;
}

// Taux decimal DB direct -> echelle 1e6 (sans perte : colonnes en 6 decimales).
export function decimalRateToScaled(decimal: string | number | null | undefined): bigint | null {
  return parseFxRate(decimal == null ? null : String(decimal));
}

export const FX_SOURCES = ["manual", "last_exchange"] as const;
export type FxSource = (typeof FX_SOURCES)[number];
