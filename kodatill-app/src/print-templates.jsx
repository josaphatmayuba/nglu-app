// KodaTill — Templates d'impression (SCRUM-306).
//
// Deux gabarits distincts, chacun avec sa propre mise en page @media print
// (le reste de la page est masque, seul le conteneur #kt-print-area
// s'imprime) :
//   - ReceiptPrintView  : ticket client (largeur ~80mm), lignes+totaux+devise
//     +pied de ticket configure (kt_business_profiles.receiptFooter).
//   - KitchenTicketPrintView : bon de preparation cuisine, uniquement les
//     lignes + note, PAS de prix/totaux (oriente preparation, pas facturation).
//
// Declenchement via window.print() depuis l'ecran appelant (bouton "Imprimer
// le ticket" / "Imprimer le bon cuisine") — voir screens.jsx (CaisseScreen,
// CommandesScreen, KitchenScreen).
//
// HORS SCOPE (documente, ticket futur) : impression Bluetooth ESC/POS native
// via Capacitor. Ce module ne genere que du HTML imprime par le navigateur
// (window.print), pas de commandes ESC/POS ni de plugin Capacitor Bluetooth.
import React from "react";

const formatMoney = (amount, currencyCode) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${value} ${currencyCode || ""}`.trim();
};

function formatDateTime(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Style d'impression partage : masque tout sauf #kt-print-area, largeur fixe
// ~80mm (imprimante ticket standard), police compacte. Injecte une seule fois
// via <style> dans le conteneur (pas de fichier .css global a charger).
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden; }
  #kt-print-area, #kt-print-area * { visibility: visible; }
  #kt-print-area {
    position: absolute; top: 0; left: 0; width: 80mm;
    padding: 4mm; margin: 0; font-family: "Courier New", monospace;
  }
}
@media screen {
  #kt-print-area {
    width: 320px; margin: 16px auto; padding: 16px; border: 1px dashed #ccc;
    font-family: "Courier New", monospace; background: #fff;
  }
}
`;

/**
 * Ticket client — vente finalisee. Affiche lignes, sous-total, remise, taxe,
 * service, total, devise, paiements et pied de ticket configurable.
 * `receipt` = payload de GET /kodatill/orders/:id/receipt (api.getOrderReceipt).
 */
export function ReceiptPrintView({ receipt }) {
  if (!receipt) return null;
  const currency = receipt.currencyCode;
  return (
    <div id="kt-print-area">
      <style>{PRINT_STYLE}</style>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{receipt.organization?.name}</div>
        {receipt.branch?.name && <div style={{ fontSize: 12 }}>{receipt.branch.name}</div>}
        {receipt.branch?.address && <div style={{ fontSize: 11 }}>{receipt.branch.address}</div>}
      </div>
      <div style={{ fontSize: 11, borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "4px 0", marginBottom: 6 }}>
        <div>Commande {receipt.publicRef || `#${receipt.orderNumber}`}</div>
        <div>{formatDateTime(receipt.createdAt)}</div>
      </div>

      <div>
        {(receipt.lines || []).map((l, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{Number(l.qty)} × {l.name}</span>
              <span>{formatMoney(l.lineTotal, currency)}</span>
            </div>
            {l.note && <div style={{ fontSize: 10, fontStyle: "italic", paddingLeft: 8 }}>{l.note}</div>}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px dashed #000", marginTop: 6, paddingTop: 6, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Sous-total</span><span>{formatMoney(receipt.subtotal, currency)}</span>
        </div>
        {Number(receipt.discountTotal) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Remise</span><span>-{formatMoney(receipt.discountTotal, currency)}</span>
          </div>
        )}
        {Number(receipt.taxTotal) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Taxe</span><span>{formatMoney(receipt.taxTotal, currency)}</span>
          </div>
        )}
        {Number(receipt.serviceTotal) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Service</span><span>{formatMoney(receipt.serviceTotal, currency)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
          <span>TOTAL</span><span>{formatMoney(receipt.total, currency)}</span>
        </div>
      </div>

      {(receipt.payments || []).length > 0 && (
        <div style={{ borderTop: "1px dashed #000", marginTop: 6, paddingTop: 6, fontSize: 11 }}>
          {receipt.payments.map((p, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{p.methodName}</span><span>{formatMoney(p.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}

      {receipt.receiptFooter && (
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, whiteSpace: "pre-wrap" }}>
          {receipt.receiptFooter}
        </div>
      )}
    </div>
  );
}

/**
 * Bon de preparation cuisine — uniquement les lignes + note, PAS de prix ni
 * de totaux (destine a la cuisine, pas a la facturation). `order` = objet
 * commande tel que fourni par GET /kodatill/orders/:id ou l'ecran cuisine
 * (o.lines avec {name, qty, note}).
 */
export function KitchenTicketPrintView({ order }) {
  if (!order) return null;
  return (
    <div id="kt-print-area">
      <style>{PRINT_STYLE}</style>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>BON CUISINE</div>
        <div style={{ fontSize: 13 }}>{order.publicRef || `#${order.orderNumber}`}</div>
        {order.tableId ? <div style={{ fontSize: 12 }}>Table {order.tableId}</div> : null}
        <div style={{ fontSize: 11 }}>{formatDateTime(order.createdAt)}</div>
      </div>
      <div style={{ borderTop: "1px dashed #000", paddingTop: 6 }}>
        {(order.lines || []).map((l, i) => (
          <div key={l.id ?? i} style={{ marginBottom: 8, fontSize: 14 }}>
            <div style={{ fontWeight: 700 }}>
              {Number(l.qty) > 1 ? `${Number(l.qty)}× ` : ""}{l.name}
            </div>
            {l.note && <div style={{ fontSize: 12, fontStyle: "italic", paddingLeft: 8 }}>Note : {l.note}</div>}
          </div>
        ))}
        {(!order.lines || order.lines.length === 0) && (
          <div style={{ fontSize: 12 }}>Aucune ligne.</div>
        )}
      </div>
    </div>
  );
}
