// Repartition pure des lignes de paiement pour le tableau de bord.
//  - paid     : paiements reellement recus (status === "paid")
//  - upcoming : echeances planifiees FUTURES (pending, date > aujourd'hui)
//  - pendingPast : pending de date passee (NON fiable comme impaye, ignore des cartes)
// Exclus partout : voided, settled, supprimes (status === false), lignes rowKind "due".
const dayKey = (v) => String(v || "").slice(0, 10);

export function splitRentPayments(payments = [], now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const out = { paid: [], upcoming: [], pendingPast: [] };
  (Array.isArray(payments) ? payments : []).forEach((p) => {
    if (!p || p.status === false) return;
    const st = String(p.status || "").toLowerCase();
    // Ligne echeance (bail allocationLedger) : jamais de l'argent recu ; une echeance
    // future non soldee compte dans « A venir » pour son reste (montant - deja impute).
    if (p.rowKind === "due") {
      const rest = Math.round(((Number(p.amount) || 0) - (Number(p.amountPaid) || 0)) * 100) / 100;
      const d = dayKey(p.periodStart || p.paymentDate);
      if (st === "pending" && p.dueStatus !== "paid" && rest > 0.005 && d > today) out.upcoming.push({ ...p, amount: rest });
      return;
    }
    if (st === "paid") out.paid.push(p);
    else if (st === "pending") {
      const d = dayKey(p.paymentDate || p.periodStart);
      if (d && d > today) out.upcoming.push(p);
      else out.pendingPast.push(p);
    }
  });
  return out;
}
