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

  const [ticket, setTicket] = React.useState([]); // { key, productId, name, qty, unitPrice, currencyCode }
  const [checkoutOrder, setCheckoutOrder] = React.useState(null); // commande creee cote serveur, en attente de paiement
  const [checkoutError, setCheckoutError] = React.useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState(null);

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

  const addToTicket = (product) => {
    setTicket((lines) => {
      const idx = lines.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...lines];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...lines, {
        key: product.id,
        productId: product.id,
        name: product.name,
        qty: 1,
        unitPrice: Number(product.salePrice),
        currencyCode: product.currencyCode,
      }];
    });
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
              <button key={p.id} onClick={() => addToTicket(p)}
                style={{
                  textAlign: "left", cursor: "pointer", border: "1px solid var(--border-1, #E7EBF1)",
                  borderRadius: 12, padding: 14, background: "var(--paper, #fff)", display: "flex",
                  flexDirection: "column", gap: 8, minHeight: 90,
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
    </div>
  );
};

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
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [ordersList, currentSession] = await Promise.all([
        api.listOrders({ from: today, to: today }),
        api.getCurrentCashSession().catch((err) => {
          if (/404/.test(err.message || "")) return null;
          throw err;
        }),
      ]);
      setOrders(Array.isArray(ordersList) ? ordersList : []);
      setSession(currentSession);
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
  const [error, setError] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

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
      };
      const saved = product ? await api.updateProduct(product.id, body) : await api.createProduct(body);
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
const filterInputStyle = { padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-1, #E7EBF1)", fontSize: 13.5 };
