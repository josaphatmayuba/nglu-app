import {
  ClipboardCopy,
  Download,
  Eye,
  FileCheck,
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

const LeaseContextMenu = ({ contract, lease, onAction, statusText }) => {
  const variant = leaseMenuVariant(lease, contract);
  const headText = {
    signed: "Bail signé",
    noContract: "Sans contrat",
    pendingSignature: "En attente signature",
    expired: "Bail expiré",
  }[variant];

  const Item = ({ action, icon, label, tone, highlight }) => (
    <button
      type="button"
      className={`${tone || ""} ${highlight ? "highlight" : ""}`.trim()}
      onClick={() => onAction(action, lease, contract)}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="immo-context-menu">
      <div className={`immo-menu-head ${variant}`}>
        <strong>{tenantNameFromLease(lease)}</strong>
        <span>{headText} · {statusText}</span>
      </div>

      {variant === "signed" && (
        <>
          <Item action="detail" icon={<Eye size={16} />} label="Voir détail du bail" />
          <Item action="contract" icon={<FileCheck size={16} />} label="Voir contrat signé" />
          <Item action="pdf" icon={<Download size={16} />} label="Télécharger PDF" />
          <div className="immo-menu-separator" />
          <Item action="payments" icon={<ReceiptText size={16} />} label="Voir les paiements" />
          <Item action="maintenance" icon={<Wrench size={16} />} label="Tickets maintenance" />
          <div className="immo-menu-separator" />
          <Item action="edit" icon={<Pencil size={16} />} label="Modifier le bail" />
          <Item action="renew" icon={<RefreshCw size={16} />} label="Renouveler" />
          <Item action="terminate" icon={<Trash2 size={16} />} label="Résilier le bail" tone="danger" />
        </>
      )}

      {variant === "noContract" && (
        <>
          <Item action="detail" icon={<Eye size={16} />} label="Voir détail du bail" />
          <Item action="contract" icon={<FileSignature size={16} />} label="Générer le contrat" highlight />
          <div className="immo-menu-separator" />
          <Item action="edit" icon={<Pencil size={16} />} label="Modifier le bail" />
          <Item action="payments" icon={<ReceiptText size={16} />} label="Voir les paiements" />
          <div className="immo-menu-separator" />
          <Item action="delete" icon={<Trash2 size={16} />} label="Supprimer le bail" tone="danger" />
        </>
      )}

      {variant === "pendingSignature" && (
        <>
          <Item action="detail" icon={<Eye size={16} />} label="Voir détail du bail" />
          <Item action="contract" icon={<FileText size={16} />} label="Aperçu du contrat" />
          <Item action="resend" icon={<Send size={16} />} label="Renvoyer le lien" />
          <Item action="copyLink" icon={<ClipboardCopy size={16} />} label="Copier le lien de signature" />
          <div className="immo-menu-separator" />
          <Item action="edit" icon={<Pencil size={16} />} label="Modifier le bail" />
          <Item action="cancelSend" icon={<Trash2 size={16} />} label="Annuler l'envoi" tone="danger" />
        </>
      )}

      {variant === "expired" && (
        <>
          <Item action="detail" icon={<Eye size={16} />} label="Voir détail du bail" />
          <Item action="contract" icon={<FileCheck size={16} />} label="Voir contrat archivé" />
          <Item action="pdf" icon={<Download size={16} />} label="Télécharger PDF" />
          <div className="immo-menu-separator" />
          <Item action="renew" icon={<RefreshCw size={16} />} label="Renouveler (nouveau bail)" highlight />
          <Item action="archive" icon={<FileText size={16} />} label="Archiver définitivement" />
        </>
      )}
    </div>
  );
};

export default LeaseContextMenu;
