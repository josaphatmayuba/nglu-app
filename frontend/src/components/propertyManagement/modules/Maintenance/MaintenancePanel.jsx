import { Form, message } from "antd";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import { loadPropertyManagement, saveMaintenance } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { compactMoney, normalize } from "../../shared/format";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import MaintenanceFormModal from "./MaintenanceFormModal";
import MaintenanceTicketCard from "./MaintenanceTicketCard";

const MaintenancePanel = ({ searchTerm = "" }) => {
  const dispatch = useDispatch();
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

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
        [
          request.title,
          request.description,
          request.propertyName,
          request.unitName,
          request.priority,
          request.status,
          request.property?.name,
          request.unit?.name,
        ].join(" "),
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

  const maintenanceView = filteredMaintenance.filter(maintenanceMatchesStatus);
  const maintenanceFilterChips = [
    { key: "all", label: "Tous", count: filteredMaintenance.length },
    { key: "urgent", label: "Urgent", count: urgentMaintenance.length },
    { key: "in_progress", label: "En cours", count: inProgressMaintenance.length },
    { key: "done", label: "Résolus", count: resolvedMaintenance.length },
  ];

  const propertyOptions = safeProperties.map((property) => ({
    label: property.name,
    value: property.id,
  }));

  const unitOptions = safeUnits.map((unit) => ({
    label: `${unit.name} - ${unit.propertyAddress || unit.propertyName || ""}`,
    value: unit.id,
  }));

  const openModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    form.resetFields();
  };

  const submitMaintenance = async (values) => {
    setSaving(true);
    try {
      const response = await dispatch(saveMaintenance({ values }));
      if (response.payload?.message === "success") {
        message.success("Ticket créé");
        dispatch(loadPropertyManagement());
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

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
        <button type="button" className="immo-primary-button" onClick={openModal}>
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>

      <div className="immo-ticket-list">
        {maintenanceView.map((request, index) => (
          <MaintenanceTicketCard key={request.id} request={request} index={index} />
        ))}
      </div>

      <MaintenanceFormModal
        form={form}
        onCancel={closeModal}
        onSubmit={submitMaintenance}
        open={modalOpen}
        propertyOptions={propertyOptions}
        saving={saving}
        unitOptions={unitOptions}
      />
    </div>
  );
};

export default MaintenancePanel;
