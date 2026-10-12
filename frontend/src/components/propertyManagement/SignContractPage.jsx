import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { getContractForSigning, submitSignature } from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { downloadSignedContractPdf } from "./shared/contractPdf";

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [done, setDone] = useState(false);
  const [mode, setMode] = useState("draw"); // "draw" | "upload"

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch(getContractForSigning(token)).then((res) => {
      if (res.payload?.data) {
        setContract(res.payload.data);
        if (res.payload.data.status === "signed" || res.payload.data.signer?.status === "signed") setDone(true);
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
    // Reponse publique reduite : { message, status, signer, signers, signersSigned, signersTotal }.
    const returned = res.payload?.data;
    if (returned?.message && returned.status !== "signed" && Array.isArray(returned.signers) && returned.signers.length > 1) {
      // Signature enregistree mais d'autres locataires doivent encore signer.
      setContract((prev) => ({
        ...(prev || {}),
        signers: returned.signers,
        signersSigned: returned.signersSigned,
        signersTotal: returned.signersTotal,
        signer: { ...(prev?.signer || {}), status: "signed" },
      }));
      setDone(true);
    } else if (returned?.message) {
      setContract((prev) => ({
        ...(prev || {}),
        signers: returned.signers || prev?.signers,
        signersSigned: returned.signersSigned,
        signersTotal: returned.signersTotal,
        status: "signed",
        signatureData: signatureData,
        signedAt: new Date().toISOString(),
      }));
      setDone(true);
    } else {
      alert("Erreur lors de la soumission. Veuillez réessayer.");
    }
    setSubmitting(false);
  };

  const handleDownloadPdf = async () => {
    if (!contract?.signatureData) return;
    try {
      setDownloadingPdf(true);
      await downloadSignedContractPdf(contract);
    } catch (e) {
      alert("Impossible de generer le PDF. Veuillez reessayer.");
    } finally {
      setDownloadingPdf(false);
    }
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

  const otherSigners = Array.isArray(contract?.signers) && contract.signers.length > 1 ? contract.signers : [];
  const SIGNER_LABELS = { pending: "En attente", sent: "Envoyé", viewed: "Vu", signed: "Signé" };
  const signersList = (otherSigners.length > 0) && (
    <ul style={styles.signerList}>
      {otherSigners.map((s) => (
        <li key={s.id} style={styles.signerItem}>
          <span>{s.name || "—"}</span>
          <span style={{ color: s.status === "signed" ? "#52c41a" : "#888", fontWeight: 600 }}>
            {SIGNER_LABELS[s.status] || "En attente"}
          </span>
        </li>
      ))}
    </ul>
  );

  if ((done || contract?.status === "signed") && contract?.status !== "signed" && otherSigners.length > 1) {
    const signedCount = contract.signersSigned ?? otherSigners.filter((s) => s.status === "signed").length;
    const total = contract.signersTotal ?? otherSigners.length;
    return (
      <div style={styles.center}>
        <div style={styles.successBox}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2>Signature enregistrée</h2>
          <p>Votre signature est enregistrée. En attente des autres locataires ({signedCount}/{total}).</p>
          {signersList}
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
          {contract?.signatureData && (
            <button
              type="button"
              style={{ ...styles.downloadBtn, opacity: downloadingPdf ? 0.7 : 1 }}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? "Preparation du PDF..." : "Telecharger ma copie PDF"}
            </button>
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

        {contract?.signer?.name && otherSigners.length > 1 && (
          <div style={styles.signerBanner}>
            <p style={{ margin: "0 0 8px" }}>Vous signez en tant que <strong>{contract.signer.name}</strong></p>
            <div style={{ fontSize: 12, color: "#555" }}>Signataires du bail :</div>
            {signersList}
          </div>
        )}

        {contract?.tenantName && otherSigners.length < 2 && (
          <p style={{ color: "#555", marginBottom: 8 }}>
            Destinataire : <strong>{contract.tenantName}</strong>
          </p>
        )}

        {/* Contract content */}
        <div style={styles.contentBox}>
          <div
            style={styles.htmlContent}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(contract?.contractContent ?? "") }}
          />
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
    maxWidth: 780,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 32px rgba(26,35,126,0.12)",
    padding: "36px 40px 48px",
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
    background: "#fff",
    border: "1px solid #e0e4f0",
    borderRadius: 8,
    padding: "24px 28px",
    margin: "16px 0 24px",
    maxHeight: 560,
    overflowY: "auto",
    boxShadow: "inset 0 1px 4px rgba(26,35,126,0.06)",
  },
  content: {
    margin: 0,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    color: "#222",
  },
  htmlContent: {
    color: "#1a1a2e",
    fontSize: 14,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
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
  signerBanner: {
    background: "#f0f5ff",
    border: "1px solid #adc6ff",
    borderRadius: 8,
    padding: "12px 16px",
    margin: "8px 0 12px",
  },
  signerList: { listStyle: "none", margin: "6px 0 0", padding: 0, textAlign: "left" },
  signerItem: { display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #eee", fontSize: 13 },
  downloadBtn: {
    marginTop: 16,
    padding: "10px 20px",
    border: "none",
    borderRadius: 6,
    background: "#1677ff",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
};
