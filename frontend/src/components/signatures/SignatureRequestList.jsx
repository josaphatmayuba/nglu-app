import axios from "axios";
import { useEffect, useState } from "react";

/**
 * Ecran admin : creer une demande de signature, recuperer son lien, et consulter
 * les signatures deja tracees (image incluse) pour chacune des deux parties.
 */
export default function SignatureRequestList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openId, setOpenId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const load = async () => {
    try {
      const { data } = await axios.get("signature-requests");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const publicLink = (item) => `${window.location.origin}/signature/${item.publicToken}`;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await axios.post("signature-requests", { title: title.trim(), body: body.trim() || undefined });
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Impossible de créer la demande.");
    }
    setCreating(false);
  };

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(publicLink(item));
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard indisponible (http, navigateur ancien) : le lien reste
      // selectionnable a la main dans le champ ci-dessous.
    }
  };

  const handleDeactivate = async (item) => {
    if (!window.confirm(`Désactiver « ${item.title} » ? Le lien ne fonctionnera plus.`)) return;
    try {
      await axios.delete(`signature-requests/${item.id}`);
      await load();
    } catch {
      alert("Suppression impossible.");
    }
  };

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>Demandes de signature</h2>

      <form onSubmit={handleCreate} style={S.card}>
        <label style={S.label}>Titre affiché en haut de la page</label>
        <input
          style={S.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex. Merci de signer pour Bianca et Liam"
        />
        <label style={S.label}>Message (facultatif)</label>
        <textarea
          style={{ ...S.input, minHeight: 90, resize: "vertical" }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Texte complémentaire affiché sous le titre"
        />
        <button type="submit" style={S.btnPrimary} disabled={creating || !title.trim()}>
          {creating ? "Création…" : "Créer le lien"}
        </button>
      </form>

      {loading ? (
        <p style={S.muted}>Chargement…</p>
      ) : items.length === 0 ? (
        <p style={S.muted}>Aucune demande pour le moment.</p>
      ) : (
        items.map((item) => {
          const signedCount = item.signatures.filter((s) => s.signed).length;
          return (
            <div key={item.id} style={S.card}>
              <div style={S.rowHead}>
                <div>
                  <div style={S.itemTitle}>{item.title}</div>
                  <div style={S.muted}>
                    {signedCount}/{item.signatures.length} signature(s) —{" "}
                    {item.status === "completed" ? "Terminé" : item.status === "partial" ? "En cours" : "En attente"}
                  </div>
                </div>
                <button type="button" style={S.btnGhost} onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                  {openId === item.id ? "Masquer" : "Voir"}
                </button>
              </div>

              <div style={S.linkRow}>
                <input style={{ ...S.input, marginBottom: 0 }} readOnly value={publicLink(item)} onFocus={(e) => e.target.select()} />
                <button type="button" style={S.btnGhost} onClick={() => handleCopy(item)}>
                  {copiedId === item.id ? "Copié !" : "Copier"}
                </button>
              </div>

              {openId === item.id && (
                <div style={{ marginTop: 16 }}>
                  {item.body && <p style={S.body}>{item.body}</p>}
                  {item.signatures.map((sig) => (
                    <div key={sig.key} style={S.sigBlock}>
                      <div style={S.itemTitle}>Signature pour {sig.label}</div>
                      {sig.signed ? (
                        <>
                          <div style={S.muted}>
                            {sig.signerName ? `Signé par ${sig.signerName}` : "Signé"}
                            {sig.signedAt ? ` le ${new Date(sig.signedAt).toLocaleString("fr-FR")}` : ""}
                          </div>
                          <img src={sig.signatureData} alt={`Signature ${sig.label}`} style={S.sigImg} />
                        </>
                      ) : (
                        <div style={S.muted}>Pas encore signé</div>
                      )}
                    </div>
                  ))}
                  <button type="button" style={S.btnDanger} onClick={() => handleDeactivate(item)}>
                    Désactiver ce lien
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const S = {
  wrap: { padding: 20, maxWidth: 860, margin: "0 auto" },
  h2: { fontSize: 22, fontWeight: 600, marginBottom: 16 },
  card: { background: "#fff", borderRadius: 10, padding: 18, marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,.07)" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1px solid #d9d9d9",
    borderRadius: 8,
    marginBottom: 12,
    boxSizing: "border-box",
  },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  linkRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  itemTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a2e" },
  body: { fontSize: 14, color: "#444", whiteSpace: "pre-wrap" },
  sigBlock: { borderTop: "1px solid #eee", paddingTop: 12, marginTop: 12 },
  sigImg: { display: "block", maxWidth: "100%", border: "1px solid #eee", borderRadius: 6, marginTop: 8, background: "#fff" },
  btnPrimary: {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#1677ff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 16px",
    fontSize: 14,
    color: "#1677ff",
    background: "#fff",
    border: "1px solid #1677ff",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnDanger: {
    marginTop: 14,
    padding: "8px 14px",
    fontSize: 13,
    color: "#ff4d4f",
    background: "#fff",
    border: "1px solid #ffccc7",
    borderRadius: 8,
    cursor: "pointer",
  },
  muted: { fontSize: 13, color: "#888" },
};
