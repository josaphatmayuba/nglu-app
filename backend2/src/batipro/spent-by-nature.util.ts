import { effectiveCurrency, toCents, fromCents, type SpendDoc } from "./funds.util";

// "Depense par nature" d'un chantier : ventilation du DECAISSE reel (meme
// definition que "Deja depense" = disbursedCentsByCurrency + convertedPaidCents)
// par nature de ligne. Centimes entiers ; le paye d'un document est reparti sur
// ses lignes au prorata de line_ttc, le reste de centimes allant a la plus grosse
// ligne, de sorte que le total == "Deja depense" au centime pres.

export type SpendNature = "materials" | "fees" | "labor" | "handling" | "other";
export const SPEND_NATURE_LABELS: Record<SpendNature, string> = {
  materials: "Matériaux",
  fees: "Honoraires et avances",
  labor: "Main-d'œuvre",
  handling: "Manutention et transport",
  other: "Autres",
};
const ORDER: SpendNature[] = ["materials", "fees", "labor", "handling", "other"];

export type NatureLine = {
  documentId: number;
  lineTtc: string | number | null;
  lineType: string | null;
  serviceCategory: string | null;
};

export function natureOfLine(l: Pick<NatureLine, "lineType" | "serviceCategory">): SpendNature {
  switch (l.serviceCategory) {
    case "hardware_invoice": return "materials";
    case "fees": return "fees";
    case "labor": return "labor";
    case "handling":
    case "transport": return "handling";
    case "other": return l.lineType === "material" ? "materials" : "other";
    default: return l.lineType === "service" ? "other" : "materials";
  }
}

// Decaisse d'un document en devise chantier (centimes) ; 0 si hors definition.
function paidProjectCents(d: SpendDoc, projectCurrencyId: number | null): number {
  const live = d.isActive === 1 && d.status !== "cancelled";
  const spend = (d.type === "purchase_order" || d.type === "expense") && d.direction === "outbound"
    || d.type === "invoice" && d.direction === "inbound";
  if (!live || !spend) return 0;
  if (effectiveCurrency(d, projectCurrencyId) === projectCurrencyId) return toCents(d.paidAmount);
  const other = projectCurrencyId != null && d.currencyId != null && d.currencyId !== projectCurrencyId;
  return other ? toCents(d.paidAmountProjectCcy) : 0;
}

export function spentByNature(docs: SpendDoc[], lines: NatureLine[], projectCurrencyId: number | null) {
  const byDoc = new Map<number, NatureLine[]>();
  for (const l of lines) {
    const a = byDoc.get(l.documentId) ?? [];
    a.push(l);
    byDoc.set(l.documentId, a);
  }
  const totals = new Map<SpendNature, number>(ORDER.map((n) => [n, 0]));
  const addTo = (n: SpendNature, c: number) => totals.set(n, (totals.get(n) ?? 0) + c);
  for (const d of docs) {
    const paid = paidProjectCents(d, projectCurrencyId);
    if (!paid) continue;
    const ls = byDoc.get(d.id) ?? [];
    const weights = ls.map((l) => Math.max(toCents(l.lineTtc), 0));
    const wsum = weights.reduce((s, w) => s + w, 0);
    if (!ls.length || wsum <= 0) { addTo(ls.length ? natureOfLine(ls[0]) : "other", paid); continue; }
    const parts = weights.map((w) => Math.floor((paid * w) / wsum));
    let rest = paid - parts.reduce((s, p) => s + p, 0);
    let big = 0;
    weights.forEach((w, i) => { if (w > weights[big]) big = i; });
    parts[big] += rest; rest = 0;
    ls.forEach((l, i) => addTo(natureOfLine(l), parts[i]));
  }
  return ORDER.map((n) => ({ nature: n, label: SPEND_NATURE_LABELS[n], amount: fromCents(totals.get(n) ?? 0) }));
}
