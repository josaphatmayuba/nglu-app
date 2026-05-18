import { Button, message } from "antd";
import { Grid3X3, Layers, List, Plus, RefreshCw } from "lucide-react";
import moment from "moment";
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import {
  createContract,
  deleteLease,
  loadContracts,
  loadPropertyManagement,
  renewLease as renewLeaseThunk,
  saveLease,
  sendContract,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { normalize } from "../../shared/format";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import ContractWorkflowModal from "./ContractWorkflowModal";
import LeaseFormModal from "./LeaseFormModal";
import LeaseGridView from "./LeaseGridView";
import LeaseRenewModal from "./LeaseRenewModal";
import LeaseTableView from "./LeaseTableView";
import LeaseTimelineView from "./LeaseTimelineView";
import SignedContractView from "./SignedContractView";
import { leaseContractFor, leaseDisplayInfo } from "./leaseUtils";

const LeasesPanel = ({
  onViewMaintenance,
  onViewPayments,
  searchTerm = "",
}) => {
  const dispatch = useDispatch();
  const [leaseStatusFilter, setLeaseStatusFilter] = useState("all");
  const [leaseView, setLeaseView] = useState("grid");
  const [openLeaseMenu, setOpenLeaseMenu] = useState(null);
  const [leaseModal, setLeaseModal] = useState(null);
  const [contractModal, setContractModal] = useState(null);
  const [signedContractId, setSignedContractId] = useState(null);
  const [renewModal, setRenewModal] = useState(null);
  const [contractLinks, setContractLinks] = useState({});
  const [savingLease, setSavingLease] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);

  const {
    contractTemplates,
    currencyOptions,
    safeContracts,
    safeLeases,
    safeProperties,
    safeTenants,
    safeUnits,
  } = usePropertyManagementData();

  const filteredLeases = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return safeLeases;
    return safeLeases.filter((lease) => {
      const haystack = normalize(
        [
          lease.reference,
          lease.propertyName,
          lease.propertyAddress,
          lease.unitName,
          lease.tenantEmail,
          [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" "),
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [safeLeases, searchTerm]);

  const searchScope = filteredLeases;
  const missingContractLeases = searchScope.filter((lease) => !leaseContractFor(lease, safeContracts));
  const renewLeases = searchScope.filter((lease) => {
    if (!lease.endDate) return false;
    const daysLeft = moment(lease.endDate).diff(moment(), "days");
    return daysLeft >= 0 && daysLeft <= 60;
  });
  const expiredLeases = searchScope.filter((lease) => lease.endDate && moment(lease.endDate).isBefore(moment()));
  const activeLeasesView = searchScope.filter((lease) => lease.status === "active");
  const leasesView =
    leaseStatusFilter === "active" ? activeLeasesView
    : leaseStatusFilter === "renew" ? renewLeases
    : leaseStatusFilter === "expired" ? expiredLeases
    : leaseStatusFilter === "no-contract" ? missingContractLeases
    : searchScope;
  const leaseFilterChips = [
    { key: "all", label: "Tous", count: searchScope.length },
    { key: "active", label: "Actifs", count: activeLeasesView.length },
    { key: "renew", label: "À renouveler", count: renewLeases.length },
    { key: "expired", label: "Expirés", count: expiredLeases.length },
    { key: "no-contract", label: "Sans contrat", count: missingContractLeases.length },
  ];

  const generateMissingContracts = async () => {
    const missingLeases = safeLeases.filter((lease) => !leaseContractFor(lease, safeContracts));
    if (!missingLeases.length) {
      message.success("Tous les baux ont déjà un contrat");
      return;
    }
    await Promise.all(missingLeases.map((lease) => dispatch(createContract({ leaseId: lease.id }))));
    message.success(`${missingLeases.length} contrat(s) généré(s)`);
    dispatch(loadContracts());
  };

  const deleteLeaseRecord = async (lease) => {
    if (!window.confirm("Supprimer ce bail ?")) return;
    const response = await dispatch(deleteLease(lease.id));
    if (response.payload?.message === "success") {
      message.success("Bail supprimé");
      dispatch(loadPropertyManagement());
    }
  };

  const openContractWorkflow = (lease, contract = leaseContractFor(lease, safeContracts)) => {
    setOpenLeaseMenu(null);
    setContractModal({ lease, contract });
  };

  // Lookup priority : runtime cache (filled after a sendContract call) →
  // any URL-like field the backend may expose on the contract row.
  const getContractLink = (contract) =>
    contractLinks[contract?.id] ||
    contract?.signingUrl ||
    contract?.signatureUrl ||
    contract?.signatureLink ||
    contract?.publicUrl ||
    contract?.url ||
    "";

  // Returns the signing URL for a contract, generating one on the fly if
  // none exists yet (calls POST /contracts/:id/send which returns the link).
  const ensureSigningLink = async (contract) => {
    if (!contract?.id) return "";
    const existing = getContractLink(contract);
    if (existing) return existing;
    const response = await dispatch(sendContract(contract.id));
    const link = response.payload?.data?.signingUrl || "";
    if (link) {
      setContractLinks((prev) => ({ ...prev, [contract.id]: link }));
      await dispatch(loadContracts());
    }
    return link;
  };

  const copyText = async (value) => {
    if (!value) {
      message.warning("Aucun lien disponible pour ce bail.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      message.success("Lien copié");
    } catch {
      message.error("Échec de la copie. Copiez manuellement : " + value);
    }
  };

  const handleLeaseAction = (action, lease, contract) => {
    setOpenLeaseMenu(null);
    if (action === "detail" || action === "edit") {
      setLeaseModal(lease);
      return;
    }
    if (action === "contract" || action === "pdf") {
      // Pour un contrat déjà signé : on ouvre la vue read-only (avec
      // signature visible et bouton Télécharger PDF). Sinon, on garde
      // l'ancien workflow de génération/envoi.
      if (contract?.id && contract.status === "signed") {
        setSignedContractId(contract.id);
      } else {
        openContractWorkflow(lease, contract);
      }
      return;
    }
    if (action === "renew") {
      setRenewModal(lease);
      return;
    }
    if (action === "delete" || action === "terminate") {
      deleteLeaseRecord(lease);
      return;
    }
    if (action === "payments") {
      if (onViewPayments) onViewPayments(lease);
      else message.info("Le lien vers le module Paiements sera branché en Phase F.");
      return;
    }
    if (action === "maintenance") {
      if (onViewMaintenance) onViewMaintenance(lease);
      else message.info("Le lien vers le module Maintenance sera branché en Phase F.");
      return;
    }
    if (action === "copyLink") {
      ensureSigningLink(contract).then(copyText);
      return;
    }
    if (action === "resend") {
      ensureSigningLink(contract).then((link) => {
        if (link) message.success("Lien de signature renvoyé au locataire.");
        else message.error("Impossible de récupérer le lien de signature.");
      });
      return;
    }
    if (["cancelSend", "archive"].includes(action)) {
      message.info("Cette action sera finalisée dans l'assemblage Phase F.");
    }
  };

  const submitLease = async ({ id, values }) => {
    setSavingLease(true);
    try {
      const response = await dispatch(saveLease({ id, values }));
      if (response.payload?.message === "success") {
        message.success(id ? "Bail mis à jour" : "Bail créé");
        dispatch(loadPropertyManagement());
        setLeaseModal(null);
      }
    } finally {
      setSavingLease(false);
    }
  };

  const submitRenewLease = async (values) => {
    if (!renewModal) return;
    setRenewBusy(true);
    const response = await dispatch(
      renewLeaseThunk({
        id: renewModal.id,
        values: {
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
          rentAmount: values.rentAmount != null ? Number(values.rentAmount) : undefined,
          templateId: values.templateId || undefined,
          endCurrentLease: Boolean(values.endCurrentLease),
        },
      }),
    );
    setRenewBusy(false);
    if (response.payload?.message === "success") {
      message.success("Bail renouvelé");
      dispatch(loadPropertyManagement());
      dispatch(loadContracts());
      setRenewModal(null);
    }
  };

  const viewProps = {
    contracts: safeContracts,
    leases: leasesView,
    onAction: handleLeaseAction,
    openMenu: openLeaseMenu,
    setOpenMenu: setOpenLeaseMenu,
  };

  return (
    <div className="immo-table-flow">
      {missingContractLeases.length > 0 && (
        <div className="immo-alert-strip">
          <div>
            <strong>{missingContractLeases.length} bail{missingContractLeases.length > 1 ? "s" : ""} sans contrat</strong>
            <span>Générez les contrats pour sécuriser la signature et l'archivage.</span>
          </div>
          <Button type="primary" size="small" onClick={generateMissingContracts}>
            Générer les contrats
          </Button>
        </div>
      )}
      <div className="immo-table-toolbar">
        <div className="immo-filter-group">
          {leaseFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={leaseStatusFilter === chip.key ? "active" : ""}
              onClick={() => setLeaseStatusFilter(chip.key)}
            >
              {chip.label} <span>{chip.count}</span>
            </button>
          ))}
        </div>
        <div className="immo-lease-actions">
          <div className="immo-view-toggle" aria-label="Vue des baux">
            {[
              { key: "grid", label: "Grille", icon: <Grid3X3 size={15} /> },
              { key: "table", label: "Tableau", icon: <List size={15} /> },
              { key: "timeline", label: "Timeline", icon: <Layers size={15} /> },
            ].map((view) => (
              <button
                key={view.key}
                type="button"
                className={leaseView === view.key ? "active" : ""}
                onClick={() => setLeaseView(view.key)}
              >
                {view.icon}
                {view.label}
              </button>
            ))}
          </div>
          <button type="button" className="immo-primary-button" onClick={() => setLeaseModal({})}>
            <Plus size={16} /> Nouveau bail
          </button>
        </div>
      </div>

      {leaseView === "grid" && <LeaseGridView {...viewProps} />}
      {leaseView === "table" && <LeaseTableView {...viewProps} />}
      {leaseView === "timeline" && <LeaseTimelineView {...viewProps} />}

      <LeaseFormModal
        currencyOptions={currencyOptions}
        onCancel={() => setLeaseModal(null)}
        onSubmit={submitLease}
        open={Boolean(leaseModal)}
        properties={safeProperties}
        record={leaseModal?.id ? leaseModal : null}
        saving={savingLease}
        tenants={safeTenants}
        units={safeUnits}
      />
      <LeaseRenewModal
        contractTemplates={contractTemplates}
        lease={renewModal}
        onCancel={() => setRenewModal(null)}
        onSubmit={submitRenewLease}
        open={Boolean(renewModal)}
        saving={renewBusy}
        units={safeUnits}
      />
      {contractModal?.lease && (
        <ContractWorkflowModal
          contract={contractModal.contract}
          contractLinks={contractLinks}
          contractTemplates={contractTemplates}
          lease={contractModal.lease}
          onClose={() => setContractModal(null)}
          onContractLink={(id, link) => setContractLinks((prev) => ({ ...prev, [id]: link }))}
          tenants={safeTenants}
          units={safeUnits}
        />
      )}
      <SignedContractView
        open={Boolean(signedContractId)}
        contractId={signedContractId}
        onClose={() => setSignedContractId(null)}
      />
    </div>
  );
};

export default LeasesPanel;
