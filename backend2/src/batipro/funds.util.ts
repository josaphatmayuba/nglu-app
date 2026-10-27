// Fonds du chantier BatiPro : logique PURE (testable sans base) pour
//  - la definition UNIQUE du "decaisse" d'un chantier (carte Budget, liste des
//    chantiers, synthese des fonds) ;
//  - la synthese des fonds par devise (recu / decaisse / disponible / reste du /
//    manque).
// Tous les calculs se font en CENTIMES entiers (pas de flottant cumule, pas
// d'arrondi a l'unite) et JAMAIS en additionnant deux devises.

// Document de depense d'un chantier : bon de commande sortant (purchase_order /
// outbound) ou facture fournisseur (invoice / inbound). `totals` = lignes actives
// de batipro_document_totals (ventilation par devise, migration 0232) ; vide =
// document mono-devise lu sur total_ttc.
export type SpendDoc = {
  id: number;
  type: string;
  direction: string;
  status: string | null;
  isActive: number;
  currencyId: number | null;
  parentDocumentId: number | null;
  totalTtc: string | number | null;
  paidAmount: string | number | null;
  totals?: { currencyId: number; totalTtc: string | number | null }[];
};

export type FundInput = {
  amount: string | number | null;
  currencyId: number;
  isActive: number;
};

export type FundsSummaryRow = {
  currency_id: number | null;
  currency_code: string | null;
  received: number;
  disbursed: number;
  available: number;
  committed_unpaid: number;
  shortfall: number;
};

// Statuts d'une facture fournisseur sans BC qui ne constituent pas (ou plus) un
// engagement : brouillon, annulee, renvoyee/refusee a l'artisan.
const INVOICE_NOT_COMMITTED = new Set(["draft", "cancelled", "returned", "refused", "rejected"]);

export const toCents = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromCents = (c: number) => c / 100;

// true si le montant a au plus 2 decimales (tolerance flottante).
export const hasAtMostTwoDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

const isPurchaseOrder = (d: SpendDoc) => d.type === "purchase_order" && d.direction === "outbound";
const isSupplierInvoice = (d: SpendDoc) => d.type === "invoice" && d.direction === "inbound";
const isLive = (d: SpendDoc) => d.isActive === 1 && d.status !== "cancelled";

// Devise effective d'un document = sa devise, a defaut celle du chantier.
export const effectiveCurrency = (doc: { currencyId: number | null }, projectCurrencyId: number | null) =>
  doc.currencyId ?? projectCurrencyId ?? null;

type Key = number | null;
const add = (m: Map<Key, number>, k: Key, cents: number) => {
  if (!cents) return;
  m.set(k, (m.get(k) ?? 0) + cents);
};

// DECAISSE (definition unique) : somme des paid_amount des BC sortants actifs non
// annules + somme des paid_amount des factures fournisseur actives non annulees,
// dans la devise effective du document. Pas de double comptage : regler une
// facture fournisseur met a jour SON paid_amount, jamais celui du BC parent
// (cf. BatiproService.recordPayment).
export function disbursedCentsByCurrency(docs: SpendDoc[], projectCurrencyId: number | null): Map<Key, number> {
  const out = new Map<Key, number>();
  for (const d of docs) {
    if (!isLive(d) || !(isPurchaseOrder(d) || isSupplierInvoice(d))) continue;
    add(out, effectiveCurrency(d, projectCurrencyId), toCents(d.paidAmount));
  }
  return out;
}

// Montants dus par devise d'un document : ventilation batipro_document_totals
// si le document est multi-devise, sinon total_ttc dans la devise effective.
function dueBuckets(d: SpendDoc, projectCurrencyId: number | null): Map<Key, number> {
  const m = new Map<Key, number>();
  if (d.totals && d.totals.length > 1) {
    for (const t of d.totals) add(m, t.currencyId, toCents(t.totalTtc));
  } else {
    add(m, effectiveCurrency(d, projectCurrencyId), toCents(d.totalTtc));
  }
  return m;
}

// RESTE DU (engage non paye) par devise :
//  - BC actifs non annules : max(total_ttc - paye du BC - paiements de ses
//    factures fournisseur enfants (parent_document_id), 0) ;
//  - factures fournisseur SANS BC actif (ou BC annule) : max(total - paye, 0).
export function committedUnpaidCentsByCurrency(docs: SpendDoc[], projectCurrencyId: number | null): Map<Key, number> {
  const out = new Map<Key, number>();
  const livePoIds = new Set(docs.filter((d) => isLive(d) && isPurchaseOrder(d)).map((d) => d.id));

  // Paiements des factures enfants, par BC parent et par devise.
  const childPaid = new Map<number, Map<Key, number>>();
  for (const d of docs) {
    if (!isLive(d) || !isSupplierInvoice(d) || d.parentDocumentId == null || !livePoIds.has(d.parentDocumentId)) continue;
    let m = childPaid.get(d.parentDocumentId);
    if (!m) { m = new Map(); childPaid.set(d.parentDocumentId, m); }
    add(m, effectiveCurrency(d, projectCurrencyId), toCents(d.paidAmount));
  }

  for (const d of docs) {
    if (!isLive(d)) continue;
    let paid: Map<Key, number>;
    if (isPurchaseOrder(d)) {
      paid = new Map(childPaid.get(d.id) ?? []);
      add(paid, effectiveCurrency(d, projectCurrencyId), toCents(d.paidAmount));
    } else if (isSupplierInvoice(d)) {
      if (d.parentDocumentId != null && livePoIds.has(d.parentDocumentId)) continue; // deja dans son BC
      if (INVOICE_NOT_COMMITTED.has(d.status ?? "")) continue;
      paid = new Map();
      add(paid, effectiveCurrency(d, projectCurrencyId), toCents(d.paidAmount));
    } else {
      continue;
    }
    for (const [cur, due] of dueBuckets(d, projectCurrencyId)) {
      add(out, cur, Math.max(due - (paid.get(cur) ?? 0), 0));
    }
  }
  return out;
}

export function receivedCentsByCurrency(funds: FundInput[]): Map<Key, number> {
  const out = new Map<Key, number>();
  for (const f of funds) {
    if (f.isActive !== 1) continue;
    add(out, f.currencyId, toCents(f.amount));
  }
  return out;
}

// Synthese par devise. La devise du chantier figure toujours (meme a zero) ;
// les autres devises seulement si un montant y est non nul.
export function buildFundsSummary(
  funds: FundInput[],
  docs: SpendDoc[],
  projectCurrencyId: number | null,
  currencyCodeById: Map<number, string | null>,
): FundsSummaryRow[] {
  const received = receivedCentsByCurrency(funds);
  const disbursed = disbursedCentsByCurrency(docs, projectCurrencyId);
  const committed = committedUnpaidCentsByCurrency(docs, projectCurrencyId);
  const keys = new Set<Key>([...received.keys(), ...disbursed.keys(), ...committed.keys()]);
  if (projectCurrencyId != null) keys.add(projectCurrencyId);

  const rows: FundsSummaryRow[] = [];
  for (const k of keys) {
    const r = received.get(k) ?? 0;
    const dsb = disbursed.get(k) ?? 0;
    const c = committed.get(k) ?? 0;
    const available = r - dsb;
    rows.push({
      currency_id: k,
      currency_code: k != null ? currencyCodeById.get(k) ?? null : null,
      received: fromCents(r),
      disbursed: fromCents(dsb),
      available: fromCents(available),
      committed_unpaid: fromCents(c),
      shortfall: fromCents(Math.max(c - available, 0)),
    });
  }
  // Devise du chantier en premier, puis par id.
  return rows.sort((a, b) => {
    if (a.currency_id === projectCurrencyId) return -1;
    if (b.currency_id === projectCurrencyId) return 1;
    return (a.currency_id ?? 0) - (b.currency_id ?? 0);
  });
}
