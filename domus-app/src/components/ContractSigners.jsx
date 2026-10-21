// Signataires d'un contrat (bail multi-locataires) : statut, avancement, renvoi/copie du lien.
// N'affiche rien pour un contrat a 0 ou 1 signataire (affichage historique inchange).
import { useState } from "react";
import { Copy, Send } from "lucide-react";
import { api } from "../api.js";
import { t } from "../i18n.js";
import { useSmsSend, useToast } from "./Dialog.jsx";

// Libelles passes par t() au rendu (cles = texte source).
const SIGNER_STATUS = {
  pending: { label: "En attente", chip: "chip-ink" },
  sent: { label: "Envoyé", chip: "chip-amber" },
  viewed: { label: "Vu", chip: "chip-iris" },
  signed: { label: "Signé", chip: "chip-emerald" },
};
// Roles backend : principal | cotenant.
const ROLE_LABEL = { principal: "Principal", cotenant: "Co-locataire" };

export function ContractSigners({ contract, onChanged }) {
  const toast = useToast();
  const smsSend = useSmsSend();
  const [busyId, setBusyId] = useState(null);
  const [links, setLinks] = useState({}); // signerId -> url (disponible apres un renvoi)
  const signers = Array.isArray(contract?.signers) ? contract.signers : [];
  if (signers.length < 2) return null;

  const signed = contract.signersSigned ?? signers.filter((s) => s.status === "signed").length;
  const total = contract.signersTotal ?? signers.length;
  const canResend = ["sent", "viewed"].includes(contract.status);

  const resend = async (s) => {
    setBusyId(s.id);
    try {
      const res = await smsSend((extra) => api.resendContractSigner(contract.id, s.id, extra), { title: t("Lien de signature : vérifier le SMS") });
      if (!res) return;
      if (res?.signingUrl) setLinks((prev) => ({ ...prev, [s.id]: res.signingUrl }));
      toast.success(t("Lien renvoyé à") + " " + (s.name || t("ce signataire")) + ".");
      onChanged?.();
    } catch (e) {
      const msg = String(e?.message || "");
      toast.error(/429|10 minutes|trop/i.test(msg)
        ? t("Un lien a déjà été renvoyé à ce signataire il y a moins de 10 minutes. Réessayez plus tard.")
        : msg || t("Impossible de renvoyer le lien."));
    } finally {
      setBusyId(null);
    }
  };

  const copy = (url) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("Lien de signature copié.")),
      () => toast.error(t("Copie impossible. Sélectionnez le lien manuellement.")),
    );
  };

  return (
    <div className="contrats-signers">
      <p className="contrats-audit-title">{t("Signataires")} · {signed}/{total} {t("signés")}</p>
      {signers.map((s) => {
        const meta = SIGNER_STATUS[s.status] || SIGNER_STATUS.pending;
        const url = links[s.id];
        return (
          <div key={s.id} className="contrats-signer">
            <div className="contrats-signer-info">
              <span className="contrats-signer-name">{s.name || "—"}</span>
              <span className="muted" style={{ fontSize: 11 }}>{ROLE_LABEL[s.role] ? t(ROLE_LABEL[s.role]) : s.role || ""}</span>
            </div>
            <span className={`chip ${meta.chip}`}>{t(meta.label)}</span>
            {s.status !== "signed" && canResend && (
              <div className="contrats-signer-actions">
                <button type="button" className="btn contrats-signer-btn" disabled={busyId === s.id} onClick={() => resend(s)}>
                  <Send size={14} /> {t("Renvoyer le lien")}
                </button>
                {url && (
                  <button type="button" className="btn contrats-signer-btn" onClick={() => copy(url)}>
                    <Copy size={14} /> {t("Copier le lien")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
