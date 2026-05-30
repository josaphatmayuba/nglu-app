import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Select, Spin } from "antd";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  getTenantOnboarding,
  saveTenantOnboardingDraft,
  submitTenantOnboarding,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import "./PropertyManagement.css";
import PhoneInput from "../Shared/PhoneInput";
import MoneyInput from "../Shared/MoneyInput";
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
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle");
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const autoSaveInFlightRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");
  const submittedRef = useRef(false);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const firstRental = Boolean(Form.useWatch("first_rental", form));
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
        form.setFieldsValue({
          child_number: 0,
          salary_currency_id: result.data?.defaultCurrencyId ?? undefined,
          ...(result.data?.data || {}),
          phone: result.data?.phone,
        });
        lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));
        setSubmitted(result.data?.status === "submitted");
      }
      setLoading(false);
    };

    load();
  }, [dispatch, form, token]);

  const hasAnyValue = (values) =>
    Object.entries(values || {}).some(([k, v]) => {
      if (k === "phone") return false;
      if (v == null || v === "") return false;
      if (Array.isArray(v)) return v.some((x) => x != null && x !== "");
      if (typeof v === "number") return true;
      if (typeof v === "boolean") return v === true;
      return true;
    });

  const persistDraft = async ({ silent } = { silent: false }) => {
    const values = form.getFieldsValue(true);
    const snapshot = JSON.stringify(values);
    if (snapshot === lastSavedSnapshotRef.current) return { skipped: true };
    if (!hasAnyValue(values)) return { skipped: true };

    if (silent) {
      autoSaveInFlightRef.current = true;
      setAutoSaveStatus("saving");
    } else {
      setSaving(true);
    }
    try {
      const result = await dispatch(saveTenantOnboardingDraft({ token, values })).unwrap();
      if (result?.message !== "error") {
        setRecord(result.data);
        form.setFieldsValue({ ...(result.data?.data || {}), phone: result.data?.phone });
        lastSavedSnapshotRef.current = JSON.stringify(form.getFieldsValue(true));
        setLastSavedAt(new Date());
        if (silent) setAutoSaveStatus("saved");
        return { ok: true };
      }
      if (silent) setAutoSaveStatus("error");
      return { ok: false };
    } finally {
      if (silent) autoSaveInFlightRef.current = false;
      else setSaving(false);
    }
  };

  const saveDraft = () => persistDraft({ silent: false });

  const scheduleAutoSave = () => {
    if (submittedRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (autoSaveInFlightRef.current) {
        scheduleAutoSave();
        return;
      }
      persistDraft({ silent: true });
    }, 2000);
  };

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

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

  if (submitted) {
    return (
      <div className="tenant-onboarding-page">
        <Card>
          <div className="tenant-onboarding-thanks">
            <CheckCircle2 size={72} className="text-green-600" />
            <h1>Merci d'avoir rempli votre dossier&nbsp;!</h1>
            <p>
              Votre dossier a bien été soumis. Le gestionnaire va le vérifier et
              reviendra vers vous très bientôt.
            </p>
            <p className="muted">Vous pouvez maintenant fermer cette page.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="tenant-onboarding-page">
      <Card>
        <div className="pm-section-title">Dossier locataire</div>
        {error && <Alert className="mb-4" type="error" message={error} showIcon />}

        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          onValuesChange={scheduleAutoSave}
        >
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
            <Form.Item label="Téléphone secondaire" name="phone2" rules={optionalPhoneRules}>
              <PhoneInput />
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
            <Form.Item label="Nom de la personne à contacter" name="contacted_person" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item
              label="Téléphone de la personne à contacter"
              name="contacted_person_phone_number"
              rules={requiredPhoneRules}
            >
              <PhoneInput />
            </Form.Item>
          </div>

          <div className="pm-section-title">Situation Professionnelle & Revenus</div>
          <div className="pm-form-grid">
            <Form.Item label="Statut professionnel" name="prossional_status" rules={requiredRules}>
              <Select options={professionalStatuses} placeholder="Sélectionnez un statut" />
            </Form.Item>
            <Form.Item label="Domaine / Fonction" name="main_activity" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Nom de l'entité" name="entity_name" rules={requiredRules}>
              <Input />
            </Form.Item>
            <Form.Item label="Salaire mensuel" name="monthly_pay">
              <MoneyInput form={form} currencyField="salary_currency_id" currencies={record?.currencies ?? []} />
            </Form.Item>
            <Form.Item name="salary_currency_id" hidden><Input /></Form.Item>
            <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
              <MoneyInput form={form} currencyField="salary_currency_id" currencies={record?.currencies ?? []} />
            </Form.Item>
          </div>

          <div className="pm-section-title">Historique & Ménage</div>
          <Form.Item name="first_rental" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Checkbox>Première location (je n'ai jamais loué auparavant)</Checkbox>
          </Form.Item>
          <div className="pm-form-grid">
            {!firstRental && (
              <>
                <Form.Item label="Ancienne adresse" name="old_address" rules={requiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nom de l'ancien bailleur" name="old_lessor" rules={requiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Motif du déménagement" name="moving_reason" rules={requiredRules}>
                  <Input />
                </Form.Item>
              </>
            )}
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
            <div className="tenant-autosave-status">
              {autoSaveStatus === "saving" && (
                <><Loader2 className="spin" size={14} /> <span>Sauvegarde…</span></>
              )}
              {autoSaveStatus === "saved" && lastSavedAt && (
                <><CheckCircle2 size={14} className="text-green-600" />
                <span>Sauvegardé à {lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></>
              )}
              {autoSaveStatus === "error" && (
                <span className="text-red-600">Sauvegarde auto en échec — utilisez le bouton.</span>
              )}
            </div>
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
