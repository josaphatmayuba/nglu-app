import React from "react";
import { api } from "./api.js";

/* ────────────────────────────────────────────────────────────────────────
   Affiche le plan de l'architecte importé TEL QUEL (image ou PDF), récupéré
   en blob authentifié (le JWT n'est jamais dans l'URL). Aucune conversion.
   Le plan est désormais rattaché à l'étage courant (level) — chaque étage a
   potentiellement son propre fichier. Fallback sur model.importedFileKey
   UNIQUEMENT si l'étage n'a pas (encore) son propre plan, pour rester
   compatible avec les modèles créés avant cette évolution (migrés en
   level_index=0).
   ──────────────────────────────────────────────────────────────────────── */

export default function PlanOriginalView({ level, model }) {
  const [src, setSrc] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const useLevel = !!level?.importedFileKey;
  const fileKey = level?.importedFileKey || model?.importedFileKey;
  const fileFormat = useLevel ? level?.importedFileFormat : model?.importedFileFormat;
  const fetchUrl = useLevel ? () => api.levelPlanUrl(level.id) : () => api.modelPlanUrl(model.id);
  const depKey = useLevel ? `level:${level?.id}` : `model:${model?.id}`;

  React.useEffect(() => {
    let url = null, alive = true;
    if (!fileKey) { setLoading(false); return; }
    setLoading(true); setError("");
    fetchUrl()
      .then((r) => { if (alive) { url = r.url; setSrc(r); } })
      .catch((e) => { if (alive) setError(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, fileKey]);

  if (!fileKey) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 24 }}>
        Aucun plan importé.<br />Importez l'image ou le PDF du plan de l'architecte pour cet étage.
      </div>
    );
  }
  if (loading) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-400)", fontSize: 13 }}>Chargement du plan…</div>;
  if (error) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rose-600)", fontSize: 13 }}>Erreur : {error}</div>;

  const isPdf = (src?.type || "").includes("pdf") || fileFormat === "pdf";
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
