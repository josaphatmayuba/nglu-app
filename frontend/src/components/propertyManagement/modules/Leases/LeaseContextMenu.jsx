import {
  ClipboardCopy,
  Download,
  Eye,
  FileCheck,
  Hash,
  FileSpreadsheet,
  FileSignature,
  FileText,
  Pencil,
  ReceiptText,
  RefreshCw,
  Send,
  Trash2,
  Wrench,
} from "lucide-react";

import { tenantNameFromLease } from "../../shared/tenants";
import { leaseMenuVariant } from "./leaseUtils";

/**
 * Sous-composant pour les éléments du menu
 * Extrait pour éviter la re-déclaration à chaque render du parent
 */
const MenuItem = ({ action, icon, label, tone, highlight, onClick }) => (
  <button
    type="button"
    className={`${tone || ""} ${highlight ? "highlight" : ""}`.trim()}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

const LeaseContextMenu = ({ contract, lease, onAction, statusText }) => {
  const variant = leaseMenuVariant(lease, contract);

  const headTexts = {
    signed: "Bail signé",
    noContract: "Sans contrat",
    pendingSignature: "En attente signature",
    expired: "Bail expiré",
  };

  const handleAction = (action) => onAction(action, lease, contract);

  return (
    <div className="immo-context-menu">
      <div className={`immo-menu-head ${variant}`}>
        <strong>{tenantNameFromLease(lease)}</strong>
        <span>{headTexts[variant] || "Bail"} · {statusText}</span>
      </div>

      {variant === "signed" && (
        <>
          <MenuItem onClick={() => handleAction("detail")} icon={<Eye size={16} />} label="Voir détail du bail" />
          <MenuItem onClick={() => handleAction("contract")} icon={<FileCheck size={16} />} label="Voir contrat signé" />
          <MenuItem onClick={() => handleAction("pdf")} icon={<Download size={16} />} label="Télécharger PDF" />
          <MenuItem onClick={() => handleAction("csv")} icon={<FileSpreadsheet size={16} />} label="Exporter CSV" />
          <div className="immo-menu-separator" />
          <MenuItem onClick={() => handleAction("payments")} icon={<ReceiptText size={16} />} label="Voir les paiements" />
          <MenuItem onClick={() => handleAction("maintenance")} icon={<Wrench size={16} />} label="Tickets maintenance" />
          <div className="immo-menu-separator" />
          <MenuItem onClick={() => handleAction("copyRef")} icon={<Hash size={16} />} label="Copier la référence" />
          <MenuItem onClick={() => handleAction("edit")} icon={<Pencil size={16} />} label="Modifier le bail" />
          <MenuItem onClick={() => handleAction("renew")} icon={<RefreshCw size={16} />} label="Renouveler" />
          {/* DEVELOPMENT_RULES.md: Suppression logique uniquement */}
          <MenuItem onClick={() => handleAction("terminate")} icon={<Trash2 size={16} />} label="Résilier le bail" tone="danger" />
        </>
      )}

      {variant === "noContract" && (
        <>
          <MenuItem onClick={() => handleAction("detail")} icon={<Eye size={16} />} label="Voir détail du bail" />
          <MenuItem onClick={() => handleAction("contract")} icon={<FileSignature size={16} />} label="Générer le contrat" highlight />
          <div className="immo-menu-separator" />
          <MenuItem onClick={() => handleAction("copyRef")} icon={<Hash size={16} />} label="Copier la référence" />
          <MenuItem onClick={() => handleAction("edit")} icon={<Pencil size={16} />} label="Modifier le bail" />
          <MenuItem onClick={() => handleAction("payments")} icon={<ReceiptText size={16} />} label="Voir les paiements" />
          <div className="immo-menu-separator" />
          {/* DEVELOPMENT_RULES.md: Suppression logique uniquement */}
          <MenuItem onClick={() => handleAction("delete")} icon={<Trash2 size={16} />} label="Supprimer le bail" tone="danger" />
        </>
      )}

      {variant === "pendingSignature" && (
        <>
          <MenuItem onClick={() => handleAction("detail")} icon={<Eye size={16} />} label="Voir détail du bail" />
          <MenuItem onClick={() => handleAction("contract")} icon={<FileText size={16} />} label="Aperçu du contrat" />
          <MenuItem onClick={() => handleAction("resend")} icon={<Send size={16} />} label="Renvoyer le lien" />
          <MenuItem onClick={() => handleAction("copyLink")} icon={<ClipboardCopy size={16} />} label="Copier le lien de signature" />
          <div className="immo-menu-separator" />
          <MenuItem onClick={() => handleAction("copyRef")} icon={<Hash size={16} />} label="Copier la référence" />
          <MenuItem onClick={() => handleAction("edit")} icon={<Pencil size={16} />} label="Modifier le bail" />
          {/* DEVELOPMENT_RULES.md: Suppression logique uniquement */}
          <MenuItem onClick={() => handleAction("cancelSend")} icon={<Trash2 size={16} />} label="Annuler l'envoi" tone="danger" />
        </>
      )}

      {variant === "expired" && (
        <>
          <MenuItem onClick={() => handleAction("detail")} icon={<Eye size={16} />} label="Voir détail du bail" />
          <MenuItem onClick={() => handleAction("contract")} icon={<FileCheck size={16} />} label="Voir contrat archivé" />
          <MenuItem onClick={() => handleAction("pdf")} icon={<Download size={16} />} label="Télécharger PDF" />
          <MenuItem onClick={() => handleAction("csv")} icon={<FileSpreadsheet size={16} />} label="Exporter CSV" />
          <div className="immo-menu-separator" />
          <MenuItem onClick={() => handleAction("copyRef")} icon={<Hash size={16} />} label="Copier la référence" />
          <MenuItem onClick={() => handleAction("renew")} icon={<RefreshCw size={16} />} label="Renouveler (nouveau bail)" highlight />
          <MenuItem onClick={() => handleAction("archive")} icon={<FileText size={16} />} label="Archiver définitivement" />
        </>
      )}
    </div>
  );
};

export default LeaseContextMenu;
