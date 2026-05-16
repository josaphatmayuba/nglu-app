import {
  AlertTriangle,
  Check,
  CircleAlert,
  Clock,
  FileCheck,
  FileSignature,
  FileText,
  MoreHorizontal,
} from "lucide-react";

import { avatarColors } from "../../shared/constants";
import { shortMoney } from "../../shared/format";
import { initials, tenantNameFromLease } from "../../shared/tenants";
import LeaseContextMenu from "./LeaseContextMenu";
import { leaseDisplayInfo } from "./leaseUtils";

const LeaseGridView = ({ contracts, leases, onAction, openMenu, setOpenMenu }) => (
  <div className="immo-lease-grid">
    {leases.map((lease, index) => {
      const contract = contracts.find((item) => item.leaseId === lease.id || item.lease?.id === lease.id);
      const info = leaseDisplayInfo(lease, contract);
      const paymentNote =
        info.variant === "noContract"
          ? "Retard 12 jours"
          : info.variant === "pendingSignature"
            ? `${info.elapsedMonths || 1} paiements OK`
            : info.variant === "expired"
              ? "Bail terminé"
              : `${info.elapsedMonths || 1} paiements à jour`;
      return (
        <article
          key={lease.id}
          className={`immo-lease-card ${info.variant} ${openMenu === `card-${lease.id}` ? "menu-open" : ""}`}
        >
          <div className="immo-lease-card-head">
            <span className={`immo-pill ${info.statusTone}`}>{info.statusText}</span>
            {info.variant === "noContract" ? (
              <button type="button" className="immo-generate-button" onClick={() => onAction("contract", lease, contract)}>
                <FileSignature size={14} /> Générer
              </button>
            ) : (
              <span className={`immo-contract-chip ${info.contractTone}`}>
                {info.contractTone === "success" && <FileCheck size={14} />}
                {info.contractTone === "warning" && <Clock size={14} />}
                {info.contractTone === "muted" && <FileText size={14} />}
                {info.contractLabel}
              </span>
            )}
          </div>

          <div className="immo-lease-person">
            <span className={`immo-lease-avatar ${avatarColors[index % avatarColors.length]}`}>
              {initials(tenantNameFromLease(lease))}
            </span>
            <div>
              <strong>{tenantNameFromLease(lease)}</strong>
              <span>{info.propertyLabel}</span>
            </div>
          </div>

          {info.variant === "noContract" && (
            <div className="immo-lease-warning">
              <AlertTriangle size={15} />
              <span><strong>Contrat manquant.</strong> Bail créé il y a {info.elapsedMonths || 1} mois sans contrat lié.</span>
            </div>
          )}

          <div className="immo-lease-progress">
            <div>
              <span className="mono">{info.reference}</span>
              <span>{info.years} ans · {info.elapsedMonths} mois écoulés</span>
            </div>
            <span className="immo-progress">
              <span className={info.progressTone} style={{ width: `${info.progress}%` }} />
            </span>
            <div>
              <span>{info.start ? info.start.format("DD/MM/YY") : "-"}</span>
              <strong className={info.progressTone}>{info.progress}% écoulé</strong>
              <span>{info.end ? info.end.format("DD/MM/YY") : "-"}</span>
            </div>
          </div>

          <div className="immo-lease-card-foot">
            <div>
              <strong className={info.variant === "noContract" ? "danger" : ""}>
                {shortMoney(lease.rentAmount, lease.currencySymbol)}<span>/mois</span>
              </strong>
              <small className={info.variant === "noContract" ? "danger" : info.variant === "expired" ? "muted" : "success"}>
                {info.variant === "noContract" && <CircleAlert size={13} />}
                {["pendingSignature", "signed"].includes(info.variant) && <Check size={13} />}
                {paymentNote}
              </small>
            </div>
            <span className="immo-menu-anchor immo-card-actions">
              {contract && (
                <button
                  type="button"
                  className="immo-flat-icon immo-card-action"
                  onClick={() => onAction("contract", lease, contract)}
                  title="Voir contrat"
                >
                  <FileText size={16} />
                </button>
              )}
              <button
                type="button"
                className={`immo-flat-icon immo-card-action immo-more-action ${openMenu === `card-${lease.id}` ? "active" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu(openMenu === `card-${lease.id}` ? null : `card-${lease.id}`);
                }}
                aria-label="Actions du bail"
              >
                <MoreHorizontal size={16} />
              </button>
              {openMenu === `card-${lease.id}` && (
                <LeaseContextMenu contract={contract} lease={lease} onAction={onAction} statusText={info.statusText} />
              )}
            </span>
          </div>
        </article>
      );
    })}
  </div>
);

export default LeaseGridView;
