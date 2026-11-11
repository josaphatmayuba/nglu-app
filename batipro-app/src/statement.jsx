import React from "react";
import { flushSync } from "react-dom";
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
const SORTS = [
  { id: "date_desc", label: "Date (plus récent d'abord)" },
  { id: "date_asc", label: "Date (plus ancien d'abord)" },
  { id: "amount_desc", label: "Montant (plus grand d'abord)" },
  { id: "amount_asc", label: "Montant (plus petit d'abord)" },
  { id: "cat_asc", label: "Catégorie (A→Z)" },
];
const PAGE = 25;
const fmtDate = (d) => {
  if (!d) return "—";
  const m = String(d).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d).slice(0, 10);
};
const norm = (v) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
  const [reload, setReload] = React.useState(0);
  // Tri par defaut : du plus recent au plus ancien (le solde reste celui de l'ordre chronologique).
  const [sort, setSort] = React.useState("date_desc");
  const [q, setQ] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE);
  const [printAll, setPrintAll] = React.useState(false);
  React.useEffect(() => { setLimit(PAGE); }, [sort, q, from, to, category]);
  React.useEffect(() => {
    const done = () => setPrintAll(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, []);

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
  }, [projectId, from, to, category, dataProp, fetcher, reload]);

  const cur = data?.currency_code;
  const chrono = data?.lines || [];
  // Le solde de chaque ligne vient de l'API (ordre chronologique) : on ne trie que l'affichage, sans jamais recalculer.
  const lines = React.useMemo(() => {
    const nq = norm(q.trim());
    const idx = chrono.map((l, i) => ({ l, i }));
    const amount = (l) => (hideBalance ? Number(l.exit || 0) : Math.max(Number(l.entry || 0), Number(l.exit || 0)));
    const filtered = nq ? idx.filter(({ l }) => norm(`${l.label} ${catLabel(l)}`).includes(nq)) : idx;
    const cmp = {
      date_desc: (a, b) => b.i - a.i,
      date_asc: (a, b) => a.i - b.i,
      amount_desc: (a, b) => amount(b.l) - amount(a.l) || b.i - a.i,
      amount_asc: (a, b) => amount(a.l) - amount(b.l) || a.i - b.i,
      cat_asc: (a, b) => catLabel(a.l).localeCompare(catLabel(b.l), "fr") || a.i - b.i,
    }[sort];
    return [...filtered].sort(cmp).map((x) => x.l);
  }, [chrono, sort, q, hideBalance]);
  const shown = printAll ? lines : lines.slice(0, limit);
  const doPrint = () => { flushSync(() => setPrintAll(true)); window.print(); };
  // hideBalance (lien ingenieur) : sorties seulement, ni entrees ni soldes ni categories de fonds.
  const cols = hideBalance ? 4 : 6;
  const cats = hideBalance ? CATEGORIES.filter((c) => !["funding", "funding_cancel", "client_invoice"].includes(c.id)) : CATEGORIES;

  return (
    <div className="stmt report-print" style={{ display: "grid", gap: 12 }}>
      <div className="no-print stmt-filters">
        {!dataProp && <>
          <label className="field"><span>Du</span><input className="stmt-ctl" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>Au</span><input className="stmt-ctl" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <label className="field"><span>Catégorie</span>
            <select className="stmt-ctl" value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </>}
        <label className="field" htmlFor="stmt-sort"><span>Trier par</span>
          <select id="stmt-sort" className="stmt-ctl" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label className="field stmt-search" htmlFor="stmt-search"><span>Rechercher</span>
          <input id="stmt-search" className="stmt-ctl" type="search" placeholder="Libellé ou catégorie" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="stmt-actions">
          <button type="button" id="stmt-export" className="btn btn-ghost stmt-btn" disabled={!data || !lines.length} onClick={() => exportCsv({ ...data, lines }, hideBalance, `releve-chantier-${projectId || "public"}.csv`)}>Exporter CSV</button>
          <button type="button" id="stmt-print" className="btn btn-ghost stmt-btn" disabled={!data} onClick={doPrint}>Imprimer / PDF</button>
        </div>
      </div>

      {error && (
        <div className="no-print stmt-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost stmt-btn" onClick={() => setReload((n) => n + 1)}>Réessayer</button>
        </div>
      )}

      {data && (
        <div className="stmt-totals">
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Solde d'ouverture</span><strong>{amt(data.opening_balance, cur)}</strong></div>}
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Entrées</span><strong>{amt(data.totals?.entries, cur)}</strong></div>}
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Sorties</span><strong>{amt(data.totals?.exits, cur)}</strong></div>}
          {hideBalance && (
            <>
              <div className="card stmt-kpi"><span className="muted">Matériaux achetés</span><strong>{amt(data.kpis?.materials_total ?? 0, data.kpis?.currency_code || cur)}</strong></div>
              <div className="card stmt-kpi"><span className="muted">Honoraires payés</span><strong>{amt(data.kpis?.fees_paid ?? 0, data.kpis?.currency_code || cur)}</strong></div>
              <div className="card stmt-kpi"><span className="muted">Reste à payer (honoraires)</span><strong>{data.kpis?.fees_remaining == null ? "Non configuré" : amt(data.kpis.fees_remaining, data.kpis?.currency_code || cur)}</strong></div>
            </>
          )}
          {!hideBalance && <div className="card stmt-kpi"><span className="muted">Solde final</span><strong>{amt(data.final_balance ?? data.closing_balance, cur)}</strong></div>}
        </div>
      )}

      <div className="card table-card">
        <table className="bp card-table" aria-busy={loading}>
          <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th>{!hideBalance && <th>Entrée</th>}<th>Sortie</th>{!hideBalance && <th>Solde</th>}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={cols} className="muted" role="status" aria-live="polite">Chargement du relevé…</td></tr> :
              !lines.length ? <tr><td colSpan={cols} className="muted">{error ? "Relevé indisponible." : chrono.length ? "Aucune ligne ne correspond." : "Aucun mouvement sur cette période."}</td></tr> :
              shown.map((l, i) => {
                const badge = STATUS_BADGE[l.status];
                const lc = l.currency_code || cur;
                return (
                  <tr key={i} style={l.status === "cancelled" ? { opacity: 0.6 } : undefined}>
                    <td data-label="Date" style={{ color: "var(--ink-500)", whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
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
      {!loading && chrono.length > 0 && (
        <div className="no-print stmt-more">
          <span id="stmt-count" className="muted" role="status" aria-live="polite" aria-atomic="true">{Math.min(limit, lines.length)} sur {lines.length} ligne{lines.length > 1 ? "s" : ""}</span>
          {lines.length > limit && <button type="button" id="stmt-more" className="btn btn-ghost stmt-btn" onClick={() => setLimit((n) => n + PAGE)}>Afficher plus</button>}
        </div>
      )}
    </div>
  );
}

export default ProjectStatement;
