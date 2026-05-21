import { useMemo, useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import UserPrivateComponent from "../../../PrivacyComponent/UserPrivateComponent";

import { avatarColors as defaultAvatarColors, propertyListColumns, statusLabel } from "../../shared/constants";
import { shortMoney } from "../../shared/format";
import { initials as defaultInitials, tenantNameFromLease } from "../../shared/tenants";
import { unitTypeIcon } from "../../shared/units";

const propertyListSortValue = (unit, key) => {
  const status = unit.activeLease ? "occupied" : unit.status || "vacant";
  const late = unit.activeLease?.status === "late" || unit.activeLease?.isOverdue;

  switch (key) {
    case "code":
      return unit.code || unit.name || `U-${unit.id || ""}`;
    case "name":
      return unit.displayName || "";
    case "type":
      return unit.unitKindLabel || "";
    case "status":
      return late ? "En retard" : statusLabel[status] || status;
    case "tenant":
      return tenantNameFromLease(unit.activeLease);
    case "rent":
      return Number(unit.monthlyRent || 0);
    default:
      return "";
  }
};

// `avatarColors` and `initials` are accepted as props for legacy compatibility
// (the inline version in PropertyManagement.jsx still passes them in). They
// fall back to the shared module versions when called from the new modules.
const PropertyListTable = ({
  units,
  avatarColors = defaultAvatarColors,
  initials = defaultInitials,
  onAssignTenant,
  onEditUnit,
  onDeleteUnit,
}) => {
  const [sortState, setSortState] = useState({ key: "code", direction: "asc" });

  const sortedUnits = useMemo(() => {
    const direction = sortState.direction === "asc" ? 1 : -1;
    return [...units].sort((a, b) => {
      const left = propertyListSortValue(a, sortState.key);
      const right = propertyListSortValue(b, sortState.key);
      if (typeof left === "number" || typeof right === "number") {
        return ((Number(left) || 0) - (Number(right) || 0)) * direction;
      }
      return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [sortState, units]);

  const toggleSort = (key) => {
    setSortState((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <div className="immo-property-list-table">
      <div className="immo-table-scroll">
        <table>
          <thead>
            <tr>
              {propertyListColumns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "right" : ""}>
                  <button
                    type="button"
                    className={sortState.key === column.key ? "active" : ""}
                    onClick={() => toggleSort(column.key)}
                    aria-sort={
                      sortState.key === column.key
                        ? sortState.direction === "asc" ? "ascending" : "descending"
                        : "none"
                    }
                  >
                    {column.label}
                    <span>{sortState.key === column.key ? (sortState.direction === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                </th>
              ))}
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUnits.map((unit, index) => {
              const status = unit.activeLease ? "occupied" : unit.status || "vacant";
              const late = unit.activeLease?.status === "late" || unit.activeLease?.isOverdue;
              const statusTone =
                late ? "danger"
                : status === "maintenance" ? "warning"
                : status === "occupied" ? "success"
                : "neutral";
              const tenantLabel = tenantNameFromLease(unit.activeLease);
              const hasTenant = unit.activeLease && tenantLabel !== "-";
              const unitCode = unit.code || unit.name || `U-${unit.id}`;

              return (
                <tr key={unit.id || `${unitCode}-${index}`}>
                  <td>
                    <span className="immo-property-code-cell">
                      {unitTypeIcon(unit.unitKind, 15)}
                      <span className="mono">{unitCode}</span>
                    </span>
                  </td>
                  <td>
                    <div className="immo-property-name-cell">
                      <strong>{unit.displayName}</strong>
                      <span>{unit.displayAddress}</span>
                    </div>
                  </td>
                  <td>{unit.unitKindLabel}</td>
                  <td>
                    <span className={`immo-property-table-status ${statusTone}`}>
                      {late ? "En retard" : statusLabel[status] || status}
                    </span>
                  </td>
                  <td>
                    {hasTenant ? (
                      <span className="immo-property-table-tenant">
                        <span className={`mini-avatar ${avatarColors[index % avatarColors.length]}`}>
                          {initials(tenantLabel)}
                        </span>
                        {tenantLabel}
                      </span>
                    ) : (
                      <span className="immo-empty-cell">Libre</span>
                    )}
                  </td>
                  <td className="right">
                    <strong>{shortMoney(unit.monthlyRent, unit.currencySymbol)}</strong>
                  </td>
                  <td className="actions">
                    {!hasTenant && (
                      <button
                        type="button"
                        className="immo-flat-icon"
                        title="Assigner locataire"
                        onClick={() => onAssignTenant?.(unit)}
                      >
                        <UserPlus size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="immo-flat-icon"
                      title="Modifier unite"
                      onClick={() => onEditUnit?.(unit)}
                    >
                      <Pencil size={15} />
                    </button>
                    <UserPrivateComponent permission="delete-propertyManagement">
                      <button
                        type="button"
                        className="immo-flat-icon danger"
                        title="Supprimer l'unité"
                        onClick={() => onDeleteUnit?.(unit)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </UserPrivateComponent>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PropertyListTable;
