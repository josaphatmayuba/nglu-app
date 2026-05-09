import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { getContractForSigning, submitSignature } from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";

const STATUS_LABELS = {
  draft: { label: "Brouillon", color: "#888" },
  sent: { label: "En attente", color: "#fa8c16" },
  viewed: { label: "En attente de signature", color: "#1677ff" },
  signed: { label: "Signé", color: "#52c41a" },
  expired: { label: "Expiré", color: "#ff4d4f" },
};

export default function SignContractPage() {
  const { token } = useParams();
  const dispatch = useDispatch();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState("draw"); // "draw" | "upload"

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(getContractForSigning(token)).then((res) => {
      if (res.payload?.data) {
        setContract(res.payload.data);
        if (res.payload.data.status === "signed") setDone(true);
      } else {
        setError("Lien invalide ou expiré.");
      }
      setLoading(false);
    });
  }, [dispatch, token]);

  // Canvas drawing
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
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasBlank = () => {
    const canvas = canvasRef.current;
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((v) => v !== 0);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (mode === "draw" && isCanvasBlank()) {
      alert("Veuillez signer dans la zone prévue.");
      return;
    }
    setSubmitting(true);
    const signatureData = canvasRef.current.toDataURL("image/png");
    const res = await dispatch(submitSignature({ token, signatureData }));
    if (res.payload?.data?.message) {
      setDone(true);
    } else {
      alert("Erreur lors de la soumission. Veuillez réessayer.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Chargement du contrat…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorBox}>
          <h2>⚠️ Lien invalide</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (done || contract?.status === "signed") {
    return (
      <div style={styles.center}>
        <div style={styles.successBox}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2>Contrat signé</h2>
          <p>Votre contrat a été signé électroniquement. Vous pouvez fermer cette fenêtre.</p>
          {contract?.signedAt && (
            <p style={{ color: "#888", fontSize: 13 }}>
              Signé le : {new Date(contract.signedAt).toLocaleString("fr-CA")}
            </p>
          )}
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[contract?.status] ?? STATUS_LABELS.sent;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Contrat de bail</h1>
          <span style={{ ...styles.badge, background: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        {contract?.tenantName && (
          <p style={{ color: "#555", marginBottom: 8 }}>
            Destinataire : <strong>{contract.tenantName}</strong>
          </p>
        )}

        {/* Contract content */}
        <div style={styles.contentBox}>
          <pre style={styles.content}>{contract?.contractContent}</pre>
        </div>

        {/* Signature section */}
        <div style={styles.signSection}>
          <h3 style={{ marginBottom: 12 }}>Signature électronique</h3>

          <div style={styles.modeToggle}>
            <button
              style={{ ...styles.modeBtn, ...(mode === "draw" ? styles.modeBtnActive : {}) }}
              onClick={() => setMode("draw")}
            >
              Dessiner
            </button>
            <button
              style={{ ...styles.modeBtn, ...(mode === "upload" ? styles.modeBtnActive : {}) }}
              onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}
            >
              Importer une image
            </button>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleUpload}
          />

          <div style={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={560}
              height={160}
              style={styles.canvas}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <p style={styles.canvasHint}>
              {mode === "draw" ? "Signez ici avec votre souris ou au doigt" : "Votre image de signature apparaît ici"}
            </p>
          </div>

          <div style={styles.actions}>
            <button style={styles.clearBtn} onClick={clearCanvas}>
              Effacer
            </button>
            <button
              style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Envoi en cours…" : "Confirmer et signer"}
            </button>
          </div>

          <p style={styles.legalNote}>
            En cliquant sur "Confirmer et signer", vous acceptez les termes du contrat et reconnaissez que
            cette signature électronique a la même valeur légale qu'une signature manuscrite.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    padding: "32px 16px",
    fontFamily: "sans-serif",
  },
  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f2f5",
    fontFamily: "sans-serif",
  },
  container: {
    maxWidth: 680,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    padding: "32px 32px 40px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a2e",
  },
  badge: {
    padding: "3px 12px",
    borderRadius: 20,
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
  },
  contentBox: {
    background: "#fafafa",
    border: "1px solid #e8e8e8",
    borderRadius: 8,
    padding: "20px 24px",
    margin: "16px 0 24px",
    maxHeight: 420,
    overflowY: "auto",
  },
  content: {
    margin: 0,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    color: "#222",
  },
  signSection: {
    borderTop: "1px solid #e8e8e8",
    paddingTop: 24,
  },
  modeToggle: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    padding: "6px 16px",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  modeBtnActive: {
    background: "#1677ff",
    color: "#fff",
    borderColor: "#1677ff",
  },
  canvasWrapper: {
    marginBottom: 16,
  },
  canvas: {
    border: "2px dashed #d9d9d9",
    borderRadius: 8,
    display: "block",
    width: "100%",
    maxWidth: 560,
    touchAction: "none",
    cursor: "crosshair",
    background: "#fafafa",
  },
  canvasHint: {
    color: "#aaa",
    fontSize: 12,
    margin: "4px 0 0",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },
  clearBtn: {
    padding: "8px 20px",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  submitBtn: {
    padding: "8px 24px",
    border: "none",
    borderRadius: 6,
    background: "#1677ff",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  legalNote: {
    fontSize: 11,
    color: "#aaa",
    lineHeight: 1.5,
    margin: 0,
  },
  errorBox: {
    background: "#fff",
    borderRadius: 12,
    padding: 40,
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  },
  successBox: {
    background: "#fff",
    borderRadius: 12,
    padding: 40,
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  },
};
