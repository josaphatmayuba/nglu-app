import { useState, useEffect } from "react";
import { Plus, Search, Pin, PinOff, Edit2, Trash2, X, Paperclip, ChevronDown } from "lucide-react";
import { api } from "../api.js";
import { useRealtimeReload } from "../realtime.js";
import { t } from "../i18n.js";
import {
  EVENT_TYPES, SOURCE_MODULES, EVENT_COLORS, EVENT_ICONS,
  IMP_COLORS, formatRelative, formatDate, impChipClass,
} from "./shared.jsx";

export function Activite() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    const params = {};
    if (sourceFilter !== "all") params.sourceModule = sourceFilter;
    if (typeFilter !== "all") params.eventType = typeFilter;
    if (search) params.q = search;
    api.events(params)
      .then((d) => setEvents(Array.isArray(d) ? d : (d?.data || [])))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sourceFilter, typeFilter, search]);
  useRealtimeReload(load, ["journal-events"]);

  const togglePin = async (ev) => {
    try {
      ev.isPinned ? await api.unpinEvent(ev.id) : await api.pinEvent(ev.id);
      load();
    } catch (e) { setError(e.message); }
  };

  const deleteEv = async (ev) => {
    if (!confirm(`Supprimer "${ev.title}" ?`)) return;
    try { await api.deleteEvent(ev.id); load(); } catch (e) { setError(e.message); }
  };

  // Grouper par jour
  const grouped = groupByDay(events.filter((ev) => {
    const q = search.toLowerCase();
    return !q || ev.title?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q);
  }));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">{t("Fil d'activité")}</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>Historique complet des evenements de l&apos;entreprise</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nouvel evenement
          </button>
        </div>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error} <button style={{ float:"right", border:0, background:"none", cursor:"pointer" }} onClick={() => setError(null)}>×</button></div>}

      {/* Filtres */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
        <div className="search-bar" style={{ maxWidth:260 }}>
          <Search size={16} />
          <input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="source-filter">
          {SOURCE_MODULES.map((s) => (
            <button key={s.value} className={`source-btn ${sourceFilter === s.value ? "active" : ""}`}
              onClick={() => setSourceFilter(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <TypePicker value={typeFilter} onChange={setTypeFilter} />
      </div>

      {loading ? (
        <div style={{ padding:40, display:"flex", justifyContent:"center" }}><div className="spinner" /></div>
      ) : grouped.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:"center" }}>
          <p className="muted">Aucun evenement trouve.</p>
        </div>
      ) : (
        <div className="journal-feed">
          {grouped.map(([day, dayEvents]) => (
            <div className="journal-day-group" key={day}>
              <div className="journal-day-label">{day}</div>
              {dayEvents.map((ev) => {
                const color = EVENT_COLORS[ev.eventType] || "var(--iris-500)";
                const Icon = EVENT_ICONS[ev.eventType];
                return (
                  <div key={ev.id} className="journal-event-row" onClick={() => setDetailEvent(ev)}>
                    <div className="journal-event-icon" style={{ background: color }}>
                      {Icon && <Icon size={16} />}
                    </div>
                    <div className="journal-event-body">
                      <div className="journal-event-title">{ev.title}</div>
                      <div className="journal-event-meta">
                        <span className={impChipClass(ev.importance)}>{ev.importance || "basse"}</span>
                        {ev.sourceModule && <span className="chip chip-ink">{ev.sourceModule}</span>}
                        <span>{formatRelative(ev.eventDate)}</span>
                        {ev.isPinned && <Pin size={12} style={{ color: "var(--amber)" }} />}
                      </div>
                      {ev.description && <div className="journal-event-desc" style={{ WebkitLineClamp:2, display:"-webkit-box", WebkitBoxOrient:"vertical", overflow:"hidden" }}>{ev.description}</div>}
                    </div>
                    <div className="journal-event-actions" onClick={(e) => e.stopPropagation()}>
                      <button title={ev.isPinned ? "Desepingler" : "Epingler"} onClick={() => togglePin(ev)}>
                        {ev.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                      </button>
                      <button title="Modifier" onClick={() => { setEditEvent(ev); }}>
                        <Edit2 size={14} />
                      </button>
                      <button title="Supprimer" onClick={() => deleteEv(ev)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {showCreate && <EventModal onClose={() => { setShowCreate(false); load(); }} />}
      {editEvent && <EventModal event={editEvent} onClose={() => { setEditEvent(null); load(); }} />}
      {detailEvent && <EventDetail event={detailEvent} onClose={() => setDetailEvent(null)} onEdit={(ev) => { setDetailEvent(null); setEditEvent(ev); }} onPin={togglePin} onDelete={(ev) => { setDetailEvent(null); deleteEv(ev); }} />}
    </div>
  );
}

function TypePicker({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      <button className={`source-btn ${value === "all" ? "active" : ""}`} onClick={() => onChange("all")}>Tous types</button>
      {EVENT_TYPES.map((t) => (
        <button key={t.value} className={`source-btn ${value === t.value ? "active" : ""}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EventModal({ event, onClose }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title || "",
    eventType: event?.eventType || "note",
    sourceModule: event?.sourceModule || "general",
    importance: event?.importance || "basse",
    eventDate: event?.eventDate ? event.eventDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    description: event?.description || "",
    location: event?.location || "",
    participants: event?.participants || "",
    tags: event?.tags || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Le titre est obligatoire."); return; }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) { await api.updateEvent(event.id, form); }
      else { await api.createEvent(form); }
      onClose();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-head">
          <h2>{isEdit ? "Modifier l'evenement" : "Nouvel evenement"}</h2>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}
          <div className="form-grid two">
            <div className="field">
              <span>Titre <b style={{ color:"var(--rose)" }}>*</b></span>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Titre de l'evenement" />
            </div>
            <div className="field">
              <span>Date</span>
              <input type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} />
            </div>
            <div className="field">
              <span>Type</span>
              <select value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
                {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="field">
              <span>Source</span>
              <select value={form.sourceModule} onChange={(e) => set("sourceModule", e.target.value)}>
                {SOURCE_MODULES.filter((s) => s.value !== "all").map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>Importance</span>
              <select value={form.importance} onChange={(e) => set("importance", e.target.value)}>
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
            <div className="field">
              <span>Lieu</span>
              <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Bureau, site, en ligne…" />
            </div>
          </div>
          <div className="field" style={{ marginTop:12 }}>
            <span>Participants</span>
            <input value={form.participants} onChange={(e) => set("participants", e.target.value)} placeholder="Jean Dupont, Marie Martin…" />
          </div>
          <div className="field" style={{ marginTop:12 }}>
            <span>Description</span>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Details, notes, observations…" rows={4} />
          </div>
          <div className="field" style={{ marginTop:12 }}>
            <span>Tags</span>
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="contrat, urgent, client…" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : isEdit ? "Mettre a jour" : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EventDetail({ event, onClose, onEdit, onPin, onDelete }) {
  const color = EVENT_COLORS[event.eventType] || "var(--iris-500)";
  const Icon = EVENT_ICONS[event.eventType];
  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-head">
          <h2>Evenement</h2>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="event-detail-panel" style={{ padding:0 }}>
          <div className="event-detail-header">
            <div className="event-detail-icon" style={{ background: color }}>
              {Icon && <Icon size={20} />}
            </div>
            <div>
              <div className="event-detail-title">{event.title}</div>
              <div className="event-detail-meta">
                <span className={impChipClass(event.importance)}>{event.importance || "basse"}</span>
                {event.sourceModule && <span className="chip chip-ink">{event.sourceModule}</span>}
                <span>{formatDate(event.eventDate)}</span>
                {event.location && <span>📍 {event.location}</span>}
              </div>
            </div>
          </div>
          {event.description && <div className="event-detail-desc">{event.description}</div>}
          {event.participants && <div style={{ fontSize:13, color:"var(--ink-600)", marginBottom:12 }}><b>Participants :</b> {event.participants}</div>}
          {event.tags && <div style={{ fontSize:13, color:"var(--ink-500)", marginBottom:12 }}>Tags : {event.tags}</div>}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => onPin(event)}>{event.isPinned ? "Desepingler" : "Epingler"}</button>
          <button className="btn" style={{ color:"var(--rose)" }} onClick={() => onDelete(event)}>Supprimer</button>
          <button className="btn btn-primary" onClick={() => onEdit(event)}>Modifier</button>
        </div>
      </div>
    </div>
  );
}

function groupByDay(events) {
  const map = new Map();
  for (const ev of events) {
    const day = ev.eventDate
      ? new Date(ev.eventDate).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })
      : "Sans date";
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(ev);
  }
  return [...map.entries()];
}
