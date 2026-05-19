// SCRUM-72 — Kanban view (default) for the Maintenance panel.
// 3 swim lanes: Ouvert / En cours / Résolu.

import moment from "moment";

import { avatarColors } from "../../shared/constants";
import { initials } from "../../shared/tenants";
import { ticketIconFor, ticketIconTone } from "../../shared/units";

const COLUMNS = [
  { key: "open",        label: "Ouvert",   dotClass: "danger",  match: (r) => !r.status || r.status === "open" },
  { key: "in_progress", label: "En cours", dotClass: "warning", match: (r) => r.status === "in_progress" },
  { key: "done",        label: "Résolu",   dotClass: "success", match: (r) => r.status === "done" },
];

const priorityLabel = (p) =>
  ["urgent", "high"].includes(p) ? "Urgent" : p === "low" ? "Bas" : "Moyen";

const priorityClass = (p) =>
  ["urgent", "high"].includes(p) ? "danger" : p === "low" ? "neutral" : "warning";

const MaintenanceKanbanView = ({ requests = [] }) => {
  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: requests.filter(col.match),
  }));

  return (
    <div className="immo-kanban">
      {grouped.map((col) => (
        <div key={col.key} className={`immo-kanban-col col-${col.key}`}>
          <header className="immo-kanban-col-head">
            <span className={`immo-pill-dot ${col.dotClass}`}></span>
            <h3>{col.label}</h3>
            <span className="immo-kanban-count">{col.items.length}</span>
          </header>
          <div className="immo-kanban-body">
            {col.items.length === 0 && (
              <div className="immo-kanban-empty">Aucun ticket</div>
            )}
            {col.items.map((request, index) => {
              const assignee = request.assignee || request.assignedTo || request.technicianName;
              const dateRef = request.scheduledDate || request.createdAt || request.reportedAt;
              return (
                <article
                  key={request.id}
                  className={`immo-kanban-card ${col.key === "done" ? "done" : ""}`}
                >
                  <div className="immo-kanban-card-head">
                    <span className={`immo-ticket-icon-sm ${ticketIconTone(request)}`}>
                      {ticketIconFor(request, 14)}
                    </span>
                    <span className={`immo-pill ${priorityClass(request.priority)}`}>
                      {priorityLabel(request.priority)}
                    </span>
                  </div>
                  <h4 className={col.key === "done" ? "done-title" : ""}>{request.title}</h4>
                  <p className="muted">
                    {request.property?.name || request.propertyName || "-"}
                    {request.unitName ? ` · ${request.unitName}` : ""}
                  </p>
                  <footer>
                    <span className="muted-sm">
                      {dateRef ? moment(dateRef).fromNow() : "-"}
                    </span>
                    <span
                      className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}
                      title={assignee || "Non assigné"}
                    >
                      {assignee ? initials(assignee) : "?"}
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaintenanceKanbanView;
