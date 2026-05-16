import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import moment from "moment";
import { useEffect } from "react";

import { tenantNameFromLease } from "../../shared/tenants";
import { pickDefaultTemplateFor } from "./leaseUtils";

const LeaseRenewModal = ({ contractTemplates, lease, onCancel, onSubmit, open, saving, units }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open || !lease) return;
    const startDefault = lease.endDate
      ? moment(lease.endDate).add(1, "day").format("YYYY-MM-DD")
      : moment().format("YYYY-MM-DD");
    let endDefault = "";
    if (lease.startDate && lease.endDate) {
      const months = moment(lease.endDate).diff(moment(lease.startDate), "months") || 12;
      endDefault = moment(startDefault).add(months, "months").format("YYYY-MM-DD");
    }
    const defaultTemplate = pickDefaultTemplateFor(lease, contractTemplates, units);
    form.resetFields();
    form.setFieldsValue({
      startDate: startDefault,
      endDate: endDefault || undefined,
      rentAmount: lease.rentAmount,
      templateId: typeof defaultTemplate === "number" ? defaultTemplate : undefined,
      endCurrentLease: true,
    });
  }, [contractTemplates, form, lease, open, units]);

  return (
    <Modal
      open={open}
      title={lease ? `Renouveler — ${tenantNameFromLease(lease)}` : "Renouveler"}
      onCancel={onCancel}
      footer={null}
      width={620}
      destroyOnClose
    >
      <p style={{ color: "#52525b", marginTop: -8 }}>
        Un nouveau bail est créé en reprenant les informations du bail courant.
        Un nouveau contrat sera généré avec le modèle sélectionné ; l'ancien contrat reste figé.
      </p>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <div className="pm-form-grid">
          <Form.Item label="Date de début" name="startDate" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Date de fin" name="endDate" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Loyer mensuel" name="rentAmount" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Modèle de contrat" name="templateId">
            <Select
              allowClear
              placeholder="Modèle actif par défaut"
              options={(contractTemplates || []).filter(Boolean).map((tpl) => ({
                label: `${tpl.name}${tpl.isActive ? " · actif" : ""}`,
                value: tpl.id,
              }))}
            />
          </Form.Item>
        </div>
        <Form.Item name="endCurrentLease" valuePropName="checked">
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              defaultChecked
              onChange={(event) => form.setFieldValue("endCurrentLease", event.target.checked)}
            />
            Marquer l'ancien bail comme terminé
          </label>
        </Form.Item>
        <div className="immo-modal-footer">
          <Button onClick={onCancel} className="immo-modal-cancel">Annuler</Button>
          <Button type="primary" htmlType="submit" className="immo-modal-submit" loading={saving}>
            Renouveler
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default LeaseRenewModal;
