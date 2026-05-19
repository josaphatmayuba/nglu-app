// Small presentational components shared across modules.
// Copied from PropertyManagement.jsx — keep both in sync during the soft migration.

import { Building2 } from "lucide-react";

import { compactMoney } from "./format";

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
      {trend && <span className={`immo-trend ${trend.tone || "up"}`}>{trend.label}</span>}
    </div>
    <div className="immo-metric-label">{label}</div>
    <div className="immo-metric-value">{value}</div>
    {helper && <div className="immo-metric-helper">{helper}</div>}
  </div>
);

// Renders one line per currency if multiple currencies are present,
// or a single compact value for mono-currency portfolios.
export const MultiCurrencyValue = ({ byCurrency = [], fallback = "CDF 0" }) => {
  if (!byCurrency || byCurrency.length === 0) return <span>{fallback}</span>;
  if (byCurrency.length === 1) {
    const { currencySymbol, amount } = byCurrency[0];
    return <span>{compactMoney(amount, currencySymbol)}</span>;
  }
  return (
    <span className="immo-multicurrency">
      {byCurrency.map((entry, i) => (
        <span key={entry.currencyId ?? i} className="immo-multicurrency-line">
          {compactMoney(entry.amount, entry.currencySymbol)}
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
