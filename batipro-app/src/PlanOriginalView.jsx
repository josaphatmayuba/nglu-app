import React from "react";
import { api } from "./api.js";

/* ────────────────────────────────────────────────────────────────────────
   Affiche le plan de l'architecte importé TEL QUEL (image ou PDF), récupéré
   en blob authentifié (le JWT n'est jamais dans l'URL). Aucune conversion.
   ──────────────────────────────────────────────────────────────────────── */

export default function PlanOriginalView({ model }) {
  const [src, setSrc] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let url = null, alive = true;
    if (!model?.importedFileKey) { setLoading(false); return; }
    setLoading(true); setError("");
    api.modelPlanUrl(model.id)
      .then((r) => { if (alive) { url = r.url; setSrc(r); } })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [model?.id, model?.importedFileKey]);

  if (!model?.importedFileKey) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 24 }}>
        Aucun plan importé.<br />Importez l'image ou le PDF du plan de l'architecte.
      </div>
    );
  }
  if (loading) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Chargement du plan…</div>;
  if (error) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rose-600)", fontSize: 13 }}>Erreur : {error}</div>;

  const isPdf = (src?.type || "").includes("pdf") || model.importedFileFormat === "pdf";
  return (
    <div style={{ height: "100%", width: "100%", background: "#334155", overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {isPdf ? (
        <iframe title="Plan importé" src={src.url} style={{ width: "100%", height: "100%", border: 0, background: "#fff" }} />
      ) : (
        <img src={src.url} alt="Plan de l'architecte" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      )}
    </div>
  );
}
