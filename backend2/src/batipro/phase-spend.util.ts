import { convertToProjectCents, parseFxRate } from "./fx.util";
import { fromCents, toCents } from "./funds.util";

export interface PhaseSpendRow {
  phaseId: number | null;
  documentId: number;
  lineHt: string | number | null;
  lineCurrencyId: number | null;
  docCurrencyId: number | null;
  docFxRate: string | number | null;
  phaseCurrencyId: number | null;
}

// Depense/engage par phase, Map<phaseId, Map<currencyId (0 = sans devise), montant>>.
// Devise effective d'une ligne = ligne ?? document ?? phase. Une ligne dans une
// devise differente de celle du chantier est convertie avec le taux FIGE de son
// DOCUMENT (somme en centimes par phase+document, puis un seul arrondi half-up) ;
// sans taux valide elle est exclue et comptee dans `excludedNoFx`.
export function bucketPhaseSpend(rows: PhaseSpendRow[], projectCurrencyId: number | null) {
  const byPhase = new Map<number, Map<number, number>>();
  const add = (phaseId: number, cur: number, amount: number) => {
    const m = byPhase.get(phaseId) ?? new Map<number, number>();
    m.set(cur, (m.get(cur) ?? 0) + amount);
    byPhase.set(phaseId, m);
  };
  // (phase|doc) -> centimes en devise document, a convertir une seule fois
  const foreign = new Map<string, { phaseId: number; cents: number; rate: bigint; target: number }>();
  const excluded = new Set<number>();
  for (const r of rows) {
    if (r.phaseId == null) continue;
    const eff = r.lineCurrencyId ?? r.docCurrencyId ?? r.phaseCurrencyId ?? null;
    const isForeign = projectCurrencyId != null && eff != null && eff !== projectCurrencyId
      && r.docCurrencyId != null && eff === r.docCurrencyId;
    if (!isForeign) {
      add(r.phaseId, eff ?? 0, Number(r.lineHt ?? 0));
      continue;
    }
    const rate = parseFxRate(r.docFxRate);
    if (rate == null) {
      excluded.add(r.documentId);
      continue;
    }
    const key = `${r.phaseId}|${r.documentId}`;
    const cur = foreign.get(key) ?? {
      phaseId: r.phaseId,
      cents: 0,
      rate,
      target: r.phaseCurrencyId == null ? 0 : r.phaseCurrencyId === projectCurrencyId ? r.phaseCurrencyId : projectCurrencyId,
    };
    cur.cents += toCents(r.lineHt);
    foreign.set(key, cur);
  }
  for (const f of foreign.values()) add(f.phaseId, f.target, fromCents(convertToProjectCents(f.cents, f.rate)));
  return { byPhase, excludedNoFx: excluded.size };
}
