import { ChevronLeft, CheckCircle, XCircle, Clock, Paperclip, Send } from "lucide-react";
import { useApi, fmtDate, fmtMoney, getCategoryMeta, STATUS_LABELS, useCurrency } from "../data.js";
import { api } from "../api.js";

export function Detail({ go, ticketId, onToast }) {
  const { data, loading, error, reload } = useApi(() => api.getInstance(ticketId), [ticketId]);
  const currency = useCurrency();

  if (!ticketId) { go("liste"); return null; }
  if (loading) return <div className="loading"><Clock size={18} />Chargement…</div>;
  if (error) return <div className="api-error">{error}</div>;

  const t = data;
  if (!t) return null;

  const cat = getCategoryMeta(t.entityType);
  const st = STATUS_LABELS[t.status] || STATUS_LABELS.pending;
  const steps = Array.isArray(t.workflow?.steps) ? t.workflow.steps : [];
  const approvals = Array.isArray(t.approvals) ? t.approvals : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-500)", marginBottom: 14, cursor: "pointer" }}
        onClick={() => go("liste")}>
        <ChevronLeft size={15} /> Mes tickets / <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>TCK-{String(t.id).padStart(4, "0")}</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            TCK-{String(t.id).padStart(4, "0")}
          </h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{t.label || "Sans titre"}</p>
        </div>
        <span className={`chip chip-${st.color}`} style={{ fontSize: 13, padding: "5px 12px" }}>
          {st.label}{t.currentStep != null && ` — étape ${t.currentStep + 1}/${steps.length || "?"}`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Circuit */}
          {steps.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>Circuit d'approbation</div>
              <div className="steps">
                {steps.map((step, i) => {
                  const approval = approvals.find((a) => a.step === i);
                  const isDone = approval?.decision === "approved";
                  const isRejected = approval?.decision === "rejected";
                  const isCurrent = t.currentStep === i && t.status === "pending";
                  const cls = isDone ? "done" : isRejected ? "done" : isCurrent ? "current" : "pending";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
                      <div className="step">
                        <div className={`step-dot ${cls}`}>
                          {isDone ? <CheckCircle size={14} /> : isRejected ? <XCircle size={14} /> : i + 1}
                        </div>
                        <div className="step-label">{step.label || step.role || `Étape ${i + 1}`}</div>
                        {approval?.comment && (
                          <div style={{ fontSize: 11, color: "var(--ink-500)", maxWidth: 90, textAlign: "center", marginTop: 2 }}>
                            « {approval.comment} »
                          </div>
                        )}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`step-connector${isDone ? " done" : ""}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          {t.description && (
            <div className="card" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Description</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--ink-800)", whiteSpace: "pre-wrap" }}>{t.description}</p>
              {t.attachmentUrl && (
                <a href={t.attachmentUrl} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--iris-600)", fontWeight: 600, marginTop: 12, textDecoration: "none" }}>
                  <Paperclip size={14} /> Voir la pièce jointe
                </a>
              )}
            </div>
          )}

          {/* Historique */}
          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Historique</div>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot" />
                <div style={{ fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{t.submittedByName || "Demandeur"}</span>
                  {" "}<span className="muted">a soumis le ticket — {fmtDate(t.createdAt)}</span>
                </div>
              </div>
              {approvals.map((a, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot${a.decision === "approved" ? " done" : a.decision === "rejected" ? " rejected" : ""}`} />
                  <div style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{a.approverName || `Approbateur ${i + 1}`}</span>
                    {" "}<span className="muted">
                      {a.decision === "approved" ? "a approuvé" : a.decision === "rejected" ? "a rejeté" : "a décidé"}{" "}
                      l'étape « {steps[a.step]?.label || `étape ${a.step + 1}`} » — {fmtDate(a.createdAt)}
                    </span>
                    {a.comment && <div style={{ marginTop: 2, color: "var(--ink-600)", fontStyle: "italic" }}>« {a.comment} »</div>}
                  </div>
                </div>
              ))}
              {t.status === "pending" && (
                <div className="timeline-item">
                  <div className="timeline-dot" style={{ background: "var(--amber)", boxShadow: "0 0 0 4px #fef3c7" }} />
                  <div className="muted" style={{ fontSize: 13 }}>En attente de décision…</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau détails */}
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Détails</div>
          <Row label="Catégorie" value={<span className={`chip chip-${cat.color}`}>{cat.label}</span>} />
          {t.submittedByName && <Row label="Demandeur" value={t.submittedByName} />}
          <Row label="Date" value={fmtDate(t.createdAt)} />
          {t.amount && <Row label="Montant" value={fmtMoney(t.amount, currency)} bold />}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
            <Row label="Écriture ledger" value={t.status === "approved" ? "Comptabilisée" : "— (après approbation)"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 10 }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, color: "var(--ink-900)" }}>{value}</span>
    </div>
  );
}
