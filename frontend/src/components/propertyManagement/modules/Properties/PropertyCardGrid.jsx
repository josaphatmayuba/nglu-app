import { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  DollarSign,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import UserPrivateComponent from "../../../PrivacyComponent/UserPrivateComponent";

import { avatarColors, statusLabel } from "../../shared/constants";
import { shortMoney } from "../../shared/format";
import { initials, tenantNameFromLease } from "../../shared/tenants";
import { unitTypeIcon } from "../../shared/units";

const PropertyMenu = ({ unit, status, hasTenant, onAction }) => {
  const title = unit.displayName || unit.property?.name || unit.name || "Propriete";
  const subtitle = unit.code || unit.name || unit.property?.address || "Unite";

  const item = (action, icon, label, options = {}) => (
    <button
      type="button"
      className={options.highlight ? "highlight" : ""}
      onClick={(event) => {
        event.stopPropagation();
        onAction(action, unit);
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="immo-context-menu immo-property-context-menu">
      <div className={`immo-menu-head ${status === "vacant" || status === "available" ? "" : "pendingSignature"}`}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      {item("edit", <Pencil size={16} />, "Modifier l'unite", { highlight: true })}
      {(status === "vacant" || status === "available" || !hasTenant) && (
        <>
          <div className="immo-menu-separator" />
          {item("assign", <UserPlus size={16} />, "Assigner locataire")}
        </>
      )}
      {hasTenant && (
        <>
          <div className="immo-menu-separator" />
          {item("payments", <DollarSign size={16} />, "Voir paiements")}
          {item("lease", <FileText size={16} />, "Voir bail")}
        </>
      )}
      <UserPrivateComponent permission="delete-propertyManagement">
        <div className="immo-menu-separator" />
        <button
          type="button"
          className="danger"
          onClick={(event) => { event.stopPropagation(); onAction("delete", unit); }}
        >
          <Trash2 size={16} /> Supprimer
        </button>
      </UserPrivateComponent>
    </div>
  );
};

const PropertyCardGrid = ({ units, onAssignTenant, onEditUnit, onViewPayments, onViewLease, onDeleteUnit }) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const closeMenu = () => setOpenMenuId(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [openMenuId]);

  const handleMenuAction = (action, unit) => {
    setOpenMenuId(null);
    if (action === "assign") {
      onAssignTenant?.(unit);
      return;
    }
    if (action === "edit") {
      onEditUnit?.(unit);
      return;
    }
    if (action === "payments") {
      onViewPayments?.(unit);
      return;
    }
    if (action === "lease") {
      onViewLease?.(unit);
      return;
    }
    if (action === "delete") {
      onDeleteUnit?.(unit);
    }
  };

  return (
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
        const menuId = unit.id || `${unit.propertyId || "property"}-${unit.name || index}`;
        const isMenuOpen = openMenuId === menuId;

        return (
          <article key={unit.id || index} className={`immo-property-card ${cardTone} ${isMenuOpen ? "menu-open" : ""}`}>
            <div className="immo-property-media">
              <span className={`immo-status-chip ${cardTone}`}>
                {late ? "En retard" : statusLabel[status] || status}
              </span>
              <span className="immo-property-menu-anchor immo-menu-anchor">
                <button
                  type="button"
                  className={`immo-icon-button${isMenuOpen ? " active" : ""}`}
                  aria-label="Actions propriete"
                  aria-expanded={isMenuOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId((current) => (current === menuId ? null : menuId));
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>
                {isMenuOpen && (
                  <PropertyMenu
                    unit={unit}
                    status={status}
                    hasTenant={hasTenant}
                    onAction={handleMenuAction}
                  />
                )}
              </span>
              <span className="immo-property-watermark">
                {unitTypeIcon(unit.unitKind, 44)}
              </span>
              <div className="immo-property-code">
                {unit.unitKindLabel} - {unit.name || unit.code || `U-${unit.id}`}
              </div>
            </div>
            <div className="immo-property-body">
              <h3>{unit.displayName}</h3>
              <p>{unit.displayAddress}</p>
              <div className="immo-property-meta">
                <span><BedDouble size={14} />{unit.bedrooms ?? 0}</span>
                <span><Bath size={14} />{unit.bathrooms ?? 0}</span>
                <span>{unit.area ? `${unit.area}m2` : "-"}</span>
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
                  <strong className={late ? "danger" : ""}>{shortMoney(unit.monthlyRent, unit.currencySymbol)}</strong>
                  <span>/mois</span>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default PropertyCardGrid;
