import { Clock, CheckCircle, XCircle, Wallet, Plus, ChevronRight } from "lucide-react";
import { useApi, fmtMoney, fmtDate, getCategoryMeta, STATUS_LABELS, useCurrency } from "../data.js";
import { api } from "../api.js";

function loadDashboard() {
  return Promise.all([
    api.listInstances().catch(() => []),
    api.listInstances("pending").catch(() => []),
  ]).then(([all, pending]) => ({ all, pending }));
}

export function Dashboard({ go }) {
  const { data, loading, error } = useApi(loadDashboard, []);
  const currency = useCurrency();

  if (loading) return <div className="loading"><Clock size={18} />Chargement…</div>;
  if (error) return <div className="api-error">{error}</div>;

  const all = Array.isArray(data?.all) ? data.all : [];
  const pending = Array.isArray(data?.pending) ? data.pending : [];
  const approved = all.filter((t) => t.status === "approved");
  const rejected = all.filter((t) => t.status === "rejected");
  const pendingAmount = pending.reduce((s, t) => s + Number(t.amount || 0), 0);
  const recent = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tableau de bord</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Vue d'ensemble des tickets internes</p>
        </div>
        <button className="btn btn-primary" onClick={() => go("nouveau")}>
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon amber"><Clock size={18} /></div>
          <div className="metric-label">En attente</div>
          <div className="metric-value">{pending.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon emerald"><CheckCircle size={18} /></div>
          <div className="metric-label">Approuvés (total)</div>
          <div className="metric-value">{approved.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon rose"><XCircle size={18} /></div>
          <div className="metric-label">Rejetés</div>
          <div className="metric-value">{rejected.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon amber"><Wallet size={18} /></div>
          <div className="metric-label">Montant en attente</div>
          <div className="metric-value" style={{ fontSize: 16 }}>{fmtMoney(pendingAmount, currency)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
            <span className="eyebrow">Activité récente</span>
            <button className="btn" style={{ height: 32, fontSize: 12 }} onClick={() => go("liste")}>Tout voir <ChevronRight size={14} /></button>
          </div>
          {recent.length === 0 ? (
            <div className="empty">Aucun ticket pour le moment.</div>
          ) : (
            <div>
              {recent.map((t) => {
                const cat = getCategoryMeta(t.entityType);
                const st = STATUS_LABELS[t.status] || STATUS_LABELS.pending;
                return (
                  <div key={t.id} onClick={() => go("detail", t.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--ink-100)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--ink-50)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}>
                    <div className="metric-icon" style={{ width: 36, height: 36, borderRadius: 10, margin: 0 }}>
                      <span style={{ fontSize: 16 }}>
                        {cat.key === "payment" ? "💳" : cat.key === "purchase" ? "🛍️" : cat.key === "leave" ? "📅" : "📋"}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.label || `#${t.id}`}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>{fmtDate(t.createdAt)}</div>
                    </div>
                    <span className={`chip chip-${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Actions rapides</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={() => go("nouveau")}>
                <Plus size={15} /> Nouveau ticket
              </button>
              <button className="btn" style={{ justifyContent: "center" }} onClick={() => go("approbation")}>
                <Clock size={15} /> À approuver {pending.length > 0 && <span className="nav-badge" style={{ marginLeft: 4 }}>{pending.length}</span>}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Par catégorie</div>
            {["payment","purchase","leave","other"].map((key) => {
              const count = all.filter((t) => t.entityType === key).length;
              const cat = getCategoryMeta(key);
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>
                    {key === "payment" ? "💳" : key === "purchase" ? "🛍️" : key === "leave" ? "📅" : "📋"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{cat.label}</span>
                      <span className="muted">{count}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--ink-100)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "var(--iris-500)", width: all.length ? `${(count / all.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
