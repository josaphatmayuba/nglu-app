// Domus — P&L (revenus/dépenses) par propriété (SCRUM-312).
// Lecture seule : sélecteur propriété + période, résultat groupé par devise.
import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { money, useApi } from "../data.js";
import { api } from "../api.js";
import { ApiError, Loading } from "./dashboard.jsx";
import { takePnlPrefill } from "./reservationPrefill.js";
import { Autocomplete } from "../components/Autocomplete.jsx";
import { EXPENSE_CATEGORIES } from "./depenses.jsx";
import { t, tf } from "../i18n.js";

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES);

function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Presets de période — bornes calculées côté client (locale), envoyées en
// YYYY-MM-DD au backend.
function periodRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === "month") {
    return { dateFrom: toISODate(new Date(y, m, 1)), dateTo: toISODate(new Date(y, m + 1, 0)) };
  }
  if (preset === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    return { dateFrom: toISODate(new Date(y, qStart, 1)), dateTo: toISODate(new Date(y, qStart + 3, 0)) };
  }
  if (preset === "year") {
    return { dateFrom: toISODate(new Date(y, 0, 1)), dateTo: toISODate(new Date(y, 11, 31)) };
  }
  return { dateFrom: "", dateTo: "" };
}

const PRESETS = [
  ["month", () => t("Mois en cours")],
  ["quarter", () => t("Trimestre")],
  ["year", () => t("Année en cours")],
  ["custom", () => t("Personnalisé")],
];

// Petit sélecteur de période local (pas encore de composant partagé Domus
// pour ça — ne pas sur-concevoir, garder ici tant qu'un 2e écran n'en a pas besoin).
function PeriodPicker({ preset, setPreset, dateFrom, dateTo, setDateFrom, setDateTo }) {
  return (
    <div className="immo-filter-group" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {PRESETS.map(([key, label]) => (
        <button key={key} type="button" className={preset === key ? "active" : ""} onClick={() => setPreset(key)}>
          {label()}
        </button>
      ))}
      {preset === "custom" && (
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span>{t("à")}</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </span>
      )}
    </div>
  );
}

function CategoryBreakdown({ items, sym }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  return (
    <div className="pnl-breakdown">
      <button type="button" className="immo-link" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {" "}{t("Détail par catégorie")}
      </button>
      {open && (
        <ul className="pnl-breakdown-list">
          {items.map((row) => (
            <li key={row.category}>
              <span>{CATEGORY_LABEL[row.category] || row.category}</span>
              <b>{money(row.amount, sym)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CurrencyCard({ entry }) {
  const sym = entry.currencySymbol || entry.currencyCode || "";
  const net = Number(entry.netIncome || 0);
  const netColor = net >= 0 ? "#059669" : "#e11d48";
  return (
    <div className="card ops-panel pnl-card">
      <div className="panel-title">{entry.currencyName || entry.currencyCode || sym}</div>

      <div className="ops-score">
        <span>{tf(t("Revenus (loyers) — {count} paiement(s)"), { count: entry.revenue?.count ?? 0 })}</span>
        <b>{money(entry.revenue?.rent, sym)}</b>
      </div>

      <div className="ops-score">
        <span>{tf(t("Dépenses — {count} enregistrement(s)"), { count: entry.expenses?.count ?? 0 })}</span>
        <b>{money(entry.expenses?.total, sym)}</b>
      </div>
      <CategoryBreakdown items={entry.expenses?.byCategory} sym={sym} />

      <div className="ops-score">
        <span>{t("Intérêts payés (hypothèque)")}</span>
        <b>{money(entry.mortgage?.interest, sym)}</b>
      </div>

      <div className="pnl-net-block" style={{ borderColor: netColor }}>
        <span>{t("Résultat net")}</span>
        <b style={{ color: netColor }}>{money(entry.netIncome, sym)}</b>
      </div>

      {(Number(entry.mortgage?.principal || 0) !== 0 || Number(entry.mortgage?.escrow || 0) !== 0) && (
        <div className="pnl-mortgage-aside">
          <div className="pnl-mortgage-aside-title">
            <Landmark size={13} /> {t("Hors résultat net — remboursement de dette")}
          </div>
          <div className="ops-score">
            <span>{t("Capital remboursé")}</span>
            <b>{money(entry.mortgage?.principal, sym)}</b>
          </div>
          <div className="ops-score">
            <span>{t("Frais annexes")}</span>
            <b>{money(entry.mortgage?.escrow, sym)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

export function Pnl() {
  const [propertyId, setPropertyId] = useState("");
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const propertiesApi = useApi(() => api.properties(), []);
  const properties = useMemo(() => (Array.isArray(propertiesApi.data) ? propertiesApi.data : propertiesApi.data?.data || []), [propertiesApi.data]);

  useEffect(() => {
    const prefillId = takePnlPrefill();
    if (prefillId) setPropertyId(prefillId);
  }, []);

  useEffect(() => {
    if (!propertyId && properties.length) setPropertyId(String(properties[0].id));
  }, [properties, propertyId]);

  const { dateFrom, dateTo } = preset === "custom" ? { dateFrom: customFrom, dateTo: customTo } : periodRange(preset);

  const pnlApi = useApi(
    () => (propertyId ? api.propertyPnl(propertyId, dateFrom, dateTo) : Promise.resolve(null)),
    [propertyId, dateFrom, dateTo],
  );

  const byCurrency = useMemo(() => pnlApi.data?.byCurrency || [], [pnlApi.data]);

  if (propertiesApi.loading) return <Loading />;
  if (propertiesApi.error) return <ApiError error={propertiesApi.error} onRetry={propertiesApi.reload} />;

  return (
    <>
      <div className="immo-header">
        <div>
          <h1>{t("P&L par propriété")}</h1>
          <p>{t("Revenus, dépenses et hypothèque sur une période — résultat net par devise.")}</p>
        </div>
      </div>

      <div className="maintenance-toolbar" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <div className="immo-filter-autocomplete">
          <Autocomplete value={propertyId} onChange={setPropertyId} allowClear={false} placeholder={t("Choisir une propriété")}
            options={properties.map((p) => [String(p.id), p.name])} />
        </div>
        <PeriodPicker
          preset={preset}
          setPreset={setPreset}
          dateFrom={customFrom}
          dateTo={customTo}
          setDateFrom={setCustomFrom}
          setDateTo={setCustomTo}
        />
      </div>

      {!propertyId && (
        <div className="card maintenance-empty">{t("Sélectionnez une propriété pour afficher son P&L.")}</div>
      )}

      {propertyId && pnlApi.loading && <Loading />}
      {propertyId && pnlApi.error && <ApiError error={pnlApi.error} onRetry={pnlApi.reload} />}

      {propertyId && !pnlApi.loading && !pnlApi.error && (
        byCurrency.length === 0 ? (
          <div className="card maintenance-empty">
            <BarChart3 size={18} style={{ marginBottom: 6 }} />
            <div>{t("Aucune donnée pour cette propriété sur la période sélectionnée.")}</div>
          </div>
        ) : (
          <div className="pnl-cards-grid">
            {byCurrency.map((entry) => (
              <CurrencyCard key={entry.currencyId ?? entry.currencyCode} entry={entry} />
            ))}
          </div>
        )
      )}
    </>
  );
}
