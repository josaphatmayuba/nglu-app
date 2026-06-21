// Small presentational components shared across modules.
// Copied from PropertyManagement.jsx — keep both in sync during the soft migration.

import { Building2 } from "lucide-react";

import { compactMoney } from "./format";
import FormattedAmount from "@/components/Shared/FormattedAmount";

export const Kpi = ({ icon, label, value, tone = "slate" }) => (
  <div className={`pm-kpi pm-kpi-${tone}`}>
    <div className="pm-kpi-icon">{icon}</div>
    <div>
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{value}</div>
    </div>
  </div>
);

export const MetricCard = ({ icon, label, value, helper, tone = "brand", trend }) => (
  <div className="immo-metric-card">
    <div className="immo-metric-head">
      <div className={`immo-metric-icon immo-tone-${tone}`}>{icon}</div>
      {trend?.label && <span className={`immo-trend ${trend.tone || "up"}`}>{trend.label}</span>}
    </div>
    <div className="immo-metric-label">{label}</div>
    <div className="immo-metric-value">{value}</div>
    {helper && <div className="immo-metric-helper">{helper}</div>}
  </div>
);

export const MultiCurrencyValue = ({ byCurrency = [], fallback = "CDF 0" }) => {
  const rows = byCurrency.filter((entry) => Number(entry?.amount || 0) !== 0);

  if (!rows.length) return <span>{fallback}</span>;
  if (rows.length === 1) {
    const { amount, currencySymbol, currencyCode, currencyName, currency } = rows[0];
    return (
      <FormattedAmount
        amount={amount}
        currency={{
          currencyCode,
          currencyName,
          currencySymbol,
          ...currency
        }}
        compact
      />
    );
  }

  return (
    <span className="immo-multicurrency">
      {rows.map((entry, index) => (
        <span key={entry.currencyId ?? index} className="immo-multicurrency-line">
          <FormattedAmount
            amount={entry.amount}
            currency={{
              currencyCode: entry.currencyCode,
              currencyName: entry.currencyName,
              currencySymbol: entry.currencySymbol,
              ...entry.currency
            }}
            compact
          />
        </span>
      ))}
    </span>
  );
};

export const EmptyState = ({ title, text }) => (
  <div className="immo-empty">
    <Building2 size={28} />
    <h3>{title}</h3>
    <p>{text}</p>
  </div>
);
