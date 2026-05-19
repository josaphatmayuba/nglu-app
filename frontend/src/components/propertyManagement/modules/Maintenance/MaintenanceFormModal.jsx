// SCRUM-73: support edit mode (mode="edit" pre-fills form, changes title/button label)

import { Button, Form, Input, InputNumber, Modal, Select } from "antd";

const priorityOptions = [
  { label: "Basse",   value: "low" },
  { label: "Moyenne", value: "medium" },
  { label: "Haute",   value: "high" },
  { label: "Urgente", value: "urgent" },
];

const statusOptions = [
  { label: "Ouvert",   value: "open" },
  { label: "En cours", value: "in_progress" },
  { label: "Terminé",  value: "done" },
];

const MaintenanceFormModal = ({
  form,
  mode = "create",
  onCancel,
  onSubmit,
  open,
  propertyOptions,
  saving,
  unitOptions,
}) => (
  <Modal
    open={open}
    title={mode === "edit" ? "Modifier le ticket" : "Créer un ticket"}
    onCancel={onCancel}
    footer={null}
    destroyOnClose
    centered
  >
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={{ priority: "medium", status: "open" }}
    >
      <Form.Item label="Titre" name="title" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <div className="pm-form-grid">
        <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
          <Select options={propertyOptions} />
        </Form.Item>
        <Form.Item label="Unité" name="unitId">
          <Select allowClear options={unitOptions} />
        </Form.Item>
        <Form.Item label="Priorité" name="priority" initialValue="medium">
          <Select options={priorityOptions} />
        </Form.Item>
        <Form.Item label="Statut" name="status" initialValue="open">
          <Select options={statusOptions} />
        </Form.Item>
        <Form.Item label="Date prévue" name="scheduledDate">
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Coût estimé" name="estimatedCost">
          <InputNumber className="w-full" min={0} />
        </Form.Item>
      </div>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={3} />
      </Form.Item>

      <div className="immo-modal-footer">
        <Button onClick={onCancel} className="immo-modal-cancel">Annuler</Button>
        <Button type="primary" htmlType="submit" className="immo-modal-submit" loading={saving}>
          {mode === "edit" ? "Enregistrer" : "Créer"}
        </Button>
      </div>
    </Form>
  </Modal>
);

export default MaintenanceFormModal;
