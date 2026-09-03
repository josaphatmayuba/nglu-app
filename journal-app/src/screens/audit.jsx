import { useState, useEffect } from "react";
import { Shield, RefreshCw, Search } from "lucide-react";
import { api } from "../api.js";
import { formatDateTime } from "./shared.jsx";

export function Audit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 30;

  const load = (p = page) => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE };
    if (search) params.q = search;
    api.audit(params)
      .then((d) => {
        setEntries(Array.isArray(d) ? d : (d?.data || []));
        setTotal(d?.total || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1); }, [search]);
  useEffect(() => { load(page); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">Audit &amp; Tracabilite</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>Historique de toutes les actions sur le journal</p>
        </div>
        <button className="btn" onClick={() => load(page)}>
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}

      <div style={{ display:"flex", gap:12, marginBottom:14 }}>
        <div className="search-bar">
          <Search size={16} />
          <input placeholder="Rechercher par utilisateur, action…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card" style={{ overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", background:"var(--ink-50)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8, fontSize:12, fontWeight:700, color:"var(--ink-500)", textTransform:"uppercase", letterSpacing:".04em" }}>
          <Shield size={13} color="var(--iris-500)" />
          Journal d&apos;audit ({total} entrees)
        </div>
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:40 }}><div className="spinner" /></div>
        ) : entries.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:"var(--ink-400)", fontSize:13 }}>Aucune entree d&apos;audit.</div>
        ) : (
          entries.map((entry, i) => (
            <div key={entry.id || i} className="audit-row">
              <div className="audit-user">{entry.userName || entry.userEmail || "Systeme"}</div>
              <div className="audit-action">
                <ActionBadge action={entry.action} />
                {" "}
                {entry.entityType && <span style={{ color:"var(--ink-600)" }}>{entry.entityType}</span>}
                {entry.description && <span style={{ color:"var(--ink-500)" }}> — {entry.description}</span>}
              </div>
              <div className="audit-ts">{formatDateTime(entry.createdAt)}</div>
            </div>
          ))
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderTop:"1px solid var(--border)" }}>
            <button className="btn" style={{ height:30, padding:"0 10px" }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Préc.</button>
            <span style={{ fontSize:13, color:"var(--ink-600)" }}>Page {page} / {totalPages}</span>
            <button className="btn" style={{ height:30, padding:"0 10px" }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Suiv.</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBadge({ action }) {
  const map = {
    create: { label: "Créé", bg:"#d1fae5", color:"#065f46" },
    update: { label: "Modifié", bg:"#dbeafe", color:"#1e40af" },
    delete: { label: "Supprimé", bg:"#fee2e2", color:"#991b1b" },
    pin: { label: "Epinglé", bg:"#fef3c7", color:"#92400e" },
    unpin: { label: "Desepinglé", bg:"var(--ink-100)", color:"var(--ink-600)" },
    toggle: { label: "Coché", bg:"#ede9fe", color:"#5b21b6" },
  };
  const style = map[action] || { label: action, bg:"var(--ink-100)", color:"var(--ink-600)" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700, background:style.bg, color:style.color }}>
      {style.label}
    </span>
  );
}
