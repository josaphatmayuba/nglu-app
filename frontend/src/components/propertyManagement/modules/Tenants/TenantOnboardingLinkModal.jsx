// SCRUM-79 — Onboarding link generation modal.
//
// Two-step flow:
//   step 1 ("form")  → user types phone (required) + optional firstName /
//                      lastName / email used by the delivery shortcuts.
//                      Submit -> POST /property-management/onboarding
//                      and receive { url }.
//   step 2 ("share") → readonly link + Copy + Open + Email + SMS/WhatsApp.
//
// Replaces the placeholder toast that lived in PropertyManagementNew.jsx
// ("La génération du lien d'inscription n'est pas encore migrée…").

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Form, Input, Modal, message } from "antd";
import axios from "axios";
import {
  Copy,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  MessageSquare,
} from "lucide-react";

import { generateTenantOnboarding } from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import PhoneInput from "../../../Shared/PhoneInput";
import { isValidPhoneNumber } from "react-phone-number-input";
import { useSmsCooldown } from "../../shared/useSmsCooldown";

const TenantOnboardingLinkModal = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const [step, setStep] = useState("form");
  const [busy, setBusy] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [link, setLink] = useState("");
  const [contact, setContact] = useState({ email: "", phone: "", firstName: "" });
  const companyName = useSelector((s) => s.setting?.data?.companyName) || "votre gestionnaire";
  const { remainingSeconds: smsCooldown, start: startSmsCooldown } = useSmsCooldown(contact.phone);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setStep("form");
      setBusy(false);
      setSmsBusy(false);
      setEmailBusy(false);
      setLink("");
      setContact({ email: "", phone: "", firstName: "" });
    }
  }, [open, form]);

  const generate = async (values) => {
    setBusy(true);
    try {
      const response = await dispatch(generateTenantOnboarding({
        firstName: values.firstName || null,
        lastName: values.lastName || null,
        email: values.email || null,
        phone: values.phone,
      }));
      const data = response.payload?.data;
      const url = data?.url || data?.onboardingUrl;
      if (response.payload?.message === "success" && url) {
        setLink(url);
        setContact({ email: values.email || "", phone: values.phone, firstName: values.firstName || "" });
        setStep("share");
      } else {
        message.error(response.payload?.message || "Échec de la génération du lien.");
      }
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        // Fallback for non-https / older browsers.
        const tmp = document.createElement("textarea");
        tmp.value = link;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
      }
      message.success("Lien copié");
    } catch {
      message.error("Impossible de copier — sélectionnez le lien manuellement.");
    }
  };

  const openLink = () => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const greeting = contact.firstName ? `Bonjour ${contact.firstName}` : "Bonjour";

  const sendEmail = async () => {
    if (!contact.email) {
      message.warning("Aucune adresse email saisie à l'étape 1.");
      return;
    }
    setEmailBusy(true);
    try {
      const { data } = await axios.post("property-management/onboarding/send-email", {
        email: contact.email,
        url: link,
        firstName: contact.firstName || null,
      });
      if (data?.success) {
        message.success("Email envoyé");
      } else {
        message.error(data?.message || "Impossible d'envoyer l'email.");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Impossible d'envoyer l'email.");
    } finally {
      setEmailBusy(false);
    }
  };

  const sendSms = async () => {
    if (!contact.phone) {
      message.warning("Aucun numéro saisi à l'étape 1.");
      return;
    }
    setSmsBusy(true);
    try {
      const { data } = await axios.post("send-sms", {
        phone: contact.phone,
        message:
          `${greeting}, voici votre lien d'inscription en tant que locataire. Veuillez cliquer sur ce lien : ${link} ` +
          `Merci de le compléter dès que possible. — ${companyName}`,
      });
      if (data?.success) {
        message.success("SMS envoye");
        startSmsCooldown();
      } else {
        message.error(data?.message || "Impossible d'envoyer le SMS.");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Impossible d'envoyer le SMS.");
    } finally {
      setSmsBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={560}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#eef2ff",
              color: "#4f46e5",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LinkIcon size={20} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Générer un lien d'inscription</div>
            <div style={{ fontSize: 12, color: "#71717a", fontWeight: 400 }}>
              Le futur locataire complétera son dossier via ce lien sécurisé
            </div>
          </div>
        </div>
      }
    >
      {step === "form" && (
        <Form
          form={form}
          layout="vertical"
          onFinish={generate}
          initialValues={{ phone: "" }}
        >
          <Form.Item label="Prénom" name="firstName">
            <Input placeholder="ex. Marie" />
          </Form.Item>
          <Form.Item label="Nom" name="lastName">
            <Input placeholder="ex. Kabongo" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: "email" }]}>
            <Input placeholder="marie.kabongo@email.cd" />
          </Form.Item>
          <Form.Item
            label="Téléphone"
            name="phone"
            rules={[
              { required: true, message: "Numéro requis" },
              {
                validator: (_, value) =>
                  !value || isValidPhoneNumber(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error("Numéro invalide pour ce pays")),
              },
            ]}
            extra="Ce numéro identifie le dossier d'inscription côté backend."
          >
            <PhoneInput placeholder="999 123 456" />
          </Form.Item>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={onClose}>Annuler</Button>
            <Button type="primary" htmlType="submit" loading={busy} icon={<LinkIcon size={14} />}>
              Générer le lien
            </Button>
          </div>
        </Form>
      )}

      {step === "share" && (
        <div>
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "#d1fae5",
                color: "#047857",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 18,
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontWeight: 500, color: "#065f46" }}>
                Lien généré avec succès
              </div>
              <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
                Valide 7 jours · usage unique
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#71717a",
                marginBottom: 6,
              }}
            >
              Lien d'inscription
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Input
                readOnly
                value={link}
                style={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
              />
              <Button onClick={copyLink} icon={<Copy size={14} />} title="Copier">
                Copier
              </Button>
              <Button onClick={openLink} icon={<ExternalLink size={14} />} title="Ouvrir">
                Ouvrir
              </Button>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#71717a",
                marginBottom: 8,
              }}
            >
              Envoyer le lien
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={sendEmail}
                disabled={!contact.email || emailBusy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #e4e4e7",
                  background: contact.email && !emailBusy ? "#fff" : "#f4f4f5",
                  cursor: contact.email && !emailBusy ? "pointer" : "not-allowed",
                  textAlign: "left",
                  opacity: contact.email && !emailBusy ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#eef2ff",
                    color: "#4f46e5",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Mail size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Envoyer par email</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#71717a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {contact.email || "Email non saisi"}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={sendSms}
                disabled={!contact.phone || smsBusy || smsCooldown > 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #e4e4e7",
                  background: contact.phone && !smsBusy && smsCooldown === 0 ? "#fff" : "#f4f4f5",
                  cursor: contact.phone && !smsBusy && smsCooldown === 0 ? "pointer" : "not-allowed",
                  textAlign: "left",
                  opacity: contact.phone && !smsBusy && smsCooldown === 0 ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#ecfdf5",
                    color: "#047857",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MessageSquare size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {smsBusy ? "Envoi..." : smsCooldown > 0 ? `SMS envoyé (${smsCooldown}s)` : "SMS / WhatsApp"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#71717a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {contact.phone || "Numéro non saisi"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid #f4f4f5",
            }}
          >
            <Button type="link" onClick={() => setStep("form")} style={{ padding: 0 }}>
              ← Retour
            </Button>
            <Button type="primary" onClick={onClose}>
              Terminé
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TenantOnboardingLinkModal;
