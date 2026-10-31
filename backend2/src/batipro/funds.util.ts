import { convertToProjectCents, parseFxRate } from "./fx.util";

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
  // Taux fige (migration 0329) : 1 unite devise chantier = fxRate unites devise doc.
  fxRate?: string | number | null;
  totalTtcProjectCcy?: string | number | null;
  paidAmountProjectCcy?: string | number | null;
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

// ── Multi-devise : taux fige par document (migration 0329) ───────────────────
// Document en AUTRE devise que le chantier (devise doc explicite et differente ;
// un document sans devise suit celle du chantier).
const isOtherCurrency = (d: SpendDoc, projectCurrencyId: number | null) =>
  projectCurrencyId != null && d.currencyId != null && d.currencyId !== projectCurrencyId;

// Contre-valeur (devise chantier) des reglements deja faits sur des documents en
// autre devise, chacun converti a SON taux de reglement (paidAmountProjectCcy).
// S'ajoute au decaisse en devise chantier pour le "deja depense" du chantier.
export function convertedPaidCents(docs: SpendDoc[], projectCurrencyId: number | null): number {
  let sum = 0;
  for (const d of docs) {
    if (!isLive(d) || !(isPurchaseOrder(d) || isSupplierInvoice(d))) continue;
    if (!isOtherCurrency(d, projectCurrencyId)) continue;
    sum += toCents(d.paidAmountProjectCcy);
  }
  return sum;
}

export type ConvertedCurrencyRow = {
  currency_id: number;
  origin_amount: number; // engage (BC avec taux) en devise d'origine
  converted_amount: number; // contre-valeur engagee en devise chantier
  paid_origin_amount: number; // paye en devise d'origine (docs dont le paye est converti)
  paid_converted_amount: number; // contre-valeur payee (taux de reglement)
};

export type FxSummary = {
  // Σ totalTtcProjectCcy des BC en autre devise AVEC taux (s'ajoute a l'engage).
  engagedConvertedCents: number;
  // BC actifs en autre devise SANS taux ("taux a fixer").
  poWithoutRateCount: number;
  // Ids des BC comptes dans l'engage converti (a exclure de other_currency_amounts).
  convertedPoIds: number[];
  rows: ConvertedCurrencyRow[];
  // Ecart de change analytique (devise chantier, signe) : voir fxGainLoss.
  gainLossCents: number;
  gainLossByCurrency: { currency_id: number; amount: number }[];
};

// Ecart de change ANALYTIQUE, par BC en autre devise ayant un taux fige :
//   prevu  = contre-valeur, AU TAUX DU BC, de ce qui a ete regle en devise doc
//            (paye du BC + paye de ses factures fournisseur enfants) ;
//   reel   = Σ paidAmountProjectCcy (taux de reglement) du BC et de ses enfants ;
//   ecart  = prevu - reel   (> 0 = gain : on a paye moins cher que prevu ;
//                            < 0 = perte).
// Seul le PAYE entre dans l'ecart (un BC non paye n'a pas d'ecart realise). Un BC
// sans taux n'a pas de "prevu" -> exclu. N'alimente aucune ecriture comptable.
export function summarizeFx(docs: SpendDoc[], projectCurrencyId: number | null): FxSummary {
  const rows = new Map<number, ConvertedCurrencyRow & { _o: number; _c: number; _po: number; _pc: number }>();
  const row = (cur: number) => {
    let r = rows.get(cur);
    if (!r) {
      r = { currency_id: cur, origin_amount: 0, converted_amount: 0, paid_origin_amount: 0, paid_converted_amount: 0, _o: 0, _c: 0, _po: 0, _pc: 0 };
      rows.set(cur, r);
    }
    return r;
  };
  let engaged = 0;
  let withoutRate = 0;
  const convertedPoIds: number[] = [];
  let gainLoss = 0;
  const glByCur = new Map<number, number>();

  const livePos = docs.filter((d) => isLive(d) && isPurchaseOrder(d));
  const livePoIds = new Set(livePos.map((d) => d.id));

  // Paye (origine + contre-valeur) des factures fournisseur enfants, par BC parent.
  const childPaid = new Map<number, { o: number; c: number }>();
  for (const d of docs) {
    if (!isLive(d) || !isSupplierInvoice(d) || d.parentDocumentId == null || !livePoIds.has(d.parentDocumentId)) continue;
    if (!isOtherCurrency(d, projectCurrencyId)) continue;
    const m = childPaid.get(d.parentDocumentId) ?? { o: 0, c: 0 };
    m.o += toCents(d.paidAmount);
    m.c += toCents(d.paidAmountProjectCcy);
    childPaid.set(d.parentDocumentId, m);
  }

  for (const d of docs) {
    if (!isLive(d) || !(isPurchaseOrder(d) || isSupplierInvoice(d))) continue;
    if (!isOtherCurrency(d, projectCurrencyId)) continue;
    const cur = d.currencyId as number;
    const r = row(cur);
    // Seul le paye deja converti compte (sinon paid_origin incoherent avec paid_converted).
    if (toCents(d.paidAmountProjectCcy) > 0) {
      r._po += toCents(d.paidAmount);
      r._pc += toCents(d.paidAmountProjectCcy);
    }

    if (!isPurchaseOrder(d)) continue;
    const rate = parseFxRate(d.fxRate);
    if (rate == null || d.totalTtcProjectCcy == null) {
      withoutRate += 1;
      continue;
    }
    r._o += toCents(d.totalTtc);
    r._c += toCents(d.totalTtcProjectCcy);
    engaged += toCents(d.totalTtcProjectCcy);
    convertedPoIds.push(d.id);

    const kids = childPaid.get(d.id) ?? { o: 0, c: 0 };
    const paidOrigin = toCents(d.paidAmount) + kids.o;
    const paidActual = toCents(d.paidAmountProjectCcy) + kids.c;
    if (paidOrigin > 0) {
      const gl = convertToProjectCents(paidOrigin, rate) - paidActual;
      gainLoss += gl;
      glByCur.set(cur, (glByCur.get(cur) ?? 0) + gl);
    }
  }

  return {
    engagedConvertedCents: engaged,
    poWithoutRateCount: withoutRate,
    convertedPoIds,
    rows: [...rows.values()]
      .sort((a, b) => a.currency_id - b.currency_id)
      .map((r) => ({
        currency_id: r.currency_id,
        origin_amount: fromCents(r._o),
        converted_amount: fromCents(r._c),
        paid_origin_amount: fromCents(r._po),
        paid_converted_amount: fromCents(r._pc),
      })),
    gainLossCents: gainLoss,
    gainLossByCurrency: [...glByCur.entries()].map(([currency_id, c]) => ({ currency_id, amount: fromCents(c) })),
  };
}
