import { Form, message } from "antd";
import { Download, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import moment from "moment";

import { createRentPayment, loadPropertyManagement } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { compactMoney, normalize, optionalNumber } from "../../shared/format";
import { tenantName } from "../../shared/tenants";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import PaymentFormModal from "./PaymentFormModal";
import PaymentsTable from "./PaymentsTable";

const exportPaymentsToCsv = (payments) => {
  const headers = ["N° Quittance", "Locataire", "Propriété", "Période", "Méthode", "Statut", "Montant"];
  const rows = payments.map((p) => [
    `#QUIT-${p.id}`,
    [p.tenantFirstName, p.tenantLastName].filter(Boolean).join(" ") || "-",
    p.unitName || p.leaseReference || "-",
    p.paymentDate ? moment(p.paymentDate).format("MMMM YYYY") : "-",
    p.method || "-",
    p.status || "-",
    p.amount ?? 0,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paiements-${moment().format("YYYY-MM-DD")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const PaymentsPanel = ({ searchTerm = "" }) => {
  const dispatch = useDispatch();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [selectedIds, setSelectedIds] = useState([]);

  const {
    accounts,
    currencyOptions,
    lateAmount,
    overduePayments,
    paidAmount,
    pendingAmount,
    plannedAmount,
    safeLeases,
    safePayments,
    upcomingPayments,
  } = usePropertyManagementData();

  const filteredPayments = useMemo(() => {
    const q = normalize(searchTerm);
    if (!q) return safePayments;
    return safePayments.filter((payment) => {
      const haystack = normalize(
        [
          payment.reference,
          payment.leaseReference,
          payment.tenantFirstName,
          payment.tenantLastName,
          payment.propertyName,
          payment.unitName,
          payment.method,
          String(payment.amount || ""),
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [safePayments, searchTerm]);

  const paymentMatchesStatus = (payment) => {
    if (paymentStatusFilter === "all") return true;
    if (paymentStatusFilter === "late") return overduePayments.includes(payment);
    if (paymentStatusFilter === "pending") return upcomingPayments.includes(payment);
    return !overduePayments.includes(payment) && !upcomingPayments.includes(payment);
  };

  const paymentsView = filteredPayments.filter(paymentMatchesStatus);
  const paymentFilterChips = [
    { key: "all", label: "Tous", count: filteredPayments.length },
    {
      key: "paid",
      label: "Payés",
      count: filteredPayments.filter((payment) => !overduePayments.includes(payment) && !upcomingPayments.includes(payment)).length,
    },
    { key: "pending", label: "En attente", count: upcomingPayments.length },
    { key: "late", label: "En retard", count: overduePayments.length },
  ];

  const leaseOptions = safeLeases
    .filter((lease) => lease.status === "active")
    .map((lease) => ({
      label: `${lease.reference} - ${lease.unit?.name || lease.unitName || "-"} - ${tenantName(lease.tenant)}`,
      value: lease.id,
    }));

  const openModal = () => {
    form.resetFields();
    setPaymentModalOpen(true);
  };

  const closeModal = () => {
    setPaymentModalOpen(false);
    form.resetFields();
  };

  const submitPayment = async (values) => {
    setSaving(true);
    try {
      const response = await dispatch(createRentPayment({
        ...values,
        leaseId: Number(values.leaseId),
        paymentAccountId: optionalNumber(values.paymentAccountId),
        currencyId: optionalNumber(values.currencyId),
      }));
      if (response.payload?.message === "success") {
        message.success("Paiement enregistré");
        dispatch(loadPropertyManagement());
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (ids, selectAll) => {
    setSelectedIds((prev) => {
      if (selectAll) return [...new Set([...prev, ...ids])];
      return prev.filter((id) => !ids.includes(id));
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedPayments = paymentsView.filter((p) => selectedIds.includes(p.id));

  const handleExportCsv = () => {
    const toExport = selectedIds.length > 0 ? selectedPayments : paymentsView;
    if (!toExport.length) { message.warning("Aucun paiement à exporter"); return; }
    exportPaymentsToCsv(toExport);
    message.success(`${toExport.length} paiement(s) exporté(s)`);
  };

  return (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Encaissé ce mois</span><strong className="green">{compactMoney(paidAmount)}</strong></div>
        <div><span>En attente</span><strong className="amber">{compactMoney(pendingAmount)}</strong></div>
        <div><span>En retard</span><strong className="red">{compactMoney(lateAmount)}</strong></div>
        <div><span>Total prévu</span><strong>{compactMoney(plannedAmount)}</strong></div>
      </div>

      {selectedIds.length > 0 && (
        <div className="immo-bulk-bar">
          <span>{selectedIds.length} sélectionné(s)</span>
          <div className="immo-bulk-actions">
            <button type="button" className="immo-bulk-btn" onClick={handleExportCsv}>
              <Download size={14} /> Exporter CSV
            </button>
          </div>
          <button type="button" className="immo-bulk-clear" onClick={clearSelection} aria-label="Annuler la sélection">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="immo-table-toolbar">
        <div className="immo-filter-group">
          {paymentFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className={paymentStatusFilter === chip.key ? "active" : ""}
              onClick={() => setPaymentStatusFilter(chip.key)}
            >
              {chip.label} <span>{chip.count}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="immo-secondary-button" onClick={handleExportCsv} title="Exporter CSV">
            <Download size={15} /> CSV
          </button>
          <button type="button" className="immo-primary-button" onClick={openModal}>
            <Plus size={16} /> Enregistrer paiement
          </button>
        </div>
      </div>

      <PaymentsTable
        payments={paymentsView}
        pendingPayments={upcomingPayments}
        latePayments={overduePayments}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
      />

      <PaymentFormModal
        accounts={accounts}
        currencyOptions={currencyOptions}
        form={form}
        leaseOptions={leaseOptions}
        onCancel={closeModal}
        onSubmit={submitPayment}
        open={paymentModalOpen}
        saving={saving}
      />
    </div>
  );
};

export default PaymentsPanel;
