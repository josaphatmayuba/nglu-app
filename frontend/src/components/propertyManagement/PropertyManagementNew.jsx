// Phase F — modular assembly of the Property Management page.
//
// This file is INTENTIONALLY NOT WIRED as the default route. The legacy
// PropertyManagement.jsx remains the production component at
// /admin/property-management. PropertyManagementNew is reachable only via
// the dormant preview route /admin/property-management/_new so the user can
// validate the new assembly side-by-side before the final cutover.
//
// To activate this in place of the legacy: edit PropertyManagementRoutes.jsx
// and swap the import on the root /property-management route.

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  FileSignature,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

import { compactMoney } from "./shared/format";
import { MetricCard, MultiCurrencyValue } from "./shared/ui";
import { usePropertyManagementData } from "./shared/usePropertyManagementData";

import PropertiesPanel from "./modules/Properties/PropertiesPanel";
import UnitFormModal from "./modules/Properties/UnitFormModal";
import TenantsPanel from "./modules/Tenants/TenantsPanel";
import TenantOnboardingLinkModal from "./modules/Tenants/TenantOnboardingLinkModal";
import LeasesPanel from "./modules/Leases/LeasesPanel";
import PaymentsPanel from "./modules/Payments/PaymentsPanel";
import MaintenancePanel from "./modules/Maintenance/MaintenancePanel";

const EMPTY_ADVANCED = {
  city: "",
  minRent: "",
  maxRent: "",
  minBedrooms: "",
  minArea: "",
};

const PropertyManagementNew = () => {
  const {
    safeProperties,
    safePayments,
    enrichedUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    activeLeases,
    openMaintenance,
    safeTenants,
    safeLeases,
    currencyOptions,
    occupancyRate,
    monthlyRent,
    monthlyRentByCurrency,
    overduePayments,
  } = usePropertyManagementData();

  const [activeSection, setActiveSection] = useState("properties");
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState(EMPTY_ADVANCED);

  // Unit modal is owned at page level because it can be triggered from any
  // Properties view (grid card "Modifier", list "Edit", map popup, etc.).
  const [unitModalRecord, setUnitModalRecord] = useState(null);
  const [unitModalOpen, setUnitModalOpen] = useState(false);

  // Onboarding-link modal (SCRUM-79): triggered from the Tenants panel
  // header ("Lien d'inscription" button).
  const [onboardingLinkOpen, setOnboardingLinkOpen] = useState(false);

  const activeFilterCount = Object.values(advancedFilters).filter(
    (v) => v !== "" && v != null,
  ).length;

  const tabItems = [
    { key: "properties",  label: "Propriétés",  count: enrichedUnits.length || safeProperties.length },
    { key: "tenants",     label: "Locataires",  count: safeTenants.length },
    { key: "leases",      label: "Baux",        count: safeLeases.length },
    { key: "payments",    label: "Paiements",   count: safePayments.length },
    { key: "maintenance", label: "Maintenance", count: openMaintenance.length, danger: true },
  ];

  const renderPanel = () => {
    switch (activeSection) {
      case "tenants":
        return (
          <TenantsPanel
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onNavigateToLeases={() => setActiveSection("leases")}
            onNavigateToPayments={() => setActiveSection("payments")}
            onGenerateOnboardingLink={() => setOnboardingLinkOpen(true)}
          />
        );
      case "leases":
        return (
          <LeasesPanel
            searchTerm={searchTerm}
            onViewMaintenance={() => setActiveSection("maintenance")}
            onViewPayments={() => setActiveSection("payments")}
          />
        );
      case "payments":
        return <PaymentsPanel searchTerm={searchTerm} />;
      case "maintenance":
        return <MaintenancePanel searchTerm={searchTerm} />;
      case "properties":
      default:
        return (
          <PropertiesPanel
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onAssignTenant={() => setActiveSection("leases")}
            onEditUnit={(unit) => {
              setUnitModalRecord(unit);
              setUnitModalOpen(true);
            }}
            onViewAllPayments={() => setActiveSection("payments")}
          />
        );
    }
  };

  return (
    <div className="property-management-page immo-page">
      <UserPrivateComponent permission={"readAll-propertyManagement"}>
        <div className="immo-header">
          <div>
            <h1>Immobilier</h1>
            <p>Propriétés, baux, locataires et paiements de loyer</p>
          </div>
          <div className="immo-header-actions">
            <label className="immo-search">
              <Search size={17} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher adresse, locataire..."
              />
            </label>
            <button
              type="button"
              className={`immo-filter-button${advancedFiltersOpen ? " active" : ""}`}
              onClick={() => setAdvancedFiltersOpen((v) => !v)}
              aria-expanded={advancedFiltersOpen}
            >
              <SlidersHorizontal size={17} /> Filtres
              {activeFilterCount > 0 && (
                <span className="immo-filter-badge">{activeFilterCount}</span>
              )}
            </button>
            <Link to="/admin/property-management/contract-templates" className="immo-filter-button">
              <FileSignature size={17} /> Modèles de contrat
            </Link>
            <Link to="/admin/property-management/settings" className="immo-filter-button" title="Paramètres Immobilier">
              <Settings size={17} /> Paramètres
            </Link>
          </div>
        </div>

        {advancedFiltersOpen && (
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
                  ? "Aucun filtre actif (les filtres avancés ne sont appliqués qu'à l'onglet Propriétés pour l'instant)"
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

        <div className="immo-metrics-grid">
          <MetricCard
            icon={<Building2 size={20} />}
            label="Propriétés"
            value={enrichedUnits.length || safeProperties.length}
            helper={`${occupiedUnits.length} louées · ${vacantUnits.length} vacantes · ${maintenanceUnits.length} maintenance`}
            trend={{ label: "↑ 2" }}
          />
          <MetricCard
            icon={<Users size={20} />}
            label="Taux d'occupation"
            value={`${occupiedUnits.length}/${enrichedUnits.length || 0}`}
            helper={<span className="immo-progress"><span style={{ width: `${occupancyRate}%` }} /></span>}
            tone="green"
            trend={{ label: `${occupancyRate}%` }}
          />
          <MetricCard
            icon={<CreditCard size={20} />}
            label="Loyers du mois"
            value={<MultiCurrencyValue byCurrency={monthlyRentByCurrency} fallback={compactMoney(monthlyRent)} />}
            helper={`${safePayments.length} reçus · ${Math.max(activeLeases.length - safePayments.length, 0)} en attente`}
            tone="amber"
            trend={{ label: "↑ 8.2%" }}
          />
          <MetricCard
            icon={<AlertTriangle size={20} />}
            label="Loyers en retard"
            value={overduePayments.length}
            helper={`${compactMoney(overduePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0))} à recouvrer`}
            tone="red"
            trend={{ label: `↑ ${overduePayments.length}`, tone: "danger" }}
          />
        </div>

        <div className="immo-tabs" role="tablist" aria-label="Sections immobilier">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeSection === tab.key ? "active" : ""}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.label}
              <span className={tab.danger ? "danger" : ""}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="immo-panel">{renderPanel()}</div>
      </UserPrivateComponent>

      <UnitFormModal
        open={unitModalOpen}
        record={unitModalRecord}
        properties={safeProperties}
        currencyOptions={currencyOptions}
        onClose={() => setUnitModalOpen(false)}
        onSaved={() => setUnitModalOpen(false)}
      />

      <TenantOnboardingLinkModal
        open={onboardingLinkOpen}
        onClose={() => setOnboardingLinkOpen(false)}
      />
    </div>
  );
};

export default PropertyManagementNew;
