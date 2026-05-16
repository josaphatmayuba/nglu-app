import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Building2,
  Check,
  Grid3X3,
  Info,
  Layers,
  MapPin,
  Plus,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  message,
} from "antd";

import {
  loadPropertyManagement,
  saveProperty,
  saveUnit,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { propertyTypes, unitTypes } from "../../shared/constants";

const toPropertyFormRecord = (record) => {
  if (!record) return {};
  return {
    name: record.name,
    code: record.code,
    propertyType: record.propertyType,
    status: record.status,
    defaultRent: record.defaultRent,
    address: record.address,
    city: record.city,
    country: record.country,
    floors: record.floors,
    parkingSpaces: record.parkingSpaces,
    marketValue: record.marketValue,
    description: record.description,
  };
};

const richTitle = (record) => (
  <div className="immo-modal-title">
    <span className="immo-modal-title-icon brand"><Building2 size={20} /></span>
    <div>
      <strong>{record ? "Modifier la propriété" : "Nouvelle propriété"}</strong>
      <span>Ajoutez un bien à votre portefeuille immobilier</span>
    </div>
  </div>
);

const PropertyFormModal = ({ open, record, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();
  const addUnitsNow = Form.useWatch("addUnitsNow", form);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (record) {
      form.setFieldsValue(toPropertyFormRecord(record));
    } else {
      form.resetFields();
    }
  }, [open, record, form]);

  const handleSubmit = async (values) => {
    const id = record?.id;
    const { addUnitsNow: _addUnitsNow, units, _draft, ...propertyValues } = values;
    const isDraft = Boolean(_draft);

    const response = await dispatch(saveProperty({ id, values: propertyValues }));
    if (response.payload?.message !== "success") return;

    if (isDraft) {
      message.success("Brouillon enregistré");
    }

    if (_addUnitsNow && Array.isArray(units) && units.length > 0) {
      const createdPropertyId = response.payload?.data?.id ?? id;
      if (createdPropertyId) {
        const validUnits = units.filter((u) => u && u.name);
        let failed = 0;
        for (const unit of validUnits) {
          const unitResp = await dispatch(
            saveUnit({
              values: { ...unit, propertyId: createdPropertyId, status: "vacant" },
            }),
          );
          if (unitResp.payload?.message !== "success") failed++;
        }
        if (failed > 0) {
          message.warning(`${validUnits.length - failed}/${validUnits.length} unités créées (${failed} échouées)`);
        } else if (validUnits.length > 0) {
          message.success(
            `${validUnits.length} unité${validUnits.length > 1 ? "s" : ""} créée${validUnits.length > 1 ? "s" : ""}`,
          );
        }
      }
    }

    dispatch(loadPropertyManagement());
    onSaved?.();
    onClose?.();
  };

  return (
    <Modal
      open={open}
      title={richTitle(record)}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <div className="immo-property-form">
          <div className="immo-form-section">
            <h3 className="immo-form-section-title"><Info size={14} /> Informations générales</h3>
            <Form.Item label={<>Nom <span className="immo-required">*</span></>} name="name" rules={[{ required: true, message: "Le nom est requis" }]}>
              <Input placeholder="ex. Résidence Tombalbaye" />
            </Form.Item>
            <div className="pm-form-grid">
              <Form.Item label="Code interne" name="code">
                <Input disabled placeholder="Auto-généré" />
              </Form.Item>
              <Form.Item label={<>Type de bien <span className="immo-required">*</span></>} name="propertyType" initialValue="building" rules={[{ required: true }]}>
                <Select options={propertyTypes} popupClassName="immo-select-popup" getPopupContainer={() => document.body} />
              </Form.Item>
            </div>
            <Form.Item label="Statut initial" name="status" initialValue="available">
              <Radio.Group className="immo-radio-cards">
                <Radio value="available"   className="immo-radio-card">Disponible</Radio>
                <Radio value="occupied"    className="immo-radio-card">Occupé</Radio>
                <Radio value="maintenance" className="immo-radio-card">Maintenance</Radio>
              </Radio.Group>
            </Form.Item>
          </div>

          <div className="immo-form-section">
            <h3 className="immo-form-section-title"><MapPin size={14} /> Localisation</h3>
            <Form.Item label="Adresse" name="address">
              <Input placeholder="ex. 15 Av. Tombalbaye" />
            </Form.Item>
            <div className="pm-form-grid">
              <Form.Item label="Ville" name="city" initialValue="Kinshasa">
                <Input />
              </Form.Item>
              <Form.Item label="Pays" name="country" initialValue="RDC">
                <Input />
              </Form.Item>
            </div>
          </div>

          <div className="immo-form-section">
            <h3 className="immo-form-section-title"><Layers size={14} /> Caractéristiques</h3>
            <div className="pm-form-grid">
              <Form.Item label="Nombre d'étages" name="floors" initialValue={1}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item label="Places de parking" name="parkingSpaces" initialValue={0}>
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </div>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={2} placeholder="Notes, équipements, particularités du bien..." />
            </Form.Item>
          </div>

          <div className="immo-form-section">
            <h3 className="immo-form-section-title"><Wallet size={14} /> Informations financières</h3>
            <div className="pm-form-grid">
              <Form.Item label="Valeur marchande estimée" name="marketValue" extra="Pour analyse de patrimoine">
                <InputNumber className="w-full immo-cdf-field" min={0} placeholder="ex. 480 000 000" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
              </Form.Item>
              <Form.Item label="Loyer mensuel par défaut" name="defaultRent" extra="Hérité par défaut sur chaque unité créée">
                <InputNumber className="w-full immo-cdf-field" min={0} placeholder="ex. 850 000" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
              </Form.Item>
            </div>
          </div>

          <Form.Item name="addUnitsNow" valuePropName="checked" noStyle initialValue={false}>
            <Checkbox className="immo-units-toggle">
              <div>
                <strong><Grid3X3 size={14} /> Ajouter des unités maintenant</strong>
                <p>Définissez les appartements/locaux du bien. Vous pourrez aussi le faire plus tard.</p>
              </div>
            </Checkbox>
          </Form.Item>

          {addUnitsNow && (
            <Form.List name="units">
              {(fields, { add, remove }) => (
                <div className="immo-units-list">
                  {fields.map((field, index) => (
                    <div key={field.key} className="immo-unit-card">
                      <div className="immo-unit-card-head">
                        <div className="immo-unit-card-title">
                          <span className="immo-unit-card-number">{index + 1}</span>
                          <span>Unité {index + 1}</span>
                        </div>
                        <button
                          type="button"
                          className="immo-unit-card-remove"
                          onClick={() => remove(field.name)}
                          aria-label="Supprimer cette unité"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="immo-unit-card-grid">
                        <Form.Item label={<>Nom <span className="immo-required">*</span></>} name={[field.name, "name"]} rules={[{ required: true }]}>
                          <Input placeholder="ex. A-203" size="small" />
                        </Form.Item>
                        <Form.Item label="Type" name={[field.name, "unitType"]} initialValue="apartment">
                          <Select size="small" options={unitTypes} popupClassName="immo-select-popup" getPopupContainer={() => document.body} />
                        </Form.Item>
                        <Form.Item label="Étage" name={[field.name, "floor"]}>
                          <Input placeholder="ex. 2 ou RDC" size="small" />
                        </Form.Item>
                        <Form.Item label="Surface (m²)" name={[field.name, "area"]}>
                          <InputNumber className="w-full" min={0} placeholder="120" size="small" controls={false} />
                        </Form.Item>
                        <Form.Item label="Chambres" name={[field.name, "bedrooms"]} initialValue={0}>
                          <InputNumber className="w-full" min={0} size="small" controls={false} />
                        </Form.Item>
                        <Form.Item label="Salles de bain" name={[field.name, "bathrooms"]} initialValue={0}>
                          <InputNumber className="w-full" min={0} size="small" controls={false} />
                        </Form.Item>
                      </div>
                      <div className="immo-unit-card-grid">
                        <Form.Item label="Loyer mensuel" name={[field.name, "monthlyRent"]}>
                          <InputNumber className="w-full immo-cdf-field" min={0} placeholder="850 000" size="small" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                        </Form.Item>
                        <Form.Item label="Caution (2× loyer suggéré)" name={[field.name, "securityDeposit"]}>
                          <InputNumber className="w-full immo-cdf-field" min={0} placeholder="1 700 000" size="small" controls={false} prefix={<span className="immo-cdf-prefix-text">CDF</span>} />
                        </Form.Item>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="immo-unit-add"
                    onClick={() => add({ unitType: "apartment", bedrooms: 0, bathrooms: 0 })}
                  >
                    <Plus size={16} /> Ajouter une unité
                  </button>
                </div>
              )}
            </Form.List>
          )}

          <div className="immo-form-info-note">
            <Info size={14} />
            <span>
              <strong>Le code interne est généré automatiquement</strong> après création
              (format <code>PROP-YYYY-NNN</code>). Vous pourrez ajouter photo et documents
              juridiques (titre de propriété, plan cadastral) après la création.
            </span>
          </div>
        </div>

        <div className="immo-modal-footer">
          <Button onClick={onClose} className="immo-modal-cancel">Annuler</Button>
          <div className="immo-modal-footer-right">
            <Button
              className="immo-modal-draft"
              icon={<Save size={14} />}
              onClick={() => {
                form.setFieldsValue({ _draft: true });
                form.submit();
              }}
            >
              Brouillon
            </Button>
            <Button type="primary" htmlType="submit" className="immo-modal-submit" icon={<Check size={14} />}>
              {record ? "Mettre à jour la propriété" : "Créer la propriété"}
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default PropertyFormModal;
