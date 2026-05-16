import { initials, tenantNameFromLease } from "../../shared/tenants";
import { avatarColors } from "../../shared/constants";
import { shortMoney } from "../../shared/format";
import LeaseContextMenu from "./LeaseContextMenu";
import { leaseDisplayInfo } from "./leaseUtils";

const LeaseTimelineView = ({ contracts, leases, onAction, openMenu, setOpenMenu }) => (
  <div className="immo-lease-timeline">
    <div className="immo-timeline-inner">
      <div className="immo-timeline-years">
        <span>2024</span>
        <span>2025</span>
        <span>2026</span>
        <span>2027 →</span>
      </div>
      <div className="immo-today-marker">
        <span>Aujourd'hui</span>
      </div>
      <div className="immo-timeline-rows">
        {leases.map((lease, index) => {
          const contract = contracts.find((item) => item.leaseId === lease.id || item.lease?.id === lease.id);
          const info = leaseDisplayInfo(lease, contract);
          const left = Math.min(70, Math.max(0, index * 7 + (info.start ? Math.max(0, info.start.year() - 2024) * 18 : 0)));
          const width = Math.min(58, Math.max(24, info.progress > 80 ? 42 : 30 + info.progress / 3));
          return (
            <div key={lease.id} className="immo-timeline-row">
              <div className="immo-timeline-label">
                <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                  {initials(tenantNameFromLease(lease))}
                </span>
                <div>
                  <strong>{tenantNameFromLease(lease)}</strong>
                  <small className={info.variant === "noContract" ? "danger" : info.statusTone}>
                    {info.variant === "noContract" ? "Sans contrat" : info.statusText}
                  </small>
                </div>
              </div>
              <div className="immo-timeline-track">
                <span className="immo-timeline-now" />
                <button
                  type="button"
                  className={`immo-timeline-bar ${info.variant}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => setOpenMenu(openMenu === `timeline-${lease.id}` ? null : `timeline-${lease.id}`)}
                >
                  {shortMoney(lease.rentAmount, lease.currencySymbol)} · {info.contractLabel}
                </button>
                {openMenu === `timeline-${lease.id}` && (
                  <span className="immo-timeline-menu">
                    <LeaseContextMenu contract={contract} lease={lease} onAction={onAction} statusText={info.statusText} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export default LeaseTimelineView;
