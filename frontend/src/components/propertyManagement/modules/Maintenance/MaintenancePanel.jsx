import { Form, Modal, message } from "antd";
import { CalendarRange, Columns3, List, Plus, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import {
  deleteMaintenance,
  loadPropertyManagement,
  saveMaintenance,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { compactMoney, normalize } from "../../shared/format";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import MaintenanceCalendarView from "./MaintenanceCalendarView";
import MaintenanceFormModal from "./MaintenanceFormModal";
import MaintenanceKanbanView from "./MaintenanceKanbanView";
import MaintenanceTableView from "./MaintenanceTableView";
import MaintenanceTicketCard from "./MaintenanceTicketCard";

const VIEW_STORAGE_KEY = "immo.maintenance.view";
const VIEW_KEYS = ["kanban", "list", "table", "calendar"];

const readStoredView = () => {
  if (typeof window === "undefined") return "kanban";
  try {
    const stored = window.localStorage?.getItem(VIEW_STORAGE_KEY);
    return VIEW_KEYS.includes(stored) ? stored : "kanban";
  } catch {
    return "kanban";
  }
};

const MaintenancePanel = ({ searchTerm = "" }) => {
  const dispatch = useDispatch();
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceView, setMaintenanceView] = useState(readStoredView);
  const [form] = Form.useForm();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage?.setItem(VIEW_STORAGE_KEY, maintenanceView); } catch { /* ignore */ }
  }, [maintenanceView]);

  const {
    inProgressMaintenance,
    maintenanceCost,
    openMaintenance,
    resolvedMaintenance,
    safeMaintenance,
    safeProperties,
    safeUnits,
    urgentMaintenance,
  } = usePropertyManagementData();

  const filteredMaintenance = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return safeMaintenance;
    return safeMaintenance.filter((request) => {
      const haystack = normalize(
        [request.title, request.description, request.propertyName, request.unitName,
         request.priority, request.status, request.property?.name, request.unit?.name].join(" "),
      );
      return haystack.includes(q);
    });
  }, [safeMaintenance, searchTerm]);

  const maintenanceMatchesStatus = (request) => {
    if (maintenanceStatusFilter === "all") return true;
    if (maintenanceStatusFilter === "urgent") return ["urgent", "high"].includes(request.priority);
    if (maintenanceStatusFilter === "in_progress") return request.status === "in_progress";
    if (maintenanceStatusFilter === "done") return request.status === "done";
    return true;
  };

  const ticketsForView = filteredMaintenance.filter(maintenanceMatchesStatus);
  const maintenanceFilterChips = [
    { key: "all",         label: "Tous",     count: filteredMaintenance.length },
    { key: "urgent",      label: "Urgent",   count: urgentMaintenance.length },
    { key: "in_progress", label: "En cours", count: inProgressMaintenance.length },
    { key: "done",        label: "Résolus",  count: resolvedMaintenance.length },
  ];

  const propertyOptions = safeProperties.map((p) => ({ label: p.name, value: p.id }));
  const unitOptions = safeUnits.map((u) => ({
    label: `${u.name} - ${u.propertyAddress || u.propertyName || ""}`,
    value: u.id,
  }));

  const openCreateModal = () => {
    form.resetFields();
    setEditingRecord(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalMode("edit");
    form.setFieldsValue({
      title: record.title,
      propertyId: record.propertyId,
      unitId: record.unitId ?? undefined,
      priority: record.priority ?? "medium",
      status: record.status ?? "open",
      scheduledDate: record.scheduledDate ?? undefined,
      estimatedCost: record.estimatedCost ? Number(record.estimatedCost) : undefined,
      description: record.description ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const submitMaintenance = async (values) => {
    setSaving(true);
    try {
      const response = await dispatch(saveMaintenance({ id: editingRecord?.id, values }));
      if (response.payload?.message === "success" || response.payload?.id) {
        message.success(editingRecord ? "Ticket modifié" : "Ticket créé");
        dispatch(loadPropertyManagement());
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (record) => setDeleteTarget(record);
  const cancelDelete = () => setDeleteTarget(null);
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteMaintenance(deleteTarget.id));
      message.success("Ticket supprimé (masqué, non effacé de la base)");
      dispatch(loadPropertyManagement());
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const sharedViewProps = { onEdit: openEditModal, onDelete: confirmDelete };

  return (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Tickets ouverts</span><strong className="red">{openMaintenance.length}</strong></div>
        <div><span>En cours</span><strong className="amber">{inProgressMaintenance.length}</strong></div>
        <div><span>Résolus ce mois</span><strong className="green">{resolvedMaintenance.length}</strong></div>
        <div><span>Coût total</span><strong>{compactMoney(maintenanceCost)}</strong></div>
      </div>
      <div className="immo-table-toolbar">
        <div className="immo-filter-group">
          {maintenanceFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={maintenanceStatusFilter === chip.key ? "active" : ""}
              onClick={() => setMaintenanceStatusFilter(chip.key)}
            >
              {chip.label} <span>{chip.count}</span>
            </button>
          ))}
        </div>
        <div className="immo-lease-actions">
          <div className="immo-view-toggle" aria-label="Vue de la maintenance" role="tablist">
            {[
              { key: "kanban",   label: "Kanban",     icon: <Columns3 size={15} /> },
              { key: "list",     label: "Liste",      icon: <List size={15} /> },
              { key: "table",    label: "Tableau",    icon: <Table2 size={15} /> },
              { key: "calendar", label: "Calendrier", icon: <CalendarRange size={15} /> },
            ].map((view) => (
              <button
                key={view.key}
                type="button"
                role="tab"
                aria-selected={maintenanceView === view.key}
                className={maintenanceView === view.key ? "active" : ""}
                onClick={() => setMaintenanceView(view.key)}
                title={`Vue ${view.label.toLowerCase()}`}
              >
                {view.icon}
                <span>{view.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="immo-primary-button" onClick={openCreateModal}>
            <Plus size={16} /> Nouveau ticket
          </button>
        </div>
      </div>

      {maintenanceView === "list" && (
        <div className="immo-ticket-list">
          {ticketsForView.length === 0 ? (
            <div className="immo-table-empty">Aucun ticket à afficher pour ce filtre.</div>
          ) : (
            ticketsForView.map((request, index) => (
              <MaintenanceTicketCard
                key={request.id}
                request={request}
                index={index}
                onEdit={openEditModal}
                onDelete={confirmDelete}
              />
            ))
          )}
        </div>
      )}
      {maintenanceView === "table"    && <MaintenanceTableView    requests={ticketsForView} {...sharedViewProps} />}
      {maintenanceView === "kanban"   && <MaintenanceKanbanView   requests={ticketsForView} {...sharedViewProps} />}
      {maintenanceView === "calendar" && <MaintenanceCalendarView requests={ticketsForView} />}

      <MaintenanceFormModal
        form={form}
        mode={modalMode}
        onCancel={closeModal}
        onSubmit={submitMaintenance}
        open={modalOpen}
        propertyOptions={propertyOptions}
        saving={saving}
        unitOptions={unitOptions}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="Supprimer le ticket ?"
        onCancel={cancelDelete}
        onOk={executeDelete}
        okText="Supprimer"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText="Annuler"
        centered
      >
        <p>
          Le ticket <strong>{deleteTarget?.title}</strong> sera masqué de toutes les vues.
          Il ne sera <strong>pas supprimé de la base de données</strong> (suppression logique).
        </p>
      </Modal>
    </div>
  );
};

export default MaintenancePanel;
