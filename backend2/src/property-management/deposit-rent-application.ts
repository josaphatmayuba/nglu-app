import { BadRequestException } from "@nestjs/common";
import { roundMoney } from "./lease-schedule";

// Imputation de la caution detenue sur les loyers impayes (a la sortie).
// Module PUR : aucune base de donnees, aucune ecriture. Calcule la repartition,
// les avertissements et le libelle des mois. Les montants passent toujours par
// roundMoney (decimales de la devise), jamais par un arrondi a 0 decimale.

export interface DepositDueInput {
  id: number;
  periodStart: string;
  periodEnd?: string | null;
  dueDate?: string | null;
  /** Reste a payer de l'echeance. */
  remaining: number;
}

export interface DepositExplicitChoice {
  dueId: number;
  amount?: number;
}

export interface DepositPlanInput {
  dues: DepositDueInput[];
  /** Caution detenue moins deja imputee. */
  available: number;
  /** Montant demande ; absent = autant que possible (apercu). */
  amount?: number | null;
  mode?: "auto" | "manual";
  explicit?: DepositExplicitChoice[];
  /** Date de sortie (YYYY-MM-DD) : les echeances commencant apres sont exclues. */
  terminationDate?: string | null;
  decimals?: number;
}

export interface DepositPlanLine {
  dueId: number;
  periodStart: string;
  periodEnd: string | null;
  amount: number;
  remainingAfter: number;
}

export interface DepositPlan {
  amount: number;
  totalUnpaid: number;
  maxApplicable: number;
  allocations: DepositPlanLine[];
  warnings: string[];
  monthsLabel: string;
}

const MONTHS_FR = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

export function monthLabelFr(day: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(day ?? ""));
  if (!m) return String(day ?? "");
  const idx = Number(m[2]) - 1;
  return `${MONTHS_FR[idx] ?? m[2]} ${m[1]}`;
}

export function monthsLabelFromLines(lines: Array<{ periodStart: string }>): string {
  const seen: string[] = [];
  for (const l of lines) {
    const label = monthLabelFr(l.periodStart);
    if (!seen.includes(label)) seen.push(label);
  }
  if (seen.length <= 1) return seen[0] ?? "";
  return `${seen.slice(0, -1).join(", ")} et ${seen[seen.length - 1]}`;
}

/** Echeances eligibles : reste > 0 et debut <= date de sortie, plus anciennes d'abord. */
export function eligibleDues(dues: DepositDueInput[], terminationDate?: string | null, decimals = 2): DepositDueInput[] {
  const limit = terminationDate ? String(terminationDate).slice(0, 10) : null;
  return dues
    .filter((d) => roundMoney(Number(d.remaining) || 0, decimals) > 0)
    .filter((d) => !limit || String(d.periodStart).slice(0, 10) <= limit)
    .slice()
    .sort((a, b) => String(a.periodStart).localeCompare(String(b.periodStart)) || Number(a.id) - Number(b.id));
}

export function planDepositApplication(input: DepositPlanInput): DepositPlan {
  const dec = input.decimals ?? 2;
  const available = roundMoney(Number(input.available) || 0, dec);
  const dues = eligibleDues(input.dues, input.terminationDate, dec);
  const totalUnpaid = roundMoney(dues.reduce((s, d) => s + roundMoney(Number(d.remaining), dec), 0), dec);
  const maxApplicable = roundMoney(Math.min(available, totalUnpaid), dec);

  let amount: number;
  if (input.amount == null) {
    amount = maxApplicable;
  } else {
    amount = roundMoney(Number(input.amount), dec);
    if (!(amount > 0)) throw new BadRequestException("Le montant a imputer doit etre superieur a 0.");
    if (Math.abs(Number(input.amount) - amount) > 1e-9) {
      throw new BadRequestException(`Le montant a imputer ne peut pas depasser ${dec} decimales.`);
    }
    if (amount > available) throw new BadRequestException("Le montant depasse la caution disponible.");
    if (amount > totalUnpaid) throw new BadRequestException("Le montant depasse le total des loyers impayes.");
  }

  const warnings: string[] = [];
  const left = new Map<number, number>(dues.map((d) => [Number(d.id), roundMoney(Number(d.remaining), dec)]));
  const taken = new Map<number, number>();
  let rest = amount;
  const take = (dueId: number, want: number) => {
    const room = left.get(dueId) ?? 0;
    const part = roundMoney(Math.min(want, room, rest), dec);
    if (part <= 0) return;
    left.set(dueId, roundMoney(room - part, dec));
    taken.set(dueId, roundMoney((taken.get(dueId) ?? 0) + part, dec));
    rest = roundMoney(rest - part, dec);
  };

  if (input.mode === "manual" && input.explicit?.length) {
    const seen = new Set<number>();
    let sum = 0;
    for (const e of input.explicit) {
      const id = Number(e.dueId);
      if (!left.has(id)) throw new BadRequestException(`Echeance #${e.dueId} non eligible a l'imputation de la caution.`);
      if (seen.has(id)) throw new BadRequestException("Echeance en double dans l'imputation.");
      seen.add(id);
      if (e.amount != null) {
        const a = roundMoney(Number(e.amount), dec);
        if (!(a > 0)) throw new BadRequestException("Montant d'imputation invalide.");
        if (a > (left.get(id) ?? 0)) throw new BadRequestException(`Echeance #${id} : montant superieur au reste a payer.`);
        sum = roundMoney(sum + a, dec);
      }
    }
    if (sum > amount) throw new BadRequestException("Le total des imputations depasse le montant a imputer.");
    for (const e of input.explicit) take(Number(e.dueId), e.amount != null ? roundMoney(Number(e.amount), dec) : Number.POSITIVE_INFINITY);
    if (rest > 0) warnings.push("Le reste du montant a ete impute sur les echeances les plus anciennes.");
  }
  // FIFO (mode auto, ou reste du mode manual).
  for (const d of dues) {
    if (rest <= 0) break;
    take(Number(d.id), Number.POSITIVE_INFINITY);
  }

  const allocations: DepositPlanLine[] = dues
    .filter((d) => (taken.get(Number(d.id)) ?? 0) > 0)
    .map((d) => ({
      dueId: Number(d.id),
      periodStart: String(d.periodStart).slice(0, 10),
      periodEnd: d.periodEnd ? String(d.periodEnd).slice(0, 10) : null,
      amount: taken.get(Number(d.id))!,
      remainingAfter: left.get(Number(d.id)) ?? 0,
    }));
  for (const a of allocations) {
    if (a.remainingAfter > 0) warnings.push(`Echeance ${monthLabelFr(a.periodStart)} partiellement couverte (reste ${a.remainingAfter.toFixed(dec)}).`);
  }
  return { amount, totalUnpaid, maxApplicable, allocations, warnings, monthsLabel: monthsLabelFromLines(allocations) };
}
