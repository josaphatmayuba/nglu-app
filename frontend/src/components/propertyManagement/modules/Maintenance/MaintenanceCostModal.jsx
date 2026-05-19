import { Button, Form, Input, InputNumber, Modal, Select, message } from "antd";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { buildCurrencyOptions } from "../../shared/format";
import { modalSelectProps } from "../../shared/constants";

const COST_TYPES = [
  { label: "Frais de service / pièces", value: "service" },
  { label: "Main d'œuvre", value: "labour" },
];

const PAYMENT_METHODS = [
  { label: "Espèces", value: "cash" },
  { label: "Virement bancaire", value: "bank" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "Chèque", value: "cheque" },
];

const MaintenanceCostModal = ({ open, ticketId, ticketTitle, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [costs, setCosts] = useState([]);
  const [loadingCosts, setLoadingCosts] = useState(false);

  const currencies = useSelector((s) => s.currencies?.list ?? []);
  const currencyOptions = buildCurrencyOptions(currencies);

  const loadCosts = async () => {
    if (!ticketId) return;
    setLoadingCosts(true);
    try {
      const { data } = await axios.get(`property-management/maintenance/${ticketId}/costs`);
      setCosts(Array.isArray(data) ? data : []);
    } catch {
      setCosts([]);
    } finally {
      setLoadingCosts(false);
    }
  };

  useEffect(() => {
    if (open && ticketId) {
      loadCosts();
      form.resetFields();
    }
  }, [open, ticketId]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await axios.post(`property-management/maintenance/${ticketId}/costs`, values);
      message.success("Coût enregistré");
      form.resetFields();
      loadCosts();
      onSaved?.();
    } catch (e) {
      message.error(e?.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (costId) => {
    try {
      await axios.delete(`property-management/maintenance/costs/${costId}`);
      message.success("Supprimé");
      loadCosts();
      onSaved?.();
    } catch {
      message.error("Erreur lors de la suppression");
    }
  };

  const total = costs.reduce((acc, c) => {
    const key = c.currency_id ?? "default";
    acc[key] = (acc[key] || { amount: 0, currencyId: c.currency_id }) ;
    acc[key].amount += Number(c.amount || 0);
    return acc;
  }, {});

  return (
    <Modal
      open={open}
      title={`Frais de maintenance${ticketTitle ? ` — ${ticketTitle}` : ""}`}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={600}
    >
      {/* Existing costs */}
      {costs.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-ink-500 uppercase mb-2">Coûts enregistrés</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {costs.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-ink-50 rounded-lg px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-xs px-1.5 py-0.5 rounded mr-2 ${c.type === "labour" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {c.type === "labour" ? "Main d'œuvre" : "Service"}
                  </span>
                  <span className="text-ink-800">{c.description}</span>
                  {c.vendor_name && <span className="text-ink-400 ml-1">· {c.vendor_name}</span>}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="font-semibold tabular-nums">{Number(c.amount).toLocaleString()} {c.currency_id ? "" : ""}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add cost form */}
      <p className="text-xs font-semibold text-ink-500 uppercase mb-2">Ajouter un coût</p>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ type: "service", paymentMethod: "cash" }}
      >
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="Type" name="type" rules={[{ required: true }]}>
            <Select {...modalSelectProps} options={COST_TYPES} />
          </Form.Item>
          <Form.Item label="Méthode paiement" name="paymentMethod">
            <Select {...modalSelectProps} options={PAYMENT_METHODS} />
          </Form.Item>
        </div>
        <Form.Item label="Description" name="description" rules={[{ required: true }]}>
          <Input placeholder="Ex: Remplacement serrure, Installation électrique..." />
        </Form.Item>
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="Montant" name="amount" rules={[{ required: true }]}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item label="Devise" name="currencyId">
            <Select {...modalSelectProps} options={currencyOptions} allowClear placeholder="Devise par défaut" />
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item label="Fournisseur / Prestataire" name="vendorName">
            <Input placeholder="Nom du fournisseur" />
          </Form.Item>
          <Form.Item label="Date paiement" name="paymentDate">
            <Input type="date" />
          </Form.Item>
        </div>
        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={2} />
        </Form.Item>

        <div className="flex items-center justify-between">
          <Button onClick={onClose}>Annuler</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Enregistrer le coût
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default MaintenanceCostModal;
