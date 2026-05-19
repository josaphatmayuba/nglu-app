// SCRUM-72 — Calendar view for the Maintenance panel.
// Monthly grid with tickets dropped on their scheduledDate (or createdAt).

import moment from "moment";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const statusClass = (s) =>
  s === "done" ? "success" : s === "in_progress" ? "warning" : "danger";

const MaintenanceCalendarView = ({ requests = [] }) => {
  const [cursor, setCursor] = useState(() => moment().startOf("month"));

  const monthStart = cursor.clone().startOf("month");
  const monthEnd = cursor.clone().endOf("month");
  // ISO week starts Monday — start grid on the Monday of the week of day 1.
  const gridStart = monthStart.clone().startOf("isoWeek");
  const gridEnd = monthEnd.clone().endOf("isoWeek");
  const days = [];
  for (let d = gridStart.clone(); d.isSameOrBefore(gridEnd, "day"); d.add(1, "day")) {
    days.push(d.clone());
  }

  // Group requests by yyyy-mm-dd of scheduled/createdAt.
  const ticketsByDay = {};
  requests.forEach((request) => {
    const ref = request.scheduledDate || request.createdAt || request.reportedAt;
    if (!ref) return;
    const key = moment(ref).format("YYYY-MM-DD");
    if (!ticketsByDay[key]) ticketsByDay[key] = [];
    ticketsByDay[key].push(request);
  });

  const today = moment().format("YYYY-MM-DD");

  return (
    <div className="immo-calendar">
      <header className="immo-calendar-head">
        <div className="immo-calendar-nav">
          <button
            type="button"
            className="immo-icon-button"
            onClick={() => setCursor(cursor.clone().subtract(1, "month"))}
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <h3>{cursor.format("MMMM YYYY")}</h3>
          <button
            type="button"
            className="immo-icon-button"
            onClick={() => setCursor(cursor.clone().add(1, "month"))}
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="immo-secondary-button"
            onClick={() => setCursor(moment().startOf("month"))}
          >
            Aujourd'hui
          </button>
        </div>
        <div className="immo-calendar-legend">
          <span><span className="immo-pill-dot danger"></span>Ouvert</span>
          <span><span className="immo-pill-dot warning"></span>En cours</span>
          <span><span className="immo-pill-dot success"></span>Résolu</span>
        </div>
      </header>

      <div className="immo-calendar-grid">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="immo-calendar-dayhead">{d}</div>
        ))}
        {days.map((d) => {
          const key = d.format("YYYY-MM-DD");
          const tickets = ticketsByDay[key] || [];
          const outOfMonth = !d.isSame(cursor, "month");
          const isToday = key === today;
          return (
            <div
              key={key}
              className={[
                "immo-calendar-cell",
                outOfMonth ? "out" : "",
                isToday ? "today" : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="immo-calendar-cell-day">{d.format("D")}</div>
              <div className="immo-calendar-cell-items">
                {tickets.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`immo-calendar-chip ${statusClass(t.status)}`}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}
                {tickets.length > 3 && (
                  <div className="immo-calendar-chip more">+{tickets.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MaintenanceCalendarView;
