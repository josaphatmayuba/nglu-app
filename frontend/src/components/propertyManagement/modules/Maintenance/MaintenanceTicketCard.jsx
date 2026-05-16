import { Building2, CalendarDays, Check, UserRound } from "lucide-react";
import moment from "moment";

import { avatarColors } from "../../shared/constants";
import { initials } from "../../shared/tenants";
import { ticketIconFor, ticketIconTone } from "../../shared/units";

const MaintenanceTicketCard = ({ request, index }) => {
  const urgent = ["urgent", "high"].includes(request.priority);
  const done = request.status === "done";
  const iconTone = ticketIconTone(request);
  const assignee = request.assignee || request.assignedTo || request.technicianName;
  const statusKey = done ? "success" : request.status === "in_progress" ? "warning" : "danger";
  const statusText = done
    ? "Résolu"
    : request.status === "in_progress"
      ? "En cours"
      : "Ouvert";
  const priorityText = urgent
    ? "Urgent"
    : request.priority === "low"
      ? "Bas"
      : "Moyen";
  const priorityTone = urgent ? "danger" : request.priority === "low" ? "neutral" : "warning";

  return (
    <article className={`immo-ticket-card ${urgent ? "urgent" : ""} ${done ? "done" : ""}`}>
      <div className={`immo-ticket-icon ${iconTone}`}>
        {ticketIconFor(request, 20)}
      </div>
      <div className="immo-ticket-copy">
        <h3>{request.title}</h3>
        <p>{request.description || "Aucune description renseignée."}</p>
        <div>
          <span><Building2 size={14} /> {request.property?.name || request.propertyName || "-"}</span>
          <span><UserRound size={14} /> Reporté par {request.tenantName || request.reportedBy || "-"}</span>
          <span>
            {done ? <Check size={14} /> : <CalendarDays size={14} />}
            {done
              ? `Résolu ${request.resolvedAt ? moment(request.resolvedAt).fromNow() : ""}`.trim()
              : request.scheduledDate
                ? moment(request.scheduledDate).fromNow()
                : "-"}
          </span>
        </div>
      </div>
      <div className="immo-ticket-side">
        <span className={`immo-pill ${priorityTone}`}>{priorityText}</span>
        <span className="immo-ticket-assignee">
          <span className={`mini-avatar ${assignee ? avatarColors[index % avatarColors.length] : "slate"}`}>
            {assignee ? initials(assignee) : "?"}
          </span>
          {assignee || "Non assigné"}
        </span>
        <span className={`immo-pill ${statusKey}`}>{statusText}</span>
      </div>
    </article>
  );
};

export default MaintenanceTicketCard;
