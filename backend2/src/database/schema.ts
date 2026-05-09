import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  double,
  mysqlEnum,
  int,
  mysqlTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const subAccounts = mysqlTable("subAccount", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  accountId: bigint("accountId", { mode: "number" }).notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const accounts = mysqlTable("account", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const transactionTypes = mysqlTable("transaction_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  debitAccountId: bigint("debit_account_id", { mode: "number" }).notNull(),
  creditAccountId: bigint("credit_account_id", { mode: "number" }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const customers = mysqlTable("customer", {
  id: serial("id").primaryKey(),
  profileImage: varchar("profileImage", { length: 255 }),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  username: varchar("username", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  address: varchar("address", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  roleId: bigint("roleId", { mode: "number" }).default(3).notNull(),
  isLogin: varchar("isLogin", { length: 255 }).default("false").notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const paymentMethods = mysqlTable("paymentMethod", {
  id: serial("id").primaryKey(),
  subAccountId: bigint("subAccountId", { mode: "number" }).notNull(),
  methodName: varchar("methodName", { length: 255 }).notNull(),
  logo: varchar("logo", { length: 255 }),
  ownerAccount: varchar("ownerAccount", { length: 255 }),
  instruction: text("instruction"),
  isActive: varchar("isActive", { length: 255 }).default("true").notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const suppliers = mysqlTable("supplier", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const currencies = mysqlTable("currency", {
  id: serial("id").primaryKey(),
  currencyName: varchar("currencyName", { length: 255 }).notNull(),
  currencySymbol: varchar("currencySymbol", { length: 255 }).notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const discounts = mysqlTable("discount", {
  id: serial("id").primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["percentage", "flat", "flashSale"]).notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const transactions = mysqlTable("transaction", {
  id: serial("id").primaryKey(),
  date: datetime("date").notNull(),
  debitId: bigint("debitId", { mode: "number" }).notNull(),
  creditId: bigint("creditId", { mode: "number" }).notNull(),
  particulars: varchar("particulars", { length: 255 }).notNull(),
  amount: double("amount").notNull(),
  type: varchar("type", { length: 255 }),
  relatedId: varchar("relatedId", { length: 255 }),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateProperties = mysqlTable("real_estate_properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 255 }),
  propertyType: varchar("property_type", { length: 255 }).default("building").notNull(),
  status: varchar("status", { length: 255 }).default("available").notNull(),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 255 }),
  country: varchar("country", { length: 255 }),
  floors: int("floors").default(1).notNull(),
  parkingSpaces: int("parking_spaces").default(0).notNull(),
  marketValue: decimal("market_value", { precision: 15, scale: 2 }).default("0").notNull(),
  defaultRent: decimal("default_rent", { precision: 15, scale: 2 }).default("0").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateUnits = mysqlTable("real_estate_units", {
  id: serial("id").primaryKey(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  unitType: varchar("unit_type", { length: 255 }).default("apartment").notNull(),
  status: varchar("status", { length: 255 }).default("vacant").notNull(),
  floor: varchar("floor", { length: 255 }),
  bedrooms: int("bedrooms").default(0).notNull(),
  bathrooms: int("bathrooms").default(0).notNull(),
  area: decimal("area", { precision: 12, scale: 2 }).default("0").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 15, scale: 2 }).default("0").notNull(),
  securityDeposit: decimal("security_deposit", { precision: 15, scale: 2 }).default("0").notNull(),
  amenities: text("amenities"),
  description: text("description"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateLeases = mysqlTable("real_estate_leases", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 255 }).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  unitId: bigint("unit_id", { mode: "number" }).notNull(),
  tenantId: bigint("tenant_id", { mode: "number" }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  nextInvoiceDate: date("next_invoice_date"),
  billingCycle: varchar("billing_cycle", { length: 255 }).default("monthly").notNull(),
  rentAmount: decimal("rent_amount", { precision: 15, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 15, scale: 2 }).default("0").notNull(),
  moveInMeterReading: decimal("move_in_meter_reading", { precision: 12, scale: 2 }),
  moveInNotes: text("move_in_notes"),
  terms: text("terms"),
  status: varchar("status", { length: 255 }).default("draft").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateRentPayments = mysqlTable("real_estate_rent_payments", {
  id: serial("id").primaryKey(),
  leaseId: bigint("lease_id", { mode: "number" }).notNull(),
  transactionId: bigint("transaction_id", { mode: "number" }),
  paymentDate: date("payment_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  method: varchar("method", { length: 255 }).default("cash").notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateMaintenanceRequests = mysqlTable("real_estate_maintenance_requests", {
  id: serial("id").primaryKey(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  unitId: bigint("unit_id", { mode: "number" }),
  title: varchar("title", { length: 255 }).notNull(),
  priority: varchar("priority", { length: 255 }).default("medium").notNull(),
  status: varchar("status", { length: 255 }).default("open").notNull(),
  scheduledDate: date("scheduled_date"),
  estimatedCost: decimal("estimated_cost", { precision: 15, scale: 2 }).default("0").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateContracts = mysqlTable("real_estate_contracts", {
  id: serial("id").primaryKey(),
  leaseId: bigint("lease_id", { mode: "number" }).notNull(),
  status: varchar("status", { length: 50 }).default("draft").notNull(),
  contractContent: text("contract_content"),
  signatureData: text("signature_data"),
  signerToken: varchar("signer_token", { length: 255 }),
  signerTokenExpiry: timestamp("signer_token_expiry"),
  signedAt: timestamp("signed_at"),
  signerIp: varchar("signer_ip", { length: 100 }),
  signerUserAgent: varchar("signer_user_agent", { length: 500 }),
  sentAt: timestamp("sent_at"),
  tenantEmail: varchar("tenant_email", { length: 255 }),
  tenantName: varchar("tenant_name", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateContractAuditLogs = mysqlTable("real_estate_contract_audit_logs", {
  id: serial("id").primaryKey(),
  contractId: bigint("contract_id", { mode: "number" }).notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  ip: varchar("ip", { length: 100 }),
  userAgent: varchar("user_agent", { length: 500 }),
  details: text("details"),
  createdAt: timestamp("created_at"),
});

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  roleId: bigint("roleId", { mode: "number" }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
  zipCode: varchar("zipCode", { length: 255 }),
  country: varchar("country", { length: 255 }),
  joinDate: datetime("joinDate"),
  leaveDate: datetime("leaveDate"),
  employeeId: varchar("employeeId", { length: 255 }),
  bloodGroup: varchar("bloodGroup", { length: 255 }),
  image: varchar("image", { length: 255 }),
  designationId: bigint("designationId", { mode: "number" }),
  employmentStatusId: bigint("employmentStatusId", { mode: "number" }),
  departmentId: bigint("departmentId", { mode: "number" }),
  shiftId: bigint("shiftId", { mode: "number" }),
  refreshToken: varchar("refreshToken", { length: 512 }),
  isLogin: varchar("isLogin", { length: 10 }).default("false").notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const appSettings = mysqlTable("appSetting", {
  id: serial("id").primaryKey(),
  companyName: varchar("companyName", { length: 255 }),
  dashboardType: varchar("dashboardType", { length: 255 }),
  tagLine: varchar("tagLine", { length: 255 }),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  footer: text("footer"),
  logo: varchar("logo", { length: 255 }),
  currencyId: bigint("currencyId", { mode: "number" }),
  isPos: varchar("isPos", { length: 10 }).default("false"),
  isDiscount: varchar("isDiscount", { length: 10 }).default("false"),
  isTax: varchar("isTax", { length: 10 }).default("false"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const products = mysqlTable("product", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productThumbnailImage: varchar("productThumbnailImage", { length: 255 }),
  productSubCategoryId: bigint("productSubCategoryId", { mode: "number" }),
  productBrandId: bigint("productBrandId", { mode: "number" }),
  description: text("description"),
  sku: varchar("sku", { length: 255 }),
  productQuantity: double("productQuantity").default(0).notNull(),
  productSalePrice: double("productSalePrice").default(0).notNull(),
  productPurchasePrice: double("productPurchasePrice").default(0).notNull(),
  uomId: bigint("uomId", { mode: "number" }),
  uomValue: varchar("uomValue", { length: 255 }),
  reorderQuantity: double("reorderQuantity").default(0),
  productVatId: bigint("productVatId", { mode: "number" }),
  productPurchaseVatId: bigint("productPurchaseVatId", { mode: "number" }),
  discountId: bigint("discountId", { mode: "number" }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productCategories = mysqlTable("productCategory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productSubCategories = mysqlTable("productSubCategory", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productCategoryId: bigint("productCategoryId", { mode: "number" }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productBrands = mysqlTable("productBrand", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productVats = mysqlTable("productVat", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  percentage: double("percentage").notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const uoms = mysqlTable("uom", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const manufacturers = mysqlTable("manufacturer", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const purchaseInvoiceProducts = mysqlTable("purchaseInvoiceProduct", {
  id: serial("id").primaryKey(),
  invoiceId: varchar("invoiceId", { length: 50 }).notNull(),
  productId: bigint("productId", { mode: "number" }).notNull(),
  productQuantity: double("productQuantity").default(0).notNull(),
  productUnitPurchasePrice: double("productUnitPurchasePrice").default(0).notNull(),
  productFinalAmount: double("productFinalAmount").default(0).notNull(),
  tax: double("tax").default(0),
  taxAmount: double("taxAmount").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const saleInvoices = mysqlTable("saleInvoice", {
  id: varchar("id", { length: 50 }).primaryKey(),
  date: datetime("date").notNull(),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  totalAmount: double("totalAmount").default(0).notNull(),
  totalTaxAmount: double("totalTaxAmount").default(0).notNull(),
  totalDiscountAmount: double("totalDiscountAmount").default(0).notNull(),
  paidAmount: double("paidAmount").default(0).notNull(),
  dueAmount: double("dueAmount").default(0).notNull(),
  profit: double("profit").default(0).notNull(),
  customerId: bigint("customerId", { mode: "number" }),
  userId: bigint("userId", { mode: "number" }),
  note: text("note"),
  dueDate: datetime("dueDate"),
  isHold: varchar("isHold", { length: 10 }).default("false"),
  orderStatus: varchar("orderStatus", { length: 50 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const saleInvoiceProducts = mysqlTable("saleInvoiceProduct", {
  id: serial("id").primaryKey(),
  invoiceId: varchar("invoiceId", { length: 50 }).notNull(),
  productId: bigint("productId", { mode: "number" }).notNull(),
  productQuantity: double("productQuantity").default(0).notNull(),
  productUnitSalePrice: double("productUnitSalePrice").default(0).notNull(),
  productDiscount: double("productDiscount").default(0).notNull(),
  productFinalAmount: double("productFinalAmount").default(0).notNull(),
  tax: double("tax").default(0),
  taxAmount: double("taxAmount").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const purchaseInvoices = mysqlTable("purchaseInvoice", {
  id: varchar("id", { length: 50 }).primaryKey(),
  date: datetime("date").notNull(),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  supplierMemoNo: varchar("supplierMemoNo", { length: 255 }),
  totalAmount: double("totalAmount").default(0).notNull(),
  totalTax: double("totalTax").default(0).notNull(),
  paidAmount: double("paidAmount").default(0).notNull(),
  dueAmount: double("dueAmount").default(0).notNull(),
  supplierId: bigint("supplierId", { mode: "number" }),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const returnSaleInvoices = mysqlTable("returnSaleInvoice", {
  id: varchar("id", { length: 50 }).primaryKey(),
  date: datetime("date").notNull(),
  totalAmount: double("totalAmount").default(0).notNull(),
  instantReturnAmount: double("instantReturnAmount").default(0),
  tax: double("tax").default(0),
  note: text("note"),
  saleInvoiceId: varchar("saleInvoiceId", { length: 50 }),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const returnPurchaseInvoices = mysqlTable("returnPurchaseInvoice", {
  id: varchar("id", { length: 50 }).primaryKey(),
  date: datetime("date").notNull(),
  totalAmount: double("totalAmount").default(0).notNull(),
  instantReturnAmount: double("instantReturnAmount").default(0),
  tax: double("tax").default(0),
  note: text("note"),
  purchaseInvoiceId: varchar("purchaseInvoiceId", { length: 50 }),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const paymentSaleInvoices = mysqlTable("paymentSaleInvoice", {
  id: serial("id").primaryKey(),
  date: datetime("date").notNull(),
  amount: double("amount").default(0).notNull(),
  saleInvoiceId: varchar("saleInvoiceId", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const paymentPurchaseInvoices = mysqlTable("paymentPurchaseInvoice", {
  id: serial("id").primaryKey(),
  date: datetime("date").notNull(),
  amount: double("amount").default(0).notNull(),
  purchaseInvoiceId: varchar("purchaseInvoiceId", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const roles = mysqlTable("role", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 255 }).default("active").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const permissions = mysqlTable("permission", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 255 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const rolePermissions = mysqlTable("rolePermission", {
  id: serial("id").primaryKey(),
  roleId: bigint("roleId", { mode: "number" }).notNull(),
  permissionId: bigint("permissionId", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
