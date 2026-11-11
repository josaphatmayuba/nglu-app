import React from "react";
import { ProjectStatement } from "./statement.jsx";

const LS_KEY = "batipro.statement.projectId";
const readLast = () => { try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; } };
const saveLast = (v) => { try { localStorage.setItem(LS_KEY, String(v)); } catch { /* ignore */ } };

// Page « Relevés » : choix du chantier puis relevé de compte du chantier.
export default function StatementPage({ projects = [] }) {
  const [sel, setSel] = React.useState(readLast);
  const exists = projects.some((p) => String(p.id) === String(sel));
  const current = exists ? String(sel) : "";
  const choose = (v) => { setSel(v); if (v) saveLast(v); };
  return (
    <>
      <div className="topbar">
        <div><p className="eyebrow">Finances</p><h2 className="title font-display">Relevés</h2></div>
      </div>
      <div className="rel-picker">
        <label htmlFor="rel-project">Chantier</label>
        <select id="rel-project" value={current} onChange={(e) => choose(e.target.value)}>
          <option value="">Choisissez un chantier</option>
          {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
      </div>
      {current
        ? <ProjectStatement key={current} projectId={projects.find((p) => String(p.id) === current).id} />
        : <div className="card pad"><span className="muted">Choisissez un chantier pour voir son relevé.</span></div>}
    </>
  );
}
