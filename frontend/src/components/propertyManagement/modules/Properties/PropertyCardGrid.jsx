import { Bath, BedDouble, MoreHorizontal, UserPlus } from "lucide-react";

import { avatarColors, statusLabel } from "../../shared/constants";
import { shortMoney } from "../../shared/format";
import { initials, tenantNameFromLease } from "../../shared/tenants";
import { unitTypeIcon } from "../../shared/units";

const PropertyCardGrid = ({ units, onAssignTenant, onEditUnit }) => (
  <div className="immo-property-grid">
    {units.map((unit, index) => {
      const status = unit.activeLease ? "occupied" : unit.status || "vacant";
      const late = unit.activeLease?.status === "late" || unit.activeLease?.isOverdue;
      const cardTone =
        status === "maintenance"
          ? "maintenance"
          : late
            ? "late"
            : status === "occupied"
              ? "occupied"
              : "available";
      const tenantLabel = tenantNameFromLease(unit.activeLease);
      const hasTenant = unit.activeLease && tenantLabel !== "-";
      const overdueDays = unit.activeLease?.overdueDays;

      return (
        <article key={unit.id || index} className={`immo-property-card ${cardTone}`}>
          <div className="immo-property-media">
            <span className={`immo-status-chip ${cardTone}`}>
              {late ? "En retard" : statusLabel[status] || status}
            </span>
            <button type="button" className="immo-icon-button">
              <MoreHorizontal size={16} />
            </button>
            <span className="immo-property-watermark">
              {unitTypeIcon(unit.unitKind, 44)}
            </span>
            <div className="immo-property-code">
              {unit.unitKindLabel} · {unit.name || unit.code || `U-${unit.id}`}
            </div>
          </div>
          <div className="immo-property-body">
            <h3>{unit.displayName}</h3>
            <p>{unit.displayAddress}</p>
            <div className="immo-property-meta">
              <span><BedDouble size={14} />{unit.bedrooms ?? 0}</span>
              <span><Bath size={14} />{unit.bathrooms ?? 0}</span>
              <span>{unit.area ? `${unit.area}m²` : "-"}</span>
            </div>
            <div className="immo-property-footer">
              {hasTenant ? (
                <div className="immo-property-tenant">
                  <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                    {initials(tenantLabel)}
                  </span>
                  <div className="immo-property-tenant-text">
                    <span className="name">{tenantLabel}</span>
                    {late && (
                      <span className="late">
                        Retard {overdueDays ? `${overdueDays} jours` : ""}
                      </span>
                    )}
                  </div>
                </div>
              ) : status === "vacant" || status === "available" ? (
                <button
                  type="button"
                  className="immo-assign-button"
                  onClick={() => onAssignTenant?.(unit)}
                >
                  <UserPlus size={14} /> Assigner locataire
                </button>
              ) : (
                <button type="button" onClick={() => onEditUnit?.(unit)}>
                  Modifier
                </button>
              )}
              <div className="immo-property-rent">
                <strong className={late ? "danger" : ""}>{shortMoney(unit.monthlyRent)}</strong>
                <span>/mois</span>
              </div>
            </div>
          </div>
        </article>
      );
    })}
  </div>
);

export default PropertyCardGrid;
