// Ecrans KodaTill.
//  - Caisse (POS complet) : SCRUM-282 (fait, voir CaisseScreen plus bas)
//  - Dashboard / Produits / Commandes (back-office Phase 1) : SCRUM-283
import React from "react";
import { api } from "./api.js";

// Montants : jamais de devise en dur, toujours celle retournee par l'API
// (product.currencyCode / order.currencyCode / session.currencyCode).
const formatMoney = (amount, currencyCode) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${value} ${currencyCode || ""}`.trim();
};

// Libelles par defaut affiches si une methode de paiement n'a pas encore ete
// configuree avec un nom personnalise (ex: methode "cash" sans nom saisi).
const PAYMENT_METHOD_KIND_LABELS = {
  cash: "Espèces",
  card: "Carte",
  mobile: "Mobile money",
  voucher: "Bon d'achat",
  credit: "Crédit",
};

function CenteredNote({ children }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420, color: "var(--fg-3, #6b6b6b)", fontSize: 14 }}>{children}</div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{
      background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)",
      padding: "10px 14px", borderRadius: 8, fontSize: 13, margin: "0 24px 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "transparent", border: "1px solid currentColor", color: "inherit",
          borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0,
        }}>
          Réessayer
        </button>
      )}
    </div>
  );
}

// Formulaire d'ouverture de session — bloque la vente tant qu'aucune session
// de caisse n'est ouverte pour l'utilisateur courant (etape 6 du ticket).
function OpenSessionForm({ onOpened, branchId, branchError }) {
  const [openingFloat, setOpeningFloat] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(openingFloat);
    if (!Number.isFinite(value) || value < 0) {
      setError("Fonds de caisse invalide.");
      return;
    }
    if (!branchId) {
      setError("Aucune succursale disponible pour ouvrir une session.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await api.openCashSession({ branchId, openingFloat: value });
      onOpened(session);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CenteredNote>
      <form onSubmit={submit} style={{
        display: "flex", flexDirection: "column", gap: 14, background: "var(--paper, #fff)",
        border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 24, minWidth: 280,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Ouvrir la caisse</div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucune session de caisse ouverte. Renseigne le fonds de caisse de départ pour commencer à vendre.
        </div>
        {branchError && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{branchError}</div>}
        <label style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Fonds de caisse d'ouverture
          </span>
          <input autoFocus type="number" min="0" step="0.01" value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 }} />
        </label>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <button type="submit" disabled={submitting || !openingFloat}
          style={{
            background: "#1f6d75", color: "#FBF8F2", padding: "12px 16px", border: 0,
            borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer",
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? "Ouverture…" : "Ouvrir la caisse"}
        </button>
      </form>
    </CenteredNote>
  );
}

// Duree lisible entre deux dates (heures/minutes), pour le rapport Z.
function formatDuration(fromLike, toLike) {
  const from = new Date(fromLike).getTime();
  const to = new Date(toLike).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return "—";
  const totalMinutes = Math.round((to - from) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

// Ajout d'un mouvement de caisse (entree/sortie d'especes) pendant qu'une
// session est ouverte — POST /cash-sessions/:id/movements (etape 4 du ticket).
function CashMovementForm({ session, onAdded, onCancel }) {
  const [type, setType] = React.useState("in");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const movement = await api.addCashMovement(session.id, { type, amount: value, reason: reason.trim() });
      onAdded(movement);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(380px, 100%)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Mouvement de caisse</div>

        <div style={{ display: "flex", gap: 8 }}>
          {[{ v: "in", label: "Entrée" }, { v: "out", label: "Sortie" }].map((opt) => (
            <button key={opt.v} type="button" onClick={() => setType(opt.v)}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-2, #d8c8a8)",
                background: type === opt.v ? (opt.v === "in" ? "#2f7d4f" : "#7a1f2b") : "transparent",
                color: type === opt.v ? "#FBF8F2" : "var(--fg-1, #0E2418)",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Montant ({session.currencyCode})</span>
          <input autoFocus type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Motif *</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex : dépôt banque, appoint…" style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Formulaire de cloture de session — demande le montant compte en caisse.
// Aucun endpoint de previsualisation de l'ecart n'existe cote backend
// (verifie cash-sessions.controller.ts : seul POST /:id/close calcule
// expectedCash/variance, pas de route GET dediee) : le montant attendu n'est
// donc connu qu'apres la cloture reelle, affiche ensuite dans le rapport Z.
function CloseSessionForm({ session, onClosed, onCancel }) {
  const [countedCash, setCountedCash] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(countedCash);
    if (!Number.isFinite(value) || value < 0) {
      setError("Montant compté invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const closed = await api.closeCashSession(session.id, { countedCash: value });
      onClosed(closed);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(400px, 100%)",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Clôturer la caisse</div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Compte le montant en espèces présent dans la caisse. L'écart avec le montant théorique sera calculé et affiché après validation.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Fonds d'ouverture</span>
          <span style={{ fontWeight: 600 }}>{formatMoney(session.openingFloat, session.currencyCode)}</span>
        </div>
        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Montant compté ({session.currencyCode})</span>
          <input autoFocus type="number" min="0" step="0.01" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} style={fieldInputStyle} />
        </label>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting || !countedCash}
            style={{ flex: 1, background: "#7a1f2b", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Clôture…" : "Confirmer la clôture"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Rapport Z affiche apres la cloture reussie — recapitulatif de la session
// (etape 3 du ticket). movements = mouvements ajoutes localement pendant la
// session courante (aucun endpoint GET pour lister l'historique cote serveur,
// voir commentaire CaisseScreen).
function ZReportModal({ closedSession, movements, onClose }) {
  const currencyCode = closedSession.currencyCode;
  const cashIn = movements.filter((m) => m.type === "in").reduce((s, m) => s + Number(m.amount), 0);
  const cashOut = movements.filter((m) => m.type === "out").reduce((s, m) => s + Number(m.amount), 0);
  const variance = Number(closedSession.variance);
  const varianceColor = variance > 0 ? "#2f7d4f" : variance < 0 ? "#7a1f2b" : "var(--fg-1, #0E2418)";
  const varianceLabel = variance > 0 ? "Excédent" : variance < 0 ? "Manquant" : "Aucun écart";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Rapport Z — session clôturée</div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          <span>Ouverture</span>
          <span>{formatTime(closedSession.openedAt)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          <span>Clôture</span>
          <span>{formatTime(closedSession.closedAt)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginBottom: 6 }}>
          <span>Durée de la session</span>
          <span>{formatDuration(closedSession.openedAt, closedSession.closedAt)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Fonds d'ouverture</span>
            <span style={{ fontWeight: 600 }}>{formatMoney(closedSession.openingFloat, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#2f7d4f" }}>
            <span>Entrées de caisse</span>
            <span style={{ fontWeight: 600 }}>+{formatMoney(cashIn, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#7a1f2b" }}>
            <span>Sorties de caisse</span>
            <span style={{ fontWeight: 600 }}>−{formatMoney(cashOut, currencyCode)}</span>
          </div>
          {movements.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>Aucun mouvement enregistré pendant cette session.</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Montant attendu</span>
            <span style={{ fontWeight: 700 }}>{formatMoney(closedSession.expectedCash, currencyCode)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Montant compté</span>
            <span style={{ fontWeight: 700 }}>{formatMoney(closedSession.countedCash, currencyCode)}</span>
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15,
          background: "var(--bg-app, #FBF8F2)", borderRadius: 10, padding: "12px 16px", marginTop: 4,
        }}>
          <span style={{ fontWeight: 700, color: varianceColor }}>{varianceLabel}</span>
          <span style={{ fontWeight: 700, color: varianceColor, fontSize: 17 }}>
            {variance > 0 ? "+" : ""}{formatMoney(variance, currencyCode)}
          </span>
        </div>

        <button onClick={onClose} style={{
          background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px",
          fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4,
        }}>
          Ouvrir une nouvelle session
        </button>
      </div>
    </div>
  );
}

// Ecran de paiement — choix methode(s), multi-paiement (ex: 30$ especes +
// reste en carte), appelle POST /orders/:id/payments pour chaque saisie.
function PaymentPanel({ order, onDone, onCancel, paymentMethods }) {
  const currencyCode = order.currencyCode;
  const due = Number(order.dueTotal ?? order.total);
  const methods = paymentMethods && paymentMethods.length
    ? paymentMethods
    : [{ id: undefined, kind: "cash", name: PAYMENT_METHOD_KIND_LABELS.cash }];
  const [remaining, setRemaining] = React.useState(due);
  const [payments, setPayments] = React.useState([]); // { methodId, kind, label, amount }
  const [selectedMethodId, setSelectedMethodId] = React.useState(methods[0]?.id ?? methods[0]?.kind);
  const [amount, setAmount] = React.useState(due > 0 ? String(due.toFixed(2)) : "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  const findSelectedMethod = () => methods.find((m) => (m.id ?? m.kind) === selectedMethodId);

  const addPaymentLine = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Montant invalide.");
      return;
    }
    const method = findSelectedMethod();
    const label = method?.name || PAYMENT_METHOD_KIND_LABELS[method?.kind] || method?.kind || "Paiement";
    setPayments((p) => [...p, { methodId: method?.id, kind: method?.kind, label, amount: value }]);
    const nextRemaining = Math.max(0, Math.round((remaining - value) * 100) / 100);
    setRemaining(nextRemaining);
    setAmount(nextRemaining > 0 ? String(nextRemaining.toFixed(2)) : "");
    setError(null);
  };

  const removePaymentLine = (idx) => {
    setPayments((p) => {
      const removed = p[idx];
      const next = p.filter((_, i) => i !== idx);
      const nextRemaining = Math.round((remaining + removed.amount) * 100) / 100;
      setRemaining(nextRemaining);
      return next;
    });
  };

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const confirm = async () => {
    if (remaining > 0.001) {
      setError("Le montant restant doit être encaissé avant de valider.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      for (const p of payments) {
        await api.addOrderPayment(order.id, {
          methodId: p.methodId,
          amount: p.amount,
          currencyCode,
          reference: p.kind,
        });
      }
      // Vente directe boutique/supermarché sans étape de préparation : la
      // commande passe directement à "completed" une fois entièrement payée
      // (pas de flux restaurant received→preparing→ready→served ici).
      const updated = await api.setOrderStatus(order.id, { status: "completed" });
      onDone(updated);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Encaissement — Commande {order.publicRef || `#${order.id}`}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Total dû</span>
          <span style={{ fontWeight: 700 }}>{formatMoney(remaining, currencyCode)}</span>
        </div>

        {payments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {payments.map((p, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, background: "var(--bg-app, #FBF8F2)", padding: "6px 10px", borderRadius: 6 }}>
                <span>{p.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {formatMoney(p.amount, currencyCode)}
                  <button onClick={() => removePaymentLine(idx)} title="Retirer" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--oxblood-800, #7a1f2b)" }}>✕</button>
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>
              <span>Total saisi</span>
              <span>{formatMoney(totalPaid, currencyCode)}</span>
            </div>
          </div>
        )}

        {remaining > 0.001 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {methods.map((m) => {
                const key = m.id ?? m.kind;
                const label = m.name || PAYMENT_METHOD_KIND_LABELS[m.kind] || m.kind;
                return (
                  <button key={key} onClick={() => setSelectedMethodId(key)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border-2, #d8c8a8)",
                      background: selectedMethodId === key ? "#1f6d75" : "transparent",
                      color: selectedMethodId === key ? "#FBF8F2" : "var(--fg-1, #0E2418)",
                      fontWeight: 600, fontSize: 13, cursor: "pointer",
                    }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 }} />
              <button onClick={addPaymentLine}
                style={{ background: "#123F46", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "0 16px", fontWeight: 600, cursor: "pointer" }}>
                Ajouter
              </button>
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button onClick={confirm} disabled={submitting || remaining > 0.001}
            style={{
              flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8,
              padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting || remaining > 0.001 ? 0.6 : 1,
            }}>
            {submitting ? "Validation…" : "Valider le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const CaisseScreen = () => {
  const [session, setSession] = React.useState(undefined); // undefined=chargement, null=aucune, objet=ouverte
  const [sessionError, setSessionError] = React.useState(null);

  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [catalogError, setCatalogError] = React.useState(null);

  const [activeCategoryId, setActiveCategoryId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);

  const [ticket, setTicket] = React.useState([]); // { key, productId, variantId, name, qty, unitPrice, currencyCode }
  const [checkoutOrder, setCheckoutOrder] = React.useState(null); // commande creee cote serveur, en attente de paiement
  const [checkoutError, setCheckoutError] = React.useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState(null);

  // Modal variantes/modificateurs (SCRUM-293) : ouvert seulement si le produit
  // clique a des variantes et/ou des groupes de modificateurs. On decouvre ca
  // via GET /products/:id/sale-options au clic (pas de flag pre-charge sur la
  // liste catalogue pour eviter d'alourdir GET /products, appele tres souvent).
  const [saleOptionsProduct, setSaleOptionsProduct] = React.useState(null);
  const [saleOptionsLoading, setSaleOptionsLoading] = React.useState(false);
  const [saleOptionsError, setSaleOptionsError] = React.useState(null);

  // Succursale par defaut (is_default=true, sinon la premiere de la liste) et
  // methodes de paiement actives de l'organisation, chargees au montage.
  const [defaultBranchId, setDefaultBranchId] = React.useState(null);
  const [branchError, setBranchError] = React.useState(null);
  const [paymentMethods, setPaymentMethods] = React.useState([]);

  // Cloture de session + rapport Z (SCRUM-284). movements = mouvements de la
  // session courante. Au montage (ou rechargement de page en pleine session),
  // rehydrates depuis GET /cash-sessions/:id/movements (SCRUM-280 complement)
  // pour ne pas repartir d'une liste vide si l'utilisateur recharge la page ;
  // un ajout local (POST reussi) met ensuite la liste a jour sans tout recharger.
  const [sessionMovements, setSessionMovements] = React.useState([]);
  const [showMovementForm, setShowMovementForm] = React.useState(false);
  const [showCloseForm, setShowCloseForm] = React.useState(false);
  const [zReport, setZReport] = React.useState(null);

  const loadSession = React.useCallback(async () => {
    setSessionError(null);
    try {
      const current = await api.getCurrentCashSession();
      setSession(current);
      try {
        const movements = await api.listCashMovements(current.id);
        setSessionMovements(Array.isArray(movements) ? movements : []);
      } catch {
        // Rehydratation best-effort : une session ouverte reste utilisable
        // meme si l'historique des mouvements ne peut pas etre recharge.
        setSessionMovements([]);
      }
    } catch (err) {
      // 404 = aucune session ouverte (comportement attendu, pas une erreur reseau)
      if (/404/.test(err.message || "")) {
        setSession(null);
      } else {
        setSessionError(err.message || String(err));
        setSession(null);
      }
      setSessionMovements([]);
    }
  }, []);

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [cats, prods] = await Promise.all([api.listCategories(), api.listProducts()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      setCatalogError(err.message || String(err));
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const loadBranches = React.useCallback(async () => {
    try {
      const list = await api.listBranches();
      const branches = Array.isArray(list) ? list : [];
      const preferred = branches.find((b) => b.isDefault) || branches[0];
      setDefaultBranchId(preferred?.id ?? null);
      if (!preferred) setBranchError("Aucune succursale configurée pour cette organisation.");
    } catch (err) {
      setBranchError(err.message || String(err));
    }
  }, []);

  const loadPaymentMethods = React.useCallback(async () => {
    try {
      const list = await api.listPaymentMethods();
      setPaymentMethods(Array.isArray(list) ? list : []);
    } catch {
      // Fallback gracieux : le panneau de paiement retombe sur une methode
      // "Espèces" par defaut sans methodId (voir PaymentPanel).
      setPaymentMethods([]);
    }
  }, []);

  React.useEffect(() => {
    loadSession();
    loadCatalog();
    loadBranches();
    loadPaymentMethods();
  }, [loadSession, loadCatalog, loadBranches, loadPaymentMethods]);

  // selection = { variant, modifiers: [...] } quand le produit a des options
  // choisies via SaleOptionsModal ; undefined pour un produit simple (flux
  // inchange). Chaque combinaison variante+modificateurs distincte devient sa
  // propre ligne de ticket (key dediee), pour ne pas fusionner par erreur des
  // choix differents sous un meme produit.
  const addToTicket = (product, selection) => {
    const variant = selection?.variant || null;
    const modifiers = selection?.modifiers || [];

    const namePart = [
      product.name,
      variant ? variant.name : null,
      modifiers.length ? `(${modifiers.map((m) => m.name).join(", ")})` : null,
    ].filter(Boolean).join(" — ").replace(" — (", " (");

    const unitPrice = Number(product.salePrice)
      + (variant ? Number(variant.priceDelta) : 0)
      + modifiers.reduce((s, m) => s + Number(m.priceDelta), 0);

    const key = [product.id, variant?.id || 0, modifiers.map((m) => m.id).sort((a, b) => a - b).join("-")].join(":");

    setTicket((lines) => {
      const idx = lines.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = [...lines];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...lines, {
        key,
        productId: product.id,
        variantId: variant?.id,
        name: namePart,
        qty: 1,
        unitPrice,
        currencyCode: product.currencyCode,
      }];
    });
  };

  // Clic sur un produit du catalogue : verifie s'il a des variantes/groupes de
  // modificateurs. Si oui -> modal de selection avant ajout. Sinon -> ajout
  // direct au ticket, comportement identique a avant ce ticket.
  const onProductClick = async (product) => {
    setSaleOptionsError(null);
    setSaleOptionsLoading(true);
    try {
      const options = await api.getProductSaleOptions(product.id);
      const hasVariants = Array.isArray(options?.variants) && options.variants.length > 0;
      const hasModifierGroups = Array.isArray(options?.modifierGroups) && options.modifierGroups.length > 0;
      if (hasVariants || hasModifierGroups) {
        setSaleOptionsProduct({ product, options });
      } else {
        addToTicket(product);
      }
    } catch (err) {
      // Echec de la verification des options : on ne bloque pas la vente,
      // on ajoute le produit tel quel (comportement simple par defaut).
      addToTicket(product);
    } finally {
      setSaleOptionsLoading(false);
    }
  };

  const changeQty = (key, delta) => {
    setTicket((lines) => lines
      .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0));
  };

  const removeLine = (key) => setTicket((lines) => lines.filter((l) => l.key !== key));

  // Recherche/scan code-barres (etape 4) : le champ texte filtre localement
  // par nom au fil de la frappe ; sur Enter, on tente d'abord un lookup
  // code-barres exact cote serveur (comportement d'une douchette USB/BT qui
  // tape le code puis Enter), sinon on garde juste le filtre texte.
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    try {
      const product = await api.getProductByBarcode(search.trim());
      if (product) {
        addToTicket(product);
        setScanMessage(`Ajouté : ${product.name}`);
        setSearch("");
      }
    } catch (err) {
      // Pas trouve par code-barres : on laisse le filtre texte actif, ce
      // n'est pas une erreur bloquante (l'utilisateur tapait peut-etre un nom).
      setScanMessage(null);
    }
  };

  const filteredProducts = React.useMemo(() => {
    let list = products.filter((p) => p.isAvailable !== false);
    if (activeCategoryId) list = list.filter((p) => p.categoryId === activeCategoryId);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name || "").toLowerCase().includes(q));
    return list;
  }, [products, activeCategoryId, search]);

  const subtotal = ticket.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const ticketCurrency = ticket[0]?.currencyCode || session?.currencyCode || "USD";

  const startCheckout = async () => {
    if (!ticket.length || !session) return;
    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const order = await api.createOrder({
        branchId: session.branchId ?? defaultBranchId,
        registerId: session.registerId,
        channel: "pos",
        currencyCode: ticketCurrency,
        clientUuid: crypto.randomUUID(),
        lines: ticket.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          name: l.name,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
      });
      setCheckoutOrder(order);
    } catch (err) {
      setCheckoutError(err.message || String(err));
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const onPaymentDone = (order) => {
    setCheckoutOrder(null);
    setTicket([]);
    setConfirmation(order);
    setTimeout(() => setConfirmation(null), 4000);
  };

  const onMovementAdded = (movement) => {
    setSessionMovements((list) => [...list, movement]);
    setShowMovementForm(false);
  };

  // Cloture reussie : garde la session fermee (avec expectedCash/countedCash/
  // variance calcules cote serveur) pour le rapport Z, puis remet l'ecran en
  // etat "aucune session" (blocage vente jusqu'a nouvelle ouverture, etape 5).
  const onSessionClosed = (closedSession) => {
    setShowCloseForm(false);
    setZReport(closedSession);
  };

  const onZReportClosed = () => {
    setZReport(null);
    setSessionMovements([]);
    setSession(null);
  };

  // ── Etats de chargement / blocage ────────────────────────────────────
  if (session === undefined) {
    return <CenteredNote>Chargement de la session de caisse…</CenteredNote>;
  }
  if (session === null) {
    return (
      <>
        <ErrorBanner message={sessionError} onRetry={loadSession} />
        <OpenSessionForm onOpened={setSession} branchId={defaultBranchId} branchError={branchError} />
      </>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden", flexDirection: "column" }}>
      {/* Bandeau session — porte d'entree/sortie de la caisse, cohérent avec
          OpenSessionForm : les actions de cycle de vie de la session vivent
          dans CaisseScreen, pas dans le Dashboard (qui reste un écran de
          consultation en lecture seule). */}
      <div style={{
        flexShrink: 0, background: "#123F46", color: "#FBF8F2", padding: "10px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Session de caisse ouverte</div>
          <div style={{ fontSize: 11.5, opacity: 0.85 }}>
            Depuis {formatTime(session.openedAt)} · Fonds {formatMoney(session.openingFloat, session.currencyCode)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowMovementForm(true)} style={{
            background: "transparent", border: "1px solid rgba(251,248,242,0.5)", color: "#FBF8F2",
            borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
          }}>
            Ajouter un mouvement
          </button>
          <button onClick={() => setShowCloseForm(true)} style={{
            background: "#7a1f2b", border: 0, color: "#FBF8F2",
            borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>
            Clôturer la caisse
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minWidth: 0, overflow: "hidden" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 20, overflow: "auto" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Rechercher un article ou scanner un code-barres…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10,
            border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14, marginBottom: 12,
          }}
        />
        {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75", marginBottom: 8 }}>{scanMessage}</div>}

        {catalogError && <ErrorBanner message={catalogError} onRetry={loadCatalog} />}

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
          <button onClick={() => setActiveCategoryId(null)}
            style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border-2, #d8c8a8)",
              background: activeCategoryId === null ? "#1f6d75" : "transparent",
              color: activeCategoryId === null ? "#FBF8F2" : "var(--fg-1, #0E2418)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            Tous
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCategoryId(c.id)}
              style={{
                flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border-2, #d8c8a8)",
                background: activeCategoryId === c.id ? "#1f6d75" : "transparent",
                color: activeCategoryId === c.id ? "#FBF8F2" : "var(--fg-1, #0E2418)",
                fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              }}>
              {c.icon ? `${c.icon} ` : ""}{c.name}
            </button>
          ))}
        </div>

        {catalogLoading ? (
          <CenteredNote>Chargement du catalogue…</CenteredNote>
        ) : filteredProducts.length === 0 ? (
          <CenteredNote>Aucun produit ne correspond à cette recherche.</CenteredNote>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => onProductClick(p)} disabled={saleOptionsLoading}
                style={{
                  textAlign: "left", cursor: "pointer", border: "1px solid var(--border-1, #E7EBF1)",
                  borderRadius: 12, padding: 14, background: "var(--paper, #fff)", display: "flex",
                  flexDirection: "column", gap: 8, minHeight: 90, opacity: saleOptionsLoading ? 0.7 : 1,
                }}>
                <div style={{ fontSize: 24 }}>{p.emojiFallback || "🛒"}</div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fg-1, #0E2418)" }}>{p.name}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1f6d75" }}>{formatMoney(p.salePrice, p.currencyCode)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <aside style={{
        width: 320, flexShrink: 0, borderLeft: "1px solid var(--border-1, #E7EBF1)",
        background: "var(--paper, #fff)", display: "flex", flexDirection: "column", padding: 20,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: "var(--fg-1, #0E2418)" }}>Ticket</div>

        {checkoutError && <ErrorBanner message={checkoutError} onRetry={startCheckout} />}

        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {ticket.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun article. Clique sur un produit pour l'ajouter.</div>
          ) : ticket.map((l) => (
            <div key={l.key} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600 }}>
                <span>{l.name}</span>
                <button onClick={() => removeLine(l.key)} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--oxblood-800, #7a1f2b)" }}>✕</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--fg-3, #6b6b6b)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => changeQty(l.key, -1)} style={qtyBtnStyle}>−</button>
                  <span style={{ minWidth: 18, textAlign: "center" }}>{l.qty}</span>
                  <button onClick={() => changeQty(l.key, 1)} style={qtyBtnStyle}>+</button>
                </div>
                <span>{formatMoney(l.unitPrice, l.currencyCode)} / unité</span>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}>
                {formatMoney(l.qty * l.unitPrice, l.currencyCode)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-3, #6b6b6b)", marginBottom: 4 }}>
            <span>Sous-total</span>
            <span>{formatMoney(subtotal, ticketCurrency)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)", marginBottom: 12 }}>
            <span>Total</span>
            <span>{formatMoney(subtotal, ticketCurrency)}</span>
          </div>
          <button onClick={startCheckout} disabled={!ticket.length || checkoutSubmitting}
            style={{
              width: "100%", background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 10,
              padding: "14px 16px", fontWeight: 700, fontSize: 15, cursor: "pointer",
              opacity: !ticket.length || checkoutSubmitting ? 0.5 : 1,
            }}>
            {checkoutSubmitting ? "Création…" : `Encaisser ${formatMoney(subtotal, ticketCurrency)}`}
          </button>
        </div>
      </aside>

      {checkoutOrder && (
        <PaymentPanel
          order={checkoutOrder}
          onDone={onPaymentDone}
          onCancel={() => setCheckoutOrder(null)}
          paymentMethods={paymentMethods}
        />
      )}

      {confirmation && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#1f6d75", color: "#FBF8F2", padding: "12px 20px", borderRadius: 10,
          fontWeight: 600, fontSize: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 60,
        }}>
          Vente encaissée — commande {confirmation.publicRef || `#${confirmation.id}`} ✓
        </div>
      )}
      </div>

      {showMovementForm && (
        <CashMovementForm
          session={session}
          onAdded={onMovementAdded}
          onCancel={() => setShowMovementForm(false)}
        />
      )}

      {showCloseForm && (
        <CloseSessionForm
          session={session}
          onClosed={onSessionClosed}
          onCancel={() => setShowCloseForm(false)}
        />
      )}

      {zReport && (
        <ZReportModal
          closedSession={zReport}
          movements={sessionMovements}
          onClose={onZReportClosed}
        />
      )}

      {saleOptionsProduct && (
        <SaleOptionsModal
          product={saleOptionsProduct.product}
          options={saleOptionsProduct.options}
          onConfirm={(selection) => {
            addToTicket(saleOptionsProduct.product, selection);
            setSaleOptionsProduct(null);
          }}
          onCancel={() => setSaleOptionsProduct(null)}
        />
      )}
      {saleOptionsError && <ErrorBanner message={saleOptionsError} />}
    </div>
  );
};

// Modal de selection variante + modificateurs avant ajout au ticket
// (SCRUM-293). Une seule variante selectionnable (ou aucune si le produit
// n'en a pas) ; par groupe de modificateurs, respecte minSelect/maxSelect
// (validation avant confirmation, pas seulement a la saisie).
function SaleOptionsModal({ product, options, onConfirm, onCancel }) {
  const variants = options.variants || [];
  const modifierGroups = options.modifierGroups || [];

  const [variantId, setVariantId] = React.useState(variants[0]?.id ?? null);
  const [selectedByGroup, setSelectedByGroup] = React.useState({}); // { [groupId]: Set<modifierId> }
  const [error, setError] = React.useState(null);

  const toggleModifier = (group, modifier) => {
    setSelectedByGroup((prev) => {
      const current = new Set(prev[group.id] || []);
      if (current.has(modifier.id)) {
        current.delete(modifier.id);
      } else {
        if (group.maxSelect > 0 && current.size >= group.maxSelect) {
          // maxSelect=1 : on remplace la selection au lieu de bloquer, plus
          // pratique qu'un refus silencieux pour un choix unique (radio-like).
          if (group.maxSelect === 1) {
            current.clear();
            current.add(modifier.id);
            return { ...prev, [group.id]: current };
          }
          return prev;
        }
        current.add(modifier.id);
      }
      return { ...prev, [group.id]: current };
    });
  };

  const confirm = () => {
    for (const group of modifierGroups) {
      const count = (selectedByGroup[group.id] || new Set()).size;
      if (count < group.minSelect) {
        setError(`"${group.name}" : sélectionnez au moins ${group.minSelect} option(s).`);
        return;
      }
      if (group.maxSelect > 0 && count > group.maxSelect) {
        setError(`"${group.name}" : maximum ${group.maxSelect} option(s).`);
        return;
      }
    }

    const variant = variants.find((v) => v.id === variantId) || null;
    const modifiers = modifierGroups.flatMap((group) => {
      const ids = selectedByGroup[group.id] || new Set();
      return (group.modifiers || []).filter((m) => ids.has(m.id));
    });

    onConfirm({ variant, modifiers });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>{product.name}</div>

        {variants.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Variante</div>
            {variants.map((v) => (
              <label key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                <span style={{ flex: 1 }}>{v.name}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(v.priceDelta) !== 0 ? formatMoney(v.priceDelta, product.currencyCode) : ""}
                </span>
              </label>
            ))}
          </div>
        )}

        {modifierGroups.map((group) => (
          <div key={group.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {group.name}
              <span style={{ fontWeight: 400, color: "var(--fg-3, #6b6b6b)", fontSize: 11.5 }}>
                {" "}({group.minSelect > 0 ? `${group.minSelect} min` : "optionnel"}
                {group.maxSelect ? `, ${group.maxSelect} max` : ""})
              </span>
            </div>
            {(group.modifiers || []).map((m) => (
              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <input
                  type="checkbox"
                  checked={(selectedByGroup[group.id] || new Set()).has(m.id)}
                  onChange={() => toggleModifier(group, m)}
                />
                <span style={{ flex: 1 }}>{m.name}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(m.priceDelta) !== 0 ? formatMoney(m.priceDelta, product.currencyCode) : ""}
                </span>
              </label>
            ))}
          </div>
        ))}

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} style={secondaryBtnStyle}>Annuler</button>
          <button type="button" onClick={confirm} style={primaryBtnStyle}>Ajouter au ticket</button>
        </div>
      </div>
    </div>
  );
}

const qtyBtnStyle = {
  width: 22, height: 22, borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)",
  background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1,
};

// Libelles/couleurs des statuts de commande, partages entre Dashboard et
// Commandes. Alignes sur la machine a etats du backend (orders.service.ts) :
// draft→received→preparing→ready→served→completed, plus cancelled depuis
// n'importe quel etat non terminal.
const ORDER_STATUS_LABELS = {
  draft: "Brouillon",
  received: "Reçue",
  preparing: "En préparation",
  ready: "Prête",
  served: "Servie",
  completed: "Terminée",
  cancelled: "Annulée",
};
const ORDER_STATUS_COLORS = {
  draft: "#8a8a8a",
  received: "#1f6d75",
  preparing: "#b8860b",
  ready: "#2f7d4f",
  served: "#2f7d4f",
  completed: "#123F46",
  cancelled: "#7a1f2b",
};
// Transitions autorisees par etat — cote UI uniquement pour proposer les bons
// boutons ; la machine a etats fait foi cote serveur (rejette sinon, SCRUM-283).
const ORDER_STATUS_TRANSITIONS = {
  draft: ["received", "cancelled"],
  received: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
const ORDER_CHANNEL_LABELS = { pos: "Caisse", online: "En ligne", phone: "Téléphone" };

function StatusBadge({ status }) {
  const color = ORDER_STATUS_COLORS[status] || "#6b6b6b";
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11.5,
      fontWeight: 700, color: "#FBF8F2", background: color, whiteSpace: "nowrap",
    }}>
      {ORDER_STATUS_LABELS[status] || status}
    </span>
  );
}

function formatTime(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────
// Dashboard — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────
// Pas d'endpoint d'agregation dedie cote backend (verifie : orders.controller
// n'expose que list/detail). Les KPI du jour sont donc calcules ici a partir
// de GET /orders filtre from/to=aujourd'hui.

function KpiCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
      borderRadius: 12, padding: 18, flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-1, #0E2418)", marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export const DashboardScreen = () => {
  const [session, setSession] = React.useState(undefined); // undefined=chargement, null=aucune
  const [orders, setOrders] = React.useState(null);
  const [expensesSummary, setExpensesSummary] = React.useState(null); // null tant que non charge/echec
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersList, currentSession, todaysExpenses] = await Promise.all([
        api.listOrders({ from: today, to: today }),
        api.getCurrentCashSession().catch((err) => {
          if (/404/.test(err.message || "")) return null;
          throw err;
        }),
        // Depenses du jour (SCRUM-292) : echec silencieux pour ne jamais
        // casser le dashboard existant (ex: aucune permission depenses).
        api.getExpensesSummary({ from: today, to: today }).catch(() => null),
      ]);
      setOrders(Array.isArray(ordersList) ? ordersList : []);
      setSession(currentSession);
      setExpensesSummary(todaysExpenses);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const completedOrders = React.useMemo(
    () => (orders || []).filter((o) => o.orderStatus === "completed"),
    [orders],
  );
  const currencyCode = completedOrders[0]?.currencyCode || orders?.[0]?.currencyCode || session?.currencyCode || "";
  const totalSales = completedOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const orderCount = completedOrders.length;
  const avgOrder = orderCount ? totalSales / orderCount : 0;

  const recentOrders = React.useMemo(
    () => [...(orders || [])].sort((a, b) => b.id - a.id).slice(0, 8),
    [orders],
  );

  if (loading && orders === null) {
    return <CenteredNote>Chargement du tableau de bord…</CenteredNote>;
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      <ErrorBanner message={error} onRetry={load} />

      {session === null ? (
        <div style={{
          background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)",
          borderRadius: 10, padding: "12px 16px", fontSize: 13,
        }}>
          Aucune session de caisse ouverte actuellement.
        </div>
      ) : session ? (
        <div style={{
          background: "#123F46", color: "#FBF8F2", borderRadius: 10, padding: "14px 18px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Session de caisse ouverte</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Depuis {formatTime(session.openedAt)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase" }}>Fonds d'ouverture</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{formatMoney(session.openingFloat, session.currencyCode)}</div>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <KpiCard label="Commandes du jour" value={orderCount} />
        <KpiCard label="Ventes du jour" value={formatMoney(totalSales, currencyCode)} />
        <KpiCard label="Commande moyenne" value={formatMoney(avgOrder, currencyCode)} />
        {expensesSummary && expensesSummary.totals.length > 0 && expensesSummary.totals.map((t) => (
          <KpiCard key={t.currencyCode} label="Dépenses du jour" value={formatMoney(t.total, t.currencyCode)} />
        ))}
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)", marginBottom: 10 }}>Dernières commandes</div>
        {recentOrders.length === 0 ? (
          <CenteredNote>Aucune commande aujourd'hui.</CenteredNote>
        ) : (
          <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
            {recentOrders.map((o) => (
              <div key={o.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                padding: "12px 16px", borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
              }}>
                <span style={{ fontWeight: 600, minWidth: 130 }}>{o.publicRef || `#${o.id}`}</span>
                <span style={{ color: "var(--fg-3, #6b6b6b)", flex: 1 }}>{formatTime(o.createdAt)}</span>
                <StatusBadge status={o.orderStatus} />
                <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(o.total, o.currencyCode)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Produits — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [name, setName] = React.useState(product?.name || "");
  const [categoryId, setCategoryId] = React.useState(product?.categoryId ?? "");
  const [salePrice, setSalePrice] = React.useState(product?.salePrice ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(product?.currencyCode || categories[0]?.currencyCode || "USD");
  const [barcode, setBarcode] = React.useState(product?.barcode || "");
  const [sku, setSku] = React.useState(product?.sku || "");
  const [isAvailable, setIsAvailable] = React.useState(product?.isAvailable !== false);
  const [costMode, setCostMode] = React.useState(product?.costMode || "manual");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  // Le produit courant (mis a jour apres save) permet d'afficher la section
  // Recette juste apres la creation, sans devoir fermer/rouvrir le modal.
  const [savedProduct, setSavedProduct] = React.useState(product || null);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom du produit est obligatoire.");
      return;
    }
    const price = Number(salePrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Le prix de vente doit être un nombre positif.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        categoryId: categoryId === "" ? undefined : Number(categoryId),
        salePrice: price,
        currencyCode,
        barcode: barcode.trim() || undefined,
        sku: sku.trim() || undefined,
        isAvailable,
        costMode,
      };
      const saved = product ? await api.updateProduct(product.id, body) : await api.createProduct(body);
      setSavedProduct(saved);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {product ? "Modifier le produit" : "Nouveau produit"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Nom *</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Catégorie</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldInputStyle}>
            <option value="">Sans catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Prix de vente *</span>
            <input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Code-barres (optionnel)</span>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>SKU (optionnel)</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
          <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
          Disponible à la vente
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Mode de calcul du coût</span>
          <select value={costMode} onChange={(e) => setCostMode(e.target.value)} style={fieldInputStyle}>
            <option value="manual">Manuel (coût d'achat saisi à la main)</option>
            <option value="recipe">Recette (coût calculé à partir des ingrédients)</option>
          </select>
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {/* Recette (SCRUM-291) : disponible uniquement sur un produit deja
            enregistre (besoin d'un productId) et en mode costMode="recipe".
            En dehors du <form> submit du produit : sa sauvegarde est
            independante (PUT /recipe), elle ne ferme pas ce modal. */}
        {savedProduct?.id && costMode === "recipe" && (
          <RecipeEditor product={savedProduct} />
        )}

        {/* Variantes + modificateurs (SCRUM-293) : disponibles uniquement sur
            un produit deja enregistre (besoin d'un productId), meme logique
            que la Recette ci-dessus — sauvegarde independante du <form>. */}
        {savedProduct?.id && (
          <ProductVariantsSection product={savedProduct} />
        )}
        {savedProduct?.id && (
          <ProductModifierGroupsSection product={savedProduct} />
        )}
      </form>
    </div>
  );
}

// Editeur de recette d'un produit — SCRUM-291. Le cout (computedCost) est
// TOUJOURS calcule et retourne par le serveur (RecipesService.computeCost) ;
// on ne recalcule jamais ce montant cote frontend, on l'affiche tel quel.
function RecipeEditor({ product }) {
  const [ingredientsList, setIngredientsList] = React.useState([]);
  const [recipe, setRecipe] = React.useState(null); // null = pas encore chargee / inexistante
  const [lines, setLines] = React.useState([]); // [{ ingredientId, qtyBase }]
  const [wastePct, setWastePct] = React.useState("0");
  const [consumablePct, setConsumablePct] = React.useState("0");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allIngredients = await api.listIngredients();
      setIngredientsList(Array.isArray(allIngredients) ? allIngredients : []);
      try {
        const existing = await api.getProductRecipe(product.id);
        setRecipe(existing);
        setLines((existing.lines || []).map((l) => ({ ingredientId: l.ingredientId, qtyBase: String(l.qtyBase) })));
        setWastePct(String(existing.wastePct ?? "0"));
        setConsumablePct(String(existing.consumablePct ?? "0"));
      } catch {
        // Pas de recette existante pour ce produit : etat vide, ce n'est pas
        // une erreur bloquante pour l'ecran.
        setRecipe(null);
        setLines([]);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const addLine = () => {
    if (!ingredientsList.length) return;
    setLines((ls) => [...ls, { ingredientId: ingredientsList[0].id, qtyBase: "" }]);
  };
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));
  const updateLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const saveRecipe = async () => {
    setError(null);
    if (lines.length === 0) {
      setError("Ajoutez au moins une ligne d'ingrédient.");
      return;
    }
    for (const l of lines) {
      const q = Number(l.qtyBase);
      if (!Number.isFinite(q) || q <= 0) {
        setError("Chaque quantité d'ingrédient doit être un nombre positif.");
        return;
      }
    }
    const waste = Number(wastePct);
    const consumable = Number(consumablePct);
    if (!Number.isFinite(waste) || waste < 0 || !Number.isFinite(consumable) || consumable < 0) {
      setError("Les pourcentages de perte/consommables doivent être des nombres positifs.");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        wastePct: waste,
        consumablePct: consumable,
        lines: lines.map((l) => ({ ingredientId: Number(l.ingredientId), qtyBase: Number(l.qtyBase) })),
      };
      const saved = await api.saveProductRecipe(product.id, body);
      setRecipe(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRecipe = async () => {
    if (!window.confirm("Supprimer la recette de ce produit ? Pensez à repasser le mode de calcul sur \"Manuel\" si besoin.")) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.removeProductRecipe(product.id);
      setRecipe(null);
      setLines([]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const ingredientById = React.useMemo(() => {
    const map = new Map();
    ingredientsList.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredientsList]);

  const computedCost = recipe?.computedCost != null ? Number(recipe.computedCost) : null;
  const recipeCurrency = recipe?.lines?.[0]?.currencyCode || ingredientsList[0]?.currencyCode;
  const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
  const margin = computedCost != null && salePrice != null ? salePrice - computedCost : null;

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Recette</div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement de la recette…</div>
      ) : ingredientsList.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucun ingrédient n'est encore enregistré. Ajoutez-en depuis l'écran Ingrédients.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lines.map((l, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={l.ingredientId} onChange={(e) => updateLine(idx, { ingredientId: Number(e.target.value) })} style={{ ...fieldInputStyle, flex: 2 }}>
                  {ingredientsList.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.baseUnit})</option>
                  ))}
                </select>
                <input
                  type="number" min="0" step="0.0001" placeholder="Qté"
                  value={l.qtyBase}
                  onChange={(e) => updateLine(idx, { qtyBase: e.target.value })}
                  style={{ ...fieldInputStyle, flex: 1 }}
                />
                <span style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)", minWidth: 28 }}>
                  {ingredientById.get(l.ingredientId)?.baseUnit || ""}
                </span>
                <button type="button" onClick={() => removeLine(idx)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>×</button>
              </div>
            ))}
            <button type="button" onClick={addLine} style={secondaryBtnStyle}>+ Ligne d'ingrédient</button>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Perte (%)</span>
              <input type="number" min="0" step="0.1" value={wastePct} onChange={(e) => setWastePct(e.target.value)} style={fieldInputStyle} />
            </label>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Consommables (%)</span>
              <input type="number" min="0" step="0.1" value={consumablePct} onChange={(e) => setConsumablePct(e.target.value)} style={fieldInputStyle} />
            </label>
          </div>

          {computedCost != null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13, background: "var(--bg-app, #FBF8F2)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Coût de revient calculé</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(computedCost, recipeCurrency)}</span>
              </div>
              {margin != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Marge (prix de vente − coût)</span>
                  <span style={{ fontWeight: 700, color: margin < 0 ? "var(--oxblood-800, #7a1f2b)" : "inherit" }}>
                    {formatMoney(margin, product.currencyCode || recipeCurrency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            {recipe && (
              <button type="button" onClick={deleteRecipe} disabled={submitting}
                style={{ ...secondaryBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>
                Supprimer la recette
              </button>
            )}
            <button type="button" onClick={saveRecipe} disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Enregistrement…" : "Enregistrer la recette"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Section "Variantes" de ProductForm (SCRUM-293) : liste simple avec
// ajout/edition/suppression (nom + supplement de prix, priceDelta signe).
// Sauvegarde independante du <form> produit, meme pattern que RecipeEditor.
function ProductVariantsSection({ product }) {
  const [variants, setVariants] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [editingId, setEditingId] = React.useState(null); // null=aucun formulaire, 0=creation, id=edition
  const [name, setName] = React.useState("");
  const [priceDelta, setPriceDelta] = React.useState("0");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listProductVariants(product.id);
      setVariants(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const resetForm = () => { setEditingId(null); setName(""); setPriceDelta("0"); };

  const startEdit = (v) => {
    setEditingId(v.id);
    setName(v.name || "");
    setPriceDelta(String(v.priceDelta ?? "0"));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la variante est obligatoire.");
      return;
    }
    const delta = Number(priceDelta);
    if (!Number.isFinite(delta)) {
      setError("Le supplément de prix doit être un nombre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), priceDelta: delta };
      if (editingId) await api.updateProductVariant(editingId, body);
      else await api.createProductVariant(product.id, body);
      resetForm();
      load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (v) => {
    if (!window.confirm(`Désactiver la variante "${v.name}" ?`)) return;
    try {
      await api.removeProductVariant(v.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Variantes</div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {variants.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune variante.</div>}
          {variants.map((v) => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{v.name} {Number(v.priceDelta) !== 0 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>({formatMoney(v.priceDelta, product.currencyCode)})</span>}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => startEdit(v)} style={smallBtnStyle}>Modifier</button>
                <button type="button" onClick={() => remove(v)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la variante" : "Nouvelle variante"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Nom (ex: Grande)" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
          <input type="number" step="0.01" placeholder="Supplément" value={priceDelta} onChange={(e) => setPriceDelta(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
        </div>
        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          {editingId && (
            <button type="button" onClick={resetForm} style={secondaryBtnStyle}>Annuler</button>
          )}
          <button type="button" onClick={submit} disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Section "Modificateurs" de ProductForm (SCRUM-293) : selection par
// checkbox parmi les groupes de modificateurs existants de l'organisation.
// La gestion des groupes/modificateurs eux-memes se fait dans ModifierGroupsPanel,
// accessible via le bouton "Gérer les groupes" (meme pattern que CategoryPanel).
function ProductModifierGroupsSection({ product }) {
  const [allGroups, setAllGroups] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showManage, setShowManage] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groups, saleOptions] = await Promise.all([
        api.listModifierGroups(),
        api.getProductSaleOptions(product.id),
      ]);
      setAllGroups(Array.isArray(groups) ? groups : []);
      const linked = Array.isArray(saleOptions?.modifierGroups) ? saleOptions.modifierGroups : [];
      setSelectedIds(new Set(linked.map((g) => g.id)));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  React.useEffect(() => { load(); }, [load]);

  const toggle = (groupId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const save = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.setProductModifierGroups(product.id, { groupIds: [...selectedIds] });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Modificateurs</div>
        <button type="button" onClick={() => setShowManage(true)} style={smallBtnStyle}>Gérer les groupes</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
      ) : allGroups.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
          Aucun groupe de modificateurs. Créez-en un via "Gérer les groupes".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allGroups.map((g) => (
            <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
              <input type="checkbox" checked={selectedIds.has(g.id)} onChange={() => toggle(g.id)} />
              <span>{g.name}</span>
            </label>
          ))}
        </div>
      )}

      {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

      <button type="button" onClick={save} disabled={submitting || loading} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1, alignSelf: "flex-start" }}>
        {submitting ? "Enregistrement…" : "Enregistrer les groupes associés"}
      </button>

      {showManage && (
        <ModifierGroupsPanel
          onChanged={load}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}

// Panneau de gestion des groupes de modificateurs + leurs modificateurs
// (SCRUM-293), meme pattern que CategoryPanel/ExpenseCategoryPanel. Portee
// organisation (pas liee a un produit) : accessible depuis n'importe quel
// produit via ProductModifierGroupsSection.
function ModifierGroupsPanel({ onChanged, onClose }) {
  const [groups, setGroups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  // priceDelta n'a pas de devise propre en base (delta applique au prix du
  // produit) : ce panneau etant a portee organisation (pas un produit
  // precis), on affiche le supplement dans la devise par defaut de
  // l'organisation, chargee depuis le profil d'activite.
  const [defaultCurrencyCode, setDefaultCurrencyCode] = React.useState("USD");

  const [editingGroupId, setEditingGroupId] = React.useState(null);
  const [groupName, setGroupName] = React.useState("");
  const [minSelect, setMinSelect] = React.useState("0");
  const [maxSelect, setMaxSelect] = React.useState("1");

  const [modifierGroupId, setModifierGroupId] = React.useState(null); // groupe cible pour ajout de modificateur
  const [modifierName, setModifierName] = React.useState("");
  const [modifierPriceDelta, setModifierPriceDelta] = React.useState("0");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, profile] = await Promise.all([
        api.listModifierGroups(),
        api.listBusinessProfile().catch(() => null),
      ]);
      setGroups(Array.isArray(list) ? list : []);
      if (profile?.defaultCurrencyCode) setDefaultCurrencyCode(profile.defaultCurrencyCode);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const notifyAndReload = async () => {
    await load();
    onChanged?.();
  };

  const resetGroupForm = () => { setEditingGroupId(null); setGroupName(""); setMinSelect("0"); setMaxSelect("1"); };

  const startEditGroup = (g) => {
    setEditingGroupId(g.id);
    setGroupName(g.name || "");
    setMinSelect(String(g.minSelect ?? 0));
    setMaxSelect(String(g.maxSelect ?? 1));
  };

  const submitGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Le nom du groupe est obligatoire.");
      return;
    }
    const min = Number(minSelect);
    const max = Number(maxSelect);
    if (!Number.isInteger(min) || min < 0 || !Number.isInteger(max) || max < 0) {
      setError("minSelect/maxSelect doivent être des entiers positifs.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: groupName.trim(), minSelect: min, maxSelect: max };
      if (editingGroupId) await api.updateModifierGroup(editingGroupId, body);
      else await api.createModifierGroup(body);
      resetGroupForm();
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const removeGroup = async (g) => {
    if (!window.confirm(`Désactiver le groupe "${g.name}" ?`)) return;
    try {
      await api.removeModifierGroup(g.id);
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const submitModifier = async (e) => {
    e.preventDefault();
    if (!modifierGroupId) return;
    if (!modifierName.trim()) {
      setError("Le nom du modificateur est obligatoire.");
      return;
    }
    const delta = Number(modifierPriceDelta);
    if (!Number.isFinite(delta)) {
      setError("Le supplément de prix doit être un nombre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createModifier(modifierGroupId, { name: modifierName.trim(), priceDelta: delta });
      setModifierName("");
      setModifierPriceDelta("0");
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const removeModifier = async (m) => {
    if (!window.confirm(`Désactiver le modificateur "${m.name}" ?`)) return;
    try {
      await api.removeModifier(m.id);
      await notifyAndReload();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Groupes de modificateurs</div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflow: "auto" }}>
            {groups.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun groupe.</div>}
            {groups.map((g) => (
              <div key={g.id} style={{ border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                  <span style={{ fontWeight: 600 }}>{g.name} <span style={{ fontWeight: 400, color: "var(--fg-3, #6b6b6b)", fontSize: 11.5 }}>({g.minSelect} min, {g.maxSelect} max)</span></span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => startEditGroup(g)} style={smallBtnStyle}>Modifier</button>
                    <button type="button" onClick={() => removeGroup(g)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {(g.modifiers || []).map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "4px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
                      <span>{m.name} {Number(m.priceDelta) !== 0 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>({formatMoney(m.priceDelta, defaultCurrencyCode)})</span>}</span>
                      <button type="button" onClick={() => removeModifier(m)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>×</button>
                    </div>
                  ))}
                </div>

                {modifierGroupId === g.id ? (
                  <form onSubmit={submitModifier} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input placeholder="Nom" value={modifierName} onChange={(e) => setModifierName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
                    <input type="number" step="0.01" placeholder="Supplément" value={modifierPriceDelta} onChange={(e) => setModifierPriceDelta(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
                    <button type="submit" disabled={submitting} style={smallBtnStyle}>Ajouter</button>
                    <button type="button" onClick={() => setModifierGroupId(null)} style={smallBtnStyle}>×</button>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setModifierGroupId(g.id); setModifierName(""); setModifierPriceDelta("0"); }} style={{ ...smallBtnStyle, alignSelf: "flex-start" }}>
                    + Modificateur
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitGroup} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingGroupId ? "Modifier le groupe" : "Nouveau groupe"}</div>
          <input placeholder="Nom (ex: Sauces)" value={groupName} onChange={(e) => setGroupName(e.target.value)} style={fieldInputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Min</span>
              <input type="number" min="0" step="1" value={minSelect} onChange={(e) => setMinSelect(e.target.value)} style={fieldInputStyle} />
            </label>
            <label style={{ ...fieldLabelStyle, flex: 1 }}>
              <span style={fieldCaptionStyle}>Max</span>
              <input type="number" min="0" step="1" value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} style={fieldInputStyle} />
            </label>
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingGroupId && (
              <button type="button" onClick={resetGroupForm} style={secondaryBtnStyle}>Annuler</button>
            )}
            <button type="submit" disabled={submitting} style={{ ...primaryBtnStyle, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingGroupId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button type="button" onClick={onClose} style={secondaryBtnStyle}>Fermer</button>
      </div>
    </div>
  );
}

function CategoryPanel({ categories, onChanged, onClose }) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  const resetForm = () => { setName(""); setIcon(""); setEditingId(null); };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name || "");
    setIcon(c.icon || "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), icon: icon.trim() || undefined };
      if (editingId) await api.updateCategory(editingId, body);
      else await api.createCategory(body);
      resetForm();
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Désactiver la catégorie "${c.name}" ?`)) return;
    try {
      await api.removeCategory(c.id);
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Catégories</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {categories.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune catégorie.</div>}
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{c.icon ? `${c.icon} ` : ""}{c.name}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(c)} style={smallBtnStyle}>Modifier</button>
                <button onClick={() => remove(c)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
            <input placeholder="Icône" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export const ProduitsScreen = () => {
  const [categories, setCategories] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState("");
  const [editingProduct, setEditingProduct] = React.useState(null); // null=ferme, {}=creation, objet=edition
  const [showCategories, setShowCategories] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([api.listCategories(), api.listProducts()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const filtered = React.useMemo(() => {
    let list = products;
    if (activeCategoryId) list = list.filter((p) => String(p.categoryId) === String(activeCategoryId));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q)
        || (p.sku || "").toLowerCase().includes(q)
        || (p.barcode || "").toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategoryId, search]);

  const removeProduct = async (p) => {
    if (!window.confirm(`Désactiver le produit "${p.name}" ?`)) return;
    try {
      await api.removeProduct(p.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, SKU ou code-barres…"
          style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
        />
        <select value={activeCategoryId} onChange={(e) => setActiveCategoryId(e.target.value)} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button onClick={() => setShowCategories(true)} style={secondaryBtnStyle}>Catégories</button>
        <button onClick={() => setEditingProduct({})} style={primaryBtnStyle}>+ Produit</button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des produits…</CenteredNote>
      ) : filtered.length === 0 ? (
        <CenteredNote>Aucun produit ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
              }}>
                <div style={{ fontSize: 20 }}>{p.emojiFallback || "🛒"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                    {cat?.name || "Sans catégorie"}{p.sku ? ` · SKU ${p.sku}` : ""}{p.barcode ? ` · ${p.barcode}` : ""}
                  </div>
                </div>
                {p.isAvailable === false && (
                  <span style={{ fontSize: 11, color: "var(--oxblood-800, #7a1f2b)", fontWeight: 600 }}>Indisponible</span>
                )}
                <div style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(p.salePrice, p.currencyCode)}</div>
                <button onClick={() => setEditingProduct(p)} style={smallBtnStyle}>Modifier</button>
                <button onClick={() => removeProduct(p)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </div>
            );
          })}
        </div>
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct.id ? editingProduct : null}
          categories={categories}
          onSaved={() => { setEditingProduct(null); load(); }}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      {showCategories && (
        <CategoryPanel
          categories={categories}
          onChanged={load}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Commandes — SCRUM-283
// ─────────────────────────────────────────────────────────────────────────
// NB : GET /orders ne pagine pas cote backend (verifie orders.controller/
// orders.service — pas de limit/offset) : liste simple pour cette phase.
// GET /orders/:id ne retourne que { ...order, lines } — pas les paiements ni
// l'historique de statut (verifie orders.service.findOneInternal). Le detail
// ci-dessous n'affiche donc que les lignes + le statut courant ; paiements et
// historique sont a exposer cote backend dans un ticket futur si besoin.

function OrderDetail({ orderId, onClose, onChanged }) {
  const [order, setOrder] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [statusSubmitting, setStatusSubmitting] = React.useState(false);
  const [statusError, setStatusError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getOrder(orderId);
      setOrder(detail);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  React.useEffect(() => { load(); }, [load]);

  const changeStatus = async (nextStatus) => {
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      const updated = await api.setOrderStatus(orderId, { status: nextStatus });
      setOrder(updated);
      onChanged?.();
    } catch (err) {
      setStatusError(err.message || String(err));
    } finally {
      setStatusSubmitting(false);
    }
  };

  const transitions = order ? (ORDER_STATUS_TRANSITIONS[order.orderStatus] || []) : [];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        {loading ? (
          <CenteredNote>Chargement de la commande…</CenteredNote>
        ) : error ? (
          <ErrorBanner message={error} onRetry={load} />
        ) : order ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
                  {order.publicRef || `#${order.id}`}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>{formatTime(order.createdAt)}</div>
              </div>
              <StatusBadge status={order.orderStatus} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(order.lines || []).map((l) => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "6px 0", borderBottom: "1px solid var(--border-1, #E7EBF1)" }}>
                  <span>{l.qty} × {l.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatMoney(l.lineTotal, order.currencyCode)}</span>
                </div>
              ))}
              {(!order.lines || order.lines.length === 0) && (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune ligne.</div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Sous-total</span>
                <span>{formatMoney(order.subtotal, order.currencyCode)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
                <span>Total</span>
                <span>{formatMoney(order.total, order.currencyCode)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--fg-3, #6b6b6b)" }}>Payé</span>
                <span>{formatMoney(order.paidTotal, order.currencyCode)}</span>
              </div>
              {Number(order.dueTotal) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--oxblood-800, #7a1f2b)", fontWeight: 600 }}>
                  <span>Restant dû</span>
                  <span>{formatMoney(order.dueTotal, order.currencyCode)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Paiements
              </div>
              {(order.payments || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun paiement enregistré.</div>
              ) : (
                (order.payments || []).map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{p.methodName || PAYMENT_METHOD_KIND_LABELS[p.kind] || "Paiement"} · {formatTime(p.receivedAt || p.createdAt)}</span>
                    <span style={{ fontWeight: 600 }}>{formatMoney(p.amount, p.currencyCode || order.currencyCode)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: "1px solid var(--border-1, #E7EBF1)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Historique de statut
              </div>
              {(order.statusHistory || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucun historique.</div>
              ) : (
                (order.statusHistory || []).map((h) => (
                  <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus] || h.fromStatus} → ` : ""}
                      {ORDER_STATUS_LABELS[h.toStatus] || h.toStatus}
                    </span>
                    <span style={{ color: "var(--fg-3, #6b6b6b)" }}>{formatTime(h.createdAt)}</span>
                  </div>
                ))
              )}
            </div>

            {statusError && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{statusError}</div>}

            {transitions.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {transitions.map((s) => (
                  <button key={s} onClick={() => changeStatus(s)} disabled={statusSubmitting}
                    style={{
                      padding: "10px 14px", borderRadius: 8, border: 0, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      background: s === "cancelled" ? "var(--oxblood-800, #7a1f2b)" : "#1f6d75", color: "#FBF8F2",
                      opacity: statusSubmitting ? 0.7 : 1,
                    }}>
                    {s === "cancelled" ? "Annuler la commande" : `Passer à « ${ORDER_STATUS_LABELS[s]} »`}
                  </button>
                ))}
              </div>
            )}

            <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
              Fermer
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export const CommandesScreen = () => {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [status, setStatus] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedOrderId, setSelectedOrderId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listOrders({ status: status || undefined, channel: channel || undefined, from: from || undefined, to: to || undefined });
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [status, channel, from, to]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} style={filterInputStyle}>
          <option value="">Tous les canaux</option>
          {Object.entries(ORDER_CHANNEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={filterInputStyle} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={filterInputStyle} />
      </div>

      {loading ? (
        <CenteredNote>Chargement des commandes…</CenteredNote>
      ) : orders.length === 0 ? (
        <CenteredNote>Aucune commande ne correspond à ces filtres.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSelectedOrderId(o.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", width: "100%",
                borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--border-1, #E7EBF1)",
                fontSize: 13.5, background: "transparent", cursor: "pointer", textAlign: "left",
              }}>
              <span style={{ fontWeight: 600, minWidth: 150 }}>{o.publicRef || `#${o.id}`}</span>
              <span style={{ color: "var(--fg-3, #6b6b6b)", minWidth: 110 }}>{formatTime(o.createdAt)}</span>
              <span style={{ color: "var(--fg-3, #6b6b6b)", flex: 1 }}>{ORDER_CHANNEL_LABELS[o.channel] || o.channel}</span>
              <StatusBadge status={o.orderStatus} />
              <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{formatMoney(o.total, o.currencyCode)}</span>
            </button>
          ))}
        </div>
      )}

      {selectedOrderId && (
        <OrderDetail orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} onChanged={load} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Styles partages (formulaires / boutons)
// ─────────────────────────────────────────────────────────────────────────
const fieldLabelStyle = { display: "flex", flexDirection: "column", gap: 4, textAlign: "left" };
const fieldCaptionStyle = { fontSize: 11, fontWeight: 600, color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" };
const fieldInputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 14 };
const smallBtnStyle = { background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0 };
const primaryBtnStyle = { background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer" };
const secondaryBtnStyle = { background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

// ─────────────────────────────────────────────────────────────────────────
// Parametres (SCRUM-287) — premier ecran de parametres du projet : formulaire
// minimal, pas de multi-onglets. Sauvegarde le profil d'activite (activite,
// devise par defaut, % service, pied de ticket) via PUT /business-profile.
// ─────────────────────────────────────────────────────────────────────────
const ACTIVITY_TYPE_LABELS = {
  restaurant: "Restaurant",
  supermarket: "Supermarché",
  pharmacy: "Pharmacie",
  hardware: "Quincaillerie",
  shop: "Boutique / Services",
};

export const ParametresScreen = ({ profile, onSaved }) => {
  const [activityType, setActivityType] = React.useState(profile?.activityType || "shop");
  const [defaultCurrencyCode, setDefaultCurrencyCode] = React.useState(profile?.defaultCurrencyCode || "USD");
  const [serviceChargeRate, setServiceChargeRate] = React.useState(profile?.serviceChargeRate ?? "0.00");
  const [receiptFooter, setReceiptFooter] = React.useState(profile?.receiptFooter || "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);

  // Re-synchronise le formulaire quand le profil parent est (re)charge —
  // ex: apres le premier appel API au montage du shell.
  React.useEffect(() => {
    if (!profile) return;
    setActivityType(profile.activityType || "shop");
    setDefaultCurrencyCode(profile.defaultCurrencyCode || "USD");
    setServiceChargeRate(profile.serviceChargeRate ?? "0.00");
    setReceiptFooter(profile.receiptFooter || "");
  }, [profile]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.updateBusinessProfile({
        activityType,
        defaultCurrencyCode: defaultCurrencyCode.trim().toUpperCase(),
        serviceChargeRate: String(serviceChargeRate || "0"),
        receiptFooter: receiptFooter.trim() || undefined,
      });
      setSuccess(true);
      if (onSaved) await onSaved();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      <ErrorBanner message={error} />
      {profile?.isDefault && (
        <div style={{
          background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--fg-3, #6b6b6b)", marginBottom: 16,
        }}>
          Aucun profil enregistré pour le moment — valeurs par défaut affichées. Elles ne seront sauvegardées qu'après avoir cliqué sur « Enregistrer ».
        </div>
      )}
      <form onSubmit={submit} style={{
        display: "flex", flexDirection: "column", gap: 16, background: "var(--paper, #fff)",
        border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, padding: 24, maxWidth: 480,
      }}>
        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Type d'activité</span>
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={fieldInputStyle}>
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Devise par défaut</span>
          <input type="text" maxLength={3} value={defaultCurrencyCode}
            onChange={(e) => setDefaultCurrencyCode(e.target.value.toUpperCase())}
            placeholder="USD" style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Pourcentage de service (%)</span>
          <input type="number" min="0" max="100" step="0.01" value={serviceChargeRate}
            onChange={(e) => setServiceChargeRate(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Pied de ticket</span>
          <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)}
            rows={3} placeholder="Merci de votre visite !" style={{ ...fieldInputStyle, resize: "vertical" }} />
        </label>

        {success && <div style={{ color: "#1f6d75", fontSize: 12.5, fontWeight: 600 }}>Paramètres enregistrés.</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};
const filterInputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5 };

// ─────────────────────────────────────────────────────────────────────────
// Stock — SCRUM-289
// ─────────────────────────────────────────────────────────────────────────
// GET /stock retourne les lignes brutes de kt_stock_items (pas de jointure
// produit/succursale cote backend — voir stock.service.ts#list) : le nom du
// produit et de la succursale sont donc resolus ici a partir de listProducts()
// / listBranches() deja disponibles. L'etat (ok/bas/rupture) peut aussi etre
// recalcule cote client a partir de qty/reorderThreshold, meme logique que
// stock.service.ts#list (qty<=0 => rupture, qty<=seuil => bas), pour l'affichage
// sans dependre du filtre state de l'API.
function stockState(item) {
  const qty = Number(item.qty);
  const threshold = item.reorderThreshold !== null && item.reorderThreshold !== undefined ? Number(item.reorderThreshold) : null;
  if (qty <= 0) return "out";
  if (threshold !== null && qty <= threshold) return "low";
  return "ok";
}

const STOCK_STATE_META = {
  ok:  { label: "OK",      color: "#1f6d75", bg: "rgba(31,109,117,0.12)" },
  low: { label: "Bas",     color: "#a05a00", bg: "rgba(160,90,0,0.12)" },
  out: { label: "Rupture", color: "#7a1f2b", bg: "rgba(122,31,43,0.12)" },
};

function StockStateBadge({ state }) {
  const meta = STOCK_STATE_META[state] || STOCK_STATE_META.ok;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11.5,
      fontWeight: 700, color: meta.color, background: meta.bg, whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function RestockForm({ item, productName, onSaved, onCancel }) {
  const [qty, setQty] = React.useState("");
  const [supplierName, setSupplierName] = React.useState("");
  const [purchasePrice, setPurchasePrice] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) {
      setError("La quantité doit être un nombre positif.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { qty: q };
      if (supplierName.trim()) body.supplierName = supplierName.trim();
      if (purchasePrice.trim() !== "") {
        const p = Number(purchasePrice);
        if (!Number.isFinite(p) || p < 0) {
          setError("Le prix d'achat doit être un nombre positif.");
          setSubmitting(false);
          return;
        }
        body.purchasePrice = p;
      }
      const updated = await api.restockItem(item.id, body);
      onSaved(updated);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Réapprovisionner
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Quantité reçue *</span>
          <input autoFocus type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Fournisseur (optionnel)</span>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Prix d'achat (optionnel, {item.currencyCode})</span>
          <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Réapprovisionner"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdjustForm({ item, productName, onSaved, onCancel }) {
  const [delta, setDelta] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0) {
      setError("L'écart doit être un nombre différent de zéro.");
      return;
    }
    if (!reason.trim()) {
      setError("Le motif est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.adjustStock(item.id, { delta: d, reason: reason.trim() });
      onSaved(updated);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Ajustement manuel
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Écart (peut être négatif) *</span>
          <input autoFocus type="number" step="0.001" value={delta} onChange={(e) => setDelta(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Motif *</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Casse, inventaire, péremption…" style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Ajuster"}
          </button>
        </div>
      </form>
    </div>
  );
}

const MOVEMENT_TYPE_LABELS = {
  in: "Entrée",
  out: "Sortie",
  sale: "Vente",
  adjust: "Ajustement",
  loss: "Perte",
  transfer: "Transfert",
};

function MovementsPanel({ item, productName, onClose }) {
  const [movements, setMovements] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listStockMovements(item.id);
      setMovements(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(480px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          Historique des mouvements
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>{productName}</div>

        {loading ? (
          <CenteredNote>Chargement…</CenteredNote>
        ) : error ? (
          <ErrorBanner message={error} onRetry={load} />
        ) : movements.length === 0 ? (
          <CenteredNote>Aucun mouvement enregistré.</CenteredNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {movements.map((m) => (
              <div key={m.id} style={{
                display: "flex", flexDirection: "column", gap: 2, padding: "8px 0",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</span>
                  <span style={{ fontWeight: 700, color: Number(m.qty) < 0 ? "var(--oxblood-800, #7a1f2b)" : "#1f6d75" }}>
                    {Number(m.qty) > 0 ? "+" : ""}{Number(m.qty)}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  <span>
                    {formatTime(m.createdAt)}
                    {m.supplierName ? ` · ${m.supplierName}` : ""}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </span>
                  <span>Solde : {Number(m.qtyAfter)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export const StockScreen = () => {
  const [items, setItems] = React.useState([]);
  const [products, setProducts] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [alerts, setAlerts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [activeBranchId, setActiveBranchId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);
  const [highlightedItemId, setHighlightedItemId] = React.useState(null);

  const [restockingItem, setRestockingItem] = React.useState(null);
  const [adjustingItem, setAdjustingItem] = React.useState(null);
  const [movementsItem, setMovementsItem] = React.useState(null);

  const itemRefs = React.useRef({});

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockList, prods, branchList, alertList] = await Promise.all([
        api.listStock(activeBranchId ? { branchId: activeBranchId } : {}),
        api.listProducts(),
        api.listBranches(),
        api.listStockAlerts(),
      ]);
      setItems(Array.isArray(stockList) ? stockList : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  React.useEffect(() => { load(); }, [load]);

  const productById = React.useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const branchById = React.useMemo(() => {
    const map = new Map();
    branches.forEach((b) => map.set(b.id, b));
    return map;
  }, [branches]);

  const productName = (item) => productById.get(item.productId)?.name || `Produit #${item.productId}`;
  const branchName = (item) => branchById.get(item.branchId)?.name || `Succursale #${item.branchId}`;

  // Recherche/scan code-barres : meme pattern que CaisseScreen#onSearchKeyDown
  // (champ texte filtre par nom au fil de la frappe ; Enter tente un lookup
  // code-barres exact cote serveur, puis scroll/surligne l'item de stock
  // correspondant a ce produit s'il existe).
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    try {
      const product = await api.getProductByBarcode(search.trim());
      if (product) {
        const match = items.find((it) => it.productId === product.id);
        if (match) {
          setHighlightedItemId(match.id);
          setSearch("");
          setScanMessage(`Trouvé : ${product.name}`);
          itemRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          setScanMessage(`« ${product.name} » n'a pas d'article de stock sur cette succursale.`);
        }
      }
    } catch {
      // Pas trouve par code-barres : le filtre texte reste actif, ce n'est
      // pas une erreur bloquante (l'utilisateur tapait peut-etre un nom).
      setScanMessage(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const p = productById.get(it.productId);
      return (p?.name || "").toLowerCase().includes(q)
        || (p?.barcode || "").toLowerCase().includes(q)
        || (p?.sku || "").toLowerCase().includes(q);
    });
  }, [items, search, productById]);

  const applyUpdatedItem = (updated) => {
    setItems((list) => list.map((it) => (it.id === updated.id ? updated : it)));
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      {alerts.length > 0 && (
        <div style={{
          background: "rgba(160,90,0,0.10)", border: "1px solid rgba(160,90,0,0.35)",
          borderRadius: 10, padding: "12px 16px", fontSize: 13,
        }}>
          <div style={{ fontWeight: 700, color: "#a05a00", marginBottom: 4 }}>
            {alerts.length} article{alerts.length > 1 ? "s" : ""} sous le seuil de réapprovisionnement
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "var(--fg-2, #333)" }}>
            {alerts.slice(0, 5).map((a) => (
              <span key={a.id}>{productName(a)} — {branchName(a)} · {Number(a.qty)} restant{Number(a.qty) > 1 ? "s" : ""}</span>
            ))}
            {alerts.length > 5 && <span style={{ color: "var(--fg-3, #6b6b6b)" }}>… et {alerts.length - 5} autre(s).</span>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Rechercher un article ou scanner un code-barres…"
          style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
        />
        {branches.length > 1 && (
          <select value={activeBranchId} onChange={(e) => setActiveBranchId(e.target.value)} style={filterInputStyle}>
            <option value="">Toutes les succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>
      {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75" }}>{scanMessage}</div>}

      {loading ? (
        <CenteredNote>Chargement du stock…</CenteredNote>
      ) : filtered.length === 0 ? (
        <CenteredNote>Aucun article de stock ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {filtered.map((it) => {
            const state = stockState(it);
            const isHighlighted = highlightedItemId === it.id;
            return (
              <div key={it.id} ref={(el) => { itemRefs.current[it.id] = el; }} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
                background: isHighlighted ? "rgba(31,109,117,0.08)" : "transparent",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{productName(it)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                    {branchName(it)}{it.reorderThreshold !== null && it.reorderThreshold !== undefined ? ` · Seuil ${Number(it.reorderThreshold)}` : ""}
                  </div>
                </div>
                <StockStateBadge state={state} />
                <div style={{ fontWeight: 700, minWidth: 70, textAlign: "right" }}>{Number(it.qty)}</div>
                {it.purchasePrice != null && (
                  <div style={{ minWidth: 90, textAlign: "right", color: "var(--fg-3, #6b6b6b)" }}>
                    {formatMoney(it.purchasePrice, it.currencyCode)}
                  </div>
                )}
                <button onClick={() => setMovementsItem(it)} style={smallBtnStyle}>Historique</button>
                <button onClick={() => setAdjustingItem(it)} style={smallBtnStyle}>Ajuster</button>
                <button onClick={() => setRestockingItem(it)} style={{ ...smallBtnStyle, color: "#1f6d75" }}>Réapprovisionner</button>
              </div>
            );
          })}
        </div>
      )}

      {restockingItem && (
        <RestockForm
          item={restockingItem}
          productName={productName(restockingItem)}
          onSaved={(updated) => { applyUpdatedItem(updated); setRestockingItem(null); load(); }}
          onCancel={() => setRestockingItem(null)}
        />
      )}

      {adjustingItem && (
        <AdjustForm
          item={adjustingItem}
          productName={productName(adjustingItem)}
          onSaved={(updated) => { applyUpdatedItem(updated); setAdjustingItem(null); load(); }}
          onCancel={() => setAdjustingItem(null)}
        />
      )}

      {movementsItem && (
        <MovementsPanel
          item={movementsItem}
          productName={productName(movementsItem)}
          onClose={() => setMovementsItem(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Ingredients — SCRUM-291
// ─────────────────────────────────────────────────────────────────────────

function IngredientForm({ ingredient, onSaved, onCancel }) {
  const [name, setName] = React.useState(ingredient?.name || "");
  const [purchaseUnit, setPurchaseUnit] = React.useState(ingredient?.purchaseUnit || "kg");
  const [baseUnit, setBaseUnit] = React.useState(ingredient?.baseUnit || "g");
  const [unitFactor, setUnitFactor] = React.useState(ingredient?.unitFactor ?? "1000");
  const [purchasePrice, setPurchasePrice] = React.useState(ingredient?.purchasePrice ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(ingredient?.currencyCode || "USD");
  const [currentQty, setCurrentQty] = React.useState(ingredient?.currentQty ?? "0");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de l'ingrédient est obligatoire.");
      return;
    }
    const price = purchasePrice === "" ? undefined : Number(purchasePrice);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      setError("Le prix d'achat doit être un nombre positif.");
      return;
    }
    const factor = Number(unitFactor);
    if (!Number.isFinite(factor) || factor <= 0) {
      setError("Le facteur de conversion doit être un nombre positif.");
      return;
    }
    const qty = currentQty === "" ? undefined : Number(currentQty);
    if (qty !== undefined && (!Number.isFinite(qty) || qty < 0)) {
      setError("La quantité en stock doit être un nombre positif ou nul.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        purchaseUnit,
        baseUnit,
        unitFactor: factor,
        purchasePrice: price,
        currencyCode,
        currentQty: qty,
      };
      const saved = ingredient ? await api.updateIngredient(ingredient.id, body) : await api.createIngredient(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {ingredient ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Nom *</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={fieldInputStyle} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Unité d'achat</span>
            <select value={purchaseUnit} onChange={(e) => setPurchaseUnit(e.target.value)} style={fieldInputStyle}>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="piece">pièce</option>
            </select>
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Unité de base</span>
            <select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)} style={fieldInputStyle}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="piece">pièce</option>
            </select>
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Facteur de conversion (achat → base) *</span>
          <input type="number" min="0.0001" step="0.0001" value={unitFactor} onChange={(e) => setUnitFactor(e.target.value)} style={fieldInputStyle} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Prix d'achat</span>
            <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Quantité en stock</span>
          <input type="number" min="0" step="0.001" value={currentQty} onChange={(e) => setCurrentQty(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export const IngredientsScreen = () => {
  const [ingredients, setIngredients] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [editingIngredient, setEditingIngredient] = React.useState(null); // null=ferme, {}=creation, objet=edition

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.listIngredients(search ? { search } : {});
      setIngredients(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => { load(); }, [load]);

  const removeIngredient = async (ing) => {
    if (!window.confirm(`Désactiver l'ingrédient "${ing.name}" ?`)) return;
    try {
      await api.removeIngredient(ing.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ingrédient par nom…"
          style={{ flex: 1, minWidth: 220, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
        />
        <button onClick={() => setEditingIngredient({})} style={primaryBtnStyle}>+ Ingrédient</button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des ingrédients…</CenteredNote>
      ) : ingredients.length === 0 ? (
        <CenteredNote>Aucun ingrédient ne correspond à cette recherche.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {ingredients.map((ing) => (
            <div key={ing.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{ing.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  {Number(ing.currentQty ?? 0)} {ing.baseUnit || ""} en stock · 1 {ing.purchaseUnit || "?"} = {Number(ing.unitFactor ?? 0)} {ing.baseUnit || ""}
                </div>
              </div>
              <div style={{ fontWeight: 700, minWidth: 110, textAlign: "right" }}>
                {ing.purchasePrice != null ? `${formatMoney(ing.purchasePrice, ing.currencyCode)} / ${ing.purchaseUnit || ""}` : "—"}
              </div>
              <button onClick={() => setEditingIngredient(ing)} style={smallBtnStyle}>Modifier</button>
              <button onClick={() => removeIngredient(ing)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
            </div>
          ))}
        </div>
      )}

      {editingIngredient && (
        <IngredientForm
          ingredient={editingIngredient.id ? editingIngredient : null}
          onSaved={() => { setEditingIngredient(null); load(); }}
          onCancel={() => setEditingIngredient(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Depenses — SCRUM-292
// ─────────────────────────────────────────────────────────────────────────

// Meme pattern que CategoryPanel (produits) mais branche sur les endpoints
// /kodatill/expenses/categories (nom + ordre d'affichage, pas d'icone).
function ExpenseCategoryPanel({ categories, onChanged, onClose }) {
  const [name, setName] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState("0");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);

  const resetForm = () => { setName(""); setSortOrder("0"); setEditingId(null); };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name || "");
    setSortOrder(String(c.sortOrder ?? 0));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la catégorie est obligatoire.");
      return;
    }
    const order = Number(sortOrder);
    if (!Number.isInteger(order)) {
      setError("L'ordre doit être un nombre entier.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = { name: name.trim(), sortOrder: order };
      if (editingId) await api.updateExpenseCategory(editingId, body);
      else await api.createExpenseCategory(body);
      resetForm();
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Désactiver la catégorie "${c.name}" ?`)) return;
    try {
      await api.removeExpenseCategory(c.id);
      onChanged();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(420px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>Catégories de dépense</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
          {categories.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>Aucune catégorie.</div>}
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5, padding: "6px 8px", borderRadius: 6, background: "var(--bg-app, #FBF8F2)" }}>
              <span>{c.name}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(c)} style={smallBtnStyle}>Modifier</button>
                <button onClick={() => remove(c)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-1, #E7EBF1)", paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{editingId ? "Modifier la catégorie" : "Nouvelle catégorie"}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} style={{ ...fieldInputStyle, flex: 2 }} />
            <input type="number" step="1" placeholder="Ordre" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ ...fieldInputStyle, flex: 1 }} />
          </div>
          {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={submitting} style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "…" : editingId ? "Mettre à jour" : "Ajouter"}
            </button>
          </div>
        </form>

        <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

function ExpenseForm({ expense, categories, branches, onSaved, onCancel }) {
  const [categoryId, setCategoryId] = React.useState(expense?.categoryId ?? (categories[0]?.id ?? ""));
  const [branchId, setBranchId] = React.useState(expense?.branchId ?? "");
  const [label, setLabel] = React.useState(expense?.label || "");
  const [amount, setAmount] = React.useState(expense?.amount ?? "");
  const [currencyCode, setCurrencyCode] = React.useState(expense?.currencyCode || "USD");
  const [expenseDate, setExpenseDate] = React.useState(expense?.expenseDate ? String(expense.expenseDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [note, setNote] = React.useState(expense?.note || "");
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Le libellé est obligatoire.");
      return;
    }
    if (!categoryId) {
      setError("La catégorie est obligatoire.");
      return;
    }
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      setError("Le montant doit être un nombre positif.");
      return;
    }
    if (!expenseDate) {
      setError("La date est obligatoire.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        categoryId: Number(categoryId),
        label: label.trim(),
        amount: a,
        currencyCode,
        expenseDate,
        note: note.trim() || undefined,
      };
      if (branchId) body.branchId = Number(branchId);
      const saved = expense?.id ? await api.updateExpense(expense.id, body) : await api.createExpense(body);
      onSaved(saved);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(6,32,37,0.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <form onSubmit={submit} style={{
        background: "var(--paper, #fff)", borderRadius: 14, padding: 24, width: "min(440px, 100%)",
        display: "flex", flexDirection: "column", gap: 14, maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>
          {expense?.id ? "Modifier la dépense" : "Nouvelle dépense"}
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Libellé *</span>
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Catégorie *</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={fieldInputStyle}>
            <option value="">— Sélectionner —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        {branches.length > 1 && (
          <label style={fieldLabelStyle}>
            <span style={fieldCaptionStyle}>Succursale (optionnel)</span>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={fieldInputStyle}>
              <option value="">Toutes / non spécifiée</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ ...fieldLabelStyle, flex: 2 }}>
            <span style={fieldCaptionStyle}>Montant *</span>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={fieldInputStyle} />
          </label>
          <label style={{ ...fieldLabelStyle, flex: 1 }}>
            <span style={fieldCaptionStyle}>Devise</span>
            <input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} style={fieldInputStyle} maxLength={3} />
          </label>
        </div>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Date *</span>
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} style={fieldInputStyle} />
        </label>

        <label style={fieldLabelStyle}>
          <span style={fieldCaptionStyle}>Note (optionnel)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={fieldInputStyle} />
        </label>

        {error && <div style={{ color: "var(--oxblood-800, #7a1f2b)", fontSize: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            style={{ flex: 1, background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 8, padding: "12px 16px", fontWeight: 600, cursor: "pointer" }}>
            Annuler
          </button>
          <button type="submit" disabled={submitting}
            style={{ flex: 1, background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 8, padding: "12px 16px", fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function monthRange(date = new Date()) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

export const DepensesScreen = () => {
  const [expenses, setExpenses] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [branches, setBranches] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [branchFilter, setBranchFilter] = React.useState("");
  const [fromFilter, setFromFilter] = React.useState("");
  const [toFilter, setToFilter] = React.useState("");

  const [editingExpense, setEditingExpense] = React.useState(null); // null=ferme, {}=creation, objet=edition
  const [showCategoryPanel, setShowCategoryPanel] = React.useState(false);

  const { from: monthFrom, to: monthTo } = React.useMemo(() => monthRange(), []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (categoryFilter) filters.categoryId = categoryFilter;
      if (branchFilter) filters.branchId = branchFilter;
      if (fromFilter) filters.from = fromFilter;
      if (toFilter) filters.to = toFilter;
      const [list, cats, branchList, monthSummary] = await Promise.all([
        api.listExpenses(filters),
        api.listExpenseCategories(),
        api.listBranches(),
        api.getExpensesSummary({ from: monthFrom, to: monthTo }),
      ]);
      setExpenses(Array.isArray(list) ? list : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setBranches(Array.isArray(branchList) ? branchList : []);
      setSummary(monthSummary);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, branchFilter, fromFilter, toFilter, monthFrom, monthTo]);

  React.useEffect(() => { load(); }, [load]);

  const categoryById = React.useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const branchById = React.useMemo(() => {
    const map = new Map();
    branches.forEach((b) => map.set(b.id, b));
    return map;
  }, [branches]);

  const removeExpense = async (exp) => {
    if (!window.confirm(`Désactiver la dépense "${exp.label}" ?`)) return;
    try {
      await api.removeExpense(exp.id);
      load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <ErrorBanner message={error} onRetry={load} />

      {summary && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {summary.totals.length === 0 ? (
            <KpiCard label="Dépenses du mois" value={formatMoney(0, "")} />
          ) : (
            summary.totals.map((t) => (
              <KpiCard key={t.currencyCode} label="Dépenses du mois" value={formatMoney(t.total, t.currencyCode)} />
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={filterInputStyle}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {branches.length > 1 && (
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={filterInputStyle}>
            <option value="">Toutes les succursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <input type="date" value={fromFilter} onChange={(e) => setFromFilter(e.target.value)} style={filterInputStyle} />
        <span style={{ color: "var(--fg-3, #6b6b6b)", fontSize: 13 }}>à</span>
        <input type="date" value={toFilter} onChange={(e) => setToFilter(e.target.value)} style={filterInputStyle} />
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCategoryPanel(true)} style={secondaryBtnStyle}>Catégories</button>
        <button onClick={() => setEditingExpense({})} style={primaryBtnStyle}>+ Dépense</button>
      </div>

      {loading ? (
        <CenteredNote>Chargement des dépenses…</CenteredNote>
      ) : expenses.length === 0 ? (
        <CenteredNote>Aucune dépense ne correspond à ces filtres.</CenteredNote>
      ) : (
        <div style={{ background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)", borderRadius: 12, overflow: "hidden" }}>
          {expenses.map((exp) => (
            <div key={exp.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--fg-1, #0E2418)" }}>{exp.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3, #6b6b6b)" }}>
                  {String(exp.expenseDate).slice(0, 10)} · {categoryById.get(exp.categoryId)?.name || `Catégorie #${exp.categoryId}`}
                  {exp.branchId ? ` · ${branchById.get(exp.branchId)?.name || `Succursale #${exp.branchId}`}` : ""}
                  {exp.note ? ` · ${exp.note}` : ""}
                </div>
              </div>
              <div style={{ fontWeight: 700, minWidth: 100, textAlign: "right" }}>{formatMoney(exp.amount, exp.currencyCode)}</div>
              <button onClick={() => setEditingExpense(exp)} style={smallBtnStyle}>Modifier</button>
              <button onClick={() => removeExpense(exp)} style={{ ...smallBtnStyle, color: "var(--oxblood-800, #7a1f2b)" }}>Désactiver</button>
            </div>
          ))}
        </div>
      )}

      {editingExpense && (
        <ExpenseForm
          expense={editingExpense.id ? editingExpense : null}
          categories={categories}
          branches={branches}
          onSaved={() => { setEditingExpense(null); load(); }}
          onCancel={() => setEditingExpense(null)}
        />
      )}

      {showCategoryPanel && (
        <ExpenseCategoryPanel
          categories={categories}
          onChanged={load}
          onClose={() => setShowCategoryPanel(false)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Ecran cuisine (SCRUM-298) — affiche sur une TV/tablette fixe en cuisine,
// donc PAS de Shell/sidebar admin (voir app.jsx : rendu hors du wrapper
// authentifie habituel), plein ecran, police large et contrastes forts pour
// une lecture a distance.
//
// Choix realtime vs polling (documente pour la revue) : pas de branchement
// sur backend2/src/realtime (RealtimeDataPublisherService) pour cette phase.
// Ce module publie des evenements types (DataUpdateEntity fixe dans
// data-update-rules.ts, aucune entree "kodatill" existante) avec regles
// (module/tags/pages/dataLoaders) validees par un script de contrat
// (scripts/check-data-update-rules.mjs) : l'integrer proprement demanderait
// d'etendre ce contrat partage et d'ajouter un dataLoader frontend dedie,
// une portee plus large que ce ticket. Polling 5s = compromis simple et
// suffisant pour un ecran cuisine (latence de quelques secondes acceptable).
// ─────────────────────────────────────────────────────────────────────────
const KITCHEN_BOARD_POLL_MS = 5000;
const KITCHEN_CHANNEL_LABELS = { pos: "Caisse", qr: "QR Table", mobile: "Mobile", kitchen: "Cuisine" };
const KITCHEN_LINE_STATUS_LABELS = { pending: "En attente", preparing: "En préparation", ready: "Prête", served: "Servie" };
const KITCHEN_LINE_NEXT_STATUS = { pending: "preparing", preparing: "ready", ready: "served" };
const KITCHEN_LINE_STATUS_COLORS = { pending: "#8a8a8a", preparing: "#b8860b", ready: "#2f7d4f", served: "#123F46" };

function KitchenLineStatusBadge({ status }) {
  const color = KITCHEN_LINE_STATUS_COLORS[status] || "#8a8a8a";
  return (
    <span style={{
      display: "inline-block", padding: "4px 14px", borderRadius: 14, fontSize: 15,
      fontWeight: 700, color: "#FBF8F2", background: color, whiteSpace: "nowrap",
    }}>
      {KITCHEN_LINE_STATUS_LABELS[status] || status}
    </span>
  );
}

function KitchenOrderCard({ order, onAdvanceLine, advancingLineId }) {
  return (
    <div style={{
      background: "var(--paper, #fff)", border: "2px solid var(--border-1, #E7EBF1)",
      borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "var(--fg-1, #0E2418)" }}>
          {order.publicRef || `#${order.orderNumber}`}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-3, #6b6b6b)" }}>
          {KITCHEN_CHANNEL_LABELS[order.channel] || order.channel}
          {order.tableId ? ` · Table ${order.tableId}` : ""}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-3, #6b6b6b)" }}>{formatTime(order.createdAt)}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {order.lines.map((line) => {
          const next = KITCHEN_LINE_NEXT_STATUS[line.kitchenStatus];
          const isAdvancing = advancingLineId === line.id;
          return (
            <div key={line.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "10px 12px", borderRadius: 10, background: "var(--bg-app, #FBF8F2)", flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-1, #0E2418)", flex: 1, minWidth: 160 }}>
                {Number(line.qty) > 1 ? `${Number(line.qty)}× ` : ""}{line.name}
              </span>
              <KitchenLineStatusBadge status={line.kitchenStatus} />
              {next && (
                <button
                  onClick={() => onAdvanceLine(line.id, next)}
                  disabled={isAdvancing}
                  style={{
                    background: "#1f6d75", color: "#FBF8F2", border: 0, borderRadius: 10,
                    padding: "10px 18px", fontWeight: 700, fontSize: 15,
                    cursor: isAdvancing ? "default" : "pointer", opacity: isAdvancing ? 0.6 : 1,
                  }}
                >
                  {isAdvancing ? "…" : `→ ${KITCHEN_LINE_STATUS_LABELS[next]}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const KitchenScreen = () => {
  const [orders, setOrders] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [advancingLineId, setAdvancingLineId] = React.useState(null);

  const load = React.useCallback(async () => {
    try {
      const board = await api.getKitchenBoard();
      setOrders(Array.isArray(board) ? board : []);
      setError(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, KITCHEN_BOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const advanceLine = React.useCallback(async (lineId, nextStatus) => {
    setAdvancingLineId(lineId);
    try {
      await api.updateKitchenLineStatus(lineId, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setAdvancingLineId(null);
    }
  }, [load]);

  const preparingOrders = orders.filter((o) =>
    o.lines.some((l) => l.kitchenStatus === "pending" || l.kitchenStatus === "preparing"));
  const readyOrders = orders.filter((o) =>
    o.lines.some((l) => l.kitchenStatus === "ready") && !preparingOrders.includes(o));

  return (
    <div style={{
      height: "100vh", width: "100vw", overflow: "auto", boxSizing: "border-box",
      background: "var(--bg-app, #FBF8F2)", padding: 24, display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "var(--fg-1, #0E2418)" }}>Écran cuisine</h1>
        {loading && <span style={{ fontSize: 16, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</span>}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {!loading && orders.length === 0 && !error && (
        <CenteredNote>
          <span style={{ fontSize: 20 }}>Aucune commande en cuisine pour le moment.</span>
        </CenteredNote>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flex: 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#b8860b" }}>En préparation</h2>
          {preparingOrders.map((o) => (
            <KitchenOrderCard key={o.id} order={o} onAdvanceLine={advanceLine} advancingLineId={advancingLineId} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#2f7d4f" }}>Prêtes</h2>
          {readyOrders.map((o) => (
            <KitchenOrderCard key={o.id} order={o} onAdvanceLine={advanceLine} advancingLineId={advancingLineId} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Scanner mobile (SCRUM-299) ──────────────────────────────────────────
// Etape 1 (non jumele) : saisie du code a 6 chiffres genere par la caisse
// principale (POST /registers/:id/pairing-code) -> POST /registers/pair.
// Etape 2 (jumele) : reutilise EXACTEMENT le meme pattern de champ
// scan/Enter que CaisseScreen#onSearchKeyDown / StockScreen#onSearchKeyDown
// (GET /products/barcode/:code sur Enter).
//
// LIMITATION DOCUMENTEE (hors scope de ce ticket) : la liste de produits
// scannes ci-dessous est purement LOCALE a cet ecran — elle n'est PAS
// synchronisee en temps reel avec le ticket de vente de la caisse jumelee.
// Le jumelage sert uniquement a memoriser a quelle caisse/succursale ce
// scanner est rattache (id/name/branchId), pas a partager un panier. Une
// synchronisation temps reel du ticket serait une fonctionnalite bien plus
// complexe (etat partage, push/poll, gestion de conflits) a traiter dans un
// futur ticket dedie.
export const ScanScreen = () => {
  const [pairedRegister, setPairedRegister] = React.useState(null);
  const [pairingCode, setPairingCode] = React.useState("");
  const [pairError, setPairError] = React.useState(null);
  const [pairing, setPairing] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [scanMessage, setScanMessage] = React.useState(null);
  const [scanned, setScanned] = React.useState([]);

  const onJoin = async (e) => {
    e.preventDefault();
    if (!pairingCode.trim()) return;
    setPairing(true);
    setPairError(null);
    try {
      const register = await api.pairWithCode(pairingCode.trim());
      setPairedRegister(register);
      setPairingCode("");
    } catch (err) {
      setPairError("Code invalide ou expiré. Demandez un nouveau code sur la caisse principale.");
    } finally {
      setPairing(false);
    }
  };

  const onUnpair = () => {
    setPairedRegister(null);
    setScanned([]);
    setScanMessage(null);
  };

  // Meme pattern que CaisseScreen#onSearchKeyDown : Enter tente un lookup
  // code-barres exact cote serveur (comportement d'une douchette).
  const onSearchKeyDown = async (e) => {
    if (e.key !== "Enter" || !search.trim()) return;
    setScanMessage(null);
    try {
      const product = await api.getProductByBarcode(search.trim());
      if (product) {
        setScanned((list) => [{ ...product, scannedAt: new Date().toISOString() }, ...list]);
        setScanMessage(`Ajouté : ${product.name}`);
        setSearch("");
      }
    } catch (err) {
      setScanMessage("Aucun produit pour ce code-barres.");
    }
  };

  if (!pairedRegister) {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <CenteredNote>
          <form onSubmit={onJoin} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-1, #0E2418)" }}>
              Rejoindre une caisse
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-3, #6b6b6b)" }}>
              Saisissez le code à 6 chiffres affiché sur la caisse principale.
            </div>
            <input
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              maxLength={6}
              style={{ ...fieldInputStyle, fontSize: 22, textAlign: "center", letterSpacing: 4 }}
            />
            {pairError && <div style={{ fontSize: 12, color: "var(--oxblood-800, #7a1f2b)" }}>{pairError}</div>}
            <button
              type="submit"
              disabled={pairing || pairingCode.trim().length !== 6}
              style={{
                background: "var(--accent-1, #1f6d75)", color: "#fff", border: 0, borderRadius: 8,
                padding: "12px 16px", fontWeight: 700, fontSize: 14,
                cursor: pairing ? "default" : "pointer", opacity: pairing ? 0.7 : 1,
              }}
            >
              {pairing ? "Vérification…" : "Rejoindre"}
            </button>
          </form>
        </CenteredNote>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        background: "rgba(31,109,117,0.10)", border: "1px solid rgba(31,109,117,0.35)",
        borderRadius: 10, padding: "10px 16px", fontSize: 13,
      }}>
        <span>
          Jumelé à : <strong>{pairedRegister.name}</strong>
        </span>
        <button onClick={onUnpair} style={{
          background: "transparent", border: "1px solid var(--border-2, #d8c8a8)", borderRadius: 6,
          padding: "6px 12px", fontSize: 12, cursor: "pointer",
        }}>
          Se dé-jumeler
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={onSearchKeyDown}
        autoFocus
        placeholder="Scanner un code-barres…"
        style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14 }}
      />
      {scanMessage && <div style={{ fontSize: 12, color: "#1f6d75" }}>{scanMessage}</div>}

      <div style={{ fontSize: 12, color: "var(--fg-3, #6b6b6b)" }}>
        Liste locale à cet appareil — non synchronisée avec le ticket de la caisse jumelée.
      </div>

      {scanned.length === 0 ? (
        <CenteredNote>Aucun produit scanné pour l'instant.</CenteredNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {scanned.map((p, i) => (
            <div key={`${p.id}-${p.scannedAt}-${i}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 14,
            }}>
              <span>{p.name}</span>
              <span style={{ fontWeight: 700 }}>{formatMoney(p.salePrice, p.currencyCode)}</span>
            </div>
          ))}
          <button onClick={() => setScanned([])} style={{
            alignSelf: "flex-start", background: "transparent", border: "1px solid var(--border-2, #d8c8a8)",
            borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", marginTop: 4,
          }}>
            Vider la liste
          </button>
        </div>
      )}
    </div>
  );
};
