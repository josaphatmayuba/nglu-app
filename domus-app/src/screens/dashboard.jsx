import { useState } from "react";
import {
  TrendingUp, DoorOpen, Wallet, AlertTriangle, RefreshCw, UserCheck,
  Smartphone, UserPlus, Wrench, Building, ChevronRight, Search,
} from "lucide-react";
import { api } from "../api.js";
import { filterLeases, filterPayments, useDateRange } from "../dateRange.jsx";
import { groupAmountsByCurrency, normalizeCurrencyModule, useApi } from "../data.js";
import { useRealtimeReload } from "../realtime.js";
import { Metric, MetricsGrid, MoneyStack } from "./ui.jsx";

export function Dashboard({ go }) {
  const { data, loading, error, reload } = useApi(loadDashboardModule, []);
  useRealtimeReload(reload, ["properties", "units", "leases", "payments", "maintenance", "tenants"]);
  const dateRange = useDateRange();
  const [q, setQ] = useState("");

  // Recherche globale : lance le catalogue Biens en transmettant le terme.
  const runSearch = () => {
    const term = q.trim();
    try { if (term) sessionStorage.setItem("domus-search", term); } catch {}
    go("biens");
  };

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const d = data?.dashboard || {};
  const leases = filterLeases(Array.isArray(data?.leases) ? data.leases : [], dateRange);
  const leaseIds = new Set(leases.map((lease) => lease.id));
  const payments = filterPayments(Array.isArray(data?.payments) ? data.payments : [], dateRange)
    .filter((payment) => leaseIds.has(payment.leaseId));
  const currency = normalizeCurrencyModule(data?.currencies, data?.setting);
  const activeLeases = leases.filter((lease) => (lease.status || "active") === "active");
  const monthlyRentRows = groupAmountsByCurrency(activeLeases, (lease) => lease.rentAmount, currency.defaultCurrencySymbol);
  const collectedRows = groupAmountsByCurrency(payments, (payment) => payment.amount, currency.defaultCurrencySymbol);
  const occupancy = d.units ? Math.round((d.occupiedUnits / d.units) * 100) : 0;

  return (
    <>
      {/* ─────────── ACCUEIL SIMPLE (mobile) ─────────── */}
      <div className="mob-home">
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>À faire aujourd'hui</div>
          <Row icon={<AlertTriangle size={16} color="#be123c" />} bg="#ffe4e6"
            title={`${d.openMaintenance || 0} intervention(s) ouverte(s)`} sub="à traiter" onClick={() => go("maintenance")} />
          <Row icon={<DoorOpen size={16} color="#4f46e5" />} bg="#e0e7ff"
            title={`${d.vacantUnits || 0} unité(s) vacante(s)`} sub="à relouer" onClick={() => go("biens")} last />
        </div>

        <div className="actiles">
          <a className="card actile grad-iris" style={{ color: "#fff" }} onClick={() => go("paiement")}>
            <Smartphone size={24} /><div className="lab">Encaisser<br />un loyer</div>
          </a>
          <a className="card actile" onClick={() => go("onboarding")}>
            <UserPlus size={24} color="#4f46e5" /><div className="lab">Ajouter<br />un locataire</div>
          </a>
          <a className="card actile" onClick={() => go("maintenance")}>
            <Wrench size={24} color="#d97706" /><div className="lab">Déclarer<br />une panne</div>
          </a>
          <a className="card actile" onClick={() => go("biens")}>
            <Building size={24} color="#475569" /><div className="lab">Voir<br />proprietes</div>
          </a>
        </div>

        <div className="grid g2 keep">
          <Kpi label="Loyers du mois" value={<MoneyStack rows={monthlyRentRows} fallbackSymbol={currency.defaultCurrencySymbol} />} sub={`${occupancy}% occupé`} />
          <Kpi label="Encaissé (cumul)" value={<MoneyStack rows={collectedRows} fallbackSymbol={currency.defaultCurrencySymbol} />} sub={`${d.activeLeases || 0} baux actifs`} />
        </div>
      </div>

      {/* ─────────── DASHBOARD RICHE (bureau) ─────────── */}
      <div className="desk-only">
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">Vue d'ensemble</div>
            <h2 className="title">Votre parc locatif</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label className="immo-search">
              <Search size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Rechercher propriete, locataire..." />
            </label>
            <button className="btn btn-primary" onClick={() => go("baux")}>+ Nouveau bail</button>
          </div>
        </div>

        <MetricsGrid>
          <Metric tone="brand" icon={<Building size={20} />} label="Proprietes" value={d.properties ?? 0} helper={`${d.units ?? 0} lots`} />
          <Metric tone="green" icon={<DoorOpen size={20} />} label="Occupation" value={`${occupancy} %`}
            helper={<><span className="immo-progress"><span style={{ width: `${occupancy}%` }} /></span>{`${d.occupiedUnits ?? 0} / ${d.units ?? 0} unites`}</>} />
          <Metric tone="amber" icon={<Wallet size={20} />} label="Loyers du mois" value={<MoneyStack rows={monthlyRentRows} fallbackSymbol={currency.defaultCurrencySymbol} />} helper={`${d.activeLeases ?? 0} baux actifs`} />
          <Metric tone="red" icon={<Wrench size={20} />} label="Maintenance ouverte" value={d.openMaintenance ?? 0}
            valueColor={d.openMaintenance > 0 ? "#dc2626" : undefined} helper="interventions" />
        </MetricsGrid>

        <div className="grid g3">
          <div className="card" style={{ padding: 20, gridColumn: "span 2" }}>
            <h3 className="font-display" style={{ fontWeight: 600, fontSize: 15, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={16} color="#6366f1" /> Encaissé cumulé
            </h3>
            <div className="kpi-value" style={{ fontSize: 30 }}><MoneyStack rows={collectedRows} fallbackSymbol={currency.defaultCurrencySymbol} /></div>
            <p className="muted" style={{ fontSize: 13 }}>
              Total des paiements de loyer enregistrés. Le détail par échéance arrive avec l'écran Loyers (SCRUM-248).
            </p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3 className="font-display" style={{ fontWeight: 600, fontSize: 15, marginTop: 0 }}>Occupation</h3>
            <Bar label="Parc" pct={occupancy} />
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              {d.vacantUnits ?? 0} unité(s) vacante(s) · {d.occupiedUnits ?? 0} occupée(s)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

async function loadDashboardModule() {
  const [dashboard, leases, payments, currencies, setting] = await Promise.all([
    api.dashboard(),
    api.leases(),
    api.payments(),
    api.currencies(),
    api.setting(),
  ]);
  return { dashboard, leases, payments, currencies, setting };
}

function Row({ icon, bg, title, sub, onClick, last }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
      borderBottom: last ? "none" : "1px solid var(--ink-100)", cursor: "pointer" }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
      </div>
      <ChevronRight size={16} color="#cbd5e1" />
    </div>
  );
}

function Kpi({ label, value, sub, icon, ring }) {
  return (
    <div className="card" style={{ padding: 16, ...(ring ? { boxShadow: "0 0 0 1px #fecdd3 inset", background: "#fff5f6" } : {}) }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="kpi-label">{label}</span>{icon}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function Bar({ label, pct }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span><span className="muted">{pct} %</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}>
        <div className="grad-iris" style={{ height: "100%", width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Loading() {
  return <div style={{ display: "grid", placeItems: "center", padding: 60 }}><div className="spinner" /></div>;
}

export function ApiError({ error }) {
  return (
    <div className="card" style={{ padding: 20, borderColor: "#fecdd3", background: "#fff5f6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#be123c", fontWeight: 600 }}>
        <AlertTriangle size={18} /> Impossible de charger les données
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>{String(error?.message || error)}</p>
    </div>
  );
}
