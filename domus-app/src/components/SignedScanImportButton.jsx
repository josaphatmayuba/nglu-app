// Domus — import / remplacement du scan du bail signé à la main.
// Réutilise le flux d'envoi en arrière-plan (uploadManager) : la modale peut être fermée librement.
import { useState } from "react";
import { FileSignature, RefreshCw } from "lucide-react";
import { t } from "../i18n.js";
import { useConfirm } from "./Dialog.jsx";
import { MAX_UPLOAD_BYTES, UploadProgress, useUploads } from "../uploads/uploadManager.jsx";

export function SignedScanImportButton({ contract, leaseRef, replace = false, label }) {
  const confirm = useConfirm();
  const { enqueueSignedContract, itemForContract } = useUploads();
  const upload = itemForContract(contract.id);
  const busy = Boolean(upload) && upload.status !== "failed";
  const [error, setError] = useState("");

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t("Fichier trop lourd (max 10 Mo)"));
      return;
    }
    const ok = await confirm(replace
      ? { title: t("Remplacer le scan"), message: t("Remplacer le scan signé ? L'ancien sera archivé."), confirmLabel: t("Remplacer") }
      : { title: t("Signature manuscrite"), message: t("Confirmer : le locataire a bien signé ce bail à la main sur papier ?"), confirmLabel: t("Confirmer") });
    if (!ok) return;
    setError("");
    const queued = enqueueSignedContract(file, {
      contractId: contract.id,
      leaseId: contract.leaseId,
      ref: leaseRef ? (String(leaseRef).startsWith("#") ? String(leaseRef) : `#${leaseRef}`) : `#LEASE-${contract.leaseId}`,
      replace,
    });
    if (!queued) setError(t("Un envoi est déjà en cours pour ce contrat."));
  }

  const Icon = replace ? RefreshCw : FileSignature;
  return (
    <div className="signed-scan-import">
      {error && <div className="domus-upload-inline-error" role="alert">{error}</div>}
      {upload && <UploadProgress item={upload} />}
      <label className="immo-btn domus-upload-pick" aria-disabled={busy} data-disabled={busy ? "true" : undefined}>
        <Icon size={15} /> {busy ? t("Envoi en cours…") : label}
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} disabled={busy} onChange={onPick} />
      </label>
      <span className="muted signed-scan-hint">{t("PDF de plusieurs pages recommandé")}</span>
    </div>
  );
}
