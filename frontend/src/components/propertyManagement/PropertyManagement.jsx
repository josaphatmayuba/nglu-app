import {
  AppstoreOutlined,
  BankOutlined,
  CalendarOutlined,
  CopyOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  PlusOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, InputNumber, Modal, Select, Table, Tag } from "antd";
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
  generateTenantOnboarding,
  loadPropertyManagement,
  saveLease,
  saveMaintenance,
  saveProperty,
  saveTenant,
  saveTenantOnboardingAdmin,
  saveUnit,
  validateTenantOnboarding,
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

const maritalStatuses = [
  { label: "Célibataire", value: "célibataire" },
  { label: "Marié", value: "marié" },
  { label: "Conjoint de fait", value: "conjoint de fait" },
  { label: "Divorcé", value: "divorcé" },
  { label: "Veuf", value: "veuf" },
];

const coupleStatuses = ["marié", "marie", "conjoint de fait", "union libre"];

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

const onboardingStatus = {
  sent: { label: "Lien envoyé", color: "blue" },
  draft: { label: "Brouillon en cours", color: "gold" },
  submitted: { label: "Soumis", color: "green" },
  validated: { label: "Validé", color: "purple" },
  expired: { label: "Expiré", color: "red" },
};

const paymentMethodLabels = {
  cash: "Cash",
  bank: "Bank",
  mobile_money: "Mobile money",
  cheque: "Cheque",
};

const parseOnboardingData = (record) => {
  if (!record?.data) return {};
  try {
    return JSON.parse(record.data);
  } catch {
    return {};
  }
};

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
    onboardingEdit: parseOnboardingData(record),
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
  const [activeSection, setActiveSection] = useState("overview");
  const [form] = Form.useForm();
  const {
    dashboard,
    properties,
    units,
    tenants,
    onboarding,
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
      onboardingEdit: saveTenantOnboardingAdmin,
    };

    let response;
    if (type === "payment") {
      response = await dispatch(createRentPayment(values));
    } else if (type === "onboardingGenerate") {
      response = await dispatch(generateTenantOnboarding(values));
    } else if (type === "tenant") {
      const normalizedChildNumber = Number(values.child_number || 0);
      response = await dispatch(
        saveTenant({
          ...values,
          child_number: normalizedChildNumber,
          child_age:
            normalizedChildNumber > 0
              ? (values.child_age || []).slice(0, normalizedChildNumber)
              : [],
        }),
      );
    } else if (type === "onboardingEdit") {
      response = await dispatch(saveTenantOnboardingAdmin({ id, values }));
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

  const validateOnboardingRecord = async (id) => {
    const response = await dispatch(validateTenantOnboarding(id));
    if (response.payload?.message === "success") {
      dispatch(loadPropertyManagement());
    }
  };

  const copyText = (value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
  };

  const safeProperties = useMemo(() => (properties ?? []).filter(Boolean), [properties]);
  const safeUnits = useMemo(() => (units ?? []).filter(Boolean), [units]);
  const safeTenants = useMemo(() => (tenants ?? []).filter(Boolean), [tenants]);
  const safeOnboarding = useMemo(() => (onboarding ?? []).filter(Boolean), [onboarding]);
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
    label: `${unit.name} - ${unit.propertyAddress || unit.propertyName || ""}`,
    value: unit.id,
  }));

  const selectedProperty = Form.useWatch("propertyId", form);
  const leaseUnitOptions = safeUnits
    .filter((unit) => !selectedProperty || unit.propertyId === selectedProperty)
    .map((unit) => ({
      label: unit.name,
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
  const maritalStatus = Form.useWatch("marital_status", form);
  const childNumber = Number(Form.useWatch("child_number", form) || 0);
  const isCouple = coupleStatuses.includes(String(maritalStatus || "").toLowerCase());
  const tenantRequiredRules = modal?.type === "tenant" ? [{ required: true }] : [];
  const modalTitleByType = {
    tenant: "Nouveau Locataire",
    onboardingGenerate: "Générer un lien d'inscription",
    onboardingEdit: "Dossier locataire en ligne",
  };
  const modalTitle = modalTitleByType[modal?.type] || (modal?.record ? "Modifier" : "Créer");

  useEffect(() => {
    if (modal?.type !== "lease" || !selectedUnit || modal?.record) return;
    const unit = safeUnits.find((item) => item.id === selectedUnit);
    if (unit) {
      form.setFieldsValue({
        rentAmount: unit.monthlyRent,
        securityDeposit: unit.securityDeposit,
      });
    }
  }, [form, modal?.type, modal?.record, selectedUnit, safeUnits]);

  const handleLeasePropertyChange = (propertyId) => {
    const currentUnitId = form.getFieldValue("unitId");
    const currentUnit = safeUnits.find((unit) => unit.id === currentUnitId);
    if (!currentUnit || currentUnit.propertyId !== propertyId) {
      form.setFieldsValue({
        unitId: undefined,
        rentAmount: undefined,
        securityDeposit: undefined,
      });
    }
  };

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
              { title: "Bien", render: (_, record) => record.propertyAddress || "-" },
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
              { title: "Unités", render: (_, record) => Number(record.unitsCount || 0) },
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
              { title: "Bien", render: (_, record) => record.propertyAddress || "-" },
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
          <div className="pm-actions-row">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal("tenant")}>
              Nouveau Locataire
            </Button>
            <Button onClick={() => openModal("onboardingGenerate")}>
              Générer un lien d'inscription
            </Button>
          </div>
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
          <div className="pm-section-title">Liens d'inscription</div>
          <Table
            size="small"
            rowKey="id"
            dataSource={safeOnboarding}
            loading={loading}
            columns={[
              { title: "Téléphone", dataIndex: "phone" },
              {
                title: "Statut",
                dataIndex: "status",
                render: (status) => (
                  <Tag color={onboardingStatus[status]?.color || "default"}>
                    {onboardingStatus[status]?.label || status}
                  </Tag>
                ),
              },
              {
                title: "Nom saisi",
                render: (_, record) => {
                  const data = parseOnboardingData(record);
                  return [data.firstName, data.lastName].filter(Boolean).join(" ") || "-";
                },
              },
              {
                title: "Expire le",
                dataIndex: "expiresAt",
                render: (date) => (date ? moment(date).format("YYYY-MM-DD HH:mm") : "-"),
              },
              {
                title: "Actions",
                width: 330,
                render: (_, record) => (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="small" onClick={() => openModal("onboardingEdit", record)}>
                      Ouvrir
                    </Button>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      disabled={!record.url}
                      onClick={() => copyText(record.url)}
                    >
                      Lien
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      disabled={!["submitted", "draft"].includes(record.status)}
                      onClick={() => validateOnboardingRecord(record.id)}
                    >
                      Valider
                    </Button>
                  </div>
                ),
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
              { title: "Bien", render: (_, record) => record.propertyAddress || record.propertyName || "-" },
              { title: "Unité", render: (_, record) => record.unitName || "-" },
              {
                title: "Locataire",
                render: (_, record) =>
                  [record.tenantFirstName, record.tenantLastName].filter(Boolean).join(" ") || "-",
              },
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
              { title: "Bail", render: (_, record) => record.leaseReference || "-" },
              {
                title: "Locataire",
                render: (_, record) =>
                  [record.tenantFirstName, record.tenantLastName].filter(Boolean).join(" ") || "-",
              },
              { title: "Unité", render: (_, record) => record.unitName || "-" },
              { title: "Montant", dataIndex: "amount", render: money },
              {
                title: "Mode de paiement",
                render: (_, record) => paymentMethodLabels[record.method] || record.method || "-",
              },
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
        <div className="pm-layout">
          <aside className="pm-sidebar">
            {[
              { key: "overview",     label: "Vue d'ensemble",   icon: <AppstoreOutlined /> },
              { key: "properties",   label: "Biens",             icon: <HomeOutlined /> },
              { key: "units",        label: "Unités",            icon: <BankOutlined /> },
              { key: "tenants",      label: "Locataires",        icon: <TeamOutlined /> },
              { key: "leases",       label: "Baux & contrats",   icon: <FileTextOutlined /> },
              { key: "payments",     label: "Paiements loyer",   icon: <DollarOutlined /> },
              { key: "maintenance",  label: "Maintenance",       icon: <ToolOutlined /> },
              { key: "contracts",    label: "Contrats",          icon: <FileDoneOutlined /> },
            ].map((nav) => (
              <button
                key={nav.key}
                className={`pm-nav-item${activeSection === nav.key ? " active" : ""}`}
                onClick={() => setActiveSection(nav.key)}
              >
                <span className="pm-nav-icon">{nav.icon}</span>
                <span className="pm-nav-label">{nav.label}</span>
              </button>
            ))}
          </aside>
          <div className="pm-content">
            {items.find((item) => item.key === activeSection)?.children}
          </div>
        </div>
      </UserPrivateComponent>

      <Modal
        open={Boolean(modal)}
        title={modalTitle}
        onCancel={closeModal}
        footer={null}
        width={["tenant", "onboardingEdit"].includes(modal?.type) ? 920 : 720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitModal}>
          {modal?.type === "onboardingGenerate" && (
            <>
              <Form.Item label="Téléphone du futur locataire" name="phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="Validité du lien (jours)" name="expiresInDays" initialValue={7}>
                <InputNumber className="w-full" min={1} max={30} />
              </Form.Item>
            </>
          )}

          {modal?.type === "property" && (
            <>
              <Form.Item label="Nom" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <div className="pm-form-grid">
                <Form.Item label="Code" name="code">
                  <Input disabled placeholder="Généré automatiquement" />
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
                <Form.Item label="Bien" name="propertyId" rules={[{ required: true }]}>
                  <Select options={propertyOptions} onChange={handleLeasePropertyChange} />
                </Form.Item>
                <Form.Item label="Unité" name="unitId" rules={[{ required: true }]}>
                  <Select options={leaseUnitOptions} disabled={!selectedProperty} />
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

          {["tenant", "onboardingEdit"].includes(modal?.type) && (
            <>
              <div className="pm-section-title">Identité</div>
              <div className="pm-form-grid">
                <Form.Item label="Prénom" name="firstName" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nom" name="lastName" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Email" name="email">
                  <Input type="email" />
                </Form.Item>
                <Form.Item label="Téléphone" name="phone" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>
              <Form.Item label="Adresse actuelle" name="address" rules={tenantRequiredRules}>
                <Input />
              </Form.Item>

              <div className="pm-section-title">Profil Personnel & Civil</div>
              <div className="pm-form-grid">
                <Form.Item label="Date de naissance" name="birth_date" rules={tenantRequiredRules}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Sexe" name="sex" rules={tenantRequiredRules}>
                  <Select options={[{ label: "M", value: "M" }, { label: "F", value: "F" }]} />
                </Form.Item>
                <Form.Item label="Nationalité" name="nationality" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="État civil" name="marital_status" rules={tenantRequiredRules}>
                  <Select options={maritalStatuses} />
                </Form.Item>
                <Form.Item label="Province d'origine" name="origin_province" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>

              {isCouple && (
                <div className="pm-form-grid">
                  <Form.Item label="Nom du partenaire" name="partenair_name" rules={tenantRequiredRules}>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Téléphone du partenaire" name="partenair_number" rules={tenantRequiredRules}>
                    <Input />
                  </Form.Item>
                </div>
              )}

              <div className="pm-section-title">Contact d'Urgence</div>
              <div className="pm-form-grid">
                <Form.Item label="Téléphone secondaire" name="phone2">
                  <Input />
                </Form.Item>
                <Form.Item label="Personne à contacter" name="contacted_person" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Téléphone personne à contacter" name="contacted_person_phone_number" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
              </div>

              <div className="pm-section-title">Situation Professionnelle & Revenus</div>
              <div className="pm-form-grid">
                <Form.Item label="Statut professionnel" name="prossional_status" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Activité principale" name="main_activity" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nom de l'entité" name="entity_name" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Adresse de l'entité" name="entity_address" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Date d'embauche" name="hiring_date" rules={tenantRequiredRules}>
                  <Input type="date" />
                </Form.Item>
                <Form.Item label="Type de contrat" name="contract_type" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Salaire mensuel" name="monthly_pay" rules={tenantRequiredRules}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
                <Form.Item label="Autres revenus mensuels" name="other_monthly_income">
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>

              <div className="pm-section-title">Historique & Ménage</div>
              <div className="pm-form-grid">
                <Form.Item label="Ancienne adresse" name="old_address" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Ancien bailleur" name="old_lessor" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Motif du déménagement" name="moving_reason" rules={tenantRequiredRules}>
                  <Input />
                </Form.Item>
                <Form.Item label="Nombre d'occupants" name="occupant_number" rules={tenantRequiredRules}>
                  <InputNumber className="w-full" min={1} />
                </Form.Item>
                <Form.Item label="Nombre d'enfants" name="child_number" initialValue={0}>
                  <InputNumber className="w-full" min={0} />
                </Form.Item>
              </div>

              {childNumber > 0 && (
                <div className="pm-form-grid">
                  {Array.from({ length: childNumber }).map((_, index) => (
                    <Form.Item
                      key={index}
                      label={`Âge enfant ${index + 1}`}
                      name={["child_age", index]}
                      rules={tenantRequiredRules}
                    >
                      <InputNumber className="w-full" min={0} />
                    </Form.Item>
                  ))}
                </div>
              )}
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
