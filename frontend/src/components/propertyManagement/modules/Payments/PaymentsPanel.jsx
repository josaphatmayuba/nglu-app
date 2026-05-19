import { Form, message } from "antd";
import { CalendarRange, Plus, Table2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import { createRentPayment, loadPropertyManagement } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { compactMoney, normalize, optionalNumber } from "../../shared/format";
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

const PaymentsPanel = ({ searchTerm = "" }) => {
  const dispatch = useDispatch();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentView, setPaymentView] = useState(readStoredView);
  const [form] = Form.useForm();

  useEffect(() => {
    try { window.localStorage?.setItem(VIEW_STORAGE_KEY, paymentView); } catch { /* ignore */ }
  }, [paymentView]);

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

  return (
    <div className="immo-table-flow">
      <div className="immo-mini-kpis">
        <div><span>Encaissé ce mois</span><strong className="green">{compactMoney(paidAmount)}</strong></div>
        <div><span>En attente</span><strong className="amber">{compactMoney(pendingAmount)}</strong></div>
        <div><span>En retard</span><strong className="red">{compactMoney(lateAmount)}</strong></div>
        <div><span>Total prévu</span><strong>{compactMoney(plannedAmount)}</strong></div>
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
          <button type="button" className="immo-primary-button" onClick={openModal}>
            <Plus size={16} /> Enregistrer paiement
          </button>
        </div>
      </div>

      {paymentView === "tableau" && (
        <PaymentsTable
          payments={paymentsView}
          pendingPayments={upcomingPayments}
          latePayments={overduePayments}
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
          overduePayments={overduePayments}
          upcomingPayments={upcomingPayments}
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
