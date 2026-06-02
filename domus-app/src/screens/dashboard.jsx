import {
  TrendingUp, DoorOpen, Wallet, AlertTriangle, RefreshCw, UserCheck,
  Smartphone, UserPlus, Wrench, Building, ChevronRight,
} from "lucide-react";
import { api } from "../api.js";
import { useApi, money } from "../data.js";

export function Dashboard({ go }) {
  const { data, loading, error } = useApi(() => api.dashboard(), []);

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  const d = data || {};
  const occupancy = d.units ? Math.round((d.occupiedUnits / d.units) * 100) : 0;

  return (
    <>
      {/* ─────────── ACCUEIL SIMPLE (mobile) ─────────── */}
      <div className="mob-home" style={{ display: "grid", gap: 16 }}>
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
            <Building size={24} color="#475569" /><div className="lab">Voir<br />les biens</div>
          </a>
        </div>

        <div className="grid g2 keep">
          <Kpi label="Loyers du mois" value={money(d.monthlyRent)} sub={`${occupancy}% occupé`} />
          <Kpi label="Encaissé (cumul)" value={money(d.collectedRent)} sub={`${d.activeLeases || 0} baux actifs`} />
        </div>
      </div>

      {/* ─────────── DASHBOARD RICHE (bureau) ─────────── */}
      <div className="desk-only">
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">Vue d'ensemble</div>
            <h2 className="title">Votre parc locatif</h2>
          </div>
          <button className="btn btn-primary" onClick={() => go("baux")}>+ Nouveau bail</button>
        </div>

        <div className="grid g4" style={{ marginBottom: 16 }}>
          <Kpi label="Biens" value={d.properties ?? 0} sub={`${d.units ?? 0} unités`} icon={<Building size={16} color="#6366f1" />} />
          <Kpi label="Occupation" value={`${occupancy} %`} sub={`${d.occupiedUnits ?? 0} / ${d.units ?? 0} unités`} icon={<DoorOpen size={16} color="#6366f1" />} />
          <Kpi label="Loyers actifs (mois)" value={money(d.monthlyRent)} sub={`${d.activeLeases ?? 0} baux actifs`} icon={<Wallet size={16} color="#6366f1" />} />
          <Kpi label="Maintenance ouverte" value={d.openMaintenance ?? 0} sub="interventions" icon={<Wrench size={16} color="#6366f1" />} ring={d.openMaintenance > 0} />
        </div>

        <div className="grid g3">
          <div className="card" style={{ padding: 20, gridColumn: "span 2" }}>
            <h3 className="font-display" style={{ fontWeight: 600, fontSize: 15, marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={16} color="#6366f1" /> Encaissé cumulé
            </h3>
            <div className="kpi-value" style={{ fontSize: 30 }}>{money(d.collectedRent)}</div>
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
