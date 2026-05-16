import { ClipboardCopy, FileText, Mail, Pencil, ReceiptText, Trash2 } from "lucide-react";

import { tenantName } from "../../shared/tenants";

const Item = ({ icon, label, onClick, tone, highlight }) => (
  <button
    type="button"
    className={`immo-menu-item${tone === "danger" ? " danger" : ""}${highlight ? " highlight" : ""}`}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const TenantContextMenu = ({ tenant, lease, onAction }) => (
  <div className="immo-context-menu">
    <div className="immo-menu-head">
      <strong>{tenantName(tenant)}</strong>
      <span>{lease ? `Bail ${lease.reference || `#${lease.id}`}` : "Sans bail"}</span>
    </div>
    <Item icon={<Pencil size={16} />}        label="Modifier le locataire"  onClick={() => onAction("edit", tenant)} highlight />
    <Item icon={<FileText size={16} />}      label="Voir le bail"           onClick={() => onAction("viewLease", tenant)} />
    <Item icon={<ReceiptText size={16} />}   label="Voir les paiements"     onClick={() => onAction("viewPayments", tenant)} />
    <div className="immo-menu-separator" />
    <Item icon={<Mail size={16} />}          label="Copier l'email"         onClick={() => onAction("copyEmail", tenant)} />
    <Item icon={<ClipboardCopy size={16} />} label="Copier le téléphone"    onClick={() => onAction("copyPhone", tenant)} />
    <div className="immo-menu-separator" />
    <Item icon={<Trash2 size={16} />}        label="Supprimer le locataire" onClick={() => onAction("delete", tenant)} tone="danger" />
  </div>
);

export default TenantContextMenu;
