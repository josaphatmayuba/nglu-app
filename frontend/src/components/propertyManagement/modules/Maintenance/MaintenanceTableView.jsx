// SCRUM-72 — Table view for the Maintenance panel.

import moment from "moment";
import { Building2, MoreHorizontal } from "lucide-react";

import { avatarColors } from "../../shared/constants";
import { initials } from "../../shared/tenants";
import { ticketIconFor, ticketIconTone } from "../../shared/units";
import { compactMoney } from "../../shared/format";

const priorityLabel = (p) =>
  ["urgent", "high"].includes(p) ? "Urgent" : p === "low" ? "Bas" : "Moyen";

const priorityClass = (p) =>
  ["urgent", "high"].includes(p) ? "danger" : p === "low" ? "neutral" : "warning";

const statusLabel = (s) =>
  s === "done" ? "Résolu" : s === "in_progress" ? "En cours" : "Ouvert";

const statusClass = (s) =>
  s === "done" ? "success" : s === "in_progress" ? "warning" : "danger";

const MaintenanceTableView = ({ requests = [] }) => {
  if (!requests.length) {
    return (
      <div className="immo-table-empty">Aucun ticket à afficher pour ce filtre.</div>
    );
  }
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
            const assignee = request.assignee || request.assignedTo || request.technicianName;
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
                  {request.cost ? compactMoney(request.cost) : <span className="muted">—</span>}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button type="button" className="immo-icon-button" aria-label="Actions">
                    <MoreHorizontal size={16} />
                  </button>
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
