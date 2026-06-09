import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  double,
  json,
  mysqlEnum,
  int,
  mysqlTable,
  serial,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

// SCRUM-109: sessions table for JTI validation
// SCRUM-121: familyId links an access-token session to its refresh-token family
// so revoking a device/session also kills its outstanding access token.
export const sessions = mysqlTable("sessions", {
  jti:       varchar("jti", { length: 36 }).primaryKey(),
  userId:    bigint("user_id", { mode: "number" }).notNull(),
  roleId:    bigint("role_id", { mode: "number" }).notNull(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  familyId:  varchar("family_id", { length: 36 }),
  ip:        varchar("ip", { length: 100 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revoked:   tinyint("revoked").default(0).notNull(),
});

// SCRUM-121: refresh-token rotation with reuse detection.
// Each login starts a "family" (familyId). Every refresh rotates the token:
// the used row gets rotatedAt + replacedByJti, a new leaf row is created. If a
// token that was already rotated (beyond the grace window) or revoked is reused,
// the whole family is revoked and the event is audited (token theft signal).
export const refreshTokens = mysqlTable("refresh_tokens", {
  jti:           varchar("jti", { length: 36 }).primaryKey(),
  familyId:      varchar("family_id", { length: 36 }).notNull(),
  userId:        bigint("user_id", { mode: "number" }).notNull(),
  tokenHash:     varchar("token_hash", { length: 255 }).notNull(),
  userAgent:     text("user_agent"),
  ip:            varchar("ip", { length: 100 }),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  expiresAt:     timestamp("expires_at").notNull(),
  rotatedAt:     timestamp("rotated_at"),
  replacedByJti: varchar("replaced_by_jti", { length: 36 }),
  revokedAt:     timestamp("revoked_at"),
  revokedReason: varchar("revoked_reason", { length: 100 }),
});

export const organizations = mysqlTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  profileImage: varchar("profileImage", { length: 255 }),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  username: varchar("username", { length: 255 }),
  email: varchar("email", { length: 255 }),
  googleId: varchar("googleId", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  address: varchar("address", { length: 255 }),
  password: varchar("password", { length: 255 }).notNull(),
  roleId: bigint("roleId", { mode: "number" }).default(3).notNull(),
  isLogin: varchar("isLogin", { length: 255 }).default("false").notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const tenantDetails = mysqlTable("tenant_details", {
  id: serial("id").primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).notNull().unique(),
  birthDate: date("birth_date", { mode: "string" }).notNull(),
  sex: varchar("sex", { length: 10 }).notNull(),
  nationality: varchar("nationality", { length: 255 }).notNull(),
  maritalStatus: varchar("marital_status", { length: 255 }).notNull(),
  originProvince: varchar("origin_province", { length: 255 }).notNull(),
  phone2: varchar("phone2", { length: 255 }),
  contactedPerson: varchar("contacted_person", { length: 255 }).notNull(),
  contactedPersonPhoneNumber: varchar("contacted_person_phone_number", { length: 255 }).notNull(),
  professionalStatus: varchar("prossional_status", { length: 255 }).notNull(),
  mainActivity: varchar("main_activity", { length: 255 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  entityAddress: varchar("entity_address", { length: 255 }).notNull(),
  hiringDate: date("hiring_date", { mode: "string" }),
  contractType: varchar("contract_type", { length: 255 }).notNull(),
  monthlyPay: decimal("monthly_pay", { precision: 15, scale: 2 }).notNull(),
  salaryCurrencyId: bigint("salary_currency_id", { mode: "number" }),
  otherMonthlyIncome: decimal("other_monthly_income", { precision: 15, scale: 2 }),
  oldAddress: varchar("old_address", { length: 255 }),
  oldLessor: varchar("old_lessor", { length: 255 }),
  movingReason: varchar("moving_reason", { length: 255 }),
  occupantNumber: int("occupant_number").notNull(),
  partenairName: varchar("partenair_name", { length: 255 }),
  partenairNumber: varchar("partenair_number", { length: 255 }),
  childNumber: int("child_number").default(0).notNull(),
  childAges: text("child_ages"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const tenantOnboardings = mysqlTable("tenant_onboardings", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 255 }).notNull(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  token: varchar("token", { length: 128 }),
  status: varchar("status", { length: 50 }).default("sent").notNull(),
  data: text("data"),
  expiresAt: timestamp("expires_at").notNull(),
  submittedAt: timestamp("submitted_at"),
  validatedAt: timestamp("validated_at"),
  customerId: bigint("customer_id", { mode: "number" }),
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
  currencyCode: varchar("currencyCode", { length: 3 }),
  currencyName: varchar("currencyName", { length: 255 }).notNull(),
  currencySymbol: varchar("currencySymbol", { length: 255 }).notNull(),
  decimalPlaces: int("decimalPlaces").default(2),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  date: datetime("date").notNull(),
  debitId: bigint("debitId", { mode: "number" }).notNull(),
  creditId: bigint("creditId", { mode: "number" }).notNull(),
  particulars: varchar("particulars", { length: 255 }).notNull(),
  amount: double("amount").notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  type: varchar("type", { length: 255 }),
  relatedId: varchar("relatedId", { length: 255 }),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateProperties = mysqlTable("real_estate_properties", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  currencyId: bigint("currency_id", { mode: "number" }),
  description: text("description"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateUnits = mysqlTable("real_estate_units", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  unitType: varchar("unit_type", { length: 255 }).default("apartment").notNull(),
  status: varchar("status", { length: 255 }).default("vacant").notNull(),
  floor: varchar("floor", { length: 255 }),
  bedrooms: int("bedrooms").default(0).notNull(),
  bathrooms: int("bathrooms").default(0).notNull(),
  area: decimal("area", { precision: 12, scale: 2 }).default("0").notNull(),
  monthlyRent: decimal("monthly_rent", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  securityDeposit: decimal("security_deposit", { precision: 15, scale: 2 }).default("0").notNull(),
  amenities: text("amenities"),
  description: text("description"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateLeases = mysqlTable("real_estate_leases", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  reference: varchar("reference", { length: 255 }).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  unitId: bigint("unit_id", { mode: "number" }).notNull(),
  tenantId: bigint("tenant_id", { mode: "number" }).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  nextInvoiceDate: date("next_invoice_date", { mode: "string" }),
  billingCycle: varchar("billing_cycle", { length: 255 }).default("monthly").notNull(),
  rentAmount: decimal("rent_amount", { precision: 15, scale: 2 }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  securityDeposit: decimal("security_deposit", { precision: 15, scale: 2 }).default("0").notNull(),
  moveInMeterReading: decimal("move_in_meter_reading", { precision: 12, scale: 2 }),
  moveInNotes: text("move_in_notes"),
  terms: text("terms"),
  status: varchar("status", { length: 255 }).default("draft").notNull(),
  // Taxe par bail (incluse/informative) — calculée sur le loyer au paiement.
  taxName: varchar("tax_name", { length: 255 }),
  taxType: varchar("tax_type", { length: 20 }),
  taxValue: decimal("tax_value", { precision: 15, scale: 4 }),
  taxApplyMode: varchar("tax_apply_mode", { length: 20 }).default("never").notNull(),
  // Period (next_invoice_date value) we last sent an overdue reminder for, to send once per period.
  lastOverdueReminderDate: date("last_overdue_reminder_date", { mode: "string" }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateRentPayments = mysqlTable("real_estate_rent_payments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  leaseId: bigint("lease_id", { mode: "number" }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  transactionId: bigint("transaction_id", { mode: "number" }),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  method: varchar("method", { length: 255 }).default("cash").notNull(),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  // Part de taxe contenue dans ce paiement (informative, calculée depuis le bail).
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }),
  taxName: varchar("tax_name", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Caution / dépôt de garantie : cycle complet (détenu → restitué) avec retenue.
// Séparé de real_estate_rent_payments pour ne pas être compté comme du loyer.
export const realEstateSecurityDeposits = mysqlTable("real_estate_security_deposits", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  leaseId: bigint("lease_id", { mode: "number" }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  transactionId: bigint("transaction_id", { mode: "number" }),
  returnTransactionId: bigint("return_transaction_id", { mode: "number" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  method: varchar("method", { length: 255 }).default("cash").notNull(),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  // held = détenue · returned = restituée (totalement ou après retenue).
  status: varchar("status", { length: 50 }).default("held").notNull(),
  deductionAmount: decimal("deduction_amount", { precision: 15, scale: 2 }),
  deductionReason: varchar("deduction_reason", { length: 500 }),
  returnedAmount: decimal("returned_amount", { precision: 15, scale: 2 }),
  returnMethod: varchar("return_method", { length: 255 }),
  returnDate: date("return_date", { mode: "string" }),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateMaintenanceRequests = mysqlTable("real_estate_maintenance_requests", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  unitId: bigint("unit_id", { mode: "number" }),
  title: varchar("title", { length: 255 }).notNull(),
  priority: varchar("priority", { length: 255 }).default("medium").notNull(),
  status: varchar("status", { length: 255 }).default("open").notNull(),
  scheduledDate: date("scheduled_date", { mode: "string" }),
  estimatedCost: decimal("estimated_cost", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  assigneeId: bigint("assignee_id", { mode: "number" }),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateMaintenanceCosts = mysqlTable("real_estate_maintenance_costs", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  ticketId: bigint("ticket_id", { mode: "number" }).notNull(),
  type: varchar("type", { length: 50 }).default("service").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  vendorName: varchar("vendor_name", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 50 }).default("cash").notNull(),
  paymentDate: date("payment_date", { mode: "string" }),
  notes: text("notes"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateContracts = mysqlTable("real_estate_contracts", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstateContractTemplates = mysqlTable("real_estate_contract_templates", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).default("residential").notNull(),
  body: text("body").notNull(),
  description: varchar("description", { length: 500 }),
  isActive: boolean("is_active").default(false).notNull(),
  isDeleted: tinyint("is_deleted").default(0).notNull(),
  version: int("version").default(1).notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  updatedBy: bigint("updated_by", { mode: "number" }),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  firstName: varchar("firstName", { length: 255 }),
  lastName: varchar("lastName", { length: 255 }),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  roleId: bigint("roleId", { mode: "number" }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  gender: varchar("gender", { length: 40 }),
  birthDate: date("birthDate", { mode: "string" }),
  maritalStatus: varchar("maritalStatus", { length: 80 }),
  childrenCount: int("childrenCount").default(0),
  nationality: varchar("nationality", { length: 120 }),
  emergencyContactName: varchar("emergencyContactName", { length: 255 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 255 }),
  emergencyContactRelationship: varchar("emergencyContactRelationship", { length: 120 }),
  personalDocumentsUrl: text("personalDocumentsUrl"),
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
  leaveReason: varchar("leaveReason", { length: 500 }),
  refreshToken: varchar("refreshToken", { length: 512 }),
  isLogin: varchar("isLogin", { length: 10 }).default("false").notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  totpSecret: varchar("totp_secret", { length: 128 }),
  totpEnabled: tinyint("totp_enabled").default(0).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const mfaRecoveryCodes = mysqlTable("mfa_recovery_codes", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  codeHash: varchar("code_hash", { length: 128 }).notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at"),
});

export const departments = mysqlTable("department", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const employmentStatuses = mysqlTable("employmentStatus", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  colourValue: varchar("colourValue", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const educations = mysqlTable("education", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  degree: varchar("degree", { length: 255 }).notNull(),
  institution: varchar("institution", { length: 255 }).notNull(),
  fieldOfStudy: varchar("fieldOfStudy", { length: 255 }).notNull(),
  result: varchar("result", { length: 255 }).notNull(),
  studyStartDate: datetime("studyStartDate").notNull(),
  studyEndDate: datetime("studyEndDate"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const designations = mysqlTable("designations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const shifts = mysqlTable("shifts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: varchar("startTime", { length: 20 }).notNull(),
  endTime: varchar("endTime", { length: 20 }).notNull(),
  workHour: double("workHour").default(0).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrAttendances = mysqlTable("hr_attendances", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  workDate: date("workDate", { mode: "string" }).notNull(),
  shiftId: bigint("shiftId", { mode: "number" }),
  clockIn: varchar("clockIn", { length: 20 }),
  pauseOut: varchar("pauseOut", { length: 20 }),
  pauseIn: varchar("pauseIn", { length: 20 }),
  clockOut: varchar("clockOut", { length: 20 }),
  leaveRequestId: bigint("leaveRequestId", { mode: "number" }),
  workedHours: double("workedHours").default(0).notNull(),
  lateMinutes: int("lateMinutes").default(0).notNull(),
  overtimeHours: double("overtimeHours").default(0).notNull(),
  absenceHours: double("absenceHours").default(0).notNull(),
  source: varchar("source", { length: 30 }).default("manual").notNull(),
  status: varchar("status", { length: 30 }).default("present").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const awards = mysqlTable("awards", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const designationHistories = mysqlTable("designation_histories", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  designationId: bigint("designationId", { mode: "number" }).notNull(),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),
  comment: text("comment"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const salaryHistories = mysqlTable("salary_histories", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  salary: double("salary").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),
  comment: text("comment"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrPayrolls = mysqlTable("hr_payrolls", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  contractId: bigint("contractId", { mode: "number" }),
  period: varchar("period", { length: 20 }).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  baseSalary: double("baseSalary").default(0).notNull(),
  transportAllowance: double("transportAllowance").default(0).notNull(),
  housingAllowance: double("housingAllowance").default(0).notNull(),
  riskAllowance: double("riskAllowance").default(0).notNull(),
  otherAllowances: double("otherAllowances").default(0).notNull(),
  overtimeHours: double("overtimeHours").default(0).notNull(),
  overtimeAmount: double("overtimeAmount").default(0).notNull(),
  unpaidAbsenceDeduction: double("unpaidAbsenceDeduction").default(0).notNull(),
  advanceDeduction: double("advanceDeduction").default(0).notNull(),
  taxAmount: double("taxAmount").default(0).notNull(),
  cnssAmount: double("cnssAmount").default(0).notNull(),
  otherDeductions: double("otherDeductions").default(0).notNull(),
  grossSalary: double("grossSalary").default(0).notNull(),
  netSalary: double("netSalary").default(0).notNull(),
  workedDays: double("workedDays").default(0).notNull(),
  absenceDays: double("absenceDays").default(0).notNull(),
  paidLeaveDays: double("paidLeaveDays").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrProjects = mysqlTable("hr_projects", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  code: varchar("code", { length: 80 }),
  name: varchar("name", { length: 180 }).notNull(),
  donor: varchar("donor", { length: 180 }),
  managerId: bigint("managerId", { mode: "number" }),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),
  hrBudget: double("hrBudget").default(0).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrProjectAssignments = mysqlTable("hr_project_assignments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  projectId: bigint("projectId", { mode: "number" }).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  role: varchar("role", { length: 160 }),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),
  timePercent: double("timePercent").default(100).notNull(),
  monthlyCost: double("monthlyCost").default(0).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const awardHistories = mysqlTable("award_histories", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  awardId: bigint("awardId", { mode: "number" }).notNull(),
  awardedDate: date("awardedDate", { mode: "string" }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrLeaveRequests = mysqlTable("hr_leave_requests", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }).notNull(),
  requestedDays: double("requestedDays").default(0).notNull(),
  leaveYear: int("leaveYear"),
  entitlementDays: double("entitlementDays").default(0).notNull(),
  balanceBefore: double("balanceBefore").default(0).notNull(),
  balanceAfter: double("balanceAfter").default(0).notNull(),
  isPaid: tinyint("isPaid").default(1).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  managerId: bigint("managerId", { mode: "number" }),
  managerComment: text("managerComment"),
  managerDecisionAt: timestamp("managerDecisionAt"),
  hrDecisionAt: timestamp("hrDecisionAt"),
  hrComment: text("hrComment"),
  decisionComment: text("decisionComment"),
  decidedBy: bigint("decidedBy", { mode: "number" }),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrContracts = mysqlTable("hr_contracts", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  designationId: bigint("designationId", { mode: "number" }),
  departmentId: bigint("departmentId", { mode: "number" }),
  managerId: bigint("managerId", { mode: "number" }),
  hrResponsibleId: bigint("hrResponsibleId", { mode: "number" }),
  contractType: varchar("contractType", { length: 80 }).notNull(),
  startDate: date("startDate", { mode: "string" }).notNull(),
  endDate: date("endDate", { mode: "string" }),
  reference: varchar("reference", { length: 120 }),
  workLocation: varchar("workLocation", { length: 180 }),
  currencyId: bigint("currencyId", { mode: "number" }),
  baseSalary: double("baseSalary").default(0),
  transportAllowance: double("transportAllowance").default(0),
  housingAllowance: double("housingAllowance").default(0),
  payFrequency: varchar("payFrequency", { length: 40 }),
  probationMonths: double("probationMonths"),
  probationEndDate: date("probationEndDate", { mode: "string" }),
  workSchedule: varchar("workSchedule", { length: 160 }),
  school: varchar("school", { length: 180 }),
  supervisor: varchar("supervisor", { length: 180 }),
  stipend: double("stipend").default(0),
  contractAmount: double("contractAmount").default(0),
  deliverables: text("deliverables"),
  generatedDocumentUrl: varchar("generatedDocumentUrl", { length: 500 }),
  signedDocumentUrl: varchar("signedDocumentUrl", { length: 500 }),
  amendmentsUrl: varchar("amendmentsUrl", { length: 500 }),
  identityDocumentUrl: varchar("identityDocumentUrl", { length: 500 }),
  diplomasUrl: varchar("diplomasUrl", { length: 500 }),
  notes: text("notes"),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrDocuments = mysqlTable("hr_documents", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  documentType: varchar("documentType", { length: 120 }).notNull(),
  reference: varchar("reference", { length: 160 }),
  fileUrl: varchar("fileUrl", { length: 500 }),
  note: text("note"),
  status: varchar("status", { length: 30 }).default("received").notNull(),
  templateType: varchar("templateType", { length: 80 }),
  version: int("version").default(1).notNull(),
  generatedAt: timestamp("generatedAt"),
  generatedBy: bigint("generatedBy", { mode: "number" }),
  content: text("content"),
  signedAt: timestamp("signedAt"),
  signedBy: varchar("signedBy", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrExpenseRequests = mysqlTable("hr_expense_requests", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  amount: double("amount").default(0).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  requestDate: date("requestDate", { mode: "string" }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  decisionComment: text("decisionComment"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrSocialDeclarations = mysqlTable("hr_social_declarations", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  period: varchar("period", { length: 30 }).notNull(),
  organism: varchar("organism", { length: 120 }).notNull(),
  baseAmount: double("baseAmount").default(0).notNull(),
  rate: varchar("rate", { length: 30 }),
  amount: double("amount").default(0).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  dueDate: date("dueDate", { mode: "string" }),
  note: text("note"),
  status: varchar("status", { length: 30 }).default("prepared").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrPerformanceReviews = mysqlTable("hr_performance_reviews", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  managerId: bigint("managerId", { mode: "number" }),
  cycle: varchar("cycle", { length: 80 }).notNull(),
  score: double("score"),
  objectives: text("objectives"),
  comments: text("comments"),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrTrainingSessions = mysqlTable("hr_training_sessions", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  audience: varchar("audience", { length: 180 }),
  sessionDate: date("sessionDate", { mode: "string" }),
  budget: double("budget").default(0).notNull(),
  currencyId: bigint("currencyId", { mode: "number" }),
  note: text("note"),
  status: varchar("status", { length: 30 }).default("planned").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrRecruitmentOffers = mysqlTable("hr_recruitment_offers", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  role: varchar("role", { length: 180 }).notNull(),
  departmentId: bigint("departmentId", { mode: "number" }),
  deadline: date("deadline", { mode: "string" }),
  description: text("description"),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrCandidates = mysqlTable("hr_candidates", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  offerId: bigint("offerId", { mode: "number" }),
  firstName: varchar("firstName", { length: 180 }).notNull(),
  lastName: varchar("lastName", { length: 180 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 80 }),
  nationality: varchar("nationality", { length: 120 }),
  gender: varchar("gender", { length: 40 }),
  birthDate: date("birthDate", { mode: "string" }),
  currentTitle: varchar("currentTitle", { length: 180 }),
  currentEmployer: varchar("currentEmployer", { length: 180 }),
  yearsExperience: double("yearsExperience"),
  educationLevel: varchar("educationLevel", { length: 120 }),
  skills: text("skills"),
  languages: varchar("languages", { length: 500 }),
  source: varchar("source", { length: 120 }),
  cvUrl: varchar("cvUrl", { length: 500 }),
  portfolioUrl: varchar("portfolioUrl", { length: 500 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  coverLetterUrl: varchar("coverLetterUrl", { length: 500 }),
  stage: varchar("stage", { length: 50 }).default("nouveau").notNull(),
  rating: double("rating"),
  interviewDate: date("interviewDate", { mode: "string" }),
  testDate: date("testDate", { mode: "string" }),
  offerDate: date("offerDate", { mode: "string" }),
  offerAmount: double("offerAmount"),
  offerCurrencyId: bigint("offerCurrencyId", { mode: "number" }),
  convertedUserId: bigint("convertedUserId", { mode: "number" }),
  convertedAt: timestamp("convertedAt"),
  assignedTo: bigint("assignedTo", { mode: "number" }),
  decisionComment: text("decisionComment"),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrTimesheets = mysqlTable("hr_timesheets", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  workDate: date("workDate", { mode: "string" }).notNull(),
  period: varchar("period", { length: 30 }),
  periodStartDate: date("periodStartDate", { mode: "string" }),
  periodEndDate: date("periodEndDate", { mode: "string" }),
  projectId: bigint("projectId", { mode: "number" }),
  project: varchar("project", { length: 180 }).notNull(),
  donor: varchar("donor", { length: 180 }),
  activity: varchar("activity", { length: 255 }),
  hours: double("hours").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("submitted").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const hrEmployeeRequests = mysqlTable("hr_employee_requests", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  requestType: varchar("requestType", { length: 120 }).notNull(),
  subject: varchar("subject", { length: 180 }).notNull(),
  description: text("description"),
  requestedDate: date("requestedDate", { mode: "string" }).notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  decisionComment: text("decisionComment"),
  decidedBy: bigint("decidedBy", { mode: "number" }),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const colors = mysqlTable("colors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  colorCode: varchar("colorCode", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productAttributes = mysqlTable("productAttribute", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productAttributeValues = mysqlTable("productAttributeValue", {
  id: serial("id").primaryKey(),
  productAttributeId: bigint("productAttributeId", { mode: "number" }),
  name: varchar("name", { length: 255 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const termsAndConditions = mysqlTable("termsAndCondition", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const pageSizes = mysqlTable("pageSize", {
  id: serial("id").primaryKey(),
  pageSizeName: varchar("pageSizeName", { length: 255 }).notNull(),
  width: double("width").notNull(),
  height: double("height").notNull(),
  unit: varchar("unit", { length: 255 }).default("inches").notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const announcements = mysqlTable("announcement", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const emailConfigs = mysqlTable("emailConfig", {
  id: serial("id").primaryKey(),
  emailConfigName: varchar("emailConfigName", { length: 255 }),
  emailHost: varchar("emailHost", { length: 255 }),
  emailPort: int("emailPort"),
  emailUser: varchar("emailUser", { length: 255 }),
  emailPass: varchar("emailPass", { length: 255 }),
  emailFrom: varchar("emailFrom", { length: 255 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const emails = mysqlTable("email", {
  id: serial("id").primaryKey(),
  emailConfigName: varchar("emailConfigName", { length: 255 }),
  to: varchar("to", { length: 255 }),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const manualPayments = mysqlTable("manualPayment", {
  id: serial("id").primaryKey(),
  date: datetime("date"),
  amount: double("amount").default(0).notNull(),
  paymentMethodId: bigint("paymentMethodId", { mode: "number" }),
  customerId: bigint("customerId", { mode: "number" }),
  transactionId: bigint("transactionId", { mode: "number" }),
  note: text("note"),
  paymentStatus: varchar("paymentStatus", { length: 50 }).default("pending"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const adjustInvoices = mysqlTable("adjustInvoice", {
  id: serial("id").primaryKey(),
  date: datetime("date"),
  note: text("note"),
  userId: bigint("userId", { mode: "number" }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const adjustInvoiceProducts = mysqlTable("adjustInvoiceProduct", {
  id: serial("id").primaryKey(),
  invoiceId: bigint("invoiceId", { mode: "number" }).notNull(),
  productId: bigint("productId", { mode: "number" }),
  productQuantity: double("productQuantity").default(0),
  type: varchar("type", { length: 50 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const quotes = mysqlTable("quote", {
  id: serial("id").primaryKey(),
  quoteName: varchar("quoteName", { length: 255 }),
  quoteDate: datetime("quoteDate"),
  quoteOwnerId: bigint("quoteOwnerId", { mode: "number" }),
  customerId: bigint("customerId", { mode: "number" }),
  totalAmount: double("totalAmount").default(0),
  note: text("note"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const quoteProducts = mysqlTable("quoteProduct", {
  id: serial("id").primaryKey(),
  quoteId: bigint("quoteId", { mode: "number" }).notNull(),
  productId: bigint("productId", { mode: "number" }),
  productQuantity: double("productQuantity").default(0),
  productUnitSalePrice: double("productUnitSalePrice").default(0),
  productFinalAmount: double("productFinalAmount").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const purchaseReorderInvoices = mysqlTable("purchaseReorderInvoice", {
  id: serial("id").primaryKey(),
  reorderInvoiceId: varchar("reorderInvoiceId", { length: 50 }),
  productId: bigint("productId", { mode: "number" }),
  quantity: double("quantity").default(0),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const returnPurchaseInvoiceProducts = mysqlTable("returnPurchaseInvoiceProduct", {
  id: serial("id").primaryKey(),
  invoiceId: varchar("invoiceId", { length: 50 }).notNull(),
  productId: bigint("productId", { mode: "number" }),
  productQuantity: double("productQuantity").default(0),
  productUnitPurchasePrice: double("productUnitPurchasePrice").default(0),
  productFinalAmount: double("productFinalAmount").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const returnSaleInvoiceProducts = mysqlTable("returnSaleInvoiceProduct", {
  id: serial("id").primaryKey(),
  invoiceId: varchar("invoiceId", { length: 50 }).notNull(),
  productId: bigint("productId", { mode: "number" }),
  productQuantity: double("productQuantity").default(0),
  productUnitSalePrice: double("productUnitSalePrice").default(0),
  productFinalAmount: double("productFinalAmount").default(0),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const productProductAttributeValues = mysqlTable("productProductAttributeValue", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number" }),
  productAttributeValueId: bigint("productAttributeValueId", { mode: "number" }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const dimensionUnits = mysqlTable("dimensionUnit", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const weightUnits = mysqlTable("weightUnit", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const attachments = mysqlTable("attachment", {
  id: serial("id").primaryKey(),
  emailId: bigint("emailId", { mode: "number" }).notNull(),
  name: varchar("name", { length: 255 }),
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
  landlordSignature: text("landlord_signature"),
  currencyId: bigint("currencyId", { mode: "number" }),
  isPos: varchar("isPos", { length: 10 }).default("false"),
  isDiscount: varchar("isDiscount", { length: 10 }).default("false"),
  isTax: varchar("isTax", { length: 10 }).default("false"),
  invoicePrefix: varchar("invoicePrefix", { length: 50 }).default("INV-"),
  leasePrefix: varchar("leasePrefix", { length: 50 }).default("LEASE-"),
  defaultVatRate: int("defaultVatRate").default(16),
  defaultPaymentTermDays: int("defaultPaymentTermDays").default(14),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// SCRUM-146: email templates
export const emailTemplates = mysqlTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  eventType: varchar("eventType", { length: 100 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SCRUM-76: outbound system email audit trail
export const systemEmailLogs = mysqlTable("system_email_logs", {
  id: serial("id").primaryKey(),
  emailType: varchar("email_type", { length: 100 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  sender: varchar("sender", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "skipped"]).default("pending").notNull(),
  relatedType: varchar("related_type", { length: 100 }),
  relatedId: varchar("related_id", { length: 100 }),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  errorMessage: varchar("error_message", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SCRUM-146: invoice templates
export const invoiceTemplates = mysqlTable("invoice_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  headerText: text("headerText"),
  footerText: text("footerText"),
  showLogo: tinyint("showLogo").default(1),
  showSignature: tinyint("showSignature").default(0),
  colorScheme: varchar("colorScheme", { length: 50 }).default("brand"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SCRUM-143: notification preferences per user
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  eventKey: varchar("eventKey", { length: 50 }).notNull(),
  emailEnabled: tinyint("emailEnabled").default(1),
  inappEnabled: tinyint("inappEnabled").default(1),
});

export const products = mysqlTable("product", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  date: datetime("date").notNull(),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  totalAmount: double("totalAmount").default(0).notNull(),
  totalTaxAmount: double("totalTaxAmount").default(0).notNull(),
  totalDiscountAmount: double("totalDiscountAmount").default(0).notNull(),
  paidAmount: double("paidAmount").default(0).notNull(),
  dueAmount: double("dueAmount").default(0).notNull(),
  profit: double("profit").default(0).notNull(),
  customerId: bigint("customerId", { mode: "number" }),
  currencyId: bigint("currencyId", { mode: "number" }),
  userId: bigint("userId", { mode: "number" }),
  note: text("note"),
  dueDate: datetime("dueDate"),
  isHold: varchar("isHold", { length: 10 }).default("false"),
  orderStatus: varchar("orderStatus", { length: 50 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  date: datetime("date").notNull(),
  invoiceMemoNo: varchar("invoiceMemoNo", { length: 255 }),
  supplierMemoNo: varchar("supplierMemoNo", { length: 255 }),
  totalAmount: double("totalAmount").default(0).notNull(),
  totalTax: double("totalTax").default(0).notNull(),
  paidAmount: double("paidAmount").default(0).notNull(),
  dueAmount: double("dueAmount").default(0).notNull(),
  supplierId: bigint("supplierId", { mode: "number" }),
  currencyId: bigint("currencyId", { mode: "number" }),
  note: text("note"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
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
  status: varchar("status", { length: 255 }).default("true").notNull(),
  isSystem: tinyint("is_system").default(0).notNull(),
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

export const auditLog = mysqlTable("audit_log", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  userId: int("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  target: varchar("target", { length: 255 }),
  ip: varchar("ip", { length: 45 }),
  userAgent: varchar("user_agent", { length: 512 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  identityId: int("identity_id").notNull(),
  identityType: varchar("identity_type", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

// SCRUM-75: Messaging application for ongdngolu.org emails
export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body"),
  htmlBody: text("html_body"),
  status: mysqlEnum("status", ["draft", "sent", "received", "read", "unread", "archived", "trash"]).default("received").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  messageType: mysqlEnum("message_type", ["email", "internal", "system"]).default("email").notNull(),
  relatedType: varchar("related_type", { length: 50 }),
  relatedId: int("related_id"),
  attachmentCount: int("attachment_count").default(0),
  externalMessageId: varchar("external_message_id", { length: 255 }),
  mailbox: varchar("mailbox", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SCRUM-193 — FarmOS: schéma de base pour la gestion d'élevage.
// Multi-organisation (organizationId), soft delete (isActive), timestamps.
// Espèces supportées : cow, pig, chicken, fish, goat, sheep, rabbit, duck, turkey.
// ─────────────────────────────────────────────────────────────────────────────

export const farmosAnimals = mysqlTable("farmos_animals", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  externalId: varchar("external_id", { length: 100 }),
  name: varchar("name", { length: 255 }),
  species: varchar("species", { length: 50 }).notNull(),
  race: varchar("race", { length: 100 }),
  sex: varchar("sex", { length: 10 }),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
  count: int("count"),
  lot: varchar("lot", { length: 100 }),
  barn: varchar("barn", { length: 100 }),
  room: varchar("room", { length: 100 }),
  type: varchar("type", { length: 50 }),
  status: varchar("status", { length: 20 }).default("healthy").notNull(),
  withdrawalUntil: date("withdrawal_until", { mode: "string" }),
  withdrawalKind: varchar("withdrawal_kind", { length: 20 }),
  lastEvent: varchar("last_event", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosMedicines = mysqlTable("farmos_medicines", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  kind: varchar("kind", { length: 20 }).default("med").notNull(),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("0").notNull(),
  unit: varchar("unit", { length: 30 }),
  minQuantity: decimal("min_quantity", { precision: 12, scale: 2 }),
  supplier: varchar("supplier", { length: 255 }),
  expiryDate: date("expiry_date", { mode: "string" }),
  notes: text("notes"),
  species: json("species").$type<string[] | null>(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const batiproProjects = mysqlTable("batipro_projects", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  code: varchar("code", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  client: varchar("client", { length: 255 }),
  manager: varchar("manager", { length: 255 }),
  status: varchar("status", { length: 40 }).default("Planifie").notNull(),
  progress: int("progress").default(0).notNull(),
  budget: decimal("budget", { precision: 14, scale: 2 }).default("0").notNull(),
  spent: decimal("spent", { precision: 14, scale: 2 }).default("0").notNull(),
  startDate: date("start_date", { mode: "string" }),
  dueDate: date("due_date", { mode: "string" }),
  location: varchar("location", { length: 255 }),
  risk: varchar("risk", { length: 30 }).default("Faible").notNull(),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const batiproTasks = mysqlTable("batipro_tasks", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  projectId: bigint("project_id", { mode: "number" }),
  label: varchar("label", { length: 255 }).notNull(),
  owner: varchar("owner", { length: 255 }),
  status: varchar("status", { length: 40 }).default("Planifie").notNull(),
  taskDate: date("task_date", { mode: "string" }),
  priority: varchar("priority", { length: 30 }).default("Normale").notNull(),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const batiproMaterials = mysqlTable("batipro_materials", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 40 }).default("unite").notNull(),
  stock: decimal("stock", { precision: 14, scale: 2 }).default("0").notNull(),
  minStock: decimal("min_stock", { precision: 14, scale: 2 }).default("0").notNull(),
  reserved: decimal("reserved", { precision: 14, scale: 2 }).default("0").notNull(),
  supplier: varchar("supplier", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const batiproCrews = mysqlTable("batipro_crews", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  people: int("people").default(0).notNull(),
  site: varchar("site", { length: 255 }),
  status: varchar("status", { length: 40 }).default("Disponible").notNull(),
  lead: varchar("lead", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosDiseases = mysqlTable("farmos_diseases", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }),
  species: varchar("species", { length: 50 }).notNull(),
  nameFr: varchar("name_fr", { length: 255 }).notNull(),
  nameEn: varchar("name_en", { length: 255 }),
  contagious: tinyint("contagious").default(0).notNull(),
  severityDefault: varchar("severity_default", { length: 20 }),
  commonRoute: varchar("common_route", { length: 50 }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosTreatments = mysqlTable("farmos_treatments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }).notNull(),
  medicineId: bigint("medicine_id", { mode: "number" }),
  diseaseId: bigint("disease_id", { mode: "number" }).notNull(),
  medicineName: varchar("medicine_name", { length: 255 }),
  dosage: varchar("dosage", { length: 255 }),
  route: varchar("route", { length: 50 }),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  vet: varchar("vet", { length: 255 }),
  withdrawalMeatDays: int("withdrawal_meat_days"),
  withdrawalMilkHours: int("withdrawal_milk_hours"),
  withdrawalEggsDays: int("withdrawal_eggs_days"),
  status: varchar("status", { length: 20 }).default("running").notNull(),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosSales = mysqlTable("farmos_sales", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }),
  species: varchar("species", { length: 50 }),
  productType: varchar("product_type", { length: 50 }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 30 }),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  buyer: varchar("buyer", { length: 255 }),
  saleDate: date("sale_date", { mode: "string" }).notNull(),
  transactionId: bigint("transaction_id", { mode: "number" }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosPriceList = mysqlTable("farmos_price_list", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  saleSource: varchar("sale_source", { length: 30 }).default("production").notNull(),
  species: varchar("species", { length: 50 }),
  productType: varchar("product_type", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 30 }),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosExpenses = mysqlTable("farmos_expenses", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: varchar("description", { length: 500 }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  unit: varchar("unit", { length: 30 }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  supplier: varchar("supplier", { length: 255 }),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  transactionId: bigint("transaction_id", { mode: "number" }),
  relatedAnimalId: bigint("related_animal_id", { mode: "number" }),
  relatedMedicineId: bigint("related_medicine_id", { mode: "number" }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosVaccinations = mysqlTable("farmos_vaccinations", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  species: varchar("species", { length: 50 }).notNull(),
  vaccine: varchar("vaccine", { length: 255 }).notNull(),
  target: varchar("target", { length: 255 }),
  animalCount: int("animal_count"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosWorkLogs = mysqlTable("farmos_work_logs", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  workDate: date("work_date", { mode: "string" }).notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }),
  notes: text("notes"),
  tasks: json("tasks").$type<Array<{ task: string; durationMinutes?: number; lot?: string; animalId?: number; notes?: string }> | null>(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosVetExams = mysqlTable("farmos_vet_exams", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }),
  species: varchar("species", { length: 50 }),
  vet: varchar("vet", { length: 255 }),
  vetUserId: bigint("vet_user_id", { mode: "number" }),
  examDate: date("exam_date", { mode: "string" }).notNull(),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosMortalityEvents = mysqlTable("farmos_mortality_events", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }),
  species: varchar("species", { length: 50 }).notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  count: int("count").default(1).notNull(),
  cause: varchar("cause", { length: 255 }),
  necropsyRequested: tinyint("necropsy_requested").default(0).notNull(),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosAiInsights = mysqlTable("farmos_ai_insights", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  kind: varchar("kind", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  confidence: int("confidence"),
  textFr: text("text_fr").notNull(),
  textEn: text("text_en"),
  actionLabelFr: varchar("action_label_fr", { length: 255 }),
  actionLabelEn: varchar("action_label_en", { length: 255 }),
  actionTarget: varchar("action_target", { length: 50 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosFeedForecasts = mysqlTable("farmos_feed_forecasts", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  species: varchar("species", { length: 50 }).notNull(),
  item: varchar("item", { length: 255 }).notNull(),
  neededKg: decimal("needed_kg", { precision: 12, scale: 2 }).default("0").notNull(),
  horizonDays: int("horizon_days").default(14).notNull(),
  confidence: int("confidence"),
  urgent: tinyint("urgent").default(0).notNull(),
  source: varchar("source", { length: 50 }).default("ai"),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosAnimalPhotos = mysqlTable("farmos_animal_photos", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }).notNull(),
  filename: varchar("filename", { length: 255 }),
  contentType: varchar("content_type", { length: 100 }),
  sizeBytes: int("size_bytes"),
  dataUrl: text("data_url").notNull(),
  uploadedBy: bigint("uploaded_by", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const farmosLookups = mysqlTable("farmos_lookups", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  scopeKey: varchar("scope_key", { length: 50 }),
  valueFr: varchar("value_fr", { length: 255 }).notNull(),
  valueEn: varchar("value_en", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosProductionLogs = mysqlTable("farmos_production_logs", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }),
  species: varchar("species", { length: 50 }).notNull(),
  productType: varchar("product_type", { length: 20 }).notNull(),
  logDate: date("log_date", { mode: "string" }).notNull(),
  period: varchar("period", { length: 10 }),
  quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  quality: json("quality"),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosReproductionEvents = mysqlTable("farmos_reproduction_events", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  partnerExternalId: varchar("partner_external_id", { length: 100 }),
  expectedDueDate: date("expected_due_date", { mode: "string" }),
  offspringCount: int("offspring_count"),
  outcome: varchar("outcome", { length: 50 }),
  notes: text("notes"),
  // Saillie / IA — soit une paillette de la banque, soit un mâle du troupeau.
  breedingType: varchar("breeding_type", { length: 20 }).default("unknown").notNull(), // ai | natural | unknown
  sireStrawId: bigint("sire_straw_id", { mode: "number" }),
  sireAnimalId: bigint("sire_animal_id", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// ─── Banque de semence (insémination artificielle) ──────────────────────
// Une ligne = une référence de paillette détenue par l'organisation.
// `strawsRemaining` est décrémenté à chaque event repro de type "ai".
export const farmosSemenStraws = mysqlTable("farmos_semen_straws", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),

  // Identification
  code: varchar("code", { length: 100 }).notNull(),
  sireName: varchar("sire_name", { length: 255 }).notNull(),
  sireRegistration: varchar("sire_registration", { length: 100 }),
  species: varchar("species", { length: 50 }).notNull(), // cow | pig | goat | sheep

  // Origine
  breed: varchar("breed", { length: 100 }),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  supplierId: bigint("supplier_id", { mode: "number" }),
  collectionCenter: varchar("collection_center", { length: 255 }),
  collectionDate: date("collection_date", { mode: "string" }),

  // Qualité / lot
  batchNumber: varchar("batch_number", { length: 100 }),
  motilityPct: int("motility_pct"),
  concentrationMillionPerMl: int("concentration_million_per_ml"),
  strawsPerDose: int("straws_per_dose").default(1),

  // Traits génétiques (JSON libre)
  geneticTraits: json("genetic_traits"),
  notes: text("notes"),

  // Stock
  strawsTotal: int("straws_total").notNull(),
  strawsRemaining: int("straws_remaining").notNull(),
  tankLocation: varchar("tank_location", { length: 100 }),
  pricePerDose: decimal("price_per_dose", { precision: 12, scale: 2 }),
  currencyId: bigint("currency_id", { mode: "number" }),

  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});
