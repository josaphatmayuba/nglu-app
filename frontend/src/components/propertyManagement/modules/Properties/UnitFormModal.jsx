// Small unit edit/create modal. The legacy PropertyManagement keeps its own
// inline version (lines ~3597) — this one is for PropertyManagementNew which
// drives the modal from the Properties panel.

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";

import {
  loadPropertyManagement,
  saveUnit,
} from "../../../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import { modalSelectProps, unitTypes } from "../../shared/constants";
import { optionalNumber } from "../../shared/format";

const REQUIRED = [{ required: true }];

const toUnitFormRecord = (record) => {
  if (!record) return {};
  return {
    propertyId: record.propertyId,
    name: record.name,
    unitType: record.unitType,
    status: record.status,
    floor: record.floor,
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    area: record.area,
    monthlyRent: record.monthlyRent,
    currencyId: optionalNumber(record.currencyId),
    securityDeposit: record.securityDeposit,
  };
};

const UnitFormModal = ({
  open,
  record,
  properties = [],
  currencyOptions = [],
  onClose,
  onSaved,
}) => {
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    form.resetFields();
    if (record) form.setFieldsValue(toUnitFormRecord(record));
  }, [open, record, form]);

  const handleSubmit = async (values) => {
    const payload = {
      ...values,
      currencyId: optionalNumber(values.currencyId),
    };
    const response = await dispatch(saveUnit({ id: record?.id, values: payload }));
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      onSaved?.();
      onClose?.();
    } else {
      message.error("Échec de l'enregistrement de l'unité.");
    }
  };

  const propertyOptions = properties.map((p) => ({ label: p.name, value: p.id }));

  return (
    <Modal
      open={open}
      title={record ? "Modifier propriétés" : "Nouvelle propriété"}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Bien" name="propertyId" rules={REQUIRED}>
          <Select options={propertyOptions} {...modalSelectProps} />
        </Form.Item>
        <div className="pm-form-grid">
          <Form.Item label="Nom unité" name="name" rules={REQUIRED}>
            <Input />
          </Form.Item>
          <Form.Item label="Type unité" name="unitType" initialValue="apartment">
            <Select options={unitTypes} {...modalSelectProps} />
          </Form.Item>
          <Form.Item label="Statut" name="status" initialValue="vacant">
            <Select
              {...modalSelectProps}
              options={[
                { label: "Vacant",      value: "vacant" },
                { label: "Occupé",      value: "occupied" },
                { label: "Réservé",     value: "reserved" },
                { label: "Maintenance", value: "maintenance" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Étage" name="floor"><Input /></Form.Item>
          <Form.Item label="Chambres" name="bedrooms"><InputNumber className="w-full" min={0} /></Form.Item>
          <Form.Item label="Salles de bain" name="bathrooms"><InputNumber className="w-full" min={0} /></Form.Item>
          <Form.Item label="Surface" name="area"><InputNumber className="w-full" min={0} /></Form.Item>
          <Form.Item label="Loyer mensuel" name="monthlyRent"><InputNumber className="w-full" min={0} /></Form.Item>
          <Form.Item label="Devise loyer / dépôt" name="currencyId">
            <Select allowClear placeholder="Devise par défaut" options={currencyOptions} {...modalSelectProps} />
          </Form.Item>
        </div>
        <Form.Item label="Dépôt de garantie" name="securityDeposit">
          <InputNumber className="w-full" min={0} />
        </Form.Item>

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

export default UnitFormModal;
