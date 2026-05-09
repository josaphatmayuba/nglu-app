import { CheckCircleOutlined, CopyOutlined, MailOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Modal, Select, Table, Tag, Tooltip, message } from "antd";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createContract,
  deleteContract,
  loadContracts,
  sendContract,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";

const STATUS_COLOR = {
  draft: "default",
  sent: "orange",
  viewed: "blue",
  signed: "green",
  expired: "red",
};

const STATUS_LABEL = {
  draft: "Brouillon",
  sent: "Envoyé",
  viewed: "Consulté",
  signed: "Signé",
  expired: "Expiré",
};

export default function ContractsTab({ leases }) {
  const dispatch = useDispatch();
  const contracts = useSelector((s) => s.propertyManagement.contracts);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [sending, setSending] = useState(null);
  const [signingLinks, setSigningLinks] = useState({});

  useEffect(() => {
    dispatch(loadContracts());
  }, [dispatch]);

  const handleCreate = async (values) => {
    await dispatch(createContract({ leaseId: values.leaseId }));
    await dispatch(loadContracts());
    setModalOpen(false);
    form.resetFields();
  };

  const handleSend = async (id) => {
    setSending(id);
    const res = await dispatch(sendContract(id));
    if (res.payload?.data?.signingUrl) {
      setSigningLinks((prev) => ({ ...prev, [id]: res.payload.data.signingUrl }));
      message.success("Contrat envoyé au locataire");
    }
    await dispatch(loadContracts());
    setSending(null);
  };

  const copyLink = (id) => {
    const link = signingLinks[id];
    if (link) {
      navigator.clipboard.writeText(link);
      message.success("Lien copié");
    }
  };

  const handleDelete = async (id) => {
    await dispatch(deleteContract(id));
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "Locataire", dataIndex: "tenantName", key: "tenantName" },
    { title: "Courriel", dataIndex: "tenantEmail", key: "tenantEmail" },
    {
      title: "Statut",
      dataIndex: "status",
      key: "status",
      render: (s) => <Tag color={STATUS_COLOR[s] ?? "default"}>{STATUS_LABEL[s] ?? s}</Tag>,
    },
    {
      title: "Envoyé le",
      dataIndex: "sentAt",
      key: "sentAt",
      render: (v) => (v ? new Date(v).toLocaleDateString("fr-CA") : "—"),
    },
    {
      title: "Signé le",
      dataIndex: "signedAt",
      key: "signedAt",
      render: (v) =>
        v ? (
          <span style={{ color: "#52c41a" }}>
            <CheckCircleOutlined /> {new Date(v).toLocaleDateString("fr-CA")}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {record.status !== "signed" && record.status !== "expired" && (
            <Tooltip title="Envoyer pour signature">
              <Button
                size="small"
                icon={<MailOutlined />}
                loading={sending === record.id}
                onClick={() => handleSend(record.id)}
              >
                Envoyer
              </Button>
            </Tooltip>
          )}
          {signingLinks[record.id] && (
            <Tooltip title="Copier le lien de signature">
              <Button size="small" icon={<CopyOutlined />} onClick={() => copyLink(record.id)}>
                Lien
              </Button>
            </Tooltip>
          )}
          <Button
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            Supprimer
          </Button>
        </div>
      ),
    },
  ];

  const leaseOptions = (leases ?? []).map((l) => ({
    value: l.id,
    label: `#${l.id} — ${[l.tenantFirstName, l.tenantLastName].filter(Boolean).join(" ") || l.reference || "Bail"}`,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Contrats de bail</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Créer un contrat
        </Button>
      </div>

      <Table
        dataSource={contracts}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="Créer un contrat"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Créer"
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="leaseId"
            label="Bail associé"
            rules={[{ required: true, message: "Sélectionnez un bail" }]}
          >
            <Select
              options={leaseOptions}
              placeholder="Sélectionner un bail"
              showSearch
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <p style={{ color: "#888", fontSize: 13 }}>
            Le contenu du contrat sera généré automatiquement à partir des données du bail.
          </p>
        </Form>
      </Modal>
    </div>
  );
}
