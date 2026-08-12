// SCRUM-303 (KodaTill Phase 4, dernier ticket) — Espace "Super Admin"
// reserve au role super_owner. Fichier dedie plutot qu'ajout dans screens.jsx
// (deja tres volumineux), meme pattern de separation que public-menu.jsx.
//
// IMPORTANT : cet espace est concu comme un PREMIER JALON reutilisable pour
// d'autres modules futurs (pas seulement KodaTill) — la console organisations
// (suspendre/reactiver) existe deja hors KodaTill (organizations.controller.ts,
// P4 multi-tenant generique) et un futur module pourrait ajouter ses propres
// onglets ici sans dupliquer le gate de role. Le contenu actuel (plans,
// abonnements, commissions) est en revanche specifique KodaTill.
//
// Verification du role cote frontend : isSuperOwner() lit localStorage.role,
// peuple par auth.jsx a la connexion/refresh (data.role du backend). C'est un
// MIROIR cosmetique de la logique serveur (JwtAuthGuard calcule isSuperOwner
// en DB depuis roles.name === "super_owner", jamais depuis le JWT) : la vraie
// autorisation reste imposee par SuperOwnerGuard sur chaque route backend.
// Aucun nouvel appel reseau necessaire, aucun nouveau mecanisme invente.
import React from "react";
import {
  LayoutDashboard, Building2, BadgeCheck, Percent, Coins, ShoppingCart, Play, Pause, Plus, Pencil,
} from "lucide-react";
import { api } from "./api.js";

export function isSuperOwner() {
  try {
    return (localStorage.getItem("role") || "").trim() === "super_owner";
  } catch {
    return false;
  }
}

// Montant toujours accompagne de la devise renvoyee par l'API (jamais en dur),
// meme convention que formatMoney dans screens.jsx / public-menu.jsx.
const formatMoney = (amount, currencyCode) => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n.toFixed(2) : "0.00";
  return `${value} ${currencyCode || ""}`.trim();
};

// Un objet { USD: 120.5, CDF: 300000 } -> affichage ligne par ligne.
function MoneyByCurrency({ byCurrency }) {
  const entries = Object.entries(byCurrency || {});
  if (!entries.length) return <span style={{ color: "var(--fg-3, #6b6b6b)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {entries.map(([code, amount]) => (
        <span key={code}>{formatMoney(amount, code)}</span>
      ))}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{
      background: "var(--oxblood-50, #f5e3e3)", color: "var(--oxblood-800, #7a1f2b)",
      padding: "10px 14px", borderRadius: 8, fontSize: 13, margin: "0 0 12px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "transparent", border: "1px solid currentColor", color: "inherit",
          borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", flexShrink: 0,
        }}>
          Réessayer
        </button>
      )}
    </div>
  );
}

const KPI_CARD_STYLE = {
  background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
  borderRadius: 12, padding: "16px 18px", minWidth: 200, flex: "1 1 200px",
};

// icon/iconBg/iconColor optionnels : badge pastel rond, cf. mockup admKpis
// (ligne ~950 KodaTill.html) — chaque KPI y a une icone dans un badge colore.
function KpiCard({ label, children, icon: Icon, iconBg, iconColor }) {
  return (
    <div style={KPI_CARD_STYLE}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </div>
        {Icon && (
          <span style={{
            width: 32, height: 32, borderRadius: 10, background: iconBg || "rgba(31,109,117,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={16} color={iconColor || "#1f6d75"} />
          </span>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-1, #0E2418)" }}>{children}</div>
    </div>
  );
}

// icones cf. mockup admNav (KodaTill.html ~944) : layout-dashboard, building-2,
// badge-check (le mockup l'utilise pour "Abonnements", le plus proche de nos
// plans d'abonnement), percent (Commissions).
const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "organizations", label: "Organisations", icon: Building2 },
  { id: "plans", label: "Plans", icon: BadgeCheck },
  { id: "commissions", label: "Commissions", icon: Percent },
];

const TABLE_TH = {
  textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600,
  color: "var(--fg-3, #6b6b6b)", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "1px solid var(--border-1, #E7EBF1)",
};
const TABLE_TD = {
  padding: "10px 12px", fontSize: 13.5, color: "var(--fg-1, #0E2418)",
  borderBottom: "1px solid var(--border-1, #E7EBF1)", verticalAlign: "top",
};

const BTN_PRIMARY = {
  background: "#1f6d75", color: "#FBF8F2", padding: "8px 14px", border: 0,
  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
};
const BTN_SECONDARY = {
  background: "transparent", color: "#1f6d75", padding: "7px 13px", border: "1px solid #1f6d75",
  borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
};
const BTN_DANGER = {
  background: "transparent", color: "var(--oxblood-800, #7a1f2b)", padding: "6px 10px",
  border: "1px solid var(--oxblood-800, #7a1f2b)", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer",
};

// -- Vue d'ensemble --------------------------------------------------------
function OverviewTab() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getPlatformOverview());
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 24, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>;

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />
      {data && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {/* icones cf. mockup admKpis (KodaTill.html ~950) : building-2/bg-kp-50
              pour "Entreprises actives", badge-check pour les abonnements (nav
              admin), shopping-cart/bg-blue-50 pour le volume (equivalent le
              plus proche de "Ventes totales" ici), coins/bg-amber-50 pour les
              commissions. */}
          <KpiCard label="Organisations actives" icon={Building2} iconBg="#effafa" iconColor="#1f6d75">
            {data.activatedOrganizations}
          </KpiCard>
          <KpiCard label="Abonnements actifs/essai" icon={BadgeCheck} iconBg="#ecfdf5" iconColor="#10b981">
            {data.subscribedOrganizations}
          </KpiCard>
          <KpiCard label="Ventes totales" icon={ShoppingCart} iconBg="#eff6ff" iconColor="#3b82f6">
            <MoneyByCurrency byCurrency={data.totalSalesByCurrency} />
          </KpiCard>
          <KpiCard label={`Commissions du mois (${data.commissionsPeriod || "—"})`} icon={Coins} iconBg="#fffbeb" iconColor="#d97706">
            <MoneyByCurrency byCurrency={data.commissionsThisMonthByCurrency} />
          </KpiCard>
        </div>
      )}
    </div>
  );
}

// -- Organisations ----------------------------------------------------------
const SUBSCRIPTION_STATUS_LABELS = {
  active: "Actif", trial: "Essai", past_due: "Impayé", cancelled: "Résilié", none: "Aucun",
};

function OrganizationsTab() {
  const [companies, setCompanies] = React.useState([]);
  const [publicIdByOrgId, setPublicIdByOrgId] = React.useState({});
  const [orgStatusById, setOrgStatusById] = React.useState({});
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busyOrgId, setBusyOrgId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyRows, orgRows] = await Promise.all([
        api.listPlatformCompanies({ limit: 200, offset: 0 }),
        api.listOrganizations(),
      ]);
      setCompanies(Array.isArray(companyRows) ? companyRows : []);
      const idMap = {};
      const statusMap = {};
      for (const o of Array.isArray(orgRows) ? orgRows : []) {
        idMap[o.id] = o.publicId;
        statusMap[o.id] = o.status;
      }
      setPublicIdByOrgId(idMap);
      setOrgStatusById(statusMap);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const toggleSuspend = async (organizationId, isSuspended) => {
    const publicId = publicIdByOrgId[organizationId];
    if (!publicId) {
      setError("Organisation introuvable (publicId manquant).");
      return;
    }
    const confirmMsg = isSuspended
      ? "Réactiver cette organisation ?"
      : "Suspendre cette organisation ? Ses utilisateurs perdront l'accès jusqu'à réactivation.";
    if (!window.confirm(confirmMsg)) return;
    setBusyOrgId(organizationId);
    setError(null);
    try {
      if (isSuspended) {
        await api.reactivateOrganization(publicId);
      } else {
        const reason = window.prompt("Motif de la suspension (optionnel) :", "") || undefined;
        await api.suspendOrganization(publicId, reason);
      }
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusyOrgId(null);
    }
  };

  if (loading) return <div style={{ padding: 24, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>;

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TABLE_TH}>Organisation</th>
              <th style={TABLE_TH}>Activité</th>
              <th style={TABLE_TH}>Abonnement</th>
              <th style={TABLE_TH}>Ventes</th>
              <th style={TABLE_TH}>Commandes</th>
              <th style={TABLE_TH}>Statut</th>
              <th style={TABLE_TH}></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const orgStatus = orgStatusById[c.organizationId];
              const isSuspended = orgStatus === "suspended";
              return (
                <tr key={c.organizationId}>
                  <td style={TABLE_TD}>{c.organizationName || `Org #${c.organizationId}`}</td>
                  <td style={TABLE_TD}>{c.activityType || "—"}</td>
                  <td style={TABLE_TD}>{SUBSCRIPTION_STATUS_LABELS[c.subscriptionStatus] || c.subscriptionStatus}</td>
                  <td style={TABLE_TD}><MoneyByCurrency byCurrency={c.totalSalesByCurrency} /></td>
                  <td style={TABLE_TD}>{c.orderCount}</td>
                  <td style={TABLE_TD}>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: isSuspended ? "var(--oxblood-50, #f5e3e3)" : "rgba(31,109,117,0.12)",
                      color: isSuspended ? "var(--oxblood-800, #7a1f2b)" : "#1f6d75",
                    }}>
                      {isSuspended ? "Suspendue" : "Active"}
                    </span>
                  </td>
                  <td style={TABLE_TD}>
                    {/* icones Play/Pause, cf. mockup admCompanies popup actions
                        (KodaTill.html ~2056-2057 : ic:'play' Reactiver, ic:'pause' Suspendre) */}
                    <button
                      disabled={busyOrgId === c.organizationId || !publicIdByOrgId[c.organizationId]}
                      onClick={() => toggleSuspend(c.organizationId, isSuspended)}
                      style={{ ...(isSuspended ? BTN_SECONDARY : BTN_DANGER), display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {busyOrgId === c.organizationId ? "…" : isSuspended ? (<><Play size={13} />Réactiver</>) : (<><Pause size={13} />Suspendre</>)}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!companies.length && (
              <tr><td style={TABLE_TD} colSpan={7}>Aucune organisation KodaTill pour l'instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Plans --------------------------------------------------------------
const EMPTY_PLAN_FORM = { code: "", name: "", monthlyPrice: "", currencyCode: "USD", commissionRate: "" };

function PlanForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = React.useState(initial || EMPTY_PLAN_FORM);
  const isEdit = !!initial;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...(isEdit ? {} : { code: form.code.trim() }),
      name: form.name.trim(),
      monthlyPrice: form.monthlyPrice,
      currencyCode: form.currencyCode.trim().toUpperCase(),
      commissionRate: form.commissionRate,
    });
  };

  return (
    <form onSubmit={submit} style={{
      display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end",
      background: "var(--paper, #fff)", border: "1px solid var(--border-1, #E7EBF1)",
      borderRadius: 12, padding: 16, marginBottom: 16,
    }}>
      {!isEdit && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Code</span>
          <input required value={form.code} onChange={set("code")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13, width: 120 }} />
        </label>
      )}
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Nom</span>
        <input required value={form.name} onChange={set("name")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13, width: 160 }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Prix mensuel</span>
        <input required type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={set("monthlyPrice")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13, width: 110 }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Devise</span>
        <input required value={form.currencyCode} onChange={set("currencyCode")} maxLength={3} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13, width: 70, textTransform: "uppercase" }} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Commission (%)</span>
        <input required type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={set("commissionRate")} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13, width: 100 }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={submitting} style={BTN_PRIMARY}>{submitting ? "…" : isEdit ? "Enregistrer" : "Créer"}</button>
        {onCancel && <button type="button" onClick={onCancel} style={BTN_SECONDARY}>Annuler</button>}
      </div>
    </form>
  );
}

function PlansTab() {
  const [plans, setPlans] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await api.listPlans());
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const create = async (body) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createPlan(body);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (id, body) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.updatePlan(id, body);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Désactiver ce plan ? Il ne sera plus proposé (soft delete).")) return;
    setError(null);
    try {
      await api.removePlan(id);
      await load();
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  if (loading) return <div style={{ padding: 24, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>;

  return (
    <div>
      <ErrorBanner message={error} onRetry={load} />
      <div style={{ marginBottom: 12 }}>
        {/* icone Plus, cf. data-lucide="plus" dans le mockup (boutons de creation) */}
        {!showCreate && (
          <button style={{ ...BTN_PRIMARY, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowCreate(true)}>
            <Plus size={14} />Nouveau plan
          </button>
        )}
      </div>
      {showCreate && (
        <PlanForm submitting={submitting} onCancel={() => setShowCreate(false)} onSubmit={create} />
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TABLE_TH}>Code</th>
              <th style={TABLE_TH}>Nom</th>
              <th style={TABLE_TH}>Prix mensuel</th>
              <th style={TABLE_TH}>Commission</th>
              <th style={TABLE_TH}></th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              editingId === p.id ? (
                <tr key={p.id}>
                  <td style={TABLE_TD} colSpan={5}>
                    <PlanForm
                      initial={{ name: p.name, monthlyPrice: p.monthlyPrice, currencyCode: p.currencyCode, commissionRate: p.commissionRate }}
                      submitting={submitting}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(body) => update(p.id, body)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td style={TABLE_TD}>{p.code}</td>
                  <td style={TABLE_TD}>{p.name}</td>
                  <td style={TABLE_TD}>{formatMoney(p.monthlyPrice, p.currencyCode)}</td>
                  <td style={TABLE_TD}>{Number(p.commissionRate).toFixed(2)} %</td>
                  <td style={TABLE_TD}>
                    {/* icone Pencil, cf. data-lucide="pencil" dans le mockup (edition) */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ ...BTN_SECONDARY, display: "flex", alignItems: "center", gap: 6 }} onClick={() => setEditingId(p.id)}>
                        <Pencil size={13} />Modifier
                      </button>
                      <button style={BTN_DANGER} onClick={() => remove(p.id)}>Désactiver</button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {!plans.length && (
              <tr><td style={TABLE_TD} colSpan={5}>Aucun plan configuré.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Commissions --------------------------------------------------------
function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function CommissionsTab() {
  const [period, setPeriod] = React.useState(currentPeriod());
  const [entries, setEntries] = React.useState([]);
  const [summary, setSummary] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [computing, setComputing] = React.useState(false);

  const load = React.useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await api.listCommissions(p));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(period); }, [load, period]);

  const compute = async () => {
    setComputing(true);
    setError(null);
    setSummary(null);
    try {
      const res = await api.computeCommissions({ period });
      setSummary(res);
      await load(period);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setComputing(false);
    }
  };

  return (
    <div>
      <ErrorBanner message={error} onRetry={() => load(period)} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>Période (AAAA-MM)</span>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border-2, #d8c8a8)", fontSize: 13 }} />
        </label>
        <button style={BTN_PRIMARY} disabled={computing || !period} onClick={compute}>
          {computing ? "Calcul…" : "Calculer les commissions"}
        </button>
      </div>

      {summary && (
        <div style={{ marginBottom: 16 }}>
          <KpiCard label={`Entrées créées (${period})`}>
            {summary.entriesCreated}
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
              <MoneyByCurrency byCurrency={summary.totalCommission} />
            </div>
          </KpiCard>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, color: "var(--fg-3, #6b6b6b)" }}>Chargement…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TABLE_TH}>Organisation</th>
                <th style={TABLE_TH}>Base</th>
                <th style={TABLE_TH}>Taux</th>
                <th style={TABLE_TH}>Commission</th>
                <th style={TABLE_TH}>Réglée</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={TABLE_TD}>{e.organizationName || `Org #${e.organizationId}`}</td>
                  <td style={TABLE_TD}>{formatMoney(e.baseAmount, e.currencyCode)}</td>
                  <td style={TABLE_TD}>{Number(e.rate).toFixed(2)} %</td>
                  <td style={TABLE_TD}>{formatMoney(e.commissionAmount, e.currencyCode)}</td>
                  <td style={TABLE_TD}>{e.settledAt ? "Oui" : "Non"}</td>
                </tr>
              ))}
              {!entries.length && (
                <tr><td style={TABLE_TD} colSpan={5}>Aucune commission pour cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -- Ecran racine ---------------------------------------------------------
// SuperAdminScreen : suppose deja gate par isSuperOwner() en amont (app.jsx),
// mais reaffiche un message si jamais monte hors contexte (defense en
// profondeur front — le vrai gate reste SuperOwnerGuard cote backend).
export function SuperAdminScreen() {
  const [tab, setTab] = React.useState("overview");

  if (!isSuperOwner()) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--fg-3, #6b6b6b)" }}>
        Accès réservé au propriétaire de la plateforme.
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border-1, #E7EBF1)", paddingBottom: 4, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? "rgba(31,109,117,0.12)" : "transparent",
              color: tab === t.id ? "#1f6d75" : "var(--fg-2, #333)",
              border: 0, borderRadius: "8px 8px 0 0", padding: "8px 14px",
              fontWeight: tab === t.id ? 700 : 500, fontSize: 13.5, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <OverviewTab />}
      {tab === "organizations" && <OrganizationsTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "commissions" && <CommissionsTab />}
    </div>
  );
}
