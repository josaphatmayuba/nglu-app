import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import moment from "moment";
import { useEffect } from "react";

import CurrencyCombobox from "../../../Shared/CurrencyCombobox";
import { modalSelectProps } from "../../shared/constants";
import { optionalNumber } from "../../shared/format";
import { tenantName } from "../../shared/tenants";

const statusOptions = [
  { label: "Brouillon", value: "draft" },
  { label: "Actif", value: "active" },
  { label: "Terminé", value: "ended" },
  { label: "Annulé", value: "cancelled" },
];

const billingCycleOptions = [
  { label: "Mensuel", value: "monthly" },
  { label: "Trimestriel", value: "quarterly" },
  { label: "Annuel", value: "yearly" },
];

const toLeaseFormRecord = (record) => ({
  ...record,
  startDate: record?.startDate ? moment(record.startDate).format("YYYY-MM-DD") : undefined,
  endDate: record?.endDate ? moment(record.endDate).format("YYYY-MM-DD") : undefined,
  nextInvoiceDate: record?.nextInvoiceDate ? moment(record.nextInvoiceDate).format("YYYY-MM-DD") : undefined,
  currencyId: optionalNumber(record?.currencyId),
});

const LeaseFormModal = ({
  currencyOptions,
  onCancel,
  onSubmit,
  open,
  properties,
  record,
  saving,
  tenants,
  units,
}) => {
  const [form] = Form.useForm();
  const selectedProperty = Form.useWatch("propertyId", form);
  const selectedUnit = Form.useWatch("unitId", form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (record) form.setFieldsValue(toLeaseFormRecord(record));
  }, [form, open, record]);

  useEffect(() => {
    if (!open || !selectedUnit || record) return;
    const unit = units.find((item) => item.id === selectedUnit);
    if (unit) {
      form.setFieldsValue({
        rentAmount: unit.monthlyRent,
        securityDeposit: unit.securityDeposit,
      });
    }
  }, [form, open, record, selectedUnit, units]);

  const propertyOptions = properties.map((property) => ({ label: property.name, value: property.id }));
  const leaseUnitOptions = units
    .filter((unit) => !selectedProperty || unit.propertyId === selectedProperty)
    .map((unit) => ({ label: unit.name, value: unit.id }));
  const tenantOptions = tenants.map((customer) => ({ label: tenantName(customer), value: customer.id }));

  const handlePropertyChange = (propertyId) => {
    const currentUnitId = form.getFieldValue("unitId");
    const currentUnit = units.find((unit) => unit.id === currentUnitId);
    if (!currentUnit || currentUnit.propertyId !== propertyId) {
      form.setFieldsValue({
        unitId: undefined,
        rentAmount: undefined,
        securityDeposit: undefined,
      });
    }
  };

  const submit = (values) => {
    onSubmit({
      id: record?.id,
      values: {
        ...values,
        currencyId: optionalNumber(values.currencyId),
      },
    });
  };

  return (
    <Modal
      open={open}
      title={record ? "Modifier le bail" : "Créer"}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      centered
      width={820}
    >
      <Form form={form} layout="vertical" onFinish={submit}>
        <div className="pm-form-grid">
          <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
            <Select options={propertyOptions} onChange={handlePropertyChange} />
          </Form.Item>
          <Form.Item label="Unité" name="unitId" rules={[{ required: true }]}>
            <Select options={leaseUnitOptions} disabled={!selectedProperty} />
          </Form.Item>
          <Form.Item label="Locataire" name="tenantId" rules={[{ required: true }]}>
            <Select options={tenantOptions} />
          </Form.Item>
          <Form.Item label="Statut" name="status" initialValue="active">
            <Select {...modalSelectProps} options={statusOptions} />
          </Form.Item>
          <Form.Item label="Début" name="startDate" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Fin" name="endDate">
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Prochaine facture" name="nextInvoiceDate">
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Cycle" name="billingCycle" initialValue="monthly">
            <Select {...modalSelectProps} options={billingCycleOptions} />
          </Form.Item>
          <Form.Item label="Loyer" name="rentAmount" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Devise" name="currencyId">
            <CurrencyCombobox allowClear placeholder="Devise par défaut" {...modalSelectProps} options={currencyOptions} />
          </Form.Item>
          <Form.Item label="Dépôt" name="securityDeposit">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>
        <Form.Item label="Relevé compteur entrée" name="moveInMeterReading">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item label="Conditions / clauses" name="terms">
          <Input.TextArea rows={4} />
        </Form.Item>

        <div className="immo-modal-footer">
          <Button onClick={onCancel} className="immo-modal-cancel">Annuler</Button>
          <Button type="primary" htmlType="submit" className="immo-modal-submit" loading={saving}>
            {record ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default LeaseFormModal;
