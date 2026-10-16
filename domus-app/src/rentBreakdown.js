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
    if (!p || p.rowKind === "due" || p.status === false) return;
    const st = String(p.status || "").toLowerCase();
    if (st === "paid") out.paid.push(p);
    else if (st === "pending") {
      const d = dayKey(p.paymentDate || p.periodStart);
      if (d && d > today) out.upcoming.push(p);
      else out.pendingPast.push(p);
    }
  });
  return out;
}
