import { Alert, Button, Card, Form, Input, InputNumber, Select, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  getTenantOnboarding,
  saveTenantOnboardingDraft,
  submitTenantOnboarding,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import "./PropertyManagement.css";
import PhoneInput from "../Shared/PhoneInput";
import { isValidPhoneNumber } from "react-phone-number-input";

const phoneValidator = {
  validator: (_, value) =>
    !value || isValidPhoneNumber(value)
      ? Promise.resolve()
      : Promise.reject(new Error("Numéro invalide pour ce pays")),
};
const requiredPhoneRules = [{ required: true, message: "Champ obligatoire" }, phoneValidator];
const optionalPhoneRules = [phoneValidator];

const maritalStatuses = [
  { label: "Célibataire", value: "single" },
  { label: "Marié", value: "married" },
  { label: "Conjoint de fait", value: "common_law" },
  { label: "Divorcé", value: "divorced" },
  { label: "Veuf", value: "widowed" },
];

const coupleStatuses = ["married", "common_law", "marié", "marie", "conjoint de fait"];
const requiredRules = [{ required: true, message: "Champ obligatoire" }];

const TenantOnboardingPage = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const isCouple = useMemo(
    () => coupleStatuses.includes(String(maritalStatus || "").toLowerCase()),
    [maritalStatus],
  );

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Lien invalide ou manquant.");
        setLoading(false);
        return;
      }

      const result = await dispatch(getTenantOnboarding(token)).unwrap();
      if (result?.message === "error") {
        setError(result.error || "Ce lien n'est plus valide.");
      } else {
        setRecord(result.data);
        form.setFieldsValue({ child_number: 0, ...(result.data?.data || {}), phone: result.data?.phone });
        setSubmitted(result.data?.status === "submitted");
      }
      setLoading(false);
    };

    load();
  }, [dispatch, form, token]);

  const saveDraft = async () => {
    setSaving(true);
    const values = form.getFieldsValue(true);
    const result = await dispatch(saveTenantOnboardingDraft({ token, values })).unwrap();
    if (result?.message !== "error") {
      setRecord(result.data);
      form.setFieldsValue({ ...(result.data?.data || {}), phone: result.data?.phone });
    }
    setSaving(false);
  };

  const submit = async (values) => {
    setSaving(true);
    const result = await dispatch(submitTenantOnboarding({ token, values })).unwrap();
    if (result?.message === "error") {
      setError(result.error || "Impossible de soumettre le dossier.");
    } else {
      setSubmitted(true);
      setRecord({ ...record, status: "submitted" });
      setError("");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="tenant-onboarding-page">
        <Spin />
      </div>
    );
  }

  if (error && !record) {
    return (
      <div className="tenant-onboarding-page">
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  return (
    <div className="tenant-onboarding-page">
      <Card>
        <div className="pm-section-title">Dossier locataire</div>
        {submitted && (
          <Alert
            className="mb-4"
            type="success"
            message="Votre dossier a été soumis. Le gestionnaire va le vérifier."
            showIcon
          />
        )}
        {error && <Alert className="mb-4" type="error" message={error} showIcon />}

        <Form form={form} layout="vertical" onFinish={submit} disabled={submitted}>
          <div className="pm-section-title">Identité</div>
          <div className="pm-form-grid">
            <Form.Item label="Prénom" name="firstName" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Nom" name="lastName" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email">
              <Input type="email" />
            </Form.Item>
            <Form.Item label="Téléphone" name="phone" rules={requiredPhoneRules}>
              <PhoneInput disabled />
            </Form.Item>
          </div>
          <Form.Item label="Adresse actuelle" name="address" rules={requiredRules}>
            <Input />
          </Form.Item>

          <div className="pm-section-title">Profil Personnel & Civil</div>
          <div className="pm-form-grid">
            <Form.Item label="Date de naissance" name="birth_date" rules={requiredRules}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Sexe" name="sex" rules={requiredRules}>
              <Select options={[{ label: "M", value: "M" }, { label: "F", value: "F" }]} />
            </Form.Item>
            <Form.Item label="Nationalité" name="nationality" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="État civil" name="marital_status" rules={requiredRules}>
              <Select options={maritalStatuses} />
            </Form.Item>
            <Form.Item label="Province d'origine" name="origin_province" rules={requiredRules}>
              <Input />
            </Form.Item>
          </div>

          {isCouple && (
            <div className="pm-form-grid">
              <Form.Item label="Nom du partenaire" name="partenair_name" rules={requiredRules}>
                <Input />
              </Form.Item>
              <Form.Item label="Téléphone du partenaire" name="partenair_number" rules={requiredPhoneRules}>
                <PhoneInput />
              </Form.Item>
            </div>
          )}

          <div className="pm-section-title">Contact d'Urgence</div>
          <div className="pm-form-grid">
            <Form.Item label="Téléphone secondaire" name="phone2" rules={optionalPhoneRules}>
              <PhoneInput />
            </Form.Item>
            <Form.Item label="Personne à contacter" name="contacted_person" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Téléphone personne à contacter"
              name="contacted_person_phone_number"
              rules={requiredPhoneRules}
            >
              <PhoneInput />
            </Form.Item>
          </div>

          <div className="pm-section-title">Situation Professionnelle & Revenus</div>
          <div className="pm-form-grid">
            <Form.Item label="Statut professionnel" name="prossional_status" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Activité principale" name="main_activity" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Nom de l'entité" name="entity_name" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Adresse de l'entité" name="entity_address" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Date d'embauche" name="hiring_date" rules={requiredRules}>
              <Input type="date" />
            </Form.Item>
            <Form.Item label="Type de contrat" name="contract_type" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Salaire mensuel" name="monthly_pay" rules={requiredRules}>
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>

          <div className="pm-section-title">Historique & Ménage</div>
          <div className="pm-form-grid">
            <Form.Item label="Ancienne adresse" name="old_address" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Ancien bailleur" name="old_lessor" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Motif du déménagement" name="moving_reason" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Nombre d'occupants" name="occupant_number" rules={requiredRules}>
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
                  rules={requiredRules}
                >
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              ))}
            </div>
          )}

          <div className="pm-actions-row">
            <Button htmlType="button" onClick={saveDraft} loading={saving}>
              Sauvegarder pour plus tard
            </Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Soumettre
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default TenantOnboardingPage;
