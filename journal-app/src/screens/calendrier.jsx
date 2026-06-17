import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";
import { EVENT_COLORS, EVENT_ICONS, formatDate } from "./shared.jsx";
import { EventModal } from "./activite.jsx";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export function Calendrier({ go }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [dayEvents, setDayEvents] = useState(null);

  const load = () => {
    setLoading(true);
    api.calendar(year, month)
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [year, month]);

  const prev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
  };
  const next = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else { setMonth(m => m + 1); }
  };

  const days = buildCalendarDays(year, month);
  const evsByDay = groupEventsByDay(events);

  const openDay = (d) => {
    const key = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dayEvs = evsByDay[key] || [];
    setDayEvents({ day: d, month, year, events: dayEvs });
  };

  return (
    <div>
      <div className="page-head">
        <h1 className="title">{t("Calendrier")}</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouvel evenement
        </button>
      </div>

      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div className="cal-nav">
          <button className="btn btn-ghost" onClick={prev}><ChevronLeft size={20} /></button>
          <h2>{MOIS[month - 1]} {year}</h2>
          <button className="btn btn-ghost" onClick={next}><ChevronRight size={20} /></button>
          <button className="btn" style={{ marginLeft:"auto" }} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}>
            Aujourd&apos;hui
          </button>
        </div>

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}><div className="spinner" /></div>
        ) : (
          <div className="cal-grid">
            {JOURS.map((j) => <div key={j} className="cal-header-cell">{j}</div>)}
            {days.map((d, i) => {
              const isToday = d.day === today.getDate() && d.month === month && year === today.getFullYear() && d.current;
              const key = d.current ? `${year}-${String(month).padStart(2,"0")}-${String(d.day).padStart(2,"0")}` : "";
              const dayEvs = evsByDay[key] || [];
              return (
                <div key={i} className={`cal-day ${!d.current ? "other-month" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => d.current && openDay(d.day)}>
                  <div className="cal-day-num">{d.day}</div>
                  {dayEvs.slice(0, 3).map((ev) => {
                    const color = EVENT_COLORS[ev.eventType] || "var(--iris-500)";
                    return (
                      <div key={ev.id} className="cal-event-dot" style={{ background: color }}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvs.length > 3 && (
                    <div style={{ fontSize:10, color:"var(--ink-400)", paddingLeft:4 }}>+{dayEvs.length - 3} autres</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panneau événements du jour sélectionné */}
      {dayEvents && (
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <h3 style={{ margin:0, fontSize:15, fontFamily:"'Space Grotesk',sans-serif" }}>
              {dayEvents.day} {MOIS[dayEvents.month - 1]} {dayEvents.year}
            </h3>
            <button className="btn btn-ghost" onClick={() => setDayEvents(null)}>Fermer</button>
          </div>
          {dayEvents.events.length === 0 ? (
            <p className="muted" style={{ fontSize:13 }}>Aucun evenement ce jour.</p>
          ) : (
            dayEvents.events.map((ev) => {
              const color = EVENT_COLORS[ev.eventType] || "var(--iris-500)";
              const Icon = EVENT_ICONS[ev.eventType];
              return (
                <div key={ev.id} style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:"1px solid var(--ink-100)" }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:color, display:"flex", alignItems:"center", justifyContent:"center", flex:"none" }}>
                    {Icon && <Icon size={14} color="#fff" />}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{ev.title}</div>
                    <div style={{ fontSize:12, color:"var(--ink-500)" }}>{ev.sourceModule} · {ev.importance}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showCreate && <EventModal onClose={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // lundi = 0
  const days = [];
  // Jours du mois précédent
  const prevLast = new Date(year, month - 1, 0);
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ day: prevLast.getDate() - i, current: false, month: month - 1 });
  }
  // Jours du mois courant
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, current: true, month });
  }
  // Compléter jusqu'à 42 cases
  let nextDay = 1;
  while (days.length < 42) {
    days.push({ day: nextDay++, current: false, month: month + 1 });
  }
  return days;
}

function groupEventsByDay(events) {
  const map = {};
  for (const ev of events) {
    if (!ev.eventDate) continue;
    const key = ev.eventDate.slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  return map;
}
