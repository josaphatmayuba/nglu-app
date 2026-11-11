import { convertToProjectCents, parseFxRate } from "./fx.util";
import { fromCents, toCents } from "./funds.util";
import { natureOfLine, SPEND_NATURE_LABELS, type SpendNature } from "./spent-by-nature.util";

// Releve des transactions d'un chantier BatiPro : logique PURE (testable sans base).
// Tout en CENTIMES entiers. Le solde final (lignes comptees) == funds_available de
// buildFundsSummary (devise chantier) : meme definition du recu et du decaisse.

export type StatementFund = {
  id: number;
  receivedAt: string; // YYYY-MM-DD
  amount: string | number | null;
  currencyId: number;
  isActive: number;
  cancelledAt?: string | null; // YYYY-MM-DD
  contributorName?: string | null;
  reference?: string | null;
};

export type StatementDoc = {
  id: number;
  kind: "expense_doc" | "client_invoice";
  number?: string | null;
  type: string;
  status: string | null;
  currencyId: number | null;
  paidAmount: string | number | null;
  fxRate?: string | number | null;
  paidAmountProjectCcy?: string | number | null;
  paidDate: string; // date du reglement (ecriture comptable, a defaut date du document)
  nature: SpendNature;
  // Part du paye dont l'ecriture est encore en attente d'approbation (devise du doc).
  pendingCents?: number;
};

export type StatementStatus = "posted" | "pending" | "cancelled" | "to_convert" | "other_currency" | "info";

export type StatementLine = {
  date: string;
  label: string;
  category: string; // "funding" | "funding_cancel" | SpendNature | "client_invoice"
  category_label: string;
  entry: number; // entree
  exit: number; // sortie
  currency_id: number | null;
  currency_code: string | null;
  converted_amount: number | null; // contre-valeur en devise chantier (taux fige) si devise differente
  status: StatementStatus;
  counted: boolean; // entre dans le solde
  balance: number | null; // solde courant apres la ligne (null si hors solde)
};

export type StatementInput = {
  projectCurrencyId: number | null;
  currencyCodeById: Map<number, string | null>;
  funds: StatementFund[];
  docs: StatementDoc[];
};

export type StatementFilter = { from?: string | null; to?: string | null; category?: string | null };

type Raw = Omit<StatementLine, "balance"> & { entryC: number; exitC: number; countedEntryC: number; countedExitC: number; seq: number };

export function dominantNature(lines: { lineTtc: string | number | null; lineType: string | null; serviceCategory: string | null }[]): SpendNature {
  let best: SpendNature = "other";
  let bestC = -1;
  for (const l of lines) {
    const c = toCents(l.lineTtc);
    if (c > bestC) { bestC = c; best = natureOfLine(l); }
  }
  return best;
}

export function buildStatement(input: StatementInput, filter: StatementFilter = {}) {
  const { projectCurrencyId: pc, currencyCodeById } = input;
  const code = (id: number | null) => (id != null ? currencyCodeById.get(id) ?? null : null);
  const raws: Raw[] = [];
  let seq = 0;
  const push = (r: Omit<Raw, "seq">) => raws.push({ ...r, seq: seq++ });

  for (const f of input.funds) {
    const c = toCents(f.amount);
    const counted = f.currencyId === pc;
    const who = [f.contributorName, f.reference].filter(Boolean).join(" - ");
    const base = { currency_id: f.currencyId, currency_code: code(f.currencyId), converted_amount: null, counted };
    push({
      ...base, date: f.receivedAt, label: who ? `Apport - ${who}` : "Apport", category: "funding", category_label: "Apport",
      entry: fromCents(c), exit: 0, entryC: c, exitC: 0, countedEntryC: counted ? c : 0, countedExitC: 0,
      status: counted ? "posted" : "other_currency",
    });
    if (f.isActive !== 1) {
      push({
        ...base, date: f.cancelledAt || f.receivedAt, label: `Annulation apport${who ? ` - ${who}` : ""}`, category: "funding_cancel", category_label: "Annulation d'apport",
        entry: 0, exit: fromCents(c), entryC: 0, exitC: c, countedEntryC: 0, countedExitC: counted ? c : 0,
        status: counted ? "cancelled" : "other_currency",
      });
    }
  }

  for (const d of input.docs) {
    const paid = toCents(d.paidAmount);
    if (paid <= 0) continue;
    const eff = d.currencyId ?? pc;
    const foreign = pc != null && d.currencyId != null && d.currencyId !== pc;
    const label = `${d.type === "purchase_order" ? "Bon de commande" : d.type === "expense" ? "Depense" : "Facture"}${d.number ? ` ${d.number}` : ""}`;

    if (d.kind === "client_invoice") {
      push({
        date: d.paidDate, label: `Facture client ${d.number ?? ""}`.trim(), category: "client_invoice", category_label: "Facture client encaissee",
        entry: fromCents(paid), exit: 0, entryC: paid, exitC: 0, countedEntryC: 0, countedExitC: 0,
        currency_id: eff, currency_code: code(eff), converted_amount: null, status: "info", counted: false,
      });
      continue;
    }

    // Sortie : devise chantier, ou devise etrangere deja convertie au taux de reglement.
    const convC = toCents(d.paidAmountProjectCcy);
    let countedC = 0;
    let status: StatementStatus = "posted";
    let converted: number | null = null;
    if (foreign) {
      if (convC > 0) { countedC = convC; converted = fromCents(convC); }
      else {
        status = "to_convert";
        const rate = parseFxRate(d.fxRate);
        if (rate != null) converted = fromCents(convertToProjectCents(paid, rate)); // indicatif, hors solde
      }
    } else if (eff === pc) countedC = paid;
    else status = "other_currency";
    const counted = countedC > 0;

    const pend = !foreign ? Math.min(Math.max(d.pendingCents ?? 0, 0), paid) : 0;
    const parts: { c: number; st: StatementStatus }[] = [];
    if (paid - pend > 0) parts.push({ c: paid - pend, st: status });
    if (pend > 0) parts.push({ c: pend, st: "pending" });
    for (const p of parts) {
      push({
        date: d.paidDate, label, category: d.nature, category_label: SPEND_NATURE_LABELS[d.nature],
        entry: 0, exit: fromCents(p.c), entryC: 0, exitC: p.c, countedEntryC: 0, countedExitC: counted ? (foreign ? countedC : p.c) : 0,
        currency_id: eff, currency_code: code(eff), converted_amount: converted, status: p.st, counted,
      });
    }
  }

  // Ordre chronologique stable (date puis ordre de creation).
  raws.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.seq - b.seq));

  let running = 0;
  const all: StatementLine[] = raws.map((r) => {
    let balance: number | null = null;
    if (r.counted) { running += r.countedEntryC - r.countedExitC; balance = fromCents(running); }
    const { entryC, exitC, countedEntryC, countedExitC, seq: _s, ...line } = r;
    return { ...line, balance };
  });
  const totalC = running;

  const { from, to, category } = filter;
  let openingC = 0;
  const lines: StatementLine[] = [];
  raws.forEach((r, i) => {
    if (from && r.date < from) { if (r.counted) openingC += r.countedEntryC - r.countedExitC; return; }
    if (to && r.date > to) return;
    if (category && r.category !== category) return;
    lines.push(all[i]);
  });
  const last = [...lines].reverse().find((l) => l.balance != null);
  return {
    currency_id: pc,
    currency_code: code(pc),
    opening_balance: fromCents(openingC),
    lines,
    closing_balance: last?.balance ?? fromCents(openingC),
    // Solde sur tout l'historique (== funds_available).
    final_balance: fromCents(totalC),
    totals: {
      entries: fromCents(raws.reduce((s, r) => s + r.countedEntryC, 0)),
      exits: fromCents(raws.reduce((s, r) => s + r.countedExitC, 0)),
    },
  };
}
