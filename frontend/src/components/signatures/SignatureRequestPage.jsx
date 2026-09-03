import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

/**
 * Page publique ouverte par le lien de signature (aucun compte requis : le token
 * de l'URL fait autorisation). Le texte de la demande s'affiche en haut, puis les
 * deux zones a signer. La meme personne (Roxanna) trace les deux signatures a la
 * suite sur son telephone : une pour Bianca, une pour Liam.
 */
export default function SignatureRequestPage() {
  const { token } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeParty, setActiveParty] = useState(null);
  const [signerName, setSignerName] = useState("");

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const load = async () => {
    try {
      const { data } = await axios.get(`public/signature/${token}`);
      setRequest(data);
      // Ouvre d'office la premiere case encore vierge : sur mobile, cela evite
      // un tap de plus et enchaine naturellement Bianca puis Liam.
      const next = data.parties?.find((p) => !p.signed);
      setActiveParty(next ? next.key : null);
    } catch {
      setError("Lien invalide ou expiré.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Le canvas est remonte a chaque changement de case : on repart d'une zone vierge.
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
    e.preventDefault();
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    e.preventDefault();
  };

  const stopDraw = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = () => {
    const canvas = canvasRef.current;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((v) => v !== 0);
  };

  const handleSubmit = async (party) => {
    if (isCanvasBlank()) {
      alert("Veuillez signer dans la zone prévue.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`public/signature/${token}/sign`, {
        partyKey: party.key,
        signatureData: canvasRef.current.toDataURL("image/png"),
        signerName: signerName.trim() || undefined,
      });
      setRequest(data);
      clearCanvas();
      const next = data.parties?.find((p) => !p.signed);
      setActiveParty(next ? next.key : null);
    } catch (err) {
      alert(err?.response?.data?.message || "Erreur lors de l'envoi. Veuillez réessayer.");
    }
    setSubmitting(false);
  };

  if (loading) return <div style={S.page}><p style={S.muted}>Chargement…</p></div>;
  if (error) return <div style={S.page}><div style={S.card}><p style={S.error}>{error}</p></div></div>;

  const allSigned = request.parties.every((p) => p.signed);

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.title}>{request.title}</h1>
        {request.body && <p style={S.body}>{request.body}</p>}

        {allSigned ? (
          <div style={S.doneBox}>
            <div style={S.doneIcon}>✓</div>
            <p style={S.doneText}>Les deux signatures ont été enregistrées. Merci !</p>
          </div>
        ) : (
          <>
            <label style={S.label}>Nom de la personne qui signe</label>
            <input
              style={S.input}
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ex. Roxanna"
            />
          </>
        )}

        {request.parties.map((party) => (
          <div key={party.key} style={S.partyBlock}>
            <div style={S.partyHead}>
              <span style={S.partyLabel}>Signature pour {party.label}</span>
              {party.signed && <span style={S.badge}>Signé</span>}
            </div>

            {party.signed ? (
              <p style={S.muted}>
                Signé{party.signerName ? ` par ${party.signerName}` : ""}
                {party.signedAt ? ` le ${new Date(party.signedAt).toLocaleString("fr-FR")}` : ""}
              </p>
            ) : activeParty === party.key ? (
              <>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={220}
                  style={S.canvas}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                <div style={S.actions}>
                  <button type="button" style={S.btnGhost} onClick={clearCanvas}>
                    Effacer
                  </button>
                  <button
                    type="button"
                    style={S.btnPrimary}
                    disabled={submitting}
                    onClick={() => handleSubmit(party)}
                  >
                    {submitting ? "Envoi…" : `Valider la signature de ${party.label}`}
                  </button>
                </div>
              </>
            ) : (
              <button type="button" style={S.btnGhost} onClick={() => { clearCanvas(); setActiveParty(party.key); }}>
                Signer pour {party.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#f4f5f7",
    padding: "24px 12px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  card: {
    maxWidth: 640,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
  },
  title: { fontSize: 22, fontWeight: 600, margin: "0 0 12px", color: "#1a1a2e" },
  body: { fontSize: 15, lineHeight: 1.6, color: "#444", whiteSpace: "pre-wrap", margin: "0 0 20px" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: 16,
    border: "1px solid #d9d9d9",
    borderRadius: 8,
    marginBottom: 8,
    boxSizing: "border-box",
  },
  partyBlock: { borderTop: "1px solid #eee", paddingTop: 18, marginTop: 18 },
  partyHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  partyLabel: { fontSize: 16, fontWeight: 600, color: "#1a1a2e" },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    color: "#237804",
    background: "#f6ffed",
    border: "1px solid #b7eb8f",
    borderRadius: 12,
    padding: "2px 10px",
  },
  canvas: {
    width: "100%",
    height: 220,
    border: "2px dashed #c9c9d4",
    borderRadius: 8,
    background: "#fff",
    touchAction: "none",
    display: "block",
  },
  actions: { display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" },
  btnPrimary: {
    flex: 1,
    minWidth: 180,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    background: "#1677ff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 500,
    color: "#1677ff",
    background: "#fff",
    border: "1px solid #1677ff",
    borderRadius: 8,
    cursor: "pointer",
  },
  doneBox: { textAlign: "center", padding: "18px 0" },
  doneIcon: { fontSize: 40, color: "#52c41a", lineHeight: 1 },
  doneText: { fontSize: 16, color: "#237804", fontWeight: 600, marginTop: 8 },
  muted: { fontSize: 14, color: "#888" },
  error: { fontSize: 16, color: "#ff4d4f", textAlign: "center", margin: 0 },
};
