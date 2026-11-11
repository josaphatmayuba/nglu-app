import React from "react";
import { api } from "./api.js";

// Relevé de compte d'un chantier. Réutilisable (phase 3 publique) via `fetcher` + `hideBalance`.
const CATEGORIES = [
  { id: "", label: "Toutes les catégories" },
  { id: "funding", label: "Fonds reçus" },
  { id: "funding_cancel", label: "Fonds annulés" },
  { id: "materials", label: "Matériaux" },
  { id: "fees", label: "Honoraires" },
  { id: "labor", label: "Main-d'œuvre" },
  { id: "handling", label: "Manutention" },
  { id: "other", label: "Autres" },
  { id: "client_invoice", label: "Factures client" },
];
const STATUS_BADGE = {
  pending: { label: "en attente", tone: "amber" },
  cancelled: { label: "annulé", tone: "rose" },
  to_convert: { label: "à convertir", tone: "amber" },
  other_currency: { label: "autre devise", tone: "ink" },
  info: { label: "info", tone: "ink" },
};

// 2 décimales exactes, jamais d'arrondi à 0 décimale ; devise issue de la donnée.
function amt(value, code) {
  const n = Number(value || 0);
  if (!code) return `${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (devise non renseignée)`;
  try {
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${code} ${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
const catLabel = (l) => l.category_label || CATEGORIES.find((c) => c.id === l.category)?.label || l.category || "";

function csvCell(v) {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function exportCsv(data, hideBalance, filename) {
  const sep = ";"; // Excel FR/CA
  const num = (v) => (v == null || v === "" ? "" : Number(v).toFixed(2).replace(".", ","));
  const head = ["Date", "Libellé", "Catégorie", ...(hideBalance ? [] : ["Entrée"]), "Sortie", "Devise", ...(hideBalance ? [] : ["Solde"]), "Statut"];
  const rows = (data.lines || []).map((l) => [
    l.date ? String(l.date).slice(0, 10) : "", l.label, catLabel(l),
    ...(hideBalance ? [] : [l.entry ? num(l.entry) : ""]), l.exit ? num(l.exit) : "", l.currency_code || data.currency_code || "",
    ...(hideBalance ? [] : [l.balance == null ? "" : num(l.balance)]),
    STATUS_BADGE[l.status]?.label || "",
  ]);
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(sep)).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProjectStatement({ projectId, data: dataProp, fetcher, hideBalance = false }) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [data, setData] = React.useState(dataProp || null);
  const [loading, setLoading] = React.useState(!dataProp);
  const [error, setError] = React.useState("");
  // Tri par defaut : du plus recent au plus ancien (le solde reste celui de l'ordre chronologique).
  const [newestFirst, setNewestFirst] = React.useState(true);

  React.useEffect(() => {
    if (dataProp) { setData(dataProp); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError("");
    const run = fetcher ? fetcher({ from, to, category }) : api.projectStatement(projectId, { from, to, category });
    Promise.resolve(run)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) { setData(null); setError(e?.message || "Impossible de charger le relevé."); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId, from, to, category, dataProp, fetcher]);

  const cur = data?.currency_code;
  const chrono = data?.lines || [];
  const lines = React.useMemo(() => (newestFirst ? [...chrono].reverse() : chrono), [chrono, newestFirst]);
  // hideBalance (lien ingenieur) : sorties seulement, ni entrees ni soldes ni categories de fonds.
  const cols = hideBalance ? 4 : 6;
  const cats = hideBalance ? CATEGORIES.filter((c) => !["funding", "funding_cancel", "client_invoice"].includes(c.id)) : CATEGORIES;

  return (
    <div className="stmt report-print" style={{ display: "grid", gap: 12 }}>
      <div className="no-print stmt-filters">
        {!dataProp && <>
          <label className="field"><span>Du</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>Au</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="field"><span>Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </>}
        <button type="button" className="btn btn-ghost stmt-btn" disabled={!data || !lines.length} onClick={() => exportCsv({ ...data, lines }, hideBalance, `releve-chantier-${projectId || "public"}.csv`)}>Exporter CSV</button>
        <button type="button" className="btn btn-ghost stmt-btn" aria-pressed={newestFirst} onClick={() => setNewestFirst((v) => !v)}>{newestFirst ? "Plus récent d'abord" : "Plus ancien d'abord"}</button>
        <button type="button" className="btn btn-ghost stmt-btn" disabled={!data} onClick={() => window.print()}>Imprimer / PDF</button>
      </div>

      {error && <div className="no-print" style={{ color: "var(--rose-600, #b91c1c)", fontSize: 13 }}>{error}</div>}

      {data && (
        <div className="stmt-totals">
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Solde d'ouverture</span><strong>{amt(data.opening_balance, cur)}</strong></div>}
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Entrées</span><strong>{amt(data.totals?.entries, cur)}</strong></div>}
          <div className="card stmt-kpi"><span className="muted">Sorties</span><strong>{amt(data.totals?.exits, cur)}</strong></div>
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Solde final</span><strong>{amt(data.final_balance ?? data.closing_balance, cur)}</strong></div>}
        </div>
      )}

      <div className="card table-card">
        <table className="bp card-table">
          <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th>{!hideBalance && <th>Entrée</th>}<th>Sortie</th>{!hideBalance && <th>Solde</th>}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={cols} className="muted">Chargement…</td></tr> :
              !lines.length ? <tr><td colSpan={cols} className="muted">{error ? "Relevé indisponible." : "Aucun mouvement sur cette période."}</td></tr> :
              lines.map((l, i) => {
                const badge = STATUS_BADGE[l.status];
                const lc = l.currency_code || cur;
                return (
                  <tr key={i} style={l.status === "cancelled" ? { opacity: 0.6 } : undefined}>
                    <td data-label="Date" style={{ color: "var(--ink-500)", whiteSpace: "nowrap" }}>{l.date ? String(l.date).slice(0, 10) : "—"}</td>
                    <td data-label="Libellé">
                      {l.label}{" "}
                      {badge && <span className={`chip ${badge.tone}`}>{badge.label}</span>}
                    </td>
                    <td data-label="Catégorie">{catLabel(l)}</td>
                    {!hideBalance && <td data-label="Entrée" style={{ textAlign: "right" }}>{l.entry ? amt(l.entry, lc) : "—"}</td>}
                    <td data-label="Sortie" style={{ textAlign: "right" }}>{l.exit ? amt(l.exit, lc) : "—"}</td>
                    {!hideBalance && <td data-label="Solde" style={{ textAlign: "right", fontWeight: 500 }}>{l.balance == null ? "—" : amt(l.balance, cur)}</td>}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectStatement;
