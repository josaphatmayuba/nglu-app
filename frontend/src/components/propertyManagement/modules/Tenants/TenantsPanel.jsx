import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, UserRound } from "lucide-react";
import { message } from "antd";

import { deleteCustomer } from "../../../../redux/rtk/features/customer/customerSlice";
import {
  deleteTenantOnboarding,
  loadPropertyManagement,
  validateTenantOnboarding,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { normalize } from "../../shared/format";
import { parseOnboardingData, tenantName } from "../../shared/tenants";
import { EmptyState } from "../../shared/ui";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";

import OnboardingCard from "./OnboardingCard";
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
  const { visibleTenants, safeOnboarding, safeLeases, enrichedUnits } = usePropertyManagementData();

  const [internalSearch, setInternalSearch] = useState("");
  const searchTerm = searchTermProp != null ? searchTermProp : internalSearch;
  const setSearchTerm = (value) => {
    if (onSearchTermChange) onSearchTermChange(value);
    else setInternalSearch(value);
  };

  const [openMenuId, setOpenMenuId] = useState(null);
  const [modalRecord, setModalRecord] = useState(null);
  const [modalMode, setModalMode] = useState("tenant");
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
    if (!q) return visibleTenants;
    return visibleTenants.filter((tenant) => {
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
  }, [visibleTenants, searchTerm]);

  const pendingOnboarding = useMemo(() => {
    const now = Date.now();
    return safeOnboarding.filter((record) => {
      if (!record || record.status === "validated") return false;
      // Hide expired links automatically, unless the tenant already submitted
      // the dossier (status "submitted" still needs admin validation).
      if (record.status !== "submitted" && record.expiresAt) {
        const expiry = new Date(record.expiresAt).getTime();
        if (Number.isFinite(expiry) && expiry < now) return false;
      }
      return true;
    });
  }, [safeOnboarding]);

  const filteredOnboarding = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return pendingOnboarding;
    return pendingOnboarding.filter((record) => {
      const data = parseOnboardingData(record);
      const haystack = normalize(
        [
          data.firstName,
          data.lastName,
          data.email,
          data.phone,
          record.phone,
          record.status,
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [pendingOnboarding, searchTerm]);

  const tenantActiveLease = (tenant) =>
    safeLeases.find((lease) => lease.tenantId === tenant.id && lease.status === "active") ||
    safeLeases.find((lease) => lease.tenantId === tenant.id);

  const handleTenantAction = async (action, tenant) => {
    setOpenMenuId(null);
    if (action === "edit") {
      setModalRecord(tenant);
      setModalMode("tenant");
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
      const numericId = parseInt(String(tenant.id), 10);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        message.error("Impossible de supprimer : identifiant locataire invalide.");
        return;
      }
      const hasLease = safeLeases.some((lease) => Number(lease.tenantId) === numericId);
      if (hasLease) {
        message.warning("Impossible : ce locataire a un bail actif. Résiliez d'abord le bail.");
        return;
      }
      if (!window.confirm(`Supprimer définitivement le locataire « ${tenantName(tenant)} » ?`)) return;
      const result = await dispatch(deleteCustomer({ id: numericId }));
      if (result?.payload?.message === "success" || result?.meta?.requestStatus === "fulfilled") {
        message.success("Locataire supprimé");
        dispatch(loadPropertyManagement());
      } else {
        const apiError = result?.payload?.error || result?.error?.message;
        message.error(apiError || "Échec de la suppression");
      }
    }
  };

  const openOnboarding = (record) => {
    const data = parseOnboardingData(record);
    setModalRecord({
      ...data,
      phone: data.phone || record.phone,
      _onboardingId: record.id,
    });
    setModalMode("onboarding");
    setModalOpen(true);
  };

  const removeOnboarding = async (record) => {
    if (!window.confirm("Supprimer ce dossier d'inscription ?")) return;
    const response = await dispatch(deleteTenantOnboarding(record.id));
    if (response.payload?.message === "success" || response.meta?.requestStatus === "fulfilled") {
      message.success("Dossier d'inscription supprimé");
    } else {
      message.error(response.payload?.error || "Impossible de supprimer ce dossier.");
    }
  };

  const validateOnboarding = async (record) => {
    const response = await dispatch(validateTenantOnboarding(record.id));
    if (response.payload?.message === "success") {
      message.success("Dossier locataire valide");
      dispatch(loadPropertyManagement());
    } else {
      message.error(response.payload?.error || "Impossible de valider ce dossier.");
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
            setModalMode("tenant");
            setModalOpen(true);
          }}
        >
          <Plus size={18} /> Nouveau locataire
        </button>
      </div>

      {filteredOnboarding.length || filteredTenants.length ? (
        <div className="immo-tenant-grid">
          {filteredOnboarding.map((record, index) => (
            <OnboardingCard
              key={`onboarding-${record.id}`}
              record={record}
              index={index}
              onEdit={openOnboarding}
              onValidate={validateOnboarding}
              onDelete={removeOnboarding}
            />
          ))}
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
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSaved={() => setModalOpen(false)}
      />
    </div>
  );
};

export default TenantsPanel;
