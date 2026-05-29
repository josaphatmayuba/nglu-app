import { Button, Modal, message } from "antd";
import { Download, Grid3X3, Layers, List, Plus, RefreshCw } from "lucide-react";
import moment from "moment";
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import {
  createContract,
  deleteLease,
  loadContracts,
  loadLeasesDashboard,
  renewLease as renewLeaseThunk,
  saveLease,
  sendContract,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { normalize } from "../../shared/format";
import { tenantNameFromLease } from "../../shared/tenants";
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  const requestLeaseDeletion = (lease, action) => {
    setDeleteTarget({ lease, action });
  };

  const confirmDeleteLease = async () => {
    if (!deleteTarget?.lease?.id) return;
    setDeleteBusy(true);
    try {
      const response = await dispatch(deleteLease(deleteTarget.lease.id));
      if (response.payload?.message === "success") {
        message.success(deleteTarget.action === "terminate" ? "Bail résilié" : "Bail supprimé");
        dispatch(loadLeasesDashboard());
        setDeleteTarget(null);
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  const openContractWorkflow = (lease, contract = leaseContractFor(lease, safeContracts)) => {
    setOpenLeaseMenu(null);
    setContractModal({ lease, contract });
  };

  const copyLeaseReference = async (lease) => {
    const reference = String(lease?.reference || "").trim();
    if (!reference) {
      message.warning("Aucune référence disponible pour ce bail.");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = reference;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      message.success("Référence du bail copiée");
    } catch {
      message.error("Impossible de copier la référence");
    }
  };

  const exportLeaseToCsv = (lease) => {
    if (!lease) {
      message.warning("Aucun bail à exporter");
      return;
    }

    const headers = ["Référence", "Locataire", "Propriété", "Unité", "Début", "Fin", "Loyer", "Statut"];
    const row = [
      lease.reference || "",
      tenantNameFromLease(lease),
      lease.property?.name || lease.propertyName || "-",
      lease.unit?.name || lease.unitName || "-",
      lease.startDate ? moment(lease.startDate).format("DD/MM/YYYY") : "-",
      lease.endDate ? moment(lease.endDate).format("DD/MM/YYYY") : "-",
      lease.rentAmount ?? lease.monthlyRent ?? 0,
      lease.status || "-",
    ];
    const csv = [headers, row]
      .map((items) => items.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bail-${lease.reference || lease.id || moment().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success("Bail exporté en CSV");
  };

  const handleLeaseAction = async (action, lease, contract) => {
    setOpenLeaseMenu(null);
    if (action === "detail" || action === "edit") {
      setLeaseModal(lease);
      return;
    }
    if (action === "contract" || action === "pdf") {
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
      requestLeaseDeletion(lease, action);
      return;
    }
    if (action === "payments") {
      if (onViewPayments) onViewPayments(lease);
      else message.info("Ouvrez l'onglet Paiements pour consulter les paiements de ce bail.");
      return;
    }
    if (action === "maintenance") {
      if (onViewMaintenance) onViewMaintenance(lease);
      else message.info("Ouvrez l'onglet Maintenance pour consulter les tickets de ce bail.");
      return;
    }
    if (action === "copyRef") {
      copyLeaseReference(lease);
      return;
    }
    if (action === "csv") {
      exportLeaseToCsv(lease);
      return;
    }
    if (action === "resend") {
      if (!contract?.id) { message.warning("Aucun contrat trouvé pour ce bail."); return; }
      const result = await dispatch(sendContract(contract.id));
      if (result.payload?.data?.signingUrl) {
        setContractLinks((prev) => ({ ...prev, [contract.id]: result.payload.data.signingUrl }));
        message.success("Lien de signature renvoyé au locataire");
      }
      return;
    }
    if (action === "copyLink") {
      const signingUrl =
        contractLinks[contract?.id] ||
        (contract?.signerToken ? `${window.location.origin}/sign/${contract.signerToken}` : null);
      if (!signingUrl) {
        message.warning("Aucun lien de signature disponible. Utilisez « Renvoyer le lien » d'abord.");
        return;
      }
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(signingUrl);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = signingUrl;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        message.success("Lien de signature copié");
      } catch {
        message.error("Impossible de copier le lien");
      }
      return;
    }
    if (["cancelSend", "archive"].includes(action)) {
      message.info("Cette action sera ajoutée dans le workflow contrat.");
    }
  };

  const submitLease = async ({ id, values }) => {
    setSavingLease(true);
    try {
      const response = await dispatch(saveLease({ id, values }));
      if (response.payload?.message === "success") {
        message.success(id ? "Bail mis à jour" : "Bail créé");
        dispatch(loadLeasesDashboard());
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
      dispatch(loadLeasesDashboard());
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
            <span>Générez les contrats pour sécuriser la signature et l&apos;archivage.</span>
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
          <button
            type="button"
            className="immo-secondary-button"
            onClick={() => {
              if (!leasesView.length) { message.warning("Aucun bail à exporter"); return; }
              const headers = ["Référence", "Locataire", "Propriété", "Unité", "Début", "Fin", "Loyer", "Statut"];
              const rows = leasesView.map((l) => [
                l.reference || "",
                [l.tenant?.firstName, l.tenant?.lastName].filter(Boolean).join(" ") || l.tenantName || "-",
                l.property?.name || l.propertyName || "-",
                l.unit?.name || l.unitName || "-",
                l.startDate ? moment(l.startDate).format("DD/MM/YYYY") : "-",
                l.endDate ? moment(l.endDate).format("DD/MM/YYYY") : "-",
                l.rentAmount ?? l.monthlyRent ?? 0,
                l.status || "-",
              ]);
              const csv = [headers, ...rows]
                .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `baux-${moment().format("YYYY-MM-DD")}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              message.success(`${leasesView.length} bail(s) exporté(s)`);
            }}
            title="Exporter CSV"
          >
            <Download size={15} /> CSV
          </button>
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
        leases={safeLeases}
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
      <Modal
        confirmLoading={deleteBusy}
        okButtonProps={{ danger: true }}
        okText={deleteTarget?.action === "terminate" ? "Résilier le bail" : "Supprimer le bail"}
        onCancel={() => setDeleteTarget(null)}
        onOk={confirmDeleteLease}
        open={Boolean(deleteTarget)}
        title={deleteTarget?.action === "terminate" ? "Résilier ce bail ?" : "Supprimer ce bail ?"}
      >
        <p>
          Cette action applique une suppression logique: le bail sera retiré des vues actives, ses historiques
          restent conservés, et l&apos;unité associée sera marquée vacante.
        </p>
        <p>
          Bail concerné:{" "}
          <strong>{deleteTarget?.lease?.reference || tenantNameFromLease(deleteTarget?.lease || {})}</strong>
        </p>
      </Modal>
    </div>
  );
};

export default LeasesPanel;
