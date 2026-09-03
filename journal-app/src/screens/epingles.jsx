import { useState, useEffect } from "react";
import { Pin, PinOff, Edit2 } from "lucide-react";
import { api } from "../api.js";
import { useRealtimeReload } from "../realtime.js";
import { t } from "../i18n.js";
import { EVENT_COLORS, EVENT_ICONS, formatDate, impChipClass } from "./shared.jsx";
import { EventModal } from "./activite.jsx";

export function Epingles() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editEvent, setEditEvent] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    api.events({ isPinned: true })
      .then((d) => setEvents(Array.isArray(d) ? d : (d?.data || [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useRealtimeReload(load, ["journal-events"]);

  const unpin = async (ev) => {
    try { await api.unpinEvent(ev.id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">{t("Épinglés")}</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>References et documents importants</p>
        </div>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}

      {loading ? (
        <div style={{ display:"flex", justifyContent:"center", padding:40 }}><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:"center" }}>
          <Pin size={32} color="var(--ink-300)" style={{ marginBottom:10 }} />
          <p className="title" style={{ fontSize:16, marginBottom:6 }}>Aucun evenement epingle</p>
          <p className="muted" style={{ fontSize:13 }}>Epinglez un evenement depuis le fil d&apos;activite pour le retrouver ici rapidement.</p>
        </div>
      ) : (
        <div className="pins-grid">
          {events.map((ev) => {
            const color = EVENT_COLORS[ev.eventType] || "var(--iris-500)";
            const Icon = EVENT_ICONS[ev.eventType];
            return (
              <div key={ev.id} className="card pin-card">
                <div className="pin-card-icon" style={{ background: color }}>
                  {Icon && <Icon size={18} />}
                </div>
                <div className="pin-card-title">{ev.title}</div>
                <div className="pin-card-meta">
                  <span className={impChipClass(ev.importance)}>{ev.importance || "basse"}</span>
                  {" · "}
                  {ev.sourceModule || "Général"}
                  {" · "}
                  {formatDate(ev.eventDate)}
                </div>
                {ev.description && (
                  <div className="pin-card-desc"
                    style={{ WebkitLineClamp:3, display:"-webkit-box", WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {ev.description}
                  </div>
                )}
                <div style={{ display:"flex", gap:6, marginTop:12 }}>
                  <button className="btn" style={{ height:30, fontSize:12, padding:"0 10px" }}
                    onClick={() => setEditEvent(ev)}>
                    <Edit2 size={12} /> Modifier
                  </button>
                  <button className="btn" style={{ height:30, fontSize:12, padding:"0 10px", color:"var(--amber)" }}
                    onClick={() => unpin(ev)}>
                    <PinOff size={12} /> Desepingler
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editEvent && <EventModal event={editEvent} onClose={() => { setEditEvent(null); load(); }} />}
    </div>
  );
}
