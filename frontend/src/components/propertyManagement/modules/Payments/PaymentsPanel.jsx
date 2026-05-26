import { Form, message } from "antd";
import { CalendarRange, Download, Plus, Table2, Users, X } from "lucide-react";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import { createRentPayment, loadPaymentsDashboard } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { normalize, optionalNumber } from "../../shared/format";
import { MultiCurrencyValue } from "../../shared/ui";
import { tenantNameFromLease } from "../../shared/tenants";
import { usePropertyManagementData } from "../../shared/usePropertyManagementData";
import PaymentFormModal from "./PaymentFormModal";
import PaymentsCalendarView from "./PaymentsCalendarView";
import PaymentsTenantView from "./PaymentsTenantView";
import PaymentsTable from "./PaymentsTable";

const VIEW_STORAGE_KEY = "immo.payments.view";
const VIEW_KEYS = ["tableau", "locataire", "calendrier"];
const readStoredView = () => {
  try {
    const v = window.localStorage?.getItem(VIEW_STORAGE_KEY);
    return VIEW_KEYS.includes(v) ? v : "locataire";
  } catch { return "locataire"; }
};

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
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `paiements-${moment().format("YYYY-MM-DD")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const paymentMatchesSearch = (payment, query) => {
  if (!query) return true;
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
  return haystack.includes(query);
};

const leaseToExpectedPayment = (lease) => ({
  id: `expected-${lease.id}`,
  leaseId: lease.id,
  leaseReference: lease.reference,
  tenantFirstName: lease.tenantFirstName || lease.tenant?.firstName,
  tenantLastName: lease.tenantLastName || lease.tenant?.lastName,
  propertyName: lease.propertyName || lease.unit?.property?.name,
  unitName: lease.unitName || lease.unit?.name,
  amount: lease.rentAmount,
  currencySymbol: lease.currencySymbol || lease.currency?.symbol,
  paymentDate: lease.nextInvoiceDate,
  status: null,
  method: null,
  reference: null,
  _isExpected: true,
});

const PaymentsPanel = ({ searchTerm = "" }) => {
  const dispatch = useDispatch();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentView, setPaymentView] = useState(readStoredView);
  const [selectedIds, setSelectedIds] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    try { window.localStorage?.setItem(VIEW_STORAGE_KEY, paymentView); } catch { /* ignore */ }
  }, [paymentView]);

  const {
    accounts,
    currencyOptions,
    lateAmountByCurrency,
    overduePayments,
    paidAmountByCurrency,
    pendingAmountByCurrency,
    plannedAmountByCurrency,
    safeLeases,
    safePayments,
    upcomingPayments,
  } = usePropertyManagementData();

  const filteredPayments = useMemo(() => {
    const q = normalize(searchTerm);
    return safePayments.filter((payment) => paymentMatchesSearch(payment, q));
  }, [safePayments, searchTerm]);

  const overdueLeaseIds = useMemo(() => new Set(overduePayments.map((l) => l.id)), [overduePayments]);
  const upcomingLeaseIds = useMemo(() => new Set(upcomingPayments.map((l) => l.id)), [upcomingPayments]);
  const expectedOverduePayments = useMemo(
    () => overduePayments.map(leaseToExpectedPayment),
    [overduePayments],
  );
  const expectedUpcomingPayments = useMemo(
    () => upcomingPayments.map(leaseToExpectedPayment),
    [upcomingPayments],
  );
  const filteredOverduePayments = useMemo(() => {
    const q = normalize(searchTerm);
    return expectedOverduePayments.filter((payment) => paymentMatchesSearch(payment, q));
  }, [expectedOverduePayments, searchTerm]);
  const filteredUpcomingPayments = useMemo(() => {
    const q = normalize(searchTerm);
    return expectedUpcomingPayments.filter((payment) => paymentMatchesSearch(payment, q));
  }, [expectedUpcomingPayments, searchTerm]);
  const paidPayments = useMemo(
    () => filteredPayments.filter((p) => !overdueLeaseIds.has(p.leaseId) && !upcomingLeaseIds.has(p.leaseId)),
    [filteredPayments, overdueLeaseIds, upcomingLeaseIds],
  );

  const paymentsView = useMemo(() => {
    if (paymentStatusFilter === "late") return filteredOverduePayments;
    if (paymentStatusFilter === "pending") return filteredUpcomingPayments;
    if (paymentStatusFilter === "paid") return paidPayments;
    return [...paidPayments, ...filteredUpcomingPayments, ...filteredOverduePayments];
  }, [paymentStatusFilter, paidPayments, filteredOverduePayments, filteredUpcomingPayments]);

  const paymentFilterChips = [
    {
      key: "all",
      label: "Tous",
      count: paidPayments.length + filteredUpcomingPayments.length + filteredOverduePayments.length,
    },
    {
      key: "paid",
      label: "Payés",
      count: paidPayments.length,
    },
    { key: "pending", label: "En attente", count: filteredUpcomingPayments.length },
    { key: "late", label: "En retard", count: filteredOverduePayments.length },
  ];

  const leaseOptions = safeLeases
    .filter((lease) => lease.status === "active")
    .map((lease) => ({
      label: `${lease.reference} - ${lease.unit?.name || lease.unitName || "-"} - ${tenantNameFromLease(lease)}`,
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

  const handleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleSelectAll = (ids, all) => setSelectedIds((prev) => all ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id)));
  const clearSelection = () => setSelectedIds([]);
  const selectedPayments = paymentsView.filter((p) => selectedIds.includes(p.id));
  const handleExportCsv = () => {
    const toExport = selectedIds.length > 0 ? selectedPayments : paymentsView;
    if (!toExport.length) { message.warning("Aucun paiement à exporter"); return; }
    exportPaymentsToCsv(toExport);
    message.success(`${toExport.length} paiement(s) exporté(s)`);
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
        dispatch(loadPaymentsDashboard());
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Encaissé ce mois</span><strong className="green"><MultiCurrencyValue byCurrency={paidAmountByCurrency} fallback="CDF 0" /></strong></div>
        <div><span>En attente</span><strong className="amber"><MultiCurrencyValue byCurrency={pendingAmountByCurrency} fallback="CDF 0" /></strong></div>
        <div><span>En retard</span><strong className="red"><MultiCurrencyValue byCurrency={lateAmountByCurrency} fallback="CDF 0" /></strong></div>
        <div><span>Total prévu</span><strong><MultiCurrencyValue byCurrency={plannedAmountByCurrency} fallback="CDF 0" /></strong></div>
      </div>
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
        <div className="immo-lease-actions">
          <div className="immo-view-toggle" aria-label="Vue des paiements" role="tablist">
            {[
              { key: "tableau",   label: "Tableau",      icon: <Table2 size={15} /> },
              { key: "locataire", label: "Par locataire", icon: <Users size={15} /> },
              { key: "calendrier",label: "Calendrier",    icon: <CalendarRange size={15} /> },
            ].map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={paymentView === v.key}
                className={paymentView === v.key ? "active" : ""}
                onClick={() => setPaymentView(v.key)}
                title={`Vue ${v.label.toLowerCase()}`}
              >
                {v.icon}
                <span>{v.label}</span>
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

      {paymentView === "tableau" && (
        <PaymentsTable
          payments={paymentsView}
          pendingPayments={expectedUpcomingPayments}
          latePayments={expectedOverduePayments}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
        />
      )}
      {paymentView === "locataire" && (
        <PaymentsTenantView
          payments={paymentsView}
          overduePayments={overduePayments}
          upcomingPayments={upcomingPayments}
        />
      )}
      {paymentView === "calendrier" && (
        <PaymentsCalendarView
          payments={paymentsView}
          overduePayments={expectedOverduePayments}
          upcomingPayments={expectedUpcomingPayments}
        />
      )}

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
