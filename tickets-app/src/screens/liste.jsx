import { useState, useMemo } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { useApi, fmtDate, fmtMoney, getCategoryMeta, STATUS_LABELS, useCurrency } from "../data.js";
import { api } from "../api.js";

export function Liste({ go }) {
  const { data, loading, error } = useApi(() => api.listInstances(), []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const currency = useCurrency();

  const list = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    return list.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchText = !q || (t.label || "").toLowerCase().includes(q) || String(t.id).includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchCat = !catFilter || t.entityType === catFilter;
      const d = t.createdAt ? t.createdAt.slice(0, 10) : "";
      const matchFrom = !dateFrom || d >= dateFrom;
      const matchTo = !dateTo || d <= dateTo;
      return matchText && matchStatus && matchCat && matchFrom && matchTo;
    });
  }, [list, search, statusFilter, catFilter, dateFrom, dateTo]);

  const hasFilter = search || statusFilter || catFilter || dateFrom || dateTo;
  const reset = () => { setSearch(""); setStatusFilter(""); setCatFilter(""); setDateFrom(""); setDateTo(""); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Mes tickets</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Toutes vos demandes soumises</p>
        </div>
        <button className="btn btn-primary" onClick={() => go("nouveau")}>
          <Plus size={16} /> Nouveau ticket
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-400)" }} />
          <input className="input" style={{ width: 220, paddingLeft: 32, height: 36 }}
            placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 140, height: 36 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Rejeté</option>
        </select>
        <select className="input" style={{ width: 140, height: 36 }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          <option value="payment">Paiement</option>
          <option value="purchase">Achat</option>
          <option value="leave">Congé</option>
          <option value="other">Autre</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", height: 36 }}>
          <SlidersHorizontal size={13} style={{ color: "var(--ink-400)" }} />
          <input type="date" style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: "var(--ink-800)", width: 130 }}
            value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "var(--ink-300)" }}>—</span>
          <input type="date" style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: "var(--ink-800)", width: 130 }}
            value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        {hasFilter && (
          <button className="btn" style={{ height: 36, fontSize: 12 }} onClick={reset}>Réinitialiser</button>
        )}
      </div>

      {loading && <div className="loading">Chargement…</div>}
      {error && <div className="api-error">{error}</div>}

      {!loading && !error && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>N° Ticket</th>
                  <th>Catégorie</th>
                  <th>Objet</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Montant</th>
                  <th style={{ textAlign: "right" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px 16px", color: "var(--ink-500)" }}>
                    {hasFilter ? "Aucun résultat pour ces filtres." : "Aucun ticket pour le moment."}
                  </td></tr>
                )}
                {filtered.map((t) => {
                  const cat = getCategoryMeta(t.entityType);
                  const st = STATUS_LABELS[t.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={t.id} onClick={() => go("detail", t.id)}>
                      <td style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, color: "var(--iris-600)" }}>
                        TCK-{String(t.id).padStart(4, "0")}
                      </td>
                      <td><span className={`chip chip-${cat.color}`}>{cat.label}</span></td>
                      <td style={{ fontWeight: 500 }}>{t.label || "—"}</td>
                      <td className="muted">{fmtDate(t.createdAt)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {t.amount ? fmtMoney(t.amount, currency) : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={`chip chip-${st.color}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
