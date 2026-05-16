import moment from "moment";
import { MoreHorizontal } from "lucide-react";

import { avatarColors } from "../../shared/constants";
import { compactMoney } from "../../shared/format";
import { initials, tenantName } from "../../shared/tenants";
import { unitTypeIcon } from "../../shared/units";

import TenantContextMenu from "./TenantContextMenu";

const computeBadge = ({ isLate, daysToEnd, isCompany, tenancyYears, leaseCount, overdueDays }) => {
  if (isLate) {
    const label = `En retard ${overdueDays ? `${overdueDays}j` : ""}`.trim();
    return { label, tone: "danger" };
  }
  if (daysToEnd !== null && daysToEnd >= 0 && daysToEnd <= 60) {
    return { label: "Bail à renouveler", tone: "warning" };
  }
  if (isCompany) {
    return { label: "Pro · Entreprise", tone: "brand" };
  }
  if (tenancyYears >= 3 || leaseCount >= 2) {
    return { label: `VIP · ${tenancyYears || 3} ans`, tone: "success" };
  }
  return { label: `Standard · ${tenancyYears || 1} an`, tone: "neutral" };
};

const TenantCard = ({
  tenant,
  index = 0,
  tenantLeases = [],
  activeUnit,
  menuOpen = false,
  onToggleMenu,
  onAction,
}) => {
  const activeLease = tenantLeases.find((lease) => lease.status === "active") || tenantLeases[0];
  const isLate = activeLease?.isOverdue || activeLease?.status === "late";
  const daysToEnd = activeLease?.endDate ? moment(activeLease.endDate).diff(moment(), "days") : null;
  const isCompany = tenant?.companyName || tenant?.isCompany;
  const tenancyYears = activeLease?.startDate
    ? Math.max(1, moment().diff(moment(activeLease.startDate), "years"))
    : 0;
  const badge = computeBadge({
    isLate,
    daysToEnd,
    isCompany,
    tenancyYears,
    leaseCount: tenantLeases.length,
    overdueDays: activeLease?.overdueDays,
  });

  return (
    <article className={`immo-tenant-card ${isLate ? "late" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div className={`immo-letter-avatar ${avatarColors[index % avatarColors.length]}`}>
        {initials(tenantName(tenant))}
      </div>
      <span className="immo-card-menu-anchor immo-menu-anchor">
        <button
          type="button"
          className={`immo-card-menu${menuOpen ? " active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleMenu?.(tenant);
          }}
          aria-label="Actions du locataire"
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <TenantContextMenu
            tenant={tenant}
            lease={activeLease}
            onAction={onAction}
          />
        )}
      </span>
      <div className="immo-tenant-main">
        <h3>{tenantName(tenant)}</h3>
        <p>{tenant.email || "email non renseigné"}</p>
        <p>{tenant.phone || "téléphone non renseigné"}</p>
        <span className={`immo-mini-badge ${badge.tone}`}>{badge.label}</span>
      </div>
      <div className="immo-tenant-divider" />
      <div className="immo-tenant-lease">
        <p>
          {unitTypeIcon(activeUnit?.unitKind)}
          {activeUnit?.displayName || activeLease?.propertyName || "-"}
        </p>
        <div>
          <span className={isLate ? "danger" : ""}>
            Loyer · échéance {activeLease?.nextInvoiceDate ? moment(activeLease.nextInvoiceDate).format("DD/MM") : "-"}
          </span>
          <strong className={isLate ? "danger" : ""}>
            {compactMoney(activeLease?.rentAmount || activeUnit?.monthlyRent, activeLease?.currencySymbol)}
          </strong>
        </div>
      </div>
    </article>
  );
};

export default TenantCard;
