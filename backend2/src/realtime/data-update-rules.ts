export type DataUpdateEntity =
  | "property"
  | "unit"
  | "lease"
  | "contract"
  | "payment"
  | "maintenance"
  | "tenantOnboarding";

export type DataUpdateRule = {
  module: string;
  endpoints: string[];
  permissions: string[];
  tags: string[];
  pages: string[];
  dataLoaders: string[];
};

export const DATA_UPDATE_RULES: Record<DataUpdateEntity, DataUpdateRule> = {
  property: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/dashboard",
      "GET /property-management/properties",
      "GET /property-management/properties/:id",
      "POST /property-management/properties",
      "PUT/PATCH/POST /property-management/properties/:id",
      "DELETE /property-management/properties/:id",
    ],
    permissions: [
      "readAll-propertyManagement",
      "readSingle-propertyManagement",
      "create-propertyManagement",
      "update-propertyManagement",
      "delete-propertyManagement",
    ],
    tags: ["propertyManagement", "properties", "units", "dashboard"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=properties",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Properties/PropertiesPanel.jsx",
    ],
  },
  unit: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/dashboard",
      "GET /property-management/units",
      "GET /property-management/units/:id",
      "POST /property-management/units",
      "PUT/PATCH/POST /property-management/units/:id",
      "DELETE /property-management/units/:id",
    ],
    permissions: [
      "readAll-propertyManagement",
      "readSingle-propertyManagement",
      "create-propertyManagement",
      "update-propertyManagement",
      "delete-propertyManagement",
    ],
    tags: ["propertyManagement", "properties", "units", "leases", "dashboard"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=properties",
      "/admin/property-management?section=leases",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Properties/UnitFormModal.jsx",
    ],
  },
  lease: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/dashboard",
      "GET /property-management/leases",
      "GET /property-management/leases/:id",
      "POST /property-management/leases",
      "PUT /property-management/leases/:id",
      "DELETE /property-management/leases/:id",
      "POST /property-management/leases/:id/renew",
    ],
    permissions: [
      "readAll-propertyManagement",
      "readSingle-propertyManagement",
      "create-propertyManagement",
      "update-propertyManagement",
      "delete-propertyManagement",
    ],
    tags: ["propertyManagement", "leases", "payments", "maintenance", "dashboard"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=leases",
      "/admin/property-management?section=payments",
      "/admin/property-management?section=maintenance",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Leases/LeasesPanel.jsx",
      "frontend/src/components/propertyManagement/modules/Leases/ContractWorkflowModal.jsx",
    ],
  },
  contract: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/contracts",
      "GET /property-management/contracts/:id",
      "POST /property-management/contracts",
      "POST /property-management/contracts/:id/send",
      "DELETE /property-management/contracts/:id",
      "GET /property-management/contracts/sign/:token",
      "POST /property-management/contracts/sign/:token",
      "POST /property-management/leases/:id/renew",
    ],
    permissions: [
      "readAll-propertyManagement",
      "readSingle-propertyManagement",
      "create-propertyManagement",
      "update-propertyManagement",
      "delete-propertyManagement",
    ],
    tags: ["propertyManagement", "contracts", "leases", "dashboard"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=leases",
    ],
    dataLoaders: [
      "frontend/src/redux/rtk/features/propertyManagement/propertyManagementSlice.js",
      "frontend/src/components/propertyManagement/ContractsTab.jsx",
      "frontend/src/components/propertyManagement/modules/Leases/ContractWorkflowModal.jsx",
    ],
  },
  payment: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/dashboard",
      "GET /property-management/payments",
      "GET /property-management/payments/:id",
      "POST /property-management/payments",
      "GET /manual-payment",
      "POST /manual-payment",
    ],
    permissions: [
      "readAll-propertyManagement",
      "readSingle-propertyManagement",
      "create-propertyManagement",
      "readAll-manualPayment",
      "create-manualPayment",
      "readAll-account",
    ],
    tags: ["propertyManagement", "payments", "leases", "dashboard", "accounts"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=payments",
      "/admin/manual-payment",
      "/admin/account",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Payments/PaymentsPanel.jsx",
      "frontend/src/redux/rtk/features/manualPayment/manualPaymentSlice.js",
    ],
  },
  maintenance: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/dashboard",
      "GET /property-management/maintenance",
      "GET /property-management/maintenance/:id",
      "POST /property-management/maintenance",
      "PUT/PATCH/POST /property-management/maintenance/:id",
      "DELETE /property-management/maintenance/:id",
      "GET /property-management/maintenance/:id/costs",
      "POST /property-management/maintenance/:id/costs",
    ],
    permissions: [
      "readAll-maintenance",
      "readSingle-maintenance",
      "create-maintenance",
      "update-maintenance",
      "delete-maintenance",
      "readAll-maintenance-cost",
      "create-maintenance-cost",
    ],
    tags: ["propertyManagement", "maintenance", "properties", "units", "dashboard"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=maintenance",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Maintenance/MaintenancePanel.jsx",
    ],
  },
  tenantOnboarding: {
    module: "propertyManagement",
    endpoints: [
      "GET /property-management/onboarding",
      "POST /property-management/onboarding",
      "PUT/PATCH /property-management/onboarding/:id",
      "POST /property-management/onboarding/:id/validate",
      "DELETE /property-management/onboarding/:id",
      "POST /tenant-onboarding/save",
      "POST /tenant-onboarding/submit",
    ],
    permissions: [
      "readAll-propertyManagement",
      "create-propertyManagement",
      "update-propertyManagement",
      "delete-propertyManagement",
    ],
    tags: ["propertyManagement", "tenants", "onboarding"],
    pages: [
      "/admin/property-management",
      "/admin/property-management?section=tenants",
    ],
    dataLoaders: [
      "frontend/src/components/propertyManagement/usePropertyManagementData.js",
      "frontend/src/components/propertyManagement/modules/Tenants/TenantsPanel.jsx",
    ],
  },
};

export const DATA_UPDATE_TAGS = Array.from(
  new Set(Object.values(DATA_UPDATE_RULES).flatMap((rule) => rule.tags)),
).sort();
