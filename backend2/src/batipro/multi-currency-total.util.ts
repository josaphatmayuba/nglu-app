// Conversion en devise chantier des devis/factures, y compris MULTI-DEVISES
// (lignes dans plusieurs devises) : logique PURE (testable sans base).
//
// Chaque document est ventile par devise (batipro_document_totals). Pour chaque
// part :
//  - devise chantier (ou sans devise)  -> comptee telle quelle ;
//  - autre devise AVEC taux            -> contre-valeur (montant / taux, centime half-up) ;
//  - autre devise SANS taux            -> "a convertir" (montant d'origine, par devise).
// Taux d'une part = taux de la ligne de total ; a defaut, pour un document
// mono-devise, le taux fige du document (PATCH /documents/:id/fx-rate).
// Document sans ligne de total (historique) : sa devise/total d'en-tete.
import { convertToProjectCents, decimalRateToScaled } from "./fx.util";
import { toCents } from "./funds.util";

export interface MultiCurrencyDoc {
  id: number;
  currencyId: number | null;
  totalTtc: string | number | null;
  fxRate: string | null;
}

export interface MultiCurrencyTotalRow {
  documentId: number;
  currencyId: number;
  totalTtc: string | number | null;
  fxRate: string | null;
}

export interface MultiCurrencyResult {
  // Total en devise chantier (centimes) : part chantier + parts converties.
  totalCents: number;
  // Montant d'origine converti, par devise (centimes).
  convertedOriginCents: Map<number, number>;
  // Contre-valeur en devise chantier des parts converties, par devise (centimes).
  convertedProjectCents: Map<number, number>;
  // Parts sans taux, par devise (centimes, montant d'origine).
  unconvertedCents: Map<number, number>;
}

const add = (m: Map<number, number>, k: number, v: number) => m.set(k, (m.get(k) ?? 0) + v);

export function convertDocsToProjectCurrency(
  docs: MultiCurrencyDoc[],
  totals: MultiCurrencyTotalRow[],
  projectCurrencyId: number | null,
): MultiCurrencyResult {
  const byDoc = new Map<number, MultiCurrencyTotalRow[]>();
  for (const t of totals) {
    const list = byDoc.get(t.documentId) ?? [];
    list.push(t);
    byDoc.set(t.documentId, list);
  }
  const res: MultiCurrencyResult = {
    totalCents: 0,
    convertedOriginCents: new Map(),
    convertedProjectCents: new Map(),
    unconvertedCents: new Map(),
  };
  for (const doc of docs) {
    const rows = byDoc.get(doc.id);
    const parts = rows?.length
      ? rows.map((r) => ({ currencyId: r.currencyId as number | null, cents: toCents(r.totalTtc), fxRate: r.fxRate ?? (rows.length === 1 ? doc.fxRate : null) }))
      : [{ currencyId: doc.currencyId, cents: toCents(doc.totalTtc), fxRate: doc.fxRate }];
    for (const p of parts) {
      if (!p.cents) continue;
      if (p.currencyId == null || p.currencyId === projectCurrencyId) {
        res.totalCents += p.cents;
        continue;
      }
      const rate = p.fxRate != null ? decimalRateToScaled(p.fxRate) : null;
      if (rate == null || rate <= 0n) {
        add(res.unconvertedCents, p.currencyId, p.cents);
        continue;
      }
      const converted = convertToProjectCents(p.cents, rate);
      res.totalCents += converted;
      add(res.convertedOriginCents, p.currencyId, p.cents);
      add(res.convertedProjectCents, p.currencyId, converted);
    }
  }
  return res;
}
