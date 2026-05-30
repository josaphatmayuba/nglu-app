import moment from "moment";
import { CheckCircle2, Copy, ExternalLink, FileClock, Mail, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { message } from "antd";
import axios from "axios";
import { useState } from "react";
import { useSelector } from "react-redux";

import { avatarColors } from "../../shared/constants";
import { initials, parseOnboardingData } from "../../shared/tenants";
import { useSmsCooldown } from "../../shared/useSmsCooldown";

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

const OnboardingCard = ({ record, index = 0, onEdit, onValidate, onDelete }) => {
  const data = parseOnboardingData(record);
  const meta = statusMeta[record.status] || statusMeta.sent;
  const name = displayName(record);
  const isSubmitted = record.status === "submitted";
  const phone = record.phone || data.phone;
  const email = data.email;
  const firstName = data.firstName;
  const companyName = useSelector((s) => s.setting?.data?.companyName) || "votre gestionnaire";
  const [smsBusy, setSmsBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const { remainingSeconds: smsCooldown, start: startSmsCooldown } = useSmsCooldown(phone);

  const copyLink = async () => {
    if (!record.url) {
      message.warning("Lien indisponible pour ce dossier.");
      return;
    }
    await navigator.clipboard?.writeText(record.url);
    message.success("Lien copie");
  };

  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

  const resendSms = async () => {
    if (!record.url || !phone) {
      message.warning("Lien ou numéro manquant.");
      return;
    }
    setSmsBusy(true);
    try {
      const { data: r } = await axios.post("send-sms", {
        phone,
        message:
          `${greeting}, voici votre lien d'inscription en tant que locataire. Veuillez cliquer sur ce lien : ${record.url} ` +
          `Merci de le compléter dès que possible. — ${companyName}`,
      });
      if (r?.success) { message.success("SMS renvoyé"); startSmsCooldown(); }
      else message.error(r?.message || "Impossible d'envoyer le SMS.");
    } catch (e) {
      message.error(e?.response?.data?.message || "Impossible d'envoyer le SMS.");
    } finally {
      setSmsBusy(false);
    }
  };

  const resendEmail = async () => {
    if (!record.url || !email) {
      message.warning("Lien ou email manquant.");
      return;
    }
    setEmailBusy(true);
    try {
      const { data: r } = await axios.post("property-management/onboarding/send-email", {
        email,
        url: record.url,
        firstName: firstName || null,
      });
      if (r?.success) message.success("Email renvoyé");
      else message.error(r?.message || "Impossible d'envoyer l'email.");
    } catch (e) {
      message.error(e?.response?.data?.message || "Impossible d'envoyer l'email.");
    } finally {
      setEmailBusy(false);
    }
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
              <button type="button" onClick={resendSms} disabled={!phone || smsBusy || smsCooldown > 0}>
                <MessageSquare size={14} /> {smsBusy ? "Envoi…" : smsCooldown > 0 ? `Renvoyer SMS (${smsCooldown}s)` : "Renvoyer SMS"}
              </button>
              <button type="button" onClick={resendEmail} disabled={!email || emailBusy}>
                <Mail size={14} /> {emailBusy ? "Envoi…" : "Renvoyer email"}
              </button>
            </>
          )}
          {isSubmitted && (
            <button type="button" className="primary" onClick={() => onValidate?.(record)}>
              <CheckCircle2 size={14} /> Valider
            </button>
          )}
          <button type="button" className="danger" onClick={() => onDelete?.(record)}>
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>
    </article>
  );
};

export default OnboardingCard;
