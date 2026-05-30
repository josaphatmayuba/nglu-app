// SCRUM-72 — Table view for the Maintenance panel.
// SCRUM-73 — Added Modifier / Supprimer actions per row.

import moment from "moment";
import { Building2, CircleDollarSign, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { avatarColors } from "../../shared/constants";
import { initials } from "../../shared/tenants";
import { ticketIconFor, ticketIconTone } from "../../shared/units";
import { compactMoney, cleanCurrencySymbol } from "../../shared/format";

const priorityLabel = (p) =>
  ["urgent", "high"].includes(p) ? "Urgent" : p === "low" ? "Bas" : "Moyen";

const priorityClass = (p) =>
  ["urgent", "high"].includes(p) ? "danger" : p === "low" ? "neutral" : "warning";

const statusLabel = (s) =>
  s === "done" ? "Résolu" : s === "in_progress" ? "En cours" : "Ouvert";

const statusClass = (s) =>
  s === "done" ? "success" : s === "in_progress" ? "warning" : "danger";

const RowMenu = ({ request, onEdit, onDelete, onAddCost, onViewCosts }) => {
  const [open, setOpen] = useState(false);
  return (
    <span className="immo-menu-anchor">
      <button
        type="button"
        className={`immo-icon-button${open ? " active" : ""}`}
        aria-label="Actions"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <ul className="immo-context-menu" role="menu">
          {onViewCosts && (
            <li role="menuitem">
              <button type="button" onClick={() => { setOpen(false); onViewCosts(request); }}>
                <Eye size={14} /> Voir les coûts
              </button>
            </li>
          )}
          {onAddCost && (
            <li role="menuitem">
              <button type="button" onClick={() => { setOpen(false); onAddCost(request); }}>
                <CircleDollarSign size={14} /> Enregistrer un coût
              </button>
            </li>
          )}
          {onEdit && (
            <li role="menuitem">
              <button type="button" onClick={() => { setOpen(false); onEdit(request); }}>
                <Pencil size={14} /> Modifier
              </button>
            </li>
          )}
          {onDelete && (
            <li role="menuitem" className="danger">
              <button type="button" onClick={() => { setOpen(false); onDelete(request); }}>
                <Trash2 size={14} /> Supprimer
              </button>
            </li>
          )}
        </ul>
      )}
    </span>
  );
};

const MaintenanceTableView = ({ requests = [], onEdit, onDelete, onAddCost, onViewCosts, currencies = [], defaultCurrencySymbol = "" }) => {
  if (!requests.length) {
    return <div className="immo-table-empty">Aucun ticket à afficher pour ce filtre.</div>;
  }
  const symbolFor = (id) => {
    const c = currencies.find((x) => x.id === id || x.currencyId === id);
    return (c ? cleanCurrencySymbol(c) : "") || defaultCurrencySymbol;
  };
  return (
    <div className="immo-table-wrap">
      <table className="immo-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Propriété</th>
            <th>Priorité</th>
            <th>Assigné</th>
            <th>Statut</th>
            <th>Reporté</th>
            <th style={{ textAlign: "right" }}>Coût</th>
            <th aria-label="actions"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request, index) => {
            const assignee =
              request.assignee ||
              request.assignedTo ||
              request.technicianName ||
              [request.assigneeFirstName, request.assigneeLastName].filter(Boolean).join(" ") ||
              request.assigneeUsername;
            const reportedAt = request.createdAt || request.reportedAt;
            return (
              <tr key={request.id} className={request.status === "done" ? "row-done" : ""}>
                <td>
                  <div className="immo-table-cell-strong">
                    <span className={`immo-ticket-icon-sm ${ticketIconTone(request)}`}>
                      {ticketIconFor(request, 14)}
                    </span>
                    <div>
                      <div className="strong">{request.title}</div>
                      <div className="muted">#M-{request.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="muted-row">
                    <Building2 size={13} />
                    <span>{request.property?.name || request.propertyName || "-"}</span>
                  </div>
                </td>
                <td>
                  <span className={`immo-pill ${priorityClass(request.priority)}`}>
                    {priorityLabel(request.priority)}
                  </span>
                </td>
                <td>
                  <div className="immo-ticket-assignee">
                    <span className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}>
                      {assignee ? initials(assignee) : "?"}
                    </span>
                    <span>{assignee || "Non assigné"}</span>
                  </div>
                </td>
                <td>
                  <span className={`immo-pill ${statusClass(request.status)}`}>
                    {statusLabel(request.status)}
                  </span>
                </td>
                <td className="muted">
                  {reportedAt ? moment(reportedAt).fromNow() : "-"}
                  {request.tenantName ? ` · ${request.tenantName}` : ""}
                </td>
                <td style={{ textAlign: "right" }}>
                  {request.estimatedCost ? compactMoney(request.estimatedCost, symbolFor(request.currencyId)) : <span className="muted">—</span>}
                </td>
                <td style={{ textAlign: "right" }}>
                  <RowMenu request={request} onEdit={onEdit} onDelete={onDelete} onAddCost={onAddCost} onViewCosts={onViewCosts} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default MaintenanceTableView;
