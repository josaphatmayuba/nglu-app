// Domus — visionneuse modale d'une quittance/preuve protegee par JWT.
// Charge le fichier via fetch+blob (jamais de token dans l'URL, SCRUM-119) et
// l'affiche dans un modal (image ou PDF) au lieu d'un nouvel onglet, souvent
// bloque ou vide selon le navigateur.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Download, FileText } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";

// Delai avant revocation du blob URL : laisse le temps aux onglets ouverts via
// « Ouvrir dans un onglet » de charger le document.
const REVOKE_DELAY_MS = 60000;

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return /Android|iPhone|iPad/i.test(navigator.userAgent || "");
}

const FOCUSABLE = 'a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

// Bouton/lien + modal integre, pour les endroits sans etat a porter (le modal
// se rend lui-meme dans <body> : valide meme a l'interieur d'un <small>/<li>).
export function ProofButton({ path, title, className = "", style, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} style={style} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}>
        {children}
      </button>
      {open && <ProofModal path={path} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ProofModal({ path, title, onClose }) {
  const [file, setFile] = useState(null); // { url, type }
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null); // 0-100, null = indetermine
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const label = title || t("Document");

  useEffect(() => {
    let blobUrl = null;
    const ctrl = new AbortController();
    setFile(null);
    setError(null);
    setProgress(null);
    api.fetchAuthenticatedBlob(path, (p) => { if (!ctrl.signal.aborted) setProgress(p); }, ctrl.signal)
      .then((blob) => {
        if (ctrl.signal.aborted) return;
        blobUrl = URL.createObjectURL(blob);
        setFile({ url: blobUrl, type: blob.type || "" });
      })
      .catch((e) => {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        setError(e.message || String(e));
      });
    return () => {
      ctrl.abort();
      if (blobUrl) {
        const u = blobUrl;
        setTimeout(() => URL.revokeObjectURL(u), REVOKE_DELAY_MS);
      }
    };
  }, [path]);

  // Echap (capture, ne remonte pas aux autres modals) + Tab boucle + focus.
  useEffect(() => {
    const trigger = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!dialogRef.current.contains(active)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (trigger && typeof trigger.focus === "function" && document.contains(trigger)) trigger.focus();
    };
  }, []);

  const type = file?.type || "";
  const isPdf = /pdf/i.test(type) || /\.pdf$/i.test(title || "");
  const isImg = /^image\//.test(type);
  const mobile = isMobileDevice();
  const btnStyle = { minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6 };

  let content = null;
  if (file) {
    if (isPdf && mobile) {
      content = (
        <div style={{ padding: "32px 12px" }}>
          <FileText size={40} aria-hidden="true" />
          <p style={{ fontWeight: 600, margin: "10px 0 4px" }}>{t("Document PDF")}</p>
          <p className="muted" style={{ margin: "0 0 14px" }}>{t("Le PDF s'ouvre dans l'application de votre appareil.")}</p>
          <a className="immo-btn" href={file.url} target="_blank" rel="noreferrer" download={title || undefined} style={{ ...btnStyle, background: "var(--iris-600)", color: "#fff" }}>
            <Download size={16} /> {t("Télécharger")} / {t("Ouvrir")}
          </a>
        </div>
      );
    } else if (isPdf) {
      content = <iframe src={file.url} title={label} style={{ width: "100%", flex: 1, minHeight: 0, border: 0 }} />;
    } else if (isImg) {
      content = <img src={file.url} alt={label} style={{ maxWidth: "100%", maxHeight: "calc(92dvh - 160px)", objectFit: "contain", height: "auto", borderRadius: 8 }} />;
    } else {
      content = (
        <div style={{ padding: "32px 12px" }}>
          <p style={{ fontWeight: 600, margin: "0 0 14px" }}>{t("Aperçu indisponible")}</p>
          <a className="immo-btn" href={file.url} download={title || t("Document")} style={btnStyle}>
            <Download size={16} /> {t("Télécharger")}
          </a>
        </div>
      );
    }
  }

  return createPortal(
    <div className="immo-modal-scrim" style={{ zIndex: 300 }} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div
        ref={dialogRef}
        className="immo-modal immo-proof-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ maxWidth: 720, width: "100%", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="immo-modal-head">
          <h3 id={titleId}>{label}</h3>
          <button ref={closeRef} type="button" className="immo-flat-icon immo-proof-close" onClick={onClose} aria-label={t("Fermer")}>
            <X size={18} />
          </button>
        </div>
        <div className="immo-modal-body" style={{ overflow: "auto", flex: 1, minHeight: 200, textAlign: "center", display: "flex", flexDirection: "column", padding: 8 }}>
          {!file && !error && (
            <div style={{ padding: "60px 12px" }} role="progressbar" aria-label={t("Chargement du document")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}>
              <p className="muted" style={{ margin: "0 0 10px", fontWeight: 600 }}>
                {t("Chargement…")} {progress != null ? `${progress}%` : ""}
              </p>
              <div style={{ height: 10, borderRadius: 5, background: "var(--ink-200)", overflow: "hidden", maxWidth: 360, margin: "0 auto" }}>
                <div style={{
                  height: "100%", background: "var(--iris-600)", borderRadius: 5,
                  ...(progress != null
                    ? { width: `${progress}%`, transition: "width .15s ease" }
                    : { width: "40%", animation: "immo-indeterminate 1.2s ease-in-out infinite" }),
                }} />
              </div>
            </div>
          )}
          {error && <p role="alert" style={{ color: "var(--rose)" }}>{error}</p>}
          {content}
        </div>
        <div className="immo-modal-foot">
          {file && (
            <a className="immo-btn" href={file.url} target="_blank" rel="noreferrer" style={btnStyle}>
              <ExternalLink size={16} /> {t("Ouvrir dans un onglet")}
            </a>
          )}
          <button type="button" className="immo-btn" style={btnStyle} onClick={onClose}>{t("Fermer")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
