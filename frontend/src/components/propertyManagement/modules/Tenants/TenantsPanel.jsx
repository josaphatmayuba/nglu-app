import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, UserRound } from "lucide-react";
import { message } from "antd";

import { deleteCustomer } from "../../../../redux/rtk/features/customer/customerSlice";
import { loadPropertyManagement } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { normalize } from "../../shared/format";
import { tenantName } from "../../shared/tenants";
import { EmptyState } from "../../shared/ui";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";

import TenantCard from "./TenantCard";
import TenantFormModal from "./TenantFormModal";
import "./TenantsPanel.css";

const TenantsPanel = ({
  searchTerm: searchTermProp,
  onSearchTermChange,
  onGenerateOnboardingLink,
  onNavigateToLeases,
  onNavigateToPayments,
  onOpenLeaseMenu,
}) => {
  const dispatch = useDispatch();
  const { safeTenants, safeLeases, enrichedUnits } = usePropertyManagementData();

  const [internalSearch, setInternalSearch] = useState("");
  const searchTerm = searchTermProp != null ? searchTermProp : internalSearch;
  const setSearchTerm = (value) => {
    if (onSearchTermChange) onSearchTermChange(value);
    else setInternalSearch(value);
  };

  const [openMenuId, setOpenMenuId] = useState(null);
  const [modalRecord, setModalRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Close any open context menu on outside click.
  useEffect(() => {
    if (!openMenuId) return undefined;
    const onDocClick = () => setOpenMenuId(null);
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [openMenuId]);

  const filteredTenants = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return safeTenants;
    return safeTenants.filter((tenant) => {
      const haystack = normalize(
        [
          tenant.firstName,
          tenant.lastName,
          tenant.username,
          tenant.email,
          tenant.phone,
          tenant.address,
          tenantName(tenant),
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [safeTenants, searchTerm]);

  const tenantActiveLease = (tenant) =>
    safeLeases.find((lease) => lease.tenantId === tenant.id && lease.status === "active") ||
    safeLeases.find((lease) => lease.tenantId === tenant.id);

  const handleTenantAction = async (action, tenant) => {
    setOpenMenuId(null);
    if (action === "edit") {
      setModalRecord(tenant);
      setModalOpen(true);
      return;
    }
    if (action === "viewLease") {
      const lease = tenantActiveLease(tenant);
      if (lease) {
        if (onNavigateToLeases) onNavigateToLeases(lease);
        else if (onOpenLeaseMenu) onOpenLeaseMenu(`card-${lease.id}`);
        else message.info(`Bail ${lease.reference || `#${lease.id}`} disponible dans l'onglet Baux.`);
      } else {
        message.info("Ce locataire n'a pas encore de bail.");
      }
      return;
    }
    if (action === "viewPayments") {
      if (onNavigateToPayments) onNavigateToPayments(tenant);
      else message.info("Ouvrez l'onglet Paiements pour consulter les paiements.");
      return;
    }
    if (action === "copyEmail") {
      if (tenant.email) {
        navigator.clipboard?.writeText(tenant.email);
        message.success("Email copié");
      } else {
        message.warning("Pas d'email enregistré");
      }
      return;
    }
    if (action === "copyPhone") {
      if (tenant.phone) {
        navigator.clipboard?.writeText(tenant.phone);
        message.success("Téléphone copié");
      } else {
        message.warning("Pas de téléphone enregistré");
      }
      return;
    }
    if (action === "delete") {
      const hasLease = safeLeases.some((lease) => lease.tenantId === tenant.id);
      if (hasLease) {
        message.warning("Impossible : ce locataire a un bail actif. Résiliez d'abord le bail.");
        return;
      }
      if (!window.confirm(`Supprimer définitivement le locataire « ${tenantName(tenant)} » ?`)) return;
      const result = await dispatch(deleteCustomer(tenant.id));
      if (result?.payload?.message === "success" || result?.meta?.requestStatus === "fulfilled") {
        message.success("Locataire supprimé");
        dispatch(loadPropertyManagement());
      } else {
        message.error("Échec de la suppression");
      }
    }
  };

  return (
    <div className="immo-tenants-panel">
      <div className="immo-tenants-toolbar">
        <input
          type="search"
          className="immo-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher locataire (nom, email, téléphone)..."
        />
        <button
          type="button"
          className="immo-filter-button"
          onClick={() => {
            if (onGenerateOnboardingLink) onGenerateOnboardingLink();
            else message.info("La génération du lien d'inscription sera ajoutée dans le module Locataires.");
          }}
        >
          <UserRound size={17} /> Lien d'inscription
        </button>
        <button
          type="button"
          className="immo-primary-button"
          onClick={() => {
            setModalRecord(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Nouveau locataire
        </button>
      </div>

      {filteredTenants.length ? (
        <div className="immo-tenant-grid">
          {filteredTenants.map((tenant, index) => {
            const tenantLeases = safeLeases.filter((lease) => lease.tenantId === tenant.id);
            const activeLease = tenantLeases.find((l) => l.status === "active") || tenantLeases[0];
            const activeUnit = enrichedUnits.find((unit) => unit.id === activeLease?.unitId);
            return (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                index={index}
                tenantLeases={tenantLeases}
                activeUnit={activeUnit}
                menuOpen={openMenuId === tenant.id}
                onToggleMenu={() => setOpenMenuId(openMenuId === tenant.id ? null : tenant.id)}
                onAction={handleTenantAction}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={searchTerm ? "Aucun locataire trouvé" : "Aucun locataire"}
          text={searchTerm
            ? `Aucun résultat pour « ${searchTerm} ».`
            : "Créez un locataire ou générez un lien d'inscription."}
        />
      )}

      <TenantFormModal
        open={modalOpen}
        record={modalRecord}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  );
};

export default TenantsPanel;
