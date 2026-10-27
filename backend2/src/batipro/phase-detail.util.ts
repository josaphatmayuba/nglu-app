// Detail d'une phase BatiPro : prevu (devis clients acceptes) vs devis detaille
// de l'artisan (documents inbound) vs depense (bons de commande). Fonction pure :
// le service lui fournit les lignes deja lues en base, ce qui la rend testable.
// Les montants sont ventiles PAR DEVISE (jamais d'addition inter-devises).

export type PhaseDetailRow = {
  lineId: number;
  documentId: number;
  designation: string;
  quantity: string | number | null;
  unitPrice: string | number | null;
  lineHt: string | number | null;
  lineActive: number;
  lineCurrencyId: number | null;
  docType: string;
  docDirection: string;
  docStatus: string;
  docActive: number;
  docNumber: string | null;
  docCurrencyId: number | null;
  docPaidAmount: string | number | null;
  docDate: string | null;
  submittedBy: string | null;
};

export type PhaseDetailPhase = {
  id: number;
  projectId: number;
  label: string;
  progress: number | null;
  plannedBudget: string | number | null;
  currencyId: number | null;
};

// Paiement d'un BC. `totals` = lignes actives de batipro_document_totals
// (migration 0232 : total TTC et paye par devise) ; vide = repli sur le document
// (docTotalTtc / docPaidAmount), valable pour la seule devise du document.
export type PoPayInfo = {
  docTotalTtc: number;
  docPaidAmount: number;
  totals: { currencyId: number; totalTtc: number; paid: number }[];
  // HT positif / net (remises incluses) par devise effective, sur TOUTES les lignes
  // actives du BC (toutes phases). Absent = repli sur les lignes de la phase.
  htSums?: { currencyId: number | null; pos: number; net: number }[];
};

// BC sortant non annule : seul cas ou une ligne compte en depense.
const isActivePo = (r: Pick<PhaseDetailRow, "docType" | "docDirection" | "docStatus">) =>
  r.docType === "purchase_order" && r.docDirection === "outbound" && r.docStatus !== "cancelled";

// Statuts d'un document inbound (artisan) qui ne comptent plus.
const ARTISAN_EXCLUDED_STATUSES = new Set(["refused", "rejected", "cancelled", "draft"]);

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildPhaseDetail(
  phase: PhaseDetailPhase,
  rows: PhaseDetailRow[],
  // Infos de paiement par BC (voir PoPayInfo).
  poPayByDoc: Map<number, PoPayInfo>,
  currencyCodeById: Map<number, string>,
) {
  type Bucket = { planned: number; artisan_quote: number; committed: number; paid: number };
  const buckets = new Map<number, Bucket>(); // cle 0 = devise inconnue
  const bucketOf = (currencyId: number | null) => {
    const key = currencyId ?? 0;
    let b = buckets.get(key);
    if (!b) {
      b = { planned: 0, artisan_quote: 0, committed: 0, paid: 0 };
      buckets.set(key, b);
    }
    return b;
  };
  const codeOf = (currencyId: number | null) => (currencyId != null ? currencyCodeById.get(currencyId) ?? null : null);

  // Cumul de paye attribue par (BC, devise), plafonne au paye reel du BC.
  const paidGiven = new Map<string, number>();
  // Repli (si PoPayInfo.htSums absent) : HT par (BC, devise) sur les lignes de la phase.
  const poHtSums = new Map<string, { pos: number; net: number }>();
  for (const r of rows) {
    if (r.lineActive !== 1 || r.docActive !== 1) continue;
    if (!isActivePo(r)) continue;
    const key = `${r.documentId}:${(r.lineCurrencyId ?? r.docCurrencyId ?? null) ?? 0}`;
    const s = poHtSums.get(key) ?? { pos: 0, net: 0 };
    const v = Number(r.lineHt ?? 0);
    if (v > 0) s.pos += v;
    s.net += v;
    poHtSums.set(key, s);
  }
  const plannedLines: any[] = [];
  const artisanLines: any[] = [];
  const expenseLines: any[] = [];

  for (const r of rows) {
    if (r.lineActive !== 1 || r.docActive !== 1) continue;
    // NULL = devise du document, a defaut devise de la phase. Volontairement
    // different de phaseCommittedAmounts (EVM) qui fait ligne -> phase : le
    // detail suit la regle metier "NULL = devise du document".
    const currencyId = r.lineCurrencyId ?? r.docCurrencyId ?? phase.currencyId ?? null;
    const total = Number(r.lineHt ?? 0);
    const base = {
      document_id: r.documentId,
      document_number: r.docNumber,
      status: r.docStatus,
      designation: r.designation,
      currency_id: currencyId,
      currency_code: codeOf(currencyId),
    };

    if (r.docType === "quote" && r.docDirection === "outbound" && r.docStatus === "accepted") {
      bucketOf(currencyId).planned += total;
      plannedLines.push({ ...base, quantity: Number(r.quantity ?? 0), unit_price: Number(r.unitPrice ?? 0), total: round2(total) });
    } else if (r.docType === "quote" && r.docDirection === "inbound" && !ARTISAN_EXCLUDED_STATUSES.has(r.docStatus)) {
      bucketOf(currencyId).artisan_quote += total;
      artisanLines.push({
        ...base,
        quantity: Number(r.quantity ?? 0),
        unit_price: Number(r.unitPrice ?? 0),
        total: round2(total),
        submitted_by: r.submittedBy,
      });
    } else if (isActivePo(r)) {
      // Part payee = montant HT : lineHt x (paye / total TTC du document, dans la
      // devise de la ligne). Jamais de melange de devises au denominateur.
      const ownCur = r.lineCurrencyId ?? r.docCurrencyId ?? null;
      const info = poPayByDoc.get(r.documentId);
      let paidShare = 0;
      if (info && total > 0) {
        let totalTtc = 0, paid = 0, matched = false;
        if (info.totals.length) {
          const t = info.totals.find((x) => x.currencyId === ownCur);
          if (t) { totalTtc = t.totalTtc; paid = t.paid; matched = true; }
        } else if (ownCur === r.docCurrencyId) {
          totalTtc = info.docTotalTtc; paid = info.docPaidAmount; matched = true;
        }
        const key = `${r.documentId}:${ownCur ?? 0}`;
        const sums = info.htSums?.length
          ? info.htSums.find((x) => (x.currencyId ?? 0) === (ownCur ?? 0))
          : poHtSums.get(key);
        if (matched && totalTtc > 0 && paid > 0 && sums && sums.pos > 0 && sums.net > 0) {
          const given = paidGiven.get(key) ?? 0;
          // Formule : lineHt x min(1, paye/totalTTC) x (HT net / HT lignes positives).
          // Le ratio net/positif annule l'effet des lignes negatives (remises) sur le
          // denominateur ; sans remise il vaut 1 (= lineHt x paye / totalTTC).
          // Plafond : jamais plus que le paye du BC.
          const fraction = Math.min(1, paid / totalTtc);
          paidShare = Math.min(total * fraction * (sums.net / sums.pos), Math.max(0, paid - given));
          paidGiven.set(key, given + paidShare);
        }
      }
      const b = bucketOf(currencyId);
      b.committed += total;
      b.paid += paidShare;
      expenseLines.push({ ...base, date: r.docDate, total: round2(total), paid: round2(paidShare) });
    }
  }

  const totalsByCurrency = Array.from(buckets.entries()).map(([key, b]) => {
    const currencyId = key === 0 ? null : key;
    const planned = round2(b.planned);
    const artisan = round2(b.artisan_quote);
    const committed = round2(b.committed);
    const paid = round2(b.paid);
    return {
      currency_id: currencyId,
      currency_code: codeOf(currencyId),
      planned,
      artisan_quote: artisan,
      committed,
      paid,
      remaining: round2(planned - paid),
    };
  });

  const alerts: { code: string; currency_id: number | null; currency_code: string | null; amount: number; planned: number }[] = [];
  for (const t of totalsByCurrency) {
    const mk = (code: string, amount: number) =>
      alerts.push({ code, currency_id: t.currency_id, currency_code: t.currency_code, amount, planned: t.planned });
    if (t.artisan_quote > t.planned) mk("artisan_over_planned", t.artisan_quote);
    if (t.committed > t.planned) mk("committed_over_planned", t.committed);
    if (t.paid > t.planned) mk("paid_over_planned", t.paid);
  }

  return {
    phase: {
      id: phase.id,
      project_id: phase.projectId,
      label: phase.label,
      progress: phase.progress != null ? Number(phase.progress) : null,
      planned_budget: phase.plannedBudget != null ? Number(phase.plannedBudget) : null,
      currency_id: phase.currencyId ?? null,
      currency_code: codeOf(phase.currencyId ?? null),
    },
    totals_by_currency: totalsByCurrency,
    alerts,
    planned_lines: plannedLines,
    artisan_lines: artisanLines,
    expense_lines: expenseLines,
  };
}
