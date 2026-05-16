import { MoreHorizontal } from "lucide-react";

import { compactMoney } from "../../shared/format";
import { initials, tenantNameFromLease } from "../../shared/tenants";
import { avatarColors } from "../../shared/constants";
import LeaseContextMenu from "./LeaseContextMenu";
import { leaseDisplayInfo } from "./leaseUtils";

const LeaseTableView = ({ contracts, leases, onAction, openMenu, setOpenMenu }) => (
  <div className="immo-table-scroll">
    <div className="immo-data-table">
      <div className="immo-data-row head">
        <span>Bail</span>
        <span>Locataire</span>
        <span>Propriété</span>
        <span>Période</span>
        <span>Contrat</span>
        <span>Loyer</span>
        <span>Statut</span>
        <span />
      </div>
      {leases.map((lease, index) => {
        const contract = contracts.find((item) => item.leaseId === lease.id || item.lease?.id === lease.id);
        const info = leaseDisplayInfo(lease, contract);
        return (
          <div key={lease.id} className="immo-data-row">
            <span className="mono">{info.reference}</span>
            <span className="person-cell">
              <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                {initials(tenantNameFromLease(lease))}
              </span>
              {tenantNameFromLease(lease)}
            </span>
            <span>{info.propertyLabel}</span>
            <span>{info.start ? info.start.format("DD/MM/YY") : "-"} - {info.end ? info.end.format("DD/MM/YY") : "-"}</span>
            <span><span className={`immo-pill ${info.contractTone}`}>{info.contractLabel}</span></span>
            <strong>{compactMoney(lease.rentAmount, lease.currencySymbol)}</strong>
            <span><span className={`immo-pill ${info.statusTone}`}>{info.statusText}</span></span>
            <span className="immo-menu-anchor">
              <button
                type="button"
                className="immo-flat-icon"
                onClick={() => setOpenMenu(openMenu === lease.id ? null : lease.id)}
                aria-expanded={openMenu === lease.id}
              >
                <MoreHorizontal size={16} />
              </button>
              {openMenu === lease.id && (
                <LeaseContextMenu contract={contract} lease={lease} onAction={onAction} statusText={info.statusText} />
              )}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export default LeaseTableView;
