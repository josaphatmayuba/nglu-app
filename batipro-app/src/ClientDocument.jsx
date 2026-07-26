import React from "react";
import { publicDocApi } from "./api.js";

// Page publique client (sans compte) : affiche le devis (HTML rendu serveur dans
// un iframe) + bouton Accepter. Servie par token d'URL :
// /batipro/public/document/:token. Responsive mobile (Capacitor).
export default function ClientDocument({ token }) {
  const [busy, setBusy] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loadErr, setLoadErr] = React.useState(false);
  const htmlUrl = publicDocApi.htmlUrl(token);

  const accept = async () => {
    setBusy(true); setError("");
    try {
      const res = await publicDocApi.accept(token);
      setAccepted(true);
      if (res?.status) setAccepted(true);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "system-ui, sans-serif", color: "#0f172a", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, color: "#b45309" }}>BâtiPro · Votre devis</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {accepted ? (
            <span style={{ color: "#059669", fontWeight: 700 }}>✓ Devis accepté — merci</span>
          ) : (
            <button
              onClick={accept}
              disabled={busy}
              style={{ background: "#059669", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              {busy ? "Envoi…" : "Accepter le devis"}
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", fontSize: 13, padding: "8px 16px" }}>{error}</div>}

      {loadErr ? (
        <div style={{ padding: 24, color: "#b91c1c", fontWeight: 600 }}>Lien invalide ou expiré.</div>
      ) : (
        <iframe
          title="Devis"
          src={htmlUrl}
          onError={() => setLoadErr(true)}
          style={{ flex: 1, width: "100%", border: "none", minHeight: "80vh", background: "#fff" }}
        />
      )}
    </div>
  );
}
