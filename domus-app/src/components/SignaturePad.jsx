// Canvas de capture de signature (dessin souris/tactile + upload image), factorisé
// depuis landlordSignature.jsx pour être réutilisé (ex. formulaire propriétaire).
import { useRef } from "react";
import { Trash2, Upload } from "lucide-react";
import { t } from "../i18n.js";
import { fileToDataUrl } from "../landlordSignature.js";

export function SignaturePad({
  value,
  onChange,
  width = 520,
  height = 180,
  onError,
  showUpload = true,
  showClear = true,
}) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange?.(null);
  };

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - rect.left) / rect.width) * canvas.width,
      y: ((src.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
  };
  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPoint(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const endDraw = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange?.(canvasRef.current.toDataURL("image/png"));
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onChange?.(await fileToDataUrl(file));
    } catch {
      onError?.(t("Impossible de lire l'image."));
    }
    e.target.value = "";
  };

  return (
    <div className="signature-pad">
      <div className="landlord-sig-preview-box">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="landlord-sig-canvas"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {(showClear || showUpload) && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {showClear && (
              <button type="button" className="btn btn-sm" onClick={clearCanvas}>
                <Trash2 size={14} /> {t("Effacer le tracé")}
              </button>
            )}
            {showUpload && (
              <label className="landlord-sig-upload btn btn-sm">
                <Upload size={14} /> {t("Choisir PNG / JPG")}
                <input type="file" accept="image/png,image/jpeg" hidden onChange={onFile} />
              </label>
            )}
          </div>
        )}
      </div>

      {value && (
        <div className="landlord-sig-preview-box" style={{ marginTop: 10 }}>
          <img src={value} alt={t("Aperçu")} style={{ maxHeight: 80 }} />
        </div>
      )}
    </div>
  );
}

export default SignaturePad;
