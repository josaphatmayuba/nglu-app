import {
  BankOutlined,
  CalendarOutlined,
  DollarOutlined,
  HomeOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal, Select, Table, Tabs, Tag } from "antd";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "../../UI/Card";
import "./PropertyManagement.css";
import { loadAllAccount } from "../../redux/rtk/features/account/accountSlice";
import {
  createRentPayment,
  deleteLease,
  deleteMaintenance,
  deleteProperty,
  deleteUnit,
  loadPropertyManagement,
  saveLease,
  saveMaintenance,
  saveProperty,
  saveUnit,
} from "../../redux/rtk/features/propertyManagement/propertyManagementSlice";
import UserPrivateComponent from "../PrivacyComponent/UserPrivateComponent";
import ContractsTab from "./ContractsTab";

const propertyTypes = [
  { label: "Immeuble", value: "building" },
  { label: "Maison", value: "house" },
  { label: "Villa", value: "villa" },
  { label: "Local commercial", value: "commercial" },
  { label: "Terrain", value: "land" },
];

const unitTypes = [
  { label: "Appartement", value: "apartment" },
  { label: "Studio", value: "studio" },
  { label: "Bureau", value: "office" },
  { label: "Magasin", value: "shop" },
  { label: "Maison entière", value: "house" },
];

const statusColor = {
  available: "green",
  vacant: "green",
  active: "green",
  occupied: "blue",
  reserved: "gold",
  draft: "default",
  open: "gold",
  in_progress: "blue",
  done: "green",
  ended: "red",
  cancelled: "red",
};

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const tenantName = (tenant) =>
  tenant?.username ||
  [tenant?.firstName, tenant?.lastName].filter(Boolean).join(" ") ||
  tenant?.email ||
  "-";

const toFormRecord = (type, record) => {
  if (!record) return {};

  const maps = {
    property: {
      name: record.name,
      code: record.code,
      propertyType: record.propertyType,
      status: record.status,
      defaultRent: record.defaultRent,
      address: record.address,
      description: record.description,
    },
    unit: {
      propertyId: record.propertyId,
      name: record.name,
      unitType: record.unitType,
      status: record.status,
      floor: record.floor,
      bedrooms: record.bedrooms,
      bathrooms: record.bathrooms,
      area: record.area,
      monthlyRent: record.monthlyRent,
      securityDeposit: record.securityDeposit,
    },
    lease: {
      propertyId: record.propertyId,
      unitId: record.unitId,
      tenantId: record.tenantId,
      status: record.status,
      billingCycle: record.billingCycle,
      rentAmount: record.rentAmount,
      securityDeposit: record.securityDeposit,
      moveInMeterReading: record.moveInMeterReading,
      terms: record.terms,
      startDate: record.startDate,
      endDate: record.endDate,
      nextInvoiceDate: record.nextInvoiceDate,
    },
    maintenance: {
      propertyId: record.propertyId,
      unitId: record.unitId,
      title: record.title,
      priority: record.priority,
      status: record.status,
      estimatedCost: record.estimatedCost,
      description: record.description,
      scheduledDate: record.scheduledDate,
    },
  };

  return maps[type] || record;
};

const Kpi = ({ icon, label, value, tone = "slate" }) => (
  <div className={`pm-kpi pm-kpi-${tone}`}>
    <div className="pm-kpi-icon">{icon}</div>
    <div>
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{value}</div>
    </div>
  </div>
);

const PropertyManagement = () => {
  const dispatch = useDispatch();
  const [modal, setModal] = useState(null);
  const [form] = Form.useForm();
  const {
    dashboard,
    properties,
    units,
    tenants,
    leases,
    payments,
    maintenance,
    loading,
  } = useSelector((state) => state.propertyManagement);
  const accounts = useSelector((state) => state.accounts?.list) || [];

  useEffect(() => {
    dispatch(loadPropertyManagement());
    dispatch(loadAllAccount());
  }, [dispatch]);

  const openModal = (type, record = null) => {
    setModal({ type, record });
    form.resetFields();
    if (record) {
      form.setFieldsValue(toFormRecord(type, record));
    }
  };

  const closeModal = () => {
    setModal(null);
    form.resetFields();
  };

  const submitModal = async (values) => {
    const id = modal?.record?.id;
    const type = modal?.type;
    const actions = {
      property: saveProperty,
      unit: saveUnit,
      lease: saveLease,
      maintenance: saveMaintenance,
    };

    let response;
    if (type === "payment") {
      response = await dispatch(createRentPayment(values));
    } else {
      response = await dispatch(actions[type]({ id, values }));
    }

    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
      closeModal();
    }
  };

  const deleteRecord = async (action, id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    const response = await dispatch(action(id));
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
    }
  };

  const safeProperties = useMemo(() => (properties ?? []).filter(Boolean), [properties]);
  const safeUnits = useMemo(() => (units ?? []).filter(Boolean), [units]);
  const safeTenants = useMemo(() => (tenants ?? []).filter(Boolean), [tenants]);
  const safeLeases = useMemo(() => (leases ?? []).filter(Boolean), [leases]);
  const safePayments = useMemo(() => (payments ?? []).filter(Boolean), [payments]);
  const safeMaintenance = useMemo(
    () => (maintenance ?? []).filter(Boolean),
    [maintenance],
  );

  const propertyOptions = safeProperties.map((property) => ({
    label: property.name,
    value: property.id,
  }));

  const unitOptions = safeUnits.map((unit) => ({
    label: `${unit.name} - ${unit.property?.name || ""}`,
    value: unit.id,
  }));

  const leaseOptions = safeLeases
    .filter((lease) => lease.status === "active")
    .map((lease) => ({
      label: `${lease.reference} - ${lease.unit?.name} - ${tenantName(lease.tenant)}`,
      value: lease.id,
    }));

  const cashBankAccounts = (accounts ?? []).filter((account) =>
    ["cash", "bank"].includes(account.name?.toLowerCase()),
  );

  const selectedUnit = Form.useWatch("unitId", form);

  useEffect(() => {
    if (modal?.type !== "lease" || !selectedUnit || modal?.record) return;
    const unit = safeUnits.find((item) => item.id === selectedUnit);
    if (unit) {
      form.setFieldsValue({
        propertyId: unit.propertyId,
        rentAmount: unit.monthlyRent,
        securityDeposit: unit.securityDeposit,
      });
    }
  }, [form, modal?.type, modal?.record, selectedUnit, safeUnits]);

  const availabilityRows = useMemo(
    () =>
      safeUnits.map((unit) => {
        const lease = safeLeases.find(
          (item) => item.unitId === unit.id && item.status === "active",
        );
        return { ...unit, currentLease: lease };
      }),
    [safeLeases, safeUnits],
  );

  const actionColumn = (editType, deleteAction) => ({
    title: "",
    key: "action",
    width: 170,
    render: (_, record) => (
      <div className="flex gap-2">
        <Button size="small" onClick={() => openModal(editType, record)}>
          Edit
        </Button>
        <Button
          size="small"
          danger
          onClick={() => deleteRecord(deleteAction, record.id)}
        >
          Delete
        </Button>
      </div>
    ),
  });

  const items = [
    {
      key: "overview",
      label: "Vue d'ensemble",
      children: (
        <div className="pm-panel">
          <div className="pm-kpi-grid">
            <Kpi icon={<HomeOutlined />} label="Biens" value={dashboard?.properties || 0} />
            <Kpi icon={<BankOutlined />} label="Unités" value={dashboard?.units || 0} tone="green" />
            <Kpi icon={<CalendarOutlined />} label="Baux actifs" value={dashboard?.activeLeases || 0} tone="amber" />
            <Kpi icon={<DollarOutlined />} label="Loyer mensuel" value={money(dashboard?.monthlyRent)} tone="blue" />
            <Kpi icon={<DollarOutlined />} label="Loyers encaissés" value={money(dashboard?.collectedRent)} tone="green" />
            <Kpi icon={<ToolOutlined />} label="Maintenance ouverte" value={dashboard?.openMaintenance || 0} tone="red" />
          </div>
          <div className="pm-section-title">Disponibilités</div>
          <Table
            size="small"
            loading={loading}
            rowKey="id"
            dataSource={availabilityRows}
            pagination={false}
            columns={[
              { title: "Unité", dataIndex: "name" },
              { title: "Bien", render: (_, record) => record.property?.name || "-" },
              { title: "Type", dataIndex: "unitType" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              {
                title: "Contrat actif",
                render: (_, record) => record.currentLease?.reference || "-",
              },
              {
                title: "Loyer",
                dataIndex: "monthlyRent",
                render: money,
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "properties",
      label: "Biens",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("property")}>
            Nouveau bien
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeProperties}
            loading={loading}
            columns={[
              { title: "Nom", dataIndex: "name" },
              { title: "Code", dataIndex: "code" },
              { title: "Type", dataIndex: "propertyType" },
              { title: "Adresse", dataIndex: "address" },
              { title: "Unités", render: (_, record) => record.units?.length || 0 },
              { title: "Loyer défaut", dataIndex: "defaultRent", render: money },
              actionColumn("property", deleteProperty),
            ]}
          />
        </div>
      ),
    },
    {
      key: "units",
      label: "Unités",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("unit")}>
            Nouvelle unité
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeUnits}
            loading={loading}
            columns={[
              { title: "Unité", dataIndex: "name" },
              { title: "Bien", render: (_, record) => record.property?.name || "-" },
              { title: "Type", dataIndex: "unitType" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              { title: "Chambres", dataIndex: "bedrooms" },
              { title: "Loyer", dataIndex: "monthlyRent", render: money },
              actionColumn("unit", deleteUnit),
            ]}
          />
        </div>
      ),
    },
    {
      key: "tenants",
      label: "Locataires",
      children: (
        <div className="pm-panel">
          <Table
            size="small"
            rowKey="id"
            dataSource={safeTenants}
            loading={loading}
            columns={[
              { title: "Nom", render: (_, record) => tenantName(record) },
              { title: "Email", dataIndex: "email" },
              { title: "Téléphone", dataIndex: "phone" },
              { title: "Adresse", dataIndex: "address" },
              {
                title: "Baux",
                render: (_, record) =>
                  safeLeases.filter((lease) => lease.tenantId === record.id).length,
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: "leases",
      label: "Baux & contrats",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("lease")}>
            Nouveau bail
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeLeases}
            loading={loading}
            columns={[
              { title: "Référence", dataIndex: "reference" },
              { title: "Bien", render: (_, record) => record.property?.name || "-" },
              { title: "Unité", render: (_, record) => record.unit?.name || "-" },
              { title: "Locataire", render: (_, record) => tenantName(record.tenant) },
              { title: "Début", dataIndex: "startDate", render: (date) => moment(date).format("YYYY-MM-DD") },
              { title: "Fin", dataIndex: "endDate", render: (date) => (date ? moment(date).format("YYYY-MM-DD") : "-") },
              { title: "Loyer", dataIndex: "rentAmount", render: money },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              actionColumn("lease", deleteLease),
            ]}
          />
        </div>
      ),
    },
    {
      key: "payments",
      label: "Paiements loyer",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("payment")}>
            Enregistrer paiement
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safePayments}
            loading={loading}
            columns={[
              { title: "Date", dataIndex: "paymentDate", render: (date) => moment(date).format("YYYY-MM-DD") },
              { title: "Bail", render: (_, record) => record.lease?.reference || "-" },
              { title: "Locataire", render: (_, record) => tenantName(record.lease?.tenant) },
              { title: "Unité", render: (_, record) => record.lease?.unit?.name || "-" },
              { title: "Montant", dataIndex: "amount", render: money },
              { title: "Débit", render: (_, record) => record.transaction?.debit?.name || "-" },
              { title: "Crédit", render: (_, record) => record.transaction?.credit?.name || "-" },
            ]}
          />
        </div>
      ),
    },
    {
      key: "maintenance",
      label: "Maintenance",
      children: (
        <div className="pm-panel">
          <Button type="primary" onClick={() => openModal("maintenance")}>
            Nouvelle tâche
          </Button>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeMaintenance}
            loading={loading}
            columns={[
              { title: "Titre", dataIndex: "title" },
              { title: "Bien", render: (_, record) => record.property?.name || "-" },
              { title: "Unité", render: (_, record) => record.unit?.name || "-" },
              { title: "Priorité", dataIndex: "priority" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => <Tag color={statusColor[status]}>{status}</Tag>,
              },
              { title: "Coût estimé", dataIndex: "estimatedCost", render: money },
              actionColumn("maintenance", deleteMaintenance),
            ]}
          />
        </div>
      ),
    },
    {
      key: "contracts",
      label: "Contrats",
      children: (
        <div className="pm-panel">
          <ContractsTab leases={safeLeases} />
        </div>
      ),
    },
  ];

  return (
    <Card title="Gestion immobilière" className="property-management-page">
      <div className="pm-hero">
        <div>
          <div className="pm-eyebrow">Portefeuille immobilier</div>
          <h2>Biens, disponibilités, baux et loyers dans une seule vue</h2>
          <p>
            Inspiré du flux Odoo: propriétés, contrats de location, facturation
            récurrente, paiements et maintenance.
          </p>
        </div>
        <Button type="primary" onClick={() => openModal("lease")}>
          Créer un bail
        </Button>
      </div>

      <UserPrivateComponent permission={"readAll-propertyManagement"}>
        <Tabs defaultActiveKey="overview" items={items} />
      </UserPrivateComponent>

      <Modal
        open={Boolean(modal)}
        title={modal?.record ? "Modifier" : "Créer"}
        onCancel={closeModal}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitModal}>
          {modal?.type === "property" && (
            <>
              <Form.Item label="Nom" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Code" name="code">
                  <Input />
                </Form.Item>
                <Form.Item label="Type de bien" name="propertyType" initialValue="building">
                  <Select options={propertyTypes} />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="available">
                  <Select options={[
                    { label: "Disponible", value: "available" },
                    { label: "Occupé", value: "occupied" },
                    { label: "Maintenance", value: "maintenance" },
                  ]} />
                </Form.Item>
                <Form.Item label="Loyer par défaut" name="defaultRent">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <Form.Item label="Adresse" name="address">
                <Input />
              </Form.Item>
              <Form.Item label="Description" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}

          {modal?.type === "unit" && (
            <>
              <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                <Select options={propertyOptions} />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Nom unité" name="name" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item label="Type unité" name="unitType" initialValue="apartment">
                  <Select options={unitTypes} />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="vacant">
                  <Select options={[
                    { label: "Vacant", value: "vacant" },
                    { label: "Occupé", value: "occupied" },
                    { label: "Réservé", value: "reserved" },
                    { label: "Maintenance", value: "maintenance" },
                  ]} />
                </Form.Item>
                <Form.Item label="Étage" name="floor">
                  <Input />
                </Form.Item>
                <Form.Item label="Chambres" name="bedrooms">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Salles de bain" name="bathrooms">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Surface" name="area">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Loyer mensuel" name="monthlyRent">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>
              <Form.Item label="Dépôt de garantie" name="securityDeposit">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </>
          )}

          {modal?.type === "lease" && (
            <>
              <div className="pm-form-grid">
                <Form.Item label="Unité" name="unitId" rules={[{ required: true }]}>
                  <Select options={unitOptions} />
                </Form.Item>
                <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                  <Select options={propertyOptions} />
                </Form.Item>
                <Form.Item label="Locataire" name="tenantId" rules={[{ required: true }]}>
                  <Select
                    options={safeTenants.map((customer) => ({
                      label: tenantName(customer),
                      value: customer.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="active">
                  <Select options={[
                    { label: "Brouillon", value: "draft" },
                    { label: "Actif", value: "active" },
                    { label: "Terminé", value: "ended" },
                    { label: "Annulé", value: "cancelled" },
                  ]} />
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
                  <Select options={[
                    { label: "Mensuel", value: "monthly" },
                    { label: "Trimestriel", value: "quarterly" },
                    { label: "Annuel", value: "yearly" },
                  ]} />
                </Form.Item>
                <Form.Item label="Loyer" name="rentAmount" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
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
            </>
          )}

          {modal?.type === "payment" && (
            <>
              <Form.Item label="Bail" name="leaseId" rules={[{ required: true }]}>
                <Select options={leaseOptions} />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Date paiement" name="paymentDate" rules={[{ required: true }]}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Montant" name="amount" rules={[{ required: true }]}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Méthode" name="method" initialValue="cash">
                  <Select options={[
                    { label: "Cash", value: "cash" },
                    { label: "Bank", value: "bank" },
                    { label: "Mobile money", value: "mobile_money" },
                    { label: "Cheque", value: "cheque" },
                  ]} />
                </Form.Item>
                <Form.Item label="Compte paiement" name="paymentAccountId">
                  <Select
                    placeholder="Par défaut: compte du type Rent Payment"
                    allowClear
                    options={cashBankAccounts.map((account) => ({
                      label: account.name,
                      value: account.id,
                    }))}
                  />
                </Form.Item>
              </div>
              <Form.Item label="Référence" name="reference">
                <Input />
              </Form.Item>
              <Form.Item label="Notes" name="notes" initialValue="Payment for rent">
                <Input.TextArea rows={3} />
              </Form.Item>
            </>
          )}

          {modal?.type === "maintenance" && (
            <>
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
                  <Select options={[
                    { label: "Basse", value: "low" },
                    { label: "Moyenne", value: "medium" },
                    { label: "Haute", value: "high" },
                    { label: "Urgente", value: "urgent" },
                  ]} />
                </Form.Item>
                <Form.Item label="Statut" name="status" initialValue="open">
                  <Select options={[
                    { label: "Ouvert", value: "open" },
                    { label: "En cours", value: "in_progress" },
                    { label: "Terminé", value: "done" },
                  ]} />
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
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={closeModal}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default PropertyManagement;
