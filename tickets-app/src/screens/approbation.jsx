import { useState } from "react";
import { CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { useApi, fmtDate, fmtMoney, getCategoryMeta, useCurrency } from "../data.js";
import { api } from "../api.js";

export function Approbation({ go, onToast }) {
  const { data, loading, error, reload } = useApi(() => api.listInstances("pending"), []);
  const [deciding, setDeciding] = useState(null); // id en cours de décision
  const [comment, setComment] = useState("");
  const [commentFor, setCommentFor] = useState(null);
  const currency = useCurrency();

  const pending = Array.isArray(data) ? data : [];

  const decide = async (id, decision) => {
    setDeciding(id);
    try {
      if (decision === "approved") {
        await api.approve(id, comment);
        onToast(`TCK-${String(id).padStart(4,"0")} approuvé`);
      } else {
        await api.reject(id, comment);
        onToast(`TCK-${String(id).padStart(4,"0")} rejeté`);
      }
      setComment("");
      setCommentFor(null);
      reload();
    } catch (err) {
      onToast(`Erreur : ${err.message}`);
    } finally {
      setDeciding(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>À approuver</h1>
        <p className="muted" style={{ margin: "4px 0 0" }}>Tickets en attente de votre décision à l'étape courante</p>
      </div>

      {loading && <div className="loading"><Clock size={18} />Chargement…</div>}
      {error && <div className="api-error">{error}</div>}

      {!loading && !error && pending.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><CheckCircle size={24} color="var(--emerald)" /></div>
          <div style={{ fontWeight: 600, color: "var(--ink-700)" }}>Aucun ticket en attente</div>
          <div className="muted">Votre file d'approbation est vide.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((t) => {
          const cat = getCategoryMeta(t.entityType);
          const isExpanded = commentFor === t.id;
          return (
            <div key={t.id} className="approval-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => go("detail", t.id)}>
                <div className={`approval-card-icon metric-icon ${cat.color}`} style={{ width: 44, height: 44 }}>
                  <span style={{ fontSize: 20 }}>
                    {cat.key === "payment" ? "💳" : cat.key === "purchase" ? "🛍️" : cat.key === "leave" ? "📅" : "📋"}
                  </span>
                </div>
                <div className="approval-card-body">
                  <div className="approval-card-title">
                    TCK-{String(t.id).padStart(4, "0")} · {t.label || "Sans titre"}
                  </div>
                  <div className="approval-card-sub">
                    {t.submittedByName ? `Soumis par ${t.submittedByName} · ` : ""}{fmtDate(t.createdAt)}
                    {t.currentStep != null && (() => {
                      const steps = Array.isArray(t.workflow?.steps) ? t.workflow.steps : [];
                      const stepLabel = steps[t.currentStep]?.label || steps[t.currentStep]?.role || null;
                      return ` · Étape ${t.currentStep + 1}${steps.length ? `/${steps.length}` : ""}${stepLabel ? ` — ${stepLabel}` : ""}`;
                    })()}
                  </div>
                </div>
                {t.amount && (
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", color: "var(--ink-900)" }}>
                    {fmtMoney(t.amount, currency)}
                  </div>
                )}
              </div>

              {isExpanded && (
                <div style={{ paddingLeft: 58 }}>
                  <textarea className="input" style={{ height: 72, marginBottom: 8 }}
                    placeholder="Commentaire (optionnel)…"
                    value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingLeft: 58 }}>
                <button className="btn" style={{ height: 34, fontSize: 12, gap: 6 }}
                  onClick={() => setCommentFor(isExpanded ? null : t.id)}>
                  <MessageSquare size={14} /> {isExpanded ? "Annuler" : "Commenter"}
                </button>
                <button className="btn btn-danger" style={{ height: 34, fontSize: 12 }}
                  disabled={deciding === t.id}
                  onClick={() => decide(t.id, "rejected")}>
                  <XCircle size={14} /> Rejeter
                </button>
                <button className="btn btn-primary" style={{ height: 34, fontSize: 12 }}
                  disabled={deciding === t.id}
                  onClick={() => decide(t.id, "approved")}>
                  <CheckCircle size={14} /> {deciding === t.id ? "…" : "Approuver"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
