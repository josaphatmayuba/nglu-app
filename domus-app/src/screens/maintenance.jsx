import { useMemo, useState } from "react";
import { Wrench, Plus, CalendarDays, User, AlertTriangle, CheckCircle2, Clock3, Loader, Search, FolderKanban, ArrowRight, List, Columns3 } from "lucide-react";
import { useDateRange } from "../dateRange.jsx";
import { money, useApi } from "../data.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";

// Statuts réels du backend (real_estate_maintenance_requests.status).
const COLUMNS = [
  { key: "open", label: "Ouvert", icon: Clock3, accent: "#dc2626" },
  { key: "in_progress", label: "En cours", icon: Loader, accent: "#f59e0b" },
  { key: "resolved", label: "Résolu", icon: CheckCircle2, accent: "#059669" },
];
const STATUS_LABEL = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Clôturé" };
const NEXT_STATUS = { open: "in_progress", in_progress: "resolved" };
const PRIORITY = {
  high: { label: "Urgent", chip: "chip-rose", icon: AlertTriangle },
  medium: { label: "Moyen", chip: "chip-amber", icon: Clock3 },
  low: { label: "Bas", chip: "chip-iris", icon: CalendarDays },
};

const assigneeName = (t) =>
  [t.assigneeFirstName, t.assigneeLastName].filter(Boolean).join(" ") || t.assigneeUsername || null;

export function Maintenance() {
  const dateRange = useDateRange();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("kanban");
  const [busyId, setBusyId] = useState(null);
  const { data, loading, error, reload } = useApi(() => api.maintenance(), []);

  const tickets = useMemo(() => (Array.isArray(data) ? data : (data?.data || [])), [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (!q) return true;
      return [t.title, t.propertyName, t.unitName, assigneeName(t)].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [tickets, query]);

  const openCount = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const urgentCount = tickets.filter((t) => t.priority === "high").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const advance = async (t) => {
    const next = NEXT_STATUS[t.status];
    if (!next) return;
    setBusyId(t.id);
    try { await api.updateMaintenance(t.id, { status: next }); await reload(); }
    finally { setBusyId(null); }
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} onRetry={reload} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>Maintenance</h1>
          <p>Tickets de travaux — chaque chantier est un projet comptable</p>
        </div>
        <div className="immo-header-actions">
          <label className="immo-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticket, bien, locataire..." />
          </label>
          <button className={`immo-btn ${view === "kanban" ? "primary" : ""}`} onClick={() => setView("kanban")}><Columns3 size={16} /> Kanban</button>
          <button className={`immo-btn ${view === "list" ? "primary" : ""}`} onClick={() => setView("list")}><List size={16} /> Liste</button>
        </div>
      </div>

      <div className="immo-metrics-grid">
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-amber"><Wrench size={20} /></div></div>
          <div className="immo-metric-label">Tickets ouverts</div><div className="immo-metric-value">{openCount}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-red"><AlertTriangle size={20} /></div></div>
          <div className="immo-metric-label">Urgents</div><div className="immo-metric-value" style={{ color: "#dc2626" }}>{urgentCount}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-brand"><Loader size={20} /></div></div>
          <div className="immo-metric-label">En cours</div><div className="immo-metric-value">{inProgress}</div>
        </div>
        <div className="immo-metric-card">
          <div className="immo-metric-head"><div className="immo-metric-icon immo-tone-green"><CheckCircle2 size={20} /></div></div>
          <div className="immo-metric-label">Résolus</div><div className="immo-metric-value" style={{ color: "#059669" }}>{resolvedCount}</div>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="maintenance-kanban" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, alignItems: "start" }}>
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => t.status === col.key);
            const Icon = col.icon;
            return (
              <section className="card board-col" key={col.key} style={{ padding: 0 }}>
                <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: `3px solid ${col.accent}`, borderRadius: "10px 10px 0 0" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon size={15} style={{ color: col.accent }} /> {col.label}</span>
                  <span className="chip chip-ink">{items.length}</span>
                </div>
                <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {items.map((t) => <TicketCard key={t.id} t={t} busy={busyId === t.id} onAdvance={advance} />)}
                  {items.length === 0 && <div className="muted" style={{ fontSize: 13, padding: "12px 0" }}>—</div>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ width: "100%", minWidth: 720 }}>
            <thead><tr><th>Ticket</th><th>Bien</th><th>Priorité</th><th>Statut</th><th>Assigné</th><th>Coût estimé</th><th>Projet</th></tr></thead>
            <tbody>
              {filtered.map((t) => {
                const p = PRIORITY[t.priority] || PRIORITY.medium;
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.title}</td>
                    <td>{t.propertyName}{t.unitName ? ` · ${t.unitName}` : ""}</td>
                    <td><span className={`chip ${p.chip}`}>{p.label}</span></td>
                    <td>{STATUS_LABEL[t.status] || t.status}</td>
                    <td>{assigneeName(t) || "—"}</td>
                    <td>{money(Number(t.estimatedCost || 0))}</td>
                    <td>{t.projectId ? <span className="chip chip-iris"><FolderKanban size={12} /> MNT-{t.id}</span> : "—"}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="muted">Aucun ticket.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TicketCard({ t, busy, onAdvance }) {
  const p = PRIORITY[t.priority] || PRIORITY.medium;
  const PIcon = p.icon;
  const next = NEXT_STATUS[t.status];
  const assignee = assigneeName(t);
  return (
    <article className="ticket-card" style={{ border: "1px solid var(--domus-border, #e5e2da)", borderRadius: 10, padding: 12 }}>
      <div className="ticket-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span className={`chip ${p.chip}`}><PIcon size={12} /> {p.label}</span>
        {t.projectId && <span className="chip chip-iris" title="Chantier = projet comptable"><FolderKanban size={11} /> MNT-{t.id}</span>}
      </div>
      <h3 style={{ fontSize: 14, margin: "2px 0 4px" }}>{t.title}</h3>
      <p style={{ fontSize: 12.5, color: "var(--domus-muted, #777)", margin: 0 }}>{t.propertyName}{t.unitName ? ` · ${t.unitName}` : ""}</p>
      <div className="ticket-meta" style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: "var(--domus-muted, #777)", marginTop: 8 }}>
        {assignee && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><User size={13} /> {assignee}</span>}
        {Number(t.estimatedCost) > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Wrench size={13} /> {money(Number(t.estimatedCost))}</span>}
        {t.scheduledDate && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><CalendarDays size={13} /> {String(t.scheduledDate).slice(0, 10)}</span>}
      </div>
      {next && (
        <button className="immo-btn" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} disabled={busy} onClick={() => onAdvance(t)}>
          {busy ? "..." : <>Passer à « {STATUS_LABEL[next]} » <ArrowRight size={14} /></>}
        </button>
      )}
    </article>
  );
}
