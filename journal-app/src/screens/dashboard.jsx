import { useState, useEffect } from "react";
import { Activity, CheckSquare, Pin, AlertTriangle, TrendingUp, Clock, Plus } from "lucide-react";
import { api } from "../api.js";
import { useRealtimeReload } from "../realtime.js";
import { t } from "../i18n.js";
import { EventModal } from "./activite.jsx";
import { EVENT_COLORS, EVENT_ICONS, formatRelative } from "./shared.jsx";

export function Dashboard({ go }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    api.dashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useRealtimeReload(load, ["journal-events", "journal-tasks"]);

  if (loading) return <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner" /></div>;

  const stats = data?.stats || { totalEvents: 0, pinnedEvents: 0, openTasks: 0, urgentEvents: 0 };
  const recentEvents = data?.recentEvents || [];
  const upcomingTasks = data?.upcomingTasks || [];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">{t("Tableau de bord")}</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>
            Vue d&apos;ensemble de l&apos;activite de l&apos;entreprise
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouvel evenement
        </button>
      </div>

      {/* KPIs */}
      <div className="grid g4" style={{ marginBottom:20 }}>
        <div className="card metric">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="kpi-label">Evenements ce mois</span>
            <div style={{ width:36, height:36, borderRadius:8, background:"var(--iris-50)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Activity size={18} color="var(--iris-600)" />
            </div>
          </div>
          <div className="kpi-value">{stats.totalEvents}</div>
          <div className="kpi-sub">Toutes sources confondues</div>
        </div>

        <div className="card metric">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="kpi-label">Taches ouvertes</span>
            <div style={{ width:36, height:36, borderRadius:8, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <CheckSquare size={18} color="#b45309" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: stats.openTasks > 0 ? "#b45309" : "inherit" }}>{stats.openTasks}</div>
          <div className="kpi-sub">A traiter</div>
        </div>

        <div className="card metric">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="kpi-label">Epingles</span>
            <div style={{ width:36, height:36, borderRadius:8, background:"#fffbeb", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Pin size={18} color="var(--amber)" />
            </div>
          </div>
          <div className="kpi-value">{stats.pinnedEvents}</div>
          <div className="kpi-sub">References importantes</div>
        </div>

        <div className="card metric">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span className="kpi-label">Urgents</span>
            <div style={{ width:36, height:36, borderRadius:8, background:"#ffe4e6", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <AlertTriangle size={18} color="var(--rose)" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: stats.urgentEvents > 0 ? "var(--rose)" : "inherit" }}>{stats.urgentEvents}</div>
          <div className="kpi-sub">Importance haute</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom:20 }}>
        {/* Activité récente */}
        <div className="card" style={{ padding:16 }}>
          <div className="page-head" style={{ marginBottom:12 }}>
            <h3 style={{ margin:0, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>
              <Activity size={16} style={{ verticalAlign:"middle", marginRight:6, color:"var(--iris-500)" }} />
              Activite recente
            </h3>
            <button className="btn" style={{ height:30, fontSize:12, padding:"0 10px" }} onClick={() => go("activite")}>
              Voir tout
            </button>
          </div>
          {recentEvents.length === 0 ? (
            <EmptyState icon={<Activity size={28} color="var(--ink-300)" />} label="Aucun evenement recent" />
          ) : (
            <div className="journal-feed">
              {recentEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} compact />
              ))}
            </div>
          )}
        </div>

        {/* Tâches à venir */}
        <div className="card" style={{ padding:16 }}>
          <div className="page-head" style={{ marginBottom:12 }}>
            <h3 style={{ margin:0, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>
              <Clock size={16} style={{ verticalAlign:"middle", marginRight:6, color:"var(--amber)" }} />
              Prochaines taches
            </h3>
            <button className="btn" style={{ height:30, fontSize:12, padding:"0 10px" }} onClick={() => go("taches")}>
              Voir tout
            </button>
          </div>
          {upcomingTasks.length === 0 ? (
            <EmptyState icon={<CheckSquare size={28} color="var(--ink-300)" />} label="Aucune tache en cours" />
          ) : (
            <div className="task-list">
              {upcomingTasks.map((task) => (
                <TaskRow key={task.id} task={task} compact />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && <EventModal onClose={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

export function EventRow({ event, compact }) {
  const color = EVENT_COLORS[event.eventType] || "var(--iris-500)";
  const Icon = EVENT_ICONS[event.eventType];
  return (
    <div className="journal-event-row">
      <div className="journal-event-icon" style={{ background: color }}>
        {Icon && <Icon size={16} />}
      </div>
      <div className="journal-event-body">
        <div className="journal-event-title">{event.title}</div>
        <div className="journal-event-meta">
          <span className={`chip chip-${impChip(event.importance)}`}>{event.importance || "basse"}</span>
          <span>{event.sourceModule || "—"}</span>
          <span>{formatRelative(event.eventDate)}</span>
        </div>
        {!compact && event.description && (
          <div className="journal-event-desc">{event.description}</div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div className="task-row" style={{ opacity: task.isDone ? 0.55 : 1 }}>
      <div className={`task-check ${task.isDone ? "checked" : ""}`} style={{ cursor:"default" }}>
        {task.isDone && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>}
      </div>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.dueDate && (
          <div className="task-meta">
            <span>Echeance: {new Date(task.dueDate).toLocaleDateString("fr-FR")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div style={{ padding:"28px 16px", textAlign:"center", color:"var(--ink-400)" }}>
      <div style={{ marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{label}</div>
    </div>
  );
}

function impChip(imp) {
  if (imp === "haute") return "rose";
  if (imp === "moyenne") return "amber";
  return "emerald";
}
