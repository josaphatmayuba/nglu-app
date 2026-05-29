import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import moment from "moment";
import { useEffect, useMemo } from "react";

import CurrencyCombobox from "../../../Shared/CurrencyCombobox";
import { modalSelectProps } from "../../shared/constants";
import { optionalNumber } from "../../shared/format";
import { tenantName } from "../../shared/tenants";

const statusOptions = [
  { label: "Actif", value: "active" },
  { label: "Inactif", value: "inactive" },
  { label: "Termine", value: "ended" },
  { label: "Annule", value: "cancelled" },
];

const billingCycleOptions = [
  { label: "Mensuel", value: "monthly" },
  { label: "Trimestriel", value: "quarterly" },
  { label: "Annuel", value: "yearly" },
];

const durationOptions = [
  { label: "6 mois", value: "6m" },
  { label: "1 an", value: "1y" },
  { label: "2 ans", value: "2y" },
  { label: "Personnalisee", value: "custom" },
];

const durationToMonths = {
  "6m": 6,
  "1y": 12,
  "2y": 24,
};

const requiredMessage = "Champ requis";

const toLeaseFormRecord = (record) => ({
  ...record,
  startDate: record?.startDate ? moment(record.startDate).format("YYYY-MM-DD") : undefined,
  endDate: record?.endDate ? moment(record.endDate).format("YYYY-MM-DD") : undefined,
  nextInvoiceDate: record?.nextInvoiceDate ? moment(record.nextInvoiceDate).format("YYYY-MM-DD") : undefined,
  currencyId: optionalNumber(record?.currencyId),
});

const optionText = (parts) => parts.filter(Boolean).join(" - ");

const LeaseFormModal = ({
  currencyOptions,
  leases = [],
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
  const startDate = Form.useWatch("startDate", form);
  const leaseDuration = Form.useWatch("leaseDuration", form);

  const occupiedUnitIds = useMemo(() => {
    const ids = new Set();
    leases.forEach((lease) => {
      if (!lease?.unitId || lease.id === record?.id) return;
      if (lease.status === "active") ids.add(lease.unitId);
    });
    return ids;
  }, [leases, record?.id]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (record) {
      form.setFieldsValue({ leaseDuration: "custom", ...toLeaseFormRecord(record) });
      return;
    }

    const today = moment().format("YYYY-MM-DD");
    form.setFieldsValue({
      status: "active",
      billingCycle: "monthly",
      leaseDuration: "1y",
      startDate: today,
      nextInvoiceDate: today,
    });
  }, [form, open, record]);

  useEffect(() => {
    if (!open || !selectedUnit || record) return;
    const unit = units.find((item) => item.id === selectedUnit);
    if (unit) {
      form.setFieldsValue({
        rentAmount: unit.monthlyRent,
        securityDeposit: unit.securityDeposit,
        currencyId: optionalNumber(unit.currencyId) ?? form.getFieldValue("currencyId"),
      });
    }
  }, [form, open, record, selectedUnit, units]);

  useEffect(() => {
    if (!open || !startDate) return;
    if (!form.getFieldValue("nextInvoiceDate")) {
      form.setFieldsValue({ nextInvoiceDate: startDate });
    }

    const months = durationToMonths[leaseDuration];
    if (!months) return;

    form.setFieldsValue({
      endDate: moment(startDate).add(months, "months").subtract(1, "day").format("YYYY-MM-DD"),
    });
  }, [form, leaseDuration, open, startDate]);

  const propertyOptions = properties.map((property) => ({
    label: optionText([property.name, property.address, property.city]),
    searchText: optionText([property.name, property.address, property.city, property.country]),
    value: property.id,
  }));

  const leaseUnitOptions = units
    .filter((unit) => !selectedProperty || unit.propertyId === selectedProperty)
    .filter((unit) => unit.id === record?.unitId || !occupiedUnitIds.has(unit.id))
    .map((unit) => ({
      label: optionText([
        unit.name,
        unit.unitType,
        unit.monthlyRent ? `${unit.monthlyRent}/mois` : null,
      ]),
      searchText: optionText([unit.name, unit.unitType, unit.propertyName, unit.propertyAddress]),
      value: unit.id,
    }));

  const tenantOptions = tenants.map((customer) => ({
    label: optionText([tenantName(customer), customer.email, customer.phone]),
    searchText: optionText([tenantName(customer), customer.email, customer.phone]),
    value: customer.id,
  }));

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
    const { leaseDuration: _leaseDuration, ...leaseValues } = values;
    onSubmit({
      id: record?.id,
      values: {
        ...leaseValues,
        currencyId: optionalNumber(leaseValues.currencyId),
      },
    });
  };

  return (
    <Modal
      open={open}
      title={record ? "Modifier le bail" : "Creer un nouveau bail"}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      centered
      width={820}
    >
      <Form form={form} layout="vertical" onFinish={submit}>
        <div className="pm-form-grid">
          <Form.Item label="Bien" name="propertyId" rules={[{ required: true, message: requiredMessage }]}>
            <Select
              showSearch
              optionFilterProp="searchText"
              options={propertyOptions}
              onChange={handlePropertyChange}
              placeholder="Selectionner un bien"
            />
          </Form.Item>
          <Form.Item label="Unite" name="unitId" rules={[{ required: true, message: requiredMessage }]}>
            <Select
              showSearch
              optionFilterProp="searchText"
              options={leaseUnitOptions}
              disabled={!selectedProperty}
              placeholder={selectedProperty ? "Selectionner une unite disponible" : "Choisir le bien d'abord"}
            />
          </Form.Item>
          <Form.Item label="Locataire" name="tenantId" rules={[{ required: true, message: requiredMessage }]}>
            <Select
              showSearch
              optionFilterProp="searchText"
              options={tenantOptions}
              placeholder="Selectionner un locataire"
            />
          </Form.Item>
          <Form.Item label="Statut" name="status">
            <Select {...modalSelectProps} options={statusOptions} />
          </Form.Item>
          <Form.Item label="Debut" name="startDate" rules={[{ required: true, message: requiredMessage }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Duree" name="leaseDuration">
            <Select {...modalSelectProps} options={durationOptions} />
          </Form.Item>
          <Form.Item label="Fin" name="endDate">
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Prochaine facture" name="nextInvoiceDate">
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Cycle" name="billingCycle">
            <Select {...modalSelectProps} options={billingCycleOptions} />
          </Form.Item>
          <Form.Item label="Loyer" name="rentAmount" rules={[{ required: true, message: requiredMessage }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Devise" name="currencyId">
            <CurrencyCombobox allowClear placeholder="Devise par defaut" {...modalSelectProps} options={currencyOptions} />
          </Form.Item>
          <Form.Item label="Depot" name="securityDeposit">
            <InputNumber className="w-full" min={0} />
          </Form.Item>
        </div>
        <Form.Item label="Releve compteur entree" name="moveInMeterReading">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item label="Conditions / clauses" name="terms">
          <Input.TextArea rows={4} />
        </Form.Item>

        <div className="immo-modal-footer">
          <Button onClick={onCancel} className="immo-modal-cancel">Annuler</Button>
          <Button type="primary" htmlType="submit" className="immo-modal-submit" loading={saving}>
            {record ? "Enregistrer" : "Creer"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default LeaseFormModal;
