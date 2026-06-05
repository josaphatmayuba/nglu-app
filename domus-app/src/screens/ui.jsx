// Domus — petits composants présentationnels au look « Immobilier CRM ».
// Répliquent MetricCard du frontend CRM (immo-metric-*) sans import cross-app.
import { moneyExact } from "../data.js";

const AVATARS = ["av-indigo", "av-orange", "av-violet", "av-blue", "av-rose", "av-green"];

// Affichage multi-devises empilé (une devise par ligne, montant complet).
// rows : sortie de groupAmountsByCurrency. La taille de police diminue avec le
// nombre de devises pour rester dans la carte.
export function MoneyStack({ rows, fallbackSymbol = "CDF", emptyText = "—" }) {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && Number.isFinite(Number(r.amount)));
  if (!list.length) return <span>{emptyText}</span>;
  if (list.length === 1) {
    return <span>{moneyExact(list[0].amount, list[0].currencySymbol || fallbackSymbol)}</span>;
  }
  const tier = list.length <= 3 ? "" : list.length <= 5 ? " s" : " xs";
  return (
    <span className={`money-stack${tier}`}>
      {list.map((r, i) => (
        <span key={i} className="money-line">{moneyExact(r.amount, r.currencySymbol || fallbackSymbol)}</span>
      ))}
    </span>
  );
}

export function avatarClass(index = 0) {
  return AVATARS[index % AVATARS.length];
}

export function MetricsGrid({ children }) {
  return <div className="immo-metrics-grid">{children}</div>;
}

// icon : élément lucide déjà instancié. tone : brand|green|amber|red.
// trend : { label, danger } optionnel. helper : noeud sous la valeur.
export function Metric({ icon, label, value, helper, tone = "brand", trend, valueColor }) {
  return (
    <div className="immo-metric-card">
      <div className="immo-metric-head">
        <div className={`immo-metric-icon immo-tone-${tone}`}>{icon}</div>
        {trend?.label && <span className={`immo-trend ${trend.danger ? "danger" : ""}`}>{trend.label}</span>}
      </div>
      <div className="immo-metric-label">{label}</div>
      <div className="immo-metric-value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {helper != null && <div className="immo-metric-helper">{helper}</div>}
    </div>
  );
}

export function ImmoHeader({ title, subtitle, children }) {
  return (
    <div className="immo-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="immo-header-actions">{children}</div>}
    </div>
  );
}
