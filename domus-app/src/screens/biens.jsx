import { useMemo, useState } from "react";
import { LayoutGrid, Table as TableIcon, Layers, TrendingUp, Plus, Search } from "lucide-react";
import { api } from "../api.js";
import { useApi, money } from "../data.js";
import { Loading, ApiError } from "./dashboard.jsx";

const TYPE_LABELS = {
  residential: "Résidentiel",
  office: "Bureaux",
  commercial: "Commerces",
  mixed: "Mixte",
};

export function Biens() {
  const { data, loading, error } = useApi(() => api.properties(), []);
  const [viewMode, setViewMode] = useState("grille");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");

  const rows = Array.isArray(data) ? data : [];
  const types = useMemo(() => [...new Set(rows.map((r) => r.propertyType).filter(Boolean))], [rows]);

  const filtered = rows.filter((r) => {
    if (type !== "all" && r.propertyType !== type) return false;
    if (q && !(`${r.name || ""} ${r.address || ""} ${r.city || ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  if (loading) return <Loading />;
  if (error) return <ApiError error={error} />;

  return (
    <>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">Patrimoine</div>
          <h2 className="title">Biens &amp; unités</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label className="btn" style={{ cursor: "text" }}>
            <Search size={16} color="#94a3b8" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Adresse…"
              style={{ border: "none", outline: "none", background: "transparent", width: 110, font: "inherit" }} />
          </label>
          <button className="btn btn-primary"><Plus size={16} /> Ajouter</button>
        </div>
      </div>

      {/* Filtres type + bascule vue */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip on={type === "all"} onClick={() => setType("all")}>Tous</Chip>
          {types.map((t) => (
            <Chip key={t} on={type === t} onClick={() => setType(t)}>{TYPE_LABELS[t] || t}</Chip>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Chip on={viewMode === "grille"} onClick={() => setViewMode("grille")}><LayoutGrid size={14} /> Grille</Chip>
          <Chip on={viewMode === "liste"} onClick={() => setViewMode("liste")}><TableIcon size={14} /> Liste</Chip>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>Aucun bien {q || type !== "all" ? "ne correspond au filtre" : "pour le moment"}.</p>
        </div>
      )}

      {filtered.length > 0 && viewMode === "grille" && (
        <div className="grid g3">
          {filtered.map((p) => {
            return (
              <div key={p.id} className="card" style={{ overflow: "hidden" }}>
                <div className="grad-dark" style={{ height: 88, position: "relative" }}>
                  <span className="chip chip-ink" style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,.9)" }}>
                    {TYPE_LABELS[p.propertyType] || p.propertyType || "Bien"}
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600 }}>{p.name || `Bien #${p.id}`}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{[p.address, p.city].filter(Boolean).join(" · ") || "—"}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Layers size={14} color="#94a3b8" /> {p.unitsCount ?? 0} unités</span>
                    {p.marketValue != null && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={14} color="#94a3b8" /> {money(p.marketValue)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && viewMode === "liste" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>Bien</th><th>Type</th><th>Ville</th><th>Unités</th><th>Valeur</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.name || `Bien #${p.id}`}</td>
                  <td className="muted">{TYPE_LABELS[p.propertyType] || p.propertyType || "—"}</td>
                  <td className="muted">{p.city || "—"}</td>
                  <td>{p.unitsCount ?? 0}</td>
                  <td>{p.marketValue != null ? money(p.marketValue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} className={`chip ${on ? "" : "chip-ink"}`}
      style={{ border: "none", cursor: "pointer", font: "inherit",
        ...(on ? { background: "var(--grad-iris)", color: "#fff" } : {}) }}>
      {children}
    </button>
  );
}
