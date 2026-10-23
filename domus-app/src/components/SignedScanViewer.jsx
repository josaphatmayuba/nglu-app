// Domus — visionneuse en ligne du scan du bail signé à la main (sans portal).
// Image : aperçu <img> (clic = plein écran). PDF : carte (la CSP bloque l'iframe blob) avec
// « Ouvrir le contrat signé » / « Télécharger ». Chargement sans spinner, erreur avec « Réessayer ».
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";
import { Lightbox } from "./Lightbox.jsx";
import { ProofModal } from "./ProofModal.jsx";
import {
  downloadSignedScan, formatBytes, isImageType, isNativePlatform, isPdfType, printSignedScan, saveBlob,
  scanFileName, scanNeedsProofModal, scanPath,
} from "../signedScan.js";

// Actions Imprimer / Télécharger du scan ; sur mobile natif (Capacitor) un PDF passe par la ProofModal.
// Rendre `proofModal` dans le composant appelant.
export function useSignedScanActions(contract, onError) {
  const [proof, setProof] = useState(false);
  const viaModal = scanNeedsProofModal(contract);
  const fail = (e) => onError?.(e?.message || t("Impossible de charger le contrat signé."));
  return {
    print: () => (viaModal ? setProof(true) : printSignedScan(contract, { onError })),
    download: () => (viaModal ? setProof(true) : downloadSignedScan(contract).catch(fail)),
    proofModal: proof && contract?.signedDocumentId
      ? <ProofModal path={scanPath(contract)} title={scanFileName(contract)} onClose={() => setProof(false)} />
      : null,
  };
}

export function SignedScanViewer({ contract }) {
  const docId = contract?.signedDocumentId;
  const [state, setState] = useState({ status: "loading" }); // loading | ready | error
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [fallbackModal, setFallbackModal] = useState(false);
  const blobRef = useRef(null);

  useEffect(() => {
    if (!docId) return undefined;
    let url = null;
    const ctrl = new AbortController();
    setState({ status: "loading" });
    api.fetchAuthenticatedBlob(scanPath({ signedDocumentId: docId }), null, ctrl.signal)
      .then((blob) => {
        if (ctrl.signal.aborted) return;
        url = URL.createObjectURL(blob);
        blobRef.current = blob;
        setState({ status: "ready", url, type: blob.type || contract?.signedDocument?.mimeType || "", size: blob.size });
      })
      .catch((e) => {
        if (ctrl.signal.aborted || e?.name === "AbortError") return;
        setState({ status: "error", message: e?.message || t("Impossible de charger le contrat signé.") });
      });
    return () => {
      ctrl.abort();
      // Libère l'objectURL au démontage (délai : onglets ouverts via « Ouvrir »).
      if (url) { const u = url; setTimeout(() => URL.revokeObjectURL(u), 60000); }
    };
  }, [docId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!docId) return null;
  const doc = contract?.signedDocument;
  const name = scanFileName(contract, state.type);

  if (state.status === "loading") {
    return <div className="signed-scan signed-scan-loading" aria-busy="true"><p className="muted">{t("Chargement du contrat signé…")}</p></div>;
  }
  if (state.status === "error") {
    return (
      <div className="signed-scan">
        <p role="alert" className="signed-scan-error">{state.message}</p>
        <button type="button" className="immo-btn" onClick={() => setAttempt((n) => n + 1)}>{t("Réessayer")}</button>
      </div>
    );
  }

  const pdf = isPdfType(state.type, doc?.originalName);
  if (!pdf && isImageType(state.type)) {
    return (
      <div className="signed-scan">
        <button type="button" className="signed-scan-img-btn" onClick={() => setZoom(true)} aria-label={t("Agrandir le contrat signé")}>
          <img src={state.url} alt={t("Contrat signé")} className="signed-scan-img" />
        </button>
        {zoom && <Lightbox items={[{ url: state.url, label: t("Contrat signé") }]} index={0} onIndexChange={() => {}} onClose={() => setZoom(false)} />}
      </div>
    );
  }

  const native = isNativePlatform();
  const open = () => {
    if (native) { setFallbackModal(true); return; }
    const w = window.open(state.url, "_blank");
    if (!w) setFallbackModal(true);
  };
  return (
    <div className="signed-scan signed-scan-card">
      <FileText size={36} aria-hidden="true" />
      <div className="signed-scan-meta">
        <strong>{name}</strong>
        <span className="muted">{[pdf ? "PDF" : "", formatBytes(doc?.sizeBytes || state.size)].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="signed-scan-actions">
        <button type="button" className="immo-btn" onClick={open}><ExternalLink size={15} /> {t("Ouvrir le contrat signé")}</button>
        <button type="button" className="immo-btn" onClick={() => (native ? setFallbackModal(true) : saveBlob(blobRef.current, name))}><Download size={15} /> {t("Télécharger")}</button>
      </div>
      {fallbackModal && <ProofModal path={scanPath({ signedDocumentId: docId })} title={name} onClose={() => setFallbackModal(false)} />}
    </div>
  );
}
