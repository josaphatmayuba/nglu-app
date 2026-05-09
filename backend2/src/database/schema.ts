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
