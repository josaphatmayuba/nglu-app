import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  FileSignature,
  Search,
  Users,
} from "lucide-react";

import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";

import { compactMoney } from "./shared/format";
import { isPendingOnboarding } from "./shared/tenants";
import { MetricCard, MultiCurrencyValue } from "./shared/ui";
import { usePropertyManagementBootstrap, usePropertyManagementData } from "./shared/usePropertyManagementData";

import PropertiesPanel from "./modules/Properties/PropertiesPanel";
import UnitFormModal from "./modules/Properties/UnitFormModal";
import TenantsPanel from "./modules/Tenants/TenantsPanel";
import TenantOnboardingLinkModal from "./modules/Tenants/TenantOnboardingLinkModal";
import LeasesPanel from "./modules/Leases/LeasesPanel";
import PaymentsPanel from "./modules/Payments/PaymentsPanel";
import MaintenancePanel from "./modules/Maintenance/MaintenancePanel";

const PropertyManagement = () => {
  usePropertyManagementBootstrap();
  const {
    safeProperties,
    safePayments,
    enrichedUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    activeLeases,
    openMaintenance,
    visibleTenants,
    safeOnboarding,
    safeLeases,
    currencyOptions,
    occupancyRate,
    monthlyRent,
    monthlyRentByCurrency,
    overduePayments,
  } = usePropertyManagementData();

  const [activeSection, setActiveSection] = useState("properties");
  const [searchTerm, setSearchTerm] = useState("");
  const [onboardingLinkOpen, setOnboardingLinkOpen] = useState(false);

  // Unit modal is owned at page level because it can be triggered from any
  // Properties view (grid card "Modifier", list "Edit", map popup, etc.).
  const [unitModalRecord, setUnitModalRecord] = useState(null);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const pendingOnboardingCount = safeOnboarding.filter((record) => isPendingOnboarding(record)).length;

  const tabItems = [
    { key: "properties", label: "Propriétés", count: enrichedUnits.length },
    { key: "tenants", label: "Locataires", count: visibleTenants.length + pendingOnboardingCount },
    { key: "leases", label: "Baux", count: safeLeases.length },
    { key: "payments", label: "Paiements", count: safePayments.length },
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
            onViewUnitLease={() => setActiveSection("leases")}
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
            <Link to="/admin/property-management/contract-templates" className="immo-filter-button">
              <FileSignature size={17} /> Modèles de contrat
            </Link>
          </div>
        </div>

        <div className="immo-metrics-grid">
          <MetricCard
            icon={<Building2 size={20} />}
            label="Propriétés"
            value={enrichedUnits.length}
            helper={`${occupiedUnits.length} louées · ${vacantUnits.length} vacantes · ${maintenanceUnits.length} maintenance`}
          />
          <MetricCard
            icon={<Users size={20} />}
            label="Taux d'occupation"
            value={`${occupiedUnits.length}/${enrichedUnits.length || 0}`}
            helper={<span className="immo-progress"><span style={{ width: `${occupancyRate}%` }} /></span>}
            tone="green"
          />
          <MetricCard
            icon={<CreditCard size={20} />}
            label="Loyers du mois"
            value={<MultiCurrencyValue byCurrency={monthlyRentByCurrency} fallback={compactMoney(monthlyRent)} />}
            helper={`${safePayments.length} reçus · ${Math.max(activeLeases.length - safePayments.length, 0)} en attente`}
            tone="amber"
          />
          <MetricCard
            icon={<AlertTriangle size={20} />}
            label="Loyers en retard"
            value={overduePayments.length}
            helper={`${compactMoney(overduePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0))} à recouvrer`}
            tone="red"
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

export default PropertyManagement;
