// SCRUM-72 — Kanban view (default) for the Maintenance panel.
// 3 swim lanes: Ouvert / En cours / Résolu.

import moment from "moment";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

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

const KanbanCard = ({ request, index, colKey, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const assignee = request.assignee || request.assignedTo || request.technicianName;
  const dateRef = request.scheduledDate || request.createdAt || request.reportedAt;
  return (
    <article className={`immo-kanban-card ${colKey === "done" ? "done" : ""}`}>
      <div className="immo-kanban-card-head">
        <span className={`immo-ticket-icon-sm ${ticketIconTone(request)}`}>
          {ticketIconFor(request, 14)}
        </span>
        <span className={`immo-pill ${priorityClass(request.priority)}`}>
          {priorityLabel(request.priority)}
        </span>
        {(onEdit || onDelete) && (
          <span className="immo-menu-anchor" style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className={`immo-flat-icon${menuOpen ? " active" : ""}`}
              style={{ padding: "2px" }}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label="Actions"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <ul className="immo-context-menu" role="menu">
                {onEdit && (
                  <li role="menuitem">
                    <button type="button" onClick={() => { setMenuOpen(false); onEdit(request); }}>
                      <Pencil size={13} /> Modifier
                    </button>
                  </li>
                )}
                {onDelete && (
                  <li role="menuitem" className="danger">
                    <button type="button" onClick={() => { setMenuOpen(false); onDelete(request); }}>
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </li>
                )}
              </ul>
            )}
          </span>
        )}
      </div>
      <h4 className={colKey === "done" ? "done-title" : ""}>{request.title}</h4>
      <p className="muted">
        {request.property?.name || request.propertyName || "-"}
        {request.unitName ? ` · ${request.unitName}` : ""}
      </p>
      <footer>
        <span className="muted-sm">{dateRef ? moment(dateRef).fromNow() : "-"}</span>
        <span
          className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}
          title={assignee || "Non assigné"}
        >
          {assignee ? initials(assignee) : "?"}
        </span>
      </footer>
    </article>
  );
};

const MaintenanceKanbanView = ({ requests = [], onEdit, onDelete }) => {
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
            {col.items.map((request, index) => (
              <KanbanCard
                key={request.id}
                request={request}
                index={index}
                colKey={col.key}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaintenanceKanbanView;
