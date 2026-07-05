import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Checkbox, Form, Input, InputNumber, Modal, Select, message } from "antd";

import {
  loadPropertyManagement,
  saveTenant,
  saveTenantOnboardingAdmin,
  validateTenantOnboarding,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { coupleStatuses, maritalStatuses, normalizeMaritalStatus } from "../../shared/constants";
import CurrencyCombobox from "../../../Shared/CurrencyCombobox";
import PhoneInput from "../../../Shared/PhoneInput";
import MoneyInput from "../../../Shared/MoneyInput";
import { isValidPhoneNumber } from "react-phone-number-input";

const phoneValidator = {
  validator: (_, value) =>
    !value || isValidPhoneNumber(value)
      ? Promise.resolve()
      : Promise.reject(new Error("Numéro invalide")),
};
const REQUIRED_PHONE = [{ required: true, message: "Champ obligatoire" }, phoneValidator];
const OPTIONAL_PHONE = [phoneValidator];

const professionalStatuses = [
  { label: "Salarié", value: "salarie" },
  { label: "Entrepreneur", value: "entrepreneur" },
  { label: "Commerçant", value: "commercant" },
  { label: "Travailleur autonome / Indépendant", value: "independant" },
  { label: "Pigiste", value: "pigiste" },
  { label: "Étudiant", value: "etudiant" },
  { label: "Sans emploi", value: "sans_emploi" },
  { label: "Retraité", value: "retraite" },
  { label: "Stagiaire", value: "stagiaire" },
];

const REQUIRED = [{ required: true }];

const toTenantFormRecord = (record) => {
  if (!record) return {};
  // Take everything as-is — backend returns the same shape it expects on save.
  // (The legacy `toFormRecord("tenant", ...)` is a passthrough.)
  // On normalise l'état civil vers un code (fiches legacy FR non encore migrées → select vide sinon).
  return { ...record, marital_status: normalizeMaritalStatus(record.marital_status) };
};

const TenantFormModal = ({ open, record, mode = "tenant", onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const firstRental = Boolean(Form.useWatch("first_rental", form));
  const isCouple = coupleStatuses.includes(String(maritalStatus || "").toLowerCase());

  const currencyList = useSelector((s) => s.currency?.list) || [];
  const activeCurrencies = currencyList.filter((c) => c?.status === true || c?.status === "true");
  const defaultCurrencyId = useSelector((s) => s.setting?.data?.currencyId);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (record) {
      form.setFieldsValue(toTenantFormRecord(record));
    } else {
      form.resetFields();
      if (defaultCurrencyId) form.setFieldValue("salary_currency_id", defaultCurrencyId);
    }
  }, [open, record, form, defaultCurrencyId]);

  const normalizeValues = (values) => {
    const normalizedChildNumber = Number(values.child_number || 0);
    const payload = { ...values };
    delete payload._onboardingId;
    return {
      ...payload,
      child_number: normalizedChildNumber,
      child_age:
        normalizedChildNumber > 0
          ? (values.child_age || []).slice(0, normalizedChildNumber)
          : [],
    };
  };

  const saveOnboardingDraft = async () => {
    if (mode !== "onboarding" || !record?._onboardingId) return;
    const response = await dispatch(
      saveTenantOnboardingAdmin({
        id: record._onboardingId,
        values: normalizeValues(form.getFieldsValue(true)),
      }),
    );
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      onSaved?.();
    } else {
      message.error("Echec de l'enregistrement du brouillon.");
    }
  };

  const handleSubmit = async (values) => {
    if (mode === "onboarding") {
      if (!record?._onboardingId) return;
      const saved = await dispatch(
        saveTenantOnboardingAdmin({
          id: record._onboardingId,
          values: normalizeValues(values),
        }),
      );
      if (saved.payload?.message !== "success") {
        message.error("Echec de l'enregistrement du dossier.");
        return;
      }
      const validated = await dispatch(validateTenantOnboarding(record._onboardingId));
      if (validated.payload?.message === "success") {
        dispatch(loadPropertyManagement());
        onSaved?.();
        onClose?.();
      } else {
        message.error(validated.payload?.error || "Impossible de valider le dossier.");
      }
      return;
    }

    const response = await dispatch(
      saveTenant(normalizeValues(values)),
    );
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      onSaved?.();
      onClose?.();
    } else {
      message.error("Échec de l'enregistrement du locataire.");
    }
  };

  return (
    <Modal
      open={open}
      title={mode === "onboarding" ? "Dossier d'inscription locataire" : record ? "Modifier le locataire" : "Nouveau Locataire"}
      onCancel={onClose}
      footer={null}
      width={920}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="pm-section-title">Identité</div>
        <div className="pm-form-grid">
          <Form.Item label="Prénom" name="firstName" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Nom" name="lastName" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input type="email" />
          </Form.Item>
          <Form.Item label="Téléphone" name="phone" rules={REQUIRED_PHONE}>
            <PhoneInput />
          </Form.Item>
          <Form.Item label="Téléphone secondaire" name="phone2" rules={OPTIONAL_PHONE}>
            <PhoneInput />
          </Form.Item>
        </div>
        <Form.Item label="Adresse actuelle" name="address" rules={REQUIRED}>
          <Input />
        </Form.Item>

        <div className="pm-section-title">Profil Personnel & Civil</div>
        <div className="pm-form-grid">
          <Form.Item label="Date de naissance" name="birth_date" rules={REQUIRED}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Sexe" name="sex" rules={REQUIRED}>
            <Select options={[{ label: "M", value: "M" }, { label: "F", value: "F" }]} />
          </Form.Item>
          <Form.Item label="Nationalité" name="nationality" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="État civil" name="marital_status" rules={REQUIRED}>
            <Select options={maritalStatuses} />
          </Form.Item>
        </div>

        {isCouple && (
          <div className="pm-form-grid">
            <Form.Item label="Nom du partenaire" name="partenair_name" rules={REQUIRED}>
              <Input />
            </Form.Item>
            <Form.Item label="Téléphone du partenaire" name="partenair_number" rules={REQUIRED_PHONE}>
              <PhoneInput />
            </Form.Item>
          </div>
        )}

        <div className="pm-section-title">Contact d'Urgence</div>
        <div className="pm-form-grid">
          <Form.Item label="Nom de la personne à contacter" name="contacted_person" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Téléphone de la personne à contacter" name="contacted_person_phone_number" rules={REQUIRED_PHONE}>
            <PhoneInput />
          </Form.Item>
        </div>

        <div className="pm-section-title">Situation Professionnelle & Revenus</div>
        <div className="pm-form-grid">
          <Form.Item label="Statut professionnel" name="prossional_status" rules={REQUIRED}>
            <Select options={professionalStatuses} placeholder="Sélectionnez un statut" />
          </Form.Item>
          <Form.Item label="Domaine / Fonction" name="main_activity" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Nom de l'entité" name="entity_name" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Salaire mensuel" name="monthly_pay">
            <MoneyInput form={form} currencyField="salary_currency_id" currencies={activeCurrencies} />
          </Form.Item>
          <Form.Item name="salary_currency_id" hidden><Input /></Form.Item>
          <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
            <MoneyInput form={form} currencyField="salary_currency_id" currencies={activeCurrencies} />
          </Form.Item>
        </div>

        <div className="pm-section-title">Historique & Ménage</div>
        <Form.Item name="first_rental" valuePropName="checked" style={{ marginBottom: 12 }}>
          <Checkbox>Première location (jamais loué auparavant)</Checkbox>
        </Form.Item>
        <div className="pm-form-grid">
          {!firstRental && (
            <>
              <Form.Item label="Ancienne adresse" name="old_address" rules={REQUIRED}>
                <Input />
              </Form.Item>
              <Form.Item label="Nom de l'ancien bailleur" name="old_lessor" rules={REQUIRED}>
                <Input />
              </Form.Item>
              <Form.Item label="Motif du déménagement" name="moving_reason" rules={REQUIRED}>
                <Input />
              </Form.Item>
            </>
          )}
          <Form.Item label="Nombre d'occupants" name="occupant_number" rules={REQUIRED}>
            <InputNumber className="w-full" min={1} />
          </Form.Item>
          <Form.Item label="Nombre d'enfants" name="child_number" initialValue={0}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>

        {childNumber > 0 && (
          <div className="pm-form-grid">
            {Array.from({ length: childNumber }).map((_, index) => (
              <Form.Item
                key={index}
                label={`Âge enfant ${index + 1}`}
                name={["child_age", index]}
                rules={REQUIRED}
              >
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            ))}
          </div>
        )}

        <div className="immo-modal-footer">
          <Button onClick={onClose} className="immo-modal-cancel">Annuler</Button>
          {mode === "onboarding" && (
            <Button onClick={saveOnboardingDraft} className="immo-modal-cancel">
              Enregistrer brouillon
            </Button>
          )}
          <Button type="primary" htmlType="submit" className="immo-modal-submit">
            {mode === "onboarding" ? "Valider et creer le locataire" : record ? "Enregistrer" : "Creer"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default TenantFormModal;
