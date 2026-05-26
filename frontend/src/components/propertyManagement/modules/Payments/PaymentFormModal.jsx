import { useEffect } from "react";
import { Button, Form, Input, InputNumber, Modal, Select } from "antd";

import CurrencyCombobox from "../../../Shared/CurrencyCombobox";
import { modalSelectProps } from "../../shared/constants";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "Bank", value: "bank" },
  { label: "Mobile money", value: "mobile_money" },
  { label: "Cheque", value: "cheque" },
];

const PaymentFormModal = ({
  accounts,
  currencyOptions,
  form,
  initialLeaseId,
  leaseOptions,
  onCancel,
  onSubmit,
  open,
  saving,
}) => {
  useEffect(() => {
    if (open && initialLeaseId) {
      form.setFieldsValue({ leaseId: initialLeaseId });
    }
  }, [open, initialLeaseId, form]);
  const cashBankAccounts = (accounts ?? []).filter((account) =>
    ["cash", "bank"].includes(account.name?.toLowerCase()),
  );

  return (
    <Modal
      open={open}
      title="Créer"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      centered
    >
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ method: "cash", notes: "Payment for rent" }}>
        <Form.Item label="Bail" name="leaseId" rules={[{ required: true }]}>
          <Select {...modalSelectProps} options={leaseOptions} />
        </Form.Item>
        <div className="pm-form-grid">
          <Form.Item label="Date paiement" name="paymentDate" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item label="Montant" name="amount" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Méthode" name="method" initialValue="cash">
            <Select {...modalSelectProps} options={paymentMethods} />
          </Form.Item>
          <Form.Item label="Compte paiement" name="paymentAccountId">
            <Select
              allowClear
              placeholder="Par défaut: compte du type Rent Payment"
              {...modalSelectProps}
              options={cashBankAccounts.map((account) => ({
                label: account.name,
                value: account.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="Devise" name="currencyId">
            <CurrencyCombobox
              allowClear
              placeholder="Devise du bail ou par défaut"
              {...modalSelectProps}
              options={currencyOptions}
            />
          </Form.Item>
        </div>
        <Form.Item label="Référence" name="reference">
          <Input />
        </Form.Item>
        <Form.Item label="Notes" name="notes" initialValue="Payment for rent">
          <Input.TextArea rows={3} />
        </Form.Item>

        <div className="immo-modal-footer">
          <Button onClick={onCancel} className="immo-modal-cancel">Annuler</Button>
          <Button type="primary" htmlType="submit" className="immo-modal-submit" loading={saving}>
            Créer
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default PaymentFormModal;
