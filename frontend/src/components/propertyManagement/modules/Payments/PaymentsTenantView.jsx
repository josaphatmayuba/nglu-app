// SCRUM-95 — Payments "Par locataire" view.
// Groups payments by tenant and shows a card with 6-month bar histogram.

import moment from "moment";
import { useMemo } from "react";
import { avatarColors } from "../../shared/constants";
import { compactMoney } from "../../shared/format";
import { initials } from "../../shared/tenants";

const BAR_MONTHS = 6;

const tenantKey = (p) =>
  [p.tenantFirstName, p.tenantLastName].filter(Boolean).join(" ") ||
  p.leaseReference ||
  String(p.id);

// Use leaseId-based lookup — reference equality on synthetic objects would
// always fail because leaseToExpectedPayment() creates new objects each render.
const statusOf = (payment, overdueLeaseIds, upcomingLeaseIds) => {
  if (payment.leaseId != null) {
    if (overdueLeaseIds.has(payment.leaseId)) return "late";
    if (upcomingLeaseIds.has(payment.leaseId)) return "pending";
  }
  // _isExpected without a matching leaseId still came from an overdue/upcoming
  // filter — keep as late so the card renders meaningful detail.
  if (payment._isExpected) return "late";
  return "paid";
};

const StatusBadge = ({ status }) => {
  if (status === "late")
    return <span className="immo-pill danger">En retard</span>;
  if (status === "pending")
    return <span className="immo-pill warning">En attente</span>;
  return <span className="immo-pill success">À jour</span>;
};

const HistogramBar = ({ status }) => {
  const colorClass =
    status === "paid"
      ? "bg-emerald-400"
      : status === "pending"
        ? "bg-amber-400"
        : "bg-red-400";
  const height = status === "pending" ? "55%" : "100%";
  return (
    <div
      className={`flex-1 rounded-sm ${colorClass}`}
      style={{ height }}
      title={status === "paid" ? "Payé" : status === "pending" ? "En attente" : "En retard"}
    />
  );
};

const TenantCard = ({ name, payments, overdueLeaseIds, upcomingLeaseIds, colorIdx }) => {
  const sorted = [...payments].sort(
    (a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0),
  );
  const latest = sorted[0];
  const latestStatus = latest ? statusOf(latest, overdueLeaseIds, upcomingLeaseIds) : "paid";
  const unit = latest?.unitName || latest?.leaseReference || "-";
  const amount = latest?.amount;
  const currency = latest?.currencySymbol;

  // Days overdue for late payments
  const daysLate = latestStatus === "late" && latest?.paymentDate
    ? Math.max(0, moment().diff(moment(latest.paymentDate), "days"))
    : null;

  // Build 6-month slot history (most recent on the right)
  const history = sorted.slice(0, BAR_MONTHS).reverse();
  const slots = Array.from({ length: BAR_MONTHS }, (_, i) => {
    const p = history[history.length - BAR_MONTHS + i] ?? null;
    if (!p) return "empty";
    return statusOf(p, overdueLeaseIds, upcomingLeaseIds);
  });

  const oldestDate = sorted.length >= BAR_MONTHS
    ? moment(sorted[BAR_MONTHS - 1]?.paymentDate).format("MMM")
    : "—";
  const newestDate = latest?.paymentDate ? moment(latest.paymentDate).format("MMM") : "—";

  // Row 1 label / value
  const dateLabel =
    latestStatus === "late" ? "Échéance dépassée"
    : latestStatus === "pending" ? "Échéance"
    : "Dernier paiement";

  const dateValue = latest?.paymentDate
    ? `${moment(latest.paymentDate).format("DD MMM YYYY")}${daysLate != null && daysLate > 0 ? ` (${daysLate}j)` : ""}`
    : "—";

  // Row 2 label / value
  const amountLabel =
    latestStatus === "late" ? "Montant dû"
    : latestStatus === "pending" ? "Montant attendu"
    : "Montant mensuel";

  return (
    <div
      className={`bg-white rounded-xl border p-4 hover:shadow-md transition ${
        latestStatus === "late" ? "border-red-200" : "border-ink-200"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mini-avatar ${
              avatarColors[colorIdx % avatarColors.length]
            }`}
          >
            {initials(name)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-ink-900 text-sm truncate">{name}</div>
            <div className="text-xs text-ink-500 truncate">{unit}</div>
          </div>
        </div>
        <StatusBadge status={latestStatus} />
      </div>

      <div className="flex justify-between text-xs text-ink-500 mb-1.5">
        <span>{dateLabel}</span>
        <span
          className={`font-medium ${
            latestStatus === "late"
              ? "text-red-600"
              : latestStatus === "pending"
                ? "text-amber-600"
                : "text-ink-900"
          }`}
        >
          {dateValue}
        </span>
      </div>

      <div className="flex justify-between text-xs text-ink-500 mb-3">
        <span>{amountLabel}</span>
        <span
          className={`font-semibold ${
            latestStatus === "late"
              ? "text-red-600"
              : latestStatus === "pending"
                ? "text-ink-700"
                : "text-ink-900"
          }`}
        >
          {amount != null ? compactMoney(amount, currency) : "—"}
        </span>
      </div>

      {/* 6-month histogram */}
      <div className="flex gap-1 items-end h-8">
        {slots.map((s, i) =>
          s === "empty" ? (
            <div key={i} className="flex-1 rounded-sm bg-ink-100" style={{ height: "30%" }} />
          ) : (
            <HistogramBar key={i} status={s} />
          ),
        )}
      </div>
      <div className="text-[10px] text-ink-400 mt-1 flex justify-between">
        <span>{oldestDate}</span>
        <span>{newestDate}</span>
      </div>
    </div>
  );
};

const PaymentsTenantView = ({ payments, overduePayments, upcomingPayments }) => {
  // Build Sets once for O(1) lookup — avoids the reference-equality trap of
  // Array.includes() when payments are synthetic objects from leaseToExpectedPayment().
  const overdueLeaseIds = useMemo(
    () => new Set(overduePayments.map((l) => l.id)),
    [overduePayments],
  );
  const upcomingLeaseIds = useMemo(
    () => new Set(upcomingPayments.map((l) => l.id)),
    [upcomingPayments],
  );

  // Group by tenant name
  const groups = [];
  const seen = new Map();
  payments.forEach((p) => {
    const key = tenantKey(p);
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ key, name: key, list: [] });
    }
    groups[seen.get(key)].list.push(p);
  });

  if (groups.length === 0) {
    return (
      <div className="immo-table-empty">Aucun paiement à afficher pour ce filtre.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map((g, idx) => (
        <TenantCard
          key={g.key}
          name={g.name}
          payments={g.list}
          overdueLeaseIds={overdueLeaseIds}
          upcomingLeaseIds={upcomingLeaseIds}
          colorIdx={idx}
        />
      ))}
    </div>
  );
};

export default PaymentsTenantView;
