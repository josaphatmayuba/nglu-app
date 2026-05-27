import { useState } from 'react';
import { Button, Card, Divider, Form, Input, Space } from 'antd';
import { Send, X } from 'lucide-react';
import './compose-message.css';

export default function ComposeMessage({ onSend, onCancel, accounts = [], initialValues, title = 'Composer un nouveau message' }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await onSend({
        fromEmail: values.fromEmail,
        toEmail: values.toEmail,
        subject: values.subject,
        body: values.body,
        htmlBody: values.body,
        sendNow: true,
      });
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="compose-message-card">
      <div className="compose-message-header">
        <h3>{title}</h3>
        <Button
          type="text"
          icon={<X size={18} />}
          onClick={onCancel}
        />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark={false}
        initialValues={{
          fromEmail: accounts[0]?.email,
          ...initialValues,
        }}
      >
        {accounts.length > 0 && (
          <Form.Item
            label="Compte expediteur"
            name="fromEmail"
            rules={[{ required: true, message: "Le compte expediteur est requis" }]}
          >
            <Input readOnly />
          </Form.Item>
        )}

        <Form.Item
          label="Destinataire"
          name="toEmail"
          rules={[
            { required: true, message: 'Le destinataire est requis' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const invalid = String(value)
                  .split(/[;,]/)
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .some((item) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
                return invalid ? Promise.reject(new Error('Un destinataire est invalide')) : Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder="exemple@ongdngolu.org; equipe@ongdngolu.org"
          />
        </Form.Item>

        <Form.Item
          label="Objet"
          name="subject"
          rules={[
            { required: true, message: "L'objet est requis" },
          ]}
        >
          <Input placeholder="Objet du message" />
        </Form.Item>

        <Form.Item
          label="Message"
          name="body"
          rules={[
            { required: true, message: 'Le message ne peut pas être vide' },
          ]}
        >
          <Input.TextArea
            rows={8}
            placeholder="Votre message..."
            allowClear
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<Send size={16} />}
              htmlType="submit"
              loading={loading}
            >
              Envoyer
            </Button>
            <Button onClick={onCancel}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
