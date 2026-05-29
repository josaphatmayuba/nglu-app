import moment from "moment";
import { CheckCircle2, Copy, ExternalLink, FileClock, Pencil } from "lucide-react";
import { message } from "antd";

import { avatarColors } from "../../shared/constants";
import { initials, parseOnboardingData } from "../../shared/tenants";

const statusMeta = {
  sent: { label: "Non rempli", tone: "warning" },
  draft: { label: "En remplissage", tone: "brand" },
  submitted: { label: "Soumis", tone: "success" },
  validated: { label: "Valide", tone: "success" },
  expired: { label: "Expire", tone: "danger" },
};

const displayName = (record) => {
  const data = parseOnboardingData(record);
  return [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email || record.phone || "Dossier locataire";
};

const OnboardingCard = ({ record, index = 0, onEdit, onValidate }) => {
  const data = parseOnboardingData(record);
  const meta = statusMeta[record.status] || statusMeta.sent;
  const name = displayName(record);
  const isSubmitted = record.status === "submitted";

  const copyLink = async () => {
    if (!record.url) {
      message.warning("Lien indisponible pour ce dossier.");
      return;
    }
    await navigator.clipboard?.writeText(record.url);
    message.success("Lien copie");
  };

  return (
    <article className={`immo-tenant-card onboarding ${record.status === "expired" ? "late" : ""}`}>
      <div className={`immo-letter-avatar ${avatarColors[index % avatarColors.length]}`}>
        {initials(name)}
      </div>
      <div className="immo-tenant-main">
        <h3>{name}</h3>
        <p>{data.email || "email non renseigne"}</p>
        <p>{record.phone || data.phone || "telephone non renseigne"}</p>
        <span className={`immo-mini-badge ${meta.tone}`}>{meta.label}</span>
      </div>
      <div className="immo-tenant-divider" />
      <div className="immo-tenant-lease">
        <p>
          <FileClock size={15} />
          Inscription locataire
        </p>
        <div>
          <span>
            Expire {record.expiresAt ? moment(record.expiresAt).format("DD/MM/YYYY") : "-"}
          </span>
          <strong>{record.status === "submitted" ? "A valider" : "Non valide"}</strong>
        </div>
        <div className="immo-onboarding-actions">
          <button type="button" onClick={() => onEdit?.(record)}>
            <Pencil size={14} /> Remplir
          </button>
          {record.url && (
            <>
              <button type="button" onClick={copyLink}>
                <Copy size={14} /> Copier
              </button>
              <button type="button" onClick={() => window.open(record.url, "_blank", "noopener,noreferrer")}>
                <ExternalLink size={14} /> Ouvrir
              </button>
            </>
          )}
          {isSubmitted && (
            <button type="button" className="primary" onClick={() => onValidate?.(record)}>
              <CheckCircle2 size={14} /> Valider
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default OnboardingCard;
