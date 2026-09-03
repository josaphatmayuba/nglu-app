import { useState } from "react";
import { Download, FileText, FileJson, Calendar, Filter } from "lucide-react";
import { api } from "../api.js";
import { SOURCE_MODULES } from "./shared.jsx";

export function Export() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    startDate: firstOfMonth,
    endDate: today,
    sourceModule: "all",
    eventType: "all",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildParams = () => {
    const p = { startDate: form.startDate, endDate: form.endDate };
    if (form.sourceModule !== "all") p.sourceModule = form.sourceModule;
    if (form.eventType !== "all") p.eventType = form.eventType;
    return p;
  };

  const doExport = async (format) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const params = buildParams();
      const data = format === "csv" ? await api.exportCsv(params) : await api.exportJson(params);
      const blob = new Blob(
        [format === "csv" ? data : JSON.stringify(data, null, 2)],
        { type: format === "csv" ? "text/csv;charset=utf-8;" : "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `journal-entreprise-${form.startDate}-${form.endDate}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Export ${format.toUpperCase()} telechargé avec succes.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="title">Export</h1>
          <p className="muted" style={{ margin:"4px 0 0", fontSize:13 }}>Exporter les evenements du journal vers CSV ou JSON</p>
        </div>
      </div>

      {error && <div className="api-error" style={{ marginBottom:12 }}>{error}</div>}
      {success && <div style={{ background:"#d1fae5", color:"#065f46", borderRadius:8, padding:"10px 12px", marginBottom:12, fontSize:13 }}>{success}</div>}

      {/* Filtres d'export */}
      <div className="card" style={{ padding:20, marginBottom:20 }}>
        <h3 style={{ margin:"0 0 14px", fontSize:15, fontFamily:"'Space Grotesk',sans-serif", display:"flex", alignItems:"center", gap:8 }}>
          <Filter size={16} color="var(--iris-500)" /> Filtres d&apos;export
        </h3>
        <div className="form-grid two">
          <div className="field">
            <span>Date de debut</span>
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div className="field">
            <span>Date de fin</span>
            <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
          <div className="field">
            <span>Module source</span>
            <select value={form.sourceModule} onChange={(e) => set("sourceModule", e.target.value)}>
              {SOURCE_MODULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field">
            <span>Type d&apos;evenement</span>
            <select value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
              <option value="all">Tous</option>
              <option value="note">Note</option>
              <option value="appel">Appel</option>
              <option value="reunion">Réunion</option>
              <option value="courrier">Courrier</option>
              <option value="incident">Incident</option>
              <option value="livraison">Livraison</option>
              <option value="decision">Décision</option>
              <option value="visite">Visite</option>
            </select>
          </div>
        </div>
      </div>

      {/* Options d'export */}
      <div className="export-options">
        <div className="card export-card" onClick={() => !loading && doExport("csv")}>
          <div className="export-card-icon" style={{ background:"#d1fae5" }}>
            <FileText size={22} color="#047857" />
          </div>
          <div className="export-card-title">Exporter en CSV</div>
          <div className="export-card-desc">
            Format tableur compatible Excel, Google Sheets. Ideal pour les analyses et rapports.
          </div>
          <button className="btn btn-primary" style={{ marginTop:14, width:"100%", justifyContent:"center" }}
            disabled={loading}>
            <Download size={15} /> {loading ? "Export en cours…" : "Telecharger CSV"}
          </button>
        </div>

        <div className="card export-card" onClick={() => !loading && doExport("json")}>
          <div className="export-card-icon" style={{ background:"var(--iris-50)" }}>
            <FileJson size={22} color="var(--iris-600)" />
          </div>
          <div className="export-card-title">Exporter en JSON</div>
          <div className="export-card-desc">
            Format structuré pour l&apos;integration avec d&apos;autres systemes ou APIs.
          </div>
          <button className="btn btn-primary" style={{ marginTop:14, width:"100%", justifyContent:"center" }}
            disabled={loading}>
            <Download size={15} /> {loading ? "Export en cours…" : "Telecharger JSON"}
          </button>
        </div>

        <div className="card export-card" style={{ opacity:.6, cursor:"default" }}>
          <div className="export-card-icon" style={{ background:"#fef3c7" }}>
            <Calendar size={22} color="#b45309" />
          </div>
          <div className="export-card-title">Export PDF (bientôt)</div>
          <div className="export-card-desc">
            Rapport PDF imprimable avec mise en page professionnelle.
          </div>
          <button className="btn" style={{ marginTop:14, width:"100%", justifyContent:"center" }} disabled>
            Bientot disponible
          </button>
        </div>
      </div>
    </div>
  );
}
