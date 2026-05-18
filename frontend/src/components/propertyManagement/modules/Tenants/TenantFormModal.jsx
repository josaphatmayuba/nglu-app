import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";

import {
  loadPropertyManagement,
  saveTenant,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { coupleStatuses, maritalStatuses } from "../../shared/constants";

const REQUIRED = [{ required: true }];

const toTenantFormRecord = (record) => {
  if (!record) return {};
  // Take everything as-is — backend returns the same shape it expects on save.
  // (The legacy `toFormRecord("tenant", ...)` is a passthrough.)
  return { ...record };
};

const TenantFormModal = ({ open, record, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const isCouple = coupleStatuses.includes(String(maritalStatus || "").toLowerCase());

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (record) {
      form.setFieldsValue(toTenantFormRecord(record));
    } else {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleSubmit = async (values) => {
    const normalizedChildNumber = Number(values.child_number || 0);
    const response = await dispatch(
      saveTenant({
        ...values,
        child_number: normalizedChildNumber,
        child_age:
          normalizedChildNumber > 0
            ? (values.child_age || []).slice(0, normalizedChildNumber)
            : [],
      }),
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
      title={record ? "Modifier le locataire" : "Nouveau Locataire"}
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
          <Form.Item label="Téléphone" name="phone" rules={REQUIRED}>
            <Input />
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
          <Form.Item label="Province d'origine" name="origin_province" rules={REQUIRED}>
            <Input />
          </Form.Item>
        </div>

        {isCouple && (
          <div className="pm-form-grid">
            <Form.Item label="Nom du partenaire" name="partenair_name" rules={REQUIRED}>
              <Input />
            </Form.Item>
            <Form.Item label="Téléphone du partenaire" name="partenair_number" rules={REQUIRED}>
              <Input />
            </Form.Item>
          </div>
        )}

        <div className="pm-section-title">Contact d'Urgence</div>
        <div className="pm-form-grid">
          <Form.Item label="Téléphone secondaire" name="phone2">
            <Input />
          </Form.Item>
          <Form.Item label="Personne à contacter" name="contacted_person" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Téléphone personne à contacter" name="contacted_person_phone_number" rules={REQUIRED}>
            <Input />
          </Form.Item>
        </div>

        <div className="pm-section-title">Situation Professionnelle & Revenus</div>
        <div className="pm-form-grid">
          <Form.Item label="Statut professionnel" name="prossional_status" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Activité principale" name="main_activity" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Nom de l'entité" name="entity_name" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Adresse de l'entité" name="entity_address" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Date d'embauche" name="hiring_date" rules={REQUIRED}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Type de contrat" name="contract_type" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Salaire mensuel" name="monthly_pay" rules={REQUIRED}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>

        <div className="pm-section-title">Historique & Ménage</div>
        <div className="pm-form-grid">
          <Form.Item label="Ancienne adresse" name="old_address" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Ancien bailleur" name="old_lessor" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Motif du déménagement" name="moving_reason" rules={REQUIRED}>
            <Input />
          </Form.Item>
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
          <Button type="primary" htmlType="submit" className="immo-modal-submit">
            {record ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default TenantFormModal;
