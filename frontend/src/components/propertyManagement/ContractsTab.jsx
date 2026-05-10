import {
  CheckCircleOutlined,
  CopyOutlined,
  FilePdfOutlined,
  MailOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Form, Modal, Select, Table, Tag, Tooltip, message } from "antd";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatSignedAt = (value) => {
  if (!value) return "Non signé";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non signé";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )} h ${pad(date.getMinutes())} min ${pad(date.getSeconds())}`;
};

const contractPrintHtml = (contract) => {
  const company = contract?.companyInfo || {};
  const landlordName = contract?.landlordName || company.companyName || "Bailleur";
  const signedAt = formatSignedAt(contract?.signedAt);
  const tenantSignature = contract?.signatureData
    ? `<img class="signature-image" src="${contract.signatureData}" alt="Signature du locataire" />`
    : `<div class="signature-line">Signature non disponible</div>`;
  const landlordSignature = `<div class="typed-signature">${escapeHtml(landlordName)}</div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contrat de bail #${escapeHtml(contract?.id)}</title>
  <style>
    @page { margin: 18mm; }
    body { color: #111827; font-family: Arial, sans-serif; margin: 0; }
    .header { border-bottom: 2px solid #111827; margin-bottom: 24px; padding-bottom: 16px; }
    .eyebrow { color: #6b7280; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 26px; margin: 6px 0 8px; }
    .meta { color: #4b5563; font-size: 13px; line-height: 1.5; }
    .content { font-family: "Courier New", monospace; font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
    .company { color: #374151; font-size: 13px; line-height: 1.45; margin-top: 8px; }
    .signature { border-top: 1px solid #d1d5db; margin-top: 34px; padding-top: 18px; }
    .signature-grid { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; }
    .signature h2 { font-size: 16px; margin: 0 0 10px; }
    .signature-name { color: #374151; font-size: 13px; font-weight: 700; margin-top: 10px; }
    .signature-image { border: 1px solid #d1d5db; max-height: 120px; max-width: 320px; padding: 8px; }
    .signature-line { border-bottom: 1px solid #111827; color: #6b7280; display: inline-block; min-width: 280px; padding: 28px 0 8px; }
    .typed-signature { border: 1px solid #d1d5db; display: inline-block; font-family: "Brush Script MT", "Segoe Script", cursive; font-size: 30px; min-width: 240px; padding: 20px 18px 12px; }
    .signed-date { border-top: 1px solid #e5e7eb; color: #374151; font-size: 13px; margin-top: 22px; padding-top: 12px; }
    .print-actions { margin-bottom: 18px; }
    .print-actions button { background: #1677ff; border: 0; border-radius: 4px; color: white; cursor: pointer; padding: 8px 14px; }
    @media print { .print-actions { display: none; } .signature { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="print-actions"><button onclick="window.print()">Imprimer / Enregistrer PDF</button></div>
  <div class="header">
    <div class="eyebrow">Contrat de bail</div>
    <h1>Contrat #${escapeHtml(contract?.id)}</h1>
    <div class="meta">
      Locataire: ${escapeHtml(contract?.tenantName || "-")}<br />
      Courriel: ${escapeHtml(contract?.tenantEmail || "-")}<br />
      Statut: ${escapeHtml(STATUS_LABEL[contract?.status] || contract?.status || "-")}
      <div class="company">
        Bailleur: ${escapeHtml(company.companyName || "-")}<br />
        Adresse: ${escapeHtml(company.address || "-")}<br />
        Téléphone: ${escapeHtml(company.phone || "-")}<br />
        Email: ${escapeHtml(company.email || "-")}
      </div>
    </div>
  </div>
  <pre class="content">${escapeHtml(contract?.contractContent || "")}</pre>
  <div class="signature">
    <div class="signature-grid">
      <div>
        <h2>Signature du bailleur</h2>
        ${landlordSignature}
        <div class="signature-name">${escapeHtml(landlordName)}</div>
      </div>
      <div>
        <h2>Signature du locataire</h2>
        ${tenantSignature}
        <div class="signature-name">${escapeHtml(contract?.tenantName || "Locataire")}</div>
      </div>
    </div>
    <div class="signed-date">Signé le: ${escapeHtml(signedAt)}</div>
  </div>
</body>
</html>`;
};

export default function ContractsTab({ leases }) {
  const dispatch = useDispatch();
  const contracts = useSelector((s) => s.propertyManagement.contracts);
  const safeContracts = useMemo(() => (contracts ?? []).filter(Boolean), [contracts]);
  const safeLeases = useMemo(() => (leases ?? []).filter(Boolean), [leases]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [sending, setSending] = useState(null);
  const [signingLinks, setSigningLinks] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const openPreview = async (id) => {
    setPreviewLoading(true);
    try {
      const { data } = await axios.get(`property-management/contracts/${id}`);
      setPreviewContract(data);
      setPreviewOpen(true);
    } catch {
      message.error("Impossible d'ouvrir le contrat.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const printContract = () => {
    if (!previewContract) return;
    const win = window.open("", "_blank", "width=920,height=1100");
    if (!win) {
      message.error("Autorisez les popups pour ouvrir le PDF.");
      return;
    }
    win.document.open();
    win.document.write(contractPrintHtml(previewContract));
    win.document.close();
    win.focus();
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
          <Tooltip title="Ouvrir PDF / imprimer">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              loading={previewLoading}
              onClick={() => openPreview(record.id)}
            >
              PDF
            </Button>
          </Tooltip>
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

  const leaseOptions = safeLeases.map((l) => ({
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
        dataSource={safeContracts}
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

      <Modal
        title={`Contrat de bail #${previewContract?.id ?? ""}`}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={860}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>
            Fermer
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={printContract}>
            Imprimer / PDF
          </Button>,
        ]}
      >
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 18 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>
              Locataire
            </div>
            <strong>{previewContract?.tenantName || "-"}</strong>
            <div style={{ color: "#6b7280" }}>{previewContract?.tenantEmail || "-"}</div>
            <div style={{ color: "#6b7280", marginTop: 8 }}>
              <strong>Bailleur :</strong> {previewContract?.companyInfo?.companyName || "-"}<br />
              <strong>Adresse :</strong> {previewContract?.companyInfo?.address || "-"}<br />
              <strong>Téléphone :</strong> {previewContract?.companyInfo?.phone || "-"}<br />
              <strong>Email :</strong> {previewContract?.companyInfo?.email || "-"}
            </div>
          </div>
          <pre
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              maxHeight: 420,
              overflow: "auto",
              padding: 14,
              whiteSpace: "pre-wrap",
            }}
          >
            {previewContract?.contractContent}
          </pre>
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <strong>Signature du bailleur</strong>
                <div
                  style={{
                    border: "1px solid #d1d5db",
                    display: "inline-block",
                    fontFamily: '"Brush Script MT", "Segoe Script", cursive',
                    fontSize: 30,
                    marginTop: 10,
                    minWidth: 220,
                    padding: "18px 16px 10px",
                  }}
                >
                  {previewContract?.landlordName || previewContract?.companyInfo?.companyName || "Bailleur"}
                </div>
                <div style={{ color: "#374151", fontWeight: 600, marginTop: 8 }}>
                  {previewContract?.landlordName || previewContract?.companyInfo?.companyName || "Bailleur"}
                </div>
              </div>
              <div>
                <strong>Signature du locataire</strong>
                <div style={{ marginTop: 10 }}>
                  {previewContract?.signatureData ? (
                    <img
                      alt="Signature du locataire"
                      src={previewContract.signatureData}
                      style={{ border: "1px solid #d1d5db", maxHeight: 120, maxWidth: 320, padding: 8 }}
                    />
                  ) : (
                    <span style={{ color: "#6b7280" }}>Signature non disponible</span>
                  )}
                </div>
                <div style={{ color: "#374151", fontWeight: 600, marginTop: 8 }}>
                  {previewContract?.tenantName || "Locataire"}
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", color: "#6b7280", marginTop: 16, paddingTop: 10 }}>
              Signé le: {formatSignedAt(previewContract?.signedAt)}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
