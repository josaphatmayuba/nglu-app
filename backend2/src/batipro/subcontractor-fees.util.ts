import { toCents, fromCents } from "./funds.util";

// Honoraires d'un sous-traitant / ingenieur sur un chantier.
// mode : null/'fixed' (montant fixe = contract_amount) ; 'percent_materials'
// (fee_percent % libre de la somme des bases cochees : natures de spent_by_nature (materials par defaut, labor, handling, other ; jamais fees, qui serait circulaire) et accepted_quote = devis accepte). Aucun arrondi
// monetaire : le du en % garde ses decimales (30 % de 3415.25 = 1024.575).

export type FeeSub = {
  id: number;
  name: string;
  trade: string | null;
  currencyId: number | null;
  contractAmount: string | number | null;
  feeMode: string | null;
  feePercent: string | number | null;
  feeBases?: string | null; // CSV de codes
};
export const FEE_BASE_CODES = ["materials", "labor", "handling", "other", "accepted_quote"] as const;
export type FeeBases = Record<(typeof FEE_BASE_CODES)[number], number>;
export type FeePaidDoc = { subcontractorId: number | null; currencyId: number | null; paidAmount: string | number | null };

export type FeeBlock = {
  subcontractor_id: number;
  name: string;
  trade: string | null;
  mode: "none" | "fixed" | "percent_materials";
  percent: number | null;
  bases: string[] | null;
  base_amount: number | null;
  due: number;
  paid: number;
  remaining: number;
  currency_id: number | null;
};

export function computeSubcontractorFees(
  subs: FeeSub[],
  docs: FeePaidDoc[],
  bases: FeeBases,
  projectCurrencyId: number | null,
): FeeBlock[] {
  const eff = (id: number | null | undefined) => id ?? projectCurrencyId;
  return subs.map((s) => {
    const contract = Number(s.contractAmount ?? 0);
    const pct = s.feePercent != null ? Number(s.feePercent) : null;
    let mode: FeeBlock["mode"];
    if (s.feeMode === "percent_materials") mode = "percent_materials";
    else if (s.feeMode === "fixed" || (s.feeMode == null && contract > 0)) mode = "fixed";
    else mode = "none";
    const codes = (s.feeBases ?? "").split(",").map((c) => c.trim()).filter((c) => (FEE_BASE_CODES as readonly string[]).includes(c));
    const chosen = Array.from(new Set(codes.length ? codes : ["materials"])) as (typeof FEE_BASE_CODES)[number][];
    const baseAmount = chosen.reduce((t, c) => t + (bases[c] ?? 0), 0);
    let due = 0;
    if (mode === "fixed") due = contract;
    else if (mode === "percent_materials") due = ((pct ?? 0) / 100) * baseAmount;
    const paidCents = docs
      .filter((d) => d.subcontractorId === s.id && eff(d.currencyId) === eff(s.currencyId))
      .reduce((sum, d) => sum + toCents(d.paidAmount), 0);
    const paid = fromCents(paidCents);
    return {
      subcontractor_id: s.id,
      name: s.name,
      trade: s.trade ?? null,
      mode,
      percent: mode === "percent_materials" ? pct : null,
      bases: mode === "percent_materials" ? chosen : null,
      base_amount: mode === "percent_materials" ? baseAmount : null,
      due,
      paid,
      remaining: Math.max(due - paid, 0),
      currency_id: s.currencyId ?? null,
    };
  });
}
