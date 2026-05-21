import { useMemo, useState } from "react";
import moment from "moment";
import { Grid3X3, LayoutList, Map, Plus, SlidersHorizontal } from "lucide-react";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { deleteUnit, loadPropertyManagement } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";

import { typeFilters } from "../../shared/constants";
import { normalize } from "../../shared/format";
import { tenantNameFromLease } from "../../shared/tenants";
import { getUnitKind } from "../../shared/units";
import { EmptyState } from "../../shared/ui";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";

import PropertyCardGrid from "./PropertyCardGrid";
import PropertyFormModal from "./PropertyFormModal";
import PropertyListTable from "./PropertyListTable";
import PropertyMapView from "./PropertyMapView";
import RecentPaymentsTable from "./RecentPaymentsTable";
import "./PropertiesPanel.css";

const EMPTY_ADVANCED = {
  city: "",
  minRent: "",
  maxRent: "",
  minBedrooms: "",
  minArea: "",
};

const PropertiesPanel = ({
  searchTerm: searchTermProp,
  onSearchTermChange,
  onAssignTenant,
  onEditUnit,
  onViewAllPayments,
  onViewUnitLease,
}) => {
  const data = usePropertyManagementData();
  const { enrichedUnits, safePayments, overduePayments, upcomingPayments, currencyOptions } = data;

  const [internalSearch, setInternalSearch] = useState("");
  const searchTerm = searchTermProp != null ? searchTermProp : internalSearch;
  const setSearchTerm = (value) => {
    if (onSearchTermChange) onSearchTermChange(value);
    else setInternalSearch(value);
  };

  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED);
  const [propertyModalRecord, setPropertyModalRecord] = useState(null);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const dispatch = useDispatch();

  const filteredUnits = useMemo(() => {
    const q = normalize(searchTerm);
    const cityQ = normalize(advancedFilters.city);
    const minRent = advancedFilters.minRent === "" ? null : Number(advancedFilters.minRent);
    const maxRent = advancedFilters.maxRent === "" ? null : Number(advancedFilters.maxRent);
    const minBeds = advancedFilters.minBedrooms === "" ? null : Number(advancedFilters.minBedrooms);
    const minArea = advancedFilters.minArea === "" ? null : Number(advancedFilters.minArea);
    return enrichedUnits.filter((unit) => {
      if (typeFilter !== "all" && getUnitKind(unit) !== typeFilter) return false;
      const haystack = normalize(
        [
          unit.displayName,
          unit.name,
          unit.displayAddress,
          unit.activeLease?.reference,
          tenantNameFromLease(unit.activeLease),
        ].join(" "),
      );
      if (q && !haystack.includes(q)) return false;
      if (cityQ) {
        const cityHay = normalize(
          [unit.property?.city, unit.city, unit.displayAddress].filter(Boolean).join(" "),
        );
        if (!cityHay.includes(cityQ)) return false;
      }
      const rent = Number(unit.monthlyRent || 0);
      if (minRent != null && rent < minRent) return false;
      if (maxRent != null && rent > maxRent) return false;
      if (minBeds != null && Number(unit.bedrooms || 0) < minBeds) return false;
      if (minArea != null && Number(unit.area || 0) < minArea) return false;
      return true;
    });
  }, [enrichedUnits, searchTerm, typeFilter, advancedFilters]);

  const activeFilterCount = useMemo(
    () => Object.values(advancedFilters).filter((v) => v !== "" && v != null).length,
    [advancedFilters],
  );

  const recentRentPayments = useMemo(
    () =>
      [...safePayments]
        .sort((a, b) => {
          const da = a?.paymentDate ? moment(a.paymentDate).valueOf() : 0;
          const db = b?.paymentDate ? moment(b.paymentDate).valueOf() : 0;
          return db - da;
        })
        .slice(0, 5),
    [safePayments],
  );

  const handleAssignTenant = (unit) => {
    if (onAssignTenant) onAssignTenant(unit);
    else window.alert(`(demo) Assigner un locataire à ${unit.displayName || unit.name}`);
  };
  const handleEditUnit = (unit) => {
    if (onEditUnit) onEditUnit(unit);
    else window.alert(`(demo) Modifier l'unité ${unit.displayName || unit.name}`);
  };

  const handleViewUnitPayments = (unit) => {
    if (onViewAllPayments) onViewAllPayments(unit);
    else window.alert(`(demo) Voir paiements pour ${unit.displayName || unit.name}`);
  };
  const handleDeleteUnit = (unit) => setDeleteTarget(unit);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const resp = await dispatch(deleteUnit(deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
    if (resp?.payload?.message === "success") {
      toast.success("Unité supprimée");
      dispatch(loadPropertyManagement());
    } else {
      toast.error(resp?.payload?.message || "Échec de la suppression");
    }
  };

  const handleViewUnitLease = (unit) => {
    if (onViewUnitLease) {
      onViewUnitLease(unit);
      return;
    }
    if (unit.activeLease?.id) {
      window.alert(`(demo) Voir bail ${unit.activeLease.reference || unit.activeLease.id}`);
      return;
    }
    handleAssignTenant(unit);
  };

  return (
    <div className="immo-properties-panel">
      <div className="immo-properties-toolbar">
        <input
          type="search"
          className="immo-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher adresse, locataire..."
        />
        <button
          type="button"
          className={`immo-filter-button${advancedOpen ? " active" : ""}`}
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <SlidersHorizontal size={17} /> Filtres
          {activeFilterCount > 0 && (
            <span className="immo-filter-badge">{activeFilterCount}</span>
          )}
        </button>
        <button
          type="button"
          className="immo-primary-button"
          onClick={() => {
            setPropertyModalRecord(null);
            setPropertyModalOpen(true);
          }}
        >
          <Plus size={18} /> Nouvelle propriété
        </button>
      </div>

      {advancedOpen && (
        <div className="immo-advanced-filters" role="region" aria-label="Filtres avancés">
          <div className="immo-advanced-filters-grid">
            <label>
              <span>Ville / quartier</span>
              <input
                type="text"
                value={advancedFilters.city}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="ex. Gombe"
              />
            </label>
            <label>
              <span>Loyer min</span>
              <input
                type="number"
                min="0"
                value={advancedFilters.minRent}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, minRent: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label>
              <span>Loyer max</span>
              <input
                type="number"
                min="0"
                value={advancedFilters.maxRent}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, maxRent: e.target.value }))}
                placeholder="∞"
              />
            </label>
            <label>
              <span>Chambres (min)</span>
              <input
                type="number"
                min="0"
                value={advancedFilters.minBedrooms}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, minBedrooms: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label>
              <span>Surface min (m²)</span>
              <input
                type="number"
                min="0"
                value={advancedFilters.minArea}
                onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, minArea: e.target.value }))}
                placeholder="0"
              />
            </label>
          </div>
          <div className="immo-advanced-filters-foot">
            <span className="immo-advanced-filters-summary">
              {activeFilterCount === 0
                ? "Aucun filtre actif"
                : `${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}`}
            </span>
            <button
              type="button"
              className="immo-advanced-filters-clear"
              onClick={() => setAdvancedFilters(EMPTY_ADVANCED)}
              disabled={activeFilterCount === 0}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      <div className="immo-filters">
        <div className="immo-filter-group">
          <span>Type :</span>
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={typeFilter === filter.value ? "active" : ""}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="immo-view-switch">
          <span>Vue :</span>
          {[
            { key: "grid", icon: <Grid3X3 size={15} /> },
            { key: "list", icon: <LayoutList size={15} /> },
            { key: "map",  icon: <Map size={15} /> },
          ].map((view) => (
            <button
              key={view.key}
              type="button"
              className={viewMode === view.key ? "active" : ""}
              onClick={() => setViewMode(view.key)}
            >
              {view.icon}
            </button>
          ))}
        </div>
      </div>

      {filteredUnits.length ? (
        viewMode === "map" ? (
          <PropertyMapView units={filteredUnits} onAssignTenant={handleAssignTenant} />
        ) : viewMode === "list" ? (
          <PropertyListTable
            units={filteredUnits}
            onAssignTenant={handleAssignTenant}
            onEditUnit={handleEditUnit}
            onDeleteUnit={handleDeleteUnit}
          />
        ) : (
          <PropertyCardGrid
            units={filteredUnits}
            onAssignTenant={handleAssignTenant}
            onEditUnit={handleEditUnit}
            onViewPayments={handleViewUnitPayments}
            onViewLease={handleViewUnitLease}
            onDeleteUnit={handleDeleteUnit}
          />
        )
      ) : (
        <EmptyState
          title="Aucune propriété"
          text="Ajoutez une propriété ou ajustez la recherche pour afficher vos unités."
        />
      )}

      <RecentPaymentsTable
        payments={recentRentPayments}
        latePayments={overduePayments}
        pendingPayments={upcomingPayments}
        onViewAll={onViewAllPayments}
      />

      <PropertyFormModal
        open={propertyModalOpen}
        record={propertyModalRecord}
        currencyOptions={currencyOptions}
        onClose={() => setPropertyModalOpen(false)}
        onSaved={() => setPropertyModalOpen(false)}
      />

      {deleteTarget && (
        <div className="immo-confirm-overlay" role="dialog" aria-modal="true">
          <div className="immo-confirm-dialog">
            <h3>Supprimer l&apos;unité</h3>
            <p>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget.displayName || deleteTarget.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="immo-confirm-actions">
              <button type="button" className="immo-secondary-button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Annuler
              </button>
              <button type="button" className="immo-danger-button" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
