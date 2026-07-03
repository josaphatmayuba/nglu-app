import {
  bigint,
  boolean,
  date,
  datetime,
  decimal,
  double,
  json,
  mediumtext,
  mysqlEnum,
  int,
  mysqlTable,
  serial,
  text,
  timestamp,
  tinyint,
  unique,
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
  // Identifiant PUBLIC opaque hexa (ex: org_a3f90c2b4d1e) expose dans les URLs/API.
  // La PK entiere reste interne (perf, FK). Le client ne voit jamais le numero.
  publicId: varchar("public_id", { length: 24 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  // Plan d abonnement choisi a l inscription (free|starter|business|enterprise).
  plan: varchar("plan", { length: 30 }).default("free").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const subAccounts = mysqlTable("subAccount", {
  id: serial("id").primaryKey(),
  // P2 multi-tenant : org denormalisee depuis le compte parent (migration 0176).
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  accountId: bigint("accountId", { mode: "number" }).notNull(),
  status: varchar("status", { length: 255 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const accounts = mysqlTable("account", {
  id: serial("id").primaryKey(),
  // P2 multi-tenant : plan comptable isole par organisation (migration 0176).
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const transactionTypes = mysqlTable("transaction_types", {
  id: serial("id").primaryKey(),
  // P2 multi-tenant : regles de transaction isolees par organisation (migration 0176).
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  debitAccountId: bigint("debit_account_id", { mode: "number" }).notNull(),
  creditAccountId: bigint("credit_account_id", { mode: "number" }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// === Coeur comptable moderne ERP/SIFA (migration 0105) ===
export const accountingPeriods = mysqlTable("accounting_periods", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const journalEntries = mysqlTable("journal_entries", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  date: datetime("date").notNull(),
  reference: varchar("reference", { length: 64 }),
  particulars: varchar("particulars", { length: 255 }).notNull(),
  sourceModule: varchar("source_module", { length: 64 }),
  relatedId: varchar("related_id", { length: 255 }),
  status: varchar("status", { length: 16 }).default("posted").notNull(),
  reversalOfId: bigint("reversal_of_id", { mode: "number", unsigned: true }),
  reversedById: bigint("reversed_by_id", { mode: "number", unsigned: true }),
  reason: varchar("reason", { length: 255 }),
  currencyId: bigint("currency_id", { mode: "number" }),
  exchangeRate: decimal("exchange_rate", { precision: 18, scale: 6 }),
  periodId: bigint("period_id", { mode: "number", unsigned: true }),
  idempotencyKey: varchar("idempotency_key", { length: 128 }),
  totalDebit: decimal("total_debit", { precision: 18, scale: 2 }).default("0").notNull(),
  totalCredit: decimal("total_credit", { precision: 18, scale: 2 }).default("0").notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  entryId: bigint("entry_id", { mode: "number", unsigned: true }).notNull(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  accountId: bigint("account_id", { mode: "number" }).notNull(),
  side: varchar("side", { length: 6 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  siteId: bigint("site_id", { mode: "number" }),
  departmentId: bigint("department_id", { mode: "number" }),
  projectId: bigint("project_id", { mode: "number" }),
  activityId: bigint("activity_id", { mode: "number" }),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Echange de devise (modele bancaire). Une operation = 2 ou 3 ecritures liees,
// chacune equilibree dans SA devise (pas de melange) : sortie devise source,
// entree devise cible, et frais optionnels. On stocke les VRAIS montants des
// deux cotes + le taux reel (jamais une valeur estimee). Le pont comptable est
// un sous-compte "Compte de change" par devise (l'ecart de change y apparait).
export const currencyExchanges = mysqlTable("currency_exchanges", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  date: datetime("date").notNull(),
  reference: varchar("reference", { length: 64 }),
  note: varchar("note", { length: 255 }),
  fromCurrencyId: bigint("from_currency_id", { mode: "number" }).notNull(),
  fromAccountId: bigint("from_account_id", { mode: "number" }).notNull(),
  fromAmount: decimal("from_amount", { precision: 18, scale: 2 }).notNull(),
  toCurrencyId: bigint("to_currency_id", { mode: "number" }).notNull(),
  toAccountId: bigint("to_account_id", { mode: "number" }).notNull(),
  toAmount: decimal("to_amount", { precision: 18, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 6 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  feeCurrencyId: bigint("fee_currency_id", { mode: "number" }),
  feeAccountId: bigint("fee_account_id", { mode: "number" }),
  fromEntryId: bigint("from_entry_id", { mode: "number", unsigned: true }),
  toEntryId: bigint("to_entry_id", { mode: "number", unsigned: true }),
  feeEntryId: bigint("fee_entry_id", { mode: "number", unsigned: true }),
  idempotencyKey: varchar("idempotency_key", { length: 128 }),
  status: varchar("status", { length: 16 }).default("posted").notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const transactionTypeRules = mysqlTable("transaction_type_rules", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  role: varchar("role", { length: 64 }).notNull(),
  accountId: bigint("account_id", { mode: "number" }).notNull(),
  side: varchar("side", { length: 6 }).notNull(),
  formula: varchar("formula", { length: 255 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// === Module Documents ERP/SIFA (migration 0114) ===
export const documents = mysqlTable("documents", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  type: varchar("type", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 512 }),
  mimeType: varchar("mime_type", { length: 128 }),
  contentHash: varchar("content_hash", { length: 128 }),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  uploadedBy: bigint("uploaded_by", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const documentLinks = mysqlTable("document_links", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  documentId: bigint("document_id", { mode: "number", unsigned: true }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Module Projects ERP/SIFA (migration 0115) — axe analytique + bailleur ===
export const projects = mysqlTable("projects", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  code: varchar("code", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  donor: varchar("donor", { length: 255 }),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budgetAmount: decimal("budget_amount", { precision: 18, scale: 2 }),
  currencyId: bigint("currency_id", { mode: "number" }),
  // Registre partage : source autoritaire du projet (principe SIFA). La future app de
  // gestion de projet posera source_system='project_mgmt' + external_ref = son id.
  sourceSystem: varchar("source_system", { length: 40 }).default("comptabilite").notNull(),
  externalRef: varchar("external_ref", { length: 120 }),
  status: varchar("status", { length: 32 }).default("active").notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// === Base de donnees de vaccins ANIMAUX FarmOS (migrations 0116/0117) ===
export const farmosVaccines = mysqlTable("farmos_vaccines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  commercialNames: varchar("commercial_names", { length: 512 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  species: varchar("species", { length: 255 }),
  targetDiseases: varchar("target_diseases", { length: 512 }),
  vaccineType: varchar("vaccine_type", { length: 128 }),
  dose: varchar("dose", { length: 255 }),
  route: varchar("route", { length: 128 }),
  primoAge: varchar("primo_age", { length: 128 }),
  boosterSchedule: varchar("booster_schedule", { length: 512 }),
  protectionDuration: varchar("protection_duration", { length: 128 }),
  treatmentDuration: varchar("treatment_duration", { length: 255 }),
  withdrawalMeat: varchar("withdrawal_meat", { length: 128 }),
  withdrawalMilk: varchar("withdrawal_milk", { length: 128 }),
  withdrawalEggs: varchar("withdrawal_eggs", { length: 128 }),
  sideEffects: text("side_effects"),
  contraindications: text("contraindications"),
  precautions: text("precautions"),
  storage: varchar("storage", { length: 255 }),
  packaging: varchar("packaging", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 512 }),
  registrationNo: varchar("registration_no", { length: 128 }),
  notes: text("notes"),
  isSeed: tinyint("is_seed").default(0).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// === Referentiel mondial de vaccins animaux (migrations 0119/0120) ===
export const vxSpecies = mysqlTable("vx_species", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  scientificName: varchar("scientific_name", { length: 150 }),
  commonNameEn: varchar("common_name_en", { length: 100 }),
  commonNameFr: varchar("common_name_fr", { length: 100 }),
  animalCategory: varchar("animal_category", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxPathogens = mysqlTable("vx_pathogens", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  pathogenType: varchar("pathogen_type", { length: 20 }),
  diseaseNameEn: varchar("disease_name_en", { length: 150 }),
  diseaseNameFr: varchar("disease_name_fr", { length: 150 }),
  isZoonotic: tinyint("is_zoonotic").default(0).notNull(),
  omsaCode: varchar("omsa_code", { length: 40 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxRegions = mysqlTable("vx_regions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  isoCode: varchar("iso_code", { length: 2 }),
  name: varchar("name", { length: 100 }).notNull(),
  regulatoryBody: varchar("regulatory_body", { length: 120 }),
  parentRegionId: bigint("parent_region_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxManufacturers = mysqlTable("vx_manufacturers", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  hqRegionId: bigint("hq_region_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxAntigens = mysqlTable("vx_antigens", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  pathogenId: bigint("pathogen_id", { mode: "number", unsigned: true }).notNull(),
  strainName: varchar("strain_name", { length: 100 }),
  antigenForm: varchar("antigen_form", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxVaccines = mysqlTable("vx_vaccines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  manufacturerId: bigint("manufacturer_id", { mode: "number", unsigned: true }),
  vaccineNature: varchar("vaccine_nature", { length: 30 }),
  physicalForm: varchar("physical_form", { length: 60 }),
  storageMinC: decimal("storage_min_c", { precision: 4, scale: 1 }),
  storageMaxC: decimal("storage_max_c", { precision: 4, scale: 1 }),
  sourceSystem: varchar("source_system", { length: 40 }),
  sourceUrl: varchar("source_url", { length: 400 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const vxVaccineAntigens = mysqlTable("vx_vaccine_antigens", {
  vaccineId: bigint("vaccine_id", { mode: "number", unsigned: true }).notNull(),
  antigenId: bigint("antigen_id", { mode: "number", unsigned: true }).notNull(),
  titerOrPotency: varchar("titer_or_potency", { length: 60 }),
});

export const vxVaccineSpecies = mysqlTable("vx_vaccine_species", {
  vaccineId: bigint("vaccine_id", { mode: "number", unsigned: true }).notNull(),
  speciesId: bigint("species_id", { mode: "number", unsigned: true }).notNull(),
});

export const vxRegistrations = mysqlTable("vx_registrations", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  vaccineId: bigint("vaccine_id", { mode: "number", unsigned: true }).notNull(),
  regionId: bigint("region_id", { mode: "number", unsigned: true }).notNull(),
  registrationNumber: varchar("registration_number", { length: 80 }),
  status: varchar("status", { length: 20 }).default("authorized").notNull(),
  authorizationDate: date("authorization_date"),
  expiryDate: date("expiry_date"),
  sourceSystem: varchar("source_system", { length: 40 }),
  sourceDocumentUrl: varchar("source_document_url", { length: 400 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxWithdrawalPeriods = mysqlTable("vx_withdrawal_periods", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  registrationId: bigint("registration_id", { mode: "number", unsigned: true }).notNull(),
  produceType: varchar("produce_type", { length: 20 }).notNull(),
  withdrawalDays: int("withdrawal_days"),
});

export const vxProtocols = mysqlTable("vx_protocols", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  vaccineId: bigint("vaccine_id", { mode: "number", unsigned: true }).notNull(),
  speciesId: bigint("species_id", { mode: "number", unsigned: true }).notNull(),
  sourceGuideline: varchar("source_guideline", { length: 40 }),
  protocolCategory: varchar("protocol_category", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vxProtocolSteps = mysqlTable("vx_protocol_steps", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  protocolId: bigint("protocol_id", { mode: "number", unsigned: true }).notNull(),
  stepOrder: int("step_order").default(1).notNull(),
  ageMinDays: int("age_min_days"),
  ageMaxDays: int("age_max_days"),
  intervalFromPrevDays: int("interval_from_prev_days"),
  doseAmount: decimal("dose_amount", { precision: 6, scale: 3 }),
  doseUnit: varchar("dose_unit", { length: 20 }),
  route: varchar("route", { length: 40 }),
});

export const vxConditions = mysqlTable("vx_conditions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  conditionType: varchar("condition_type", { length: 30 }).notNull(),
  operator: varchar("operator", { length: 10 }).notNull(),
  expectedValue: varchar("expected_value", { length: 200 }),
});

export const vxProtocolStepConditions = mysqlTable("vx_protocol_step_conditions", {
  protocolStepId: bigint("protocol_step_id", { mode: "number", unsigned: true }).notNull(),
  conditionId: bigint("condition_id", { mode: "number", unsigned: true }).notNull(),
  isMandatory: tinyint("is_mandatory").default(1).notNull(),
  logicGroup: int("logic_group"),
});

export const vxSynonymMap = mysqlTable("vx_synonym_map", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  entityType: varchar("entity_type", { length: 20 }).notNull(),
  rawValue: varchar("raw_value", { length: 200 }).notNull(),
  sourceSystem: varchar("source_system", { length: 40 }),
  canonicalId: bigint("canonical_id", { mode: "number", unsigned: true }).notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ETL : fouillage periodique des sources mondiales (migration 0125) ===
export const vxSyncRuns = mysqlTable("vx_sync_runs", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  sourceSystem: varchar("source_system", { length: 40 }).notNull(),
  status: varchar("status", { length: 20 }).default("running").notNull(),
  triggerMode: varchar("trigger_mode", { length: 20 }).default("manual").notNull(),
  rowsFetched: int("rows_fetched").default(0),
  rowsStaged: int("rows_staged").default(0),
  rowsUpserted: int("rows_upserted").default(0),
  rowsUnmapped: int("rows_unmapped").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const vxStagingProducts = mysqlTable("vx_staging_products", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  syncRunId: bigint("sync_run_id", { mode: "number", unsigned: true }).notNull(),
  sourceSystem: varchar("source_system", { length: 40 }).notNull(),
  sourceRef: varchar("source_ref", { length: 120 }),
  rawProductName: varchar("raw_product_name", { length: 300 }),
  rawManufacturer: varchar("raw_manufacturer", { length: 200 }),
  rawSpecies: varchar("raw_species", { length: 300 }),
  rawStatus: varchar("raw_status", { length: 60 }),
  rawPayload: json("raw_payload"),
  rowHash: varchar("row_hash", { length: 64 }).notNull(),
  processed: tinyint("processed").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Module Procurement + Stock ERP/SIFA (migration 0113) ===
export const warehouses = mysqlTable("warehouses", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 32 }),
  siteId: bigint("site_id", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const stockMovements = mysqlTable("stock_movements", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  warehouseId: bigint("warehouse_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  movementType: varchar("movement_type", { length: 16 }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 18, scale: 2 }),
  reference: varchar("reference", { length: 64 }),
  sourceModule: varchar("source_module", { length: 64 }),
  relatedId: varchar("related_id", { length: 64 }),
  note: varchar("note", { length: 255 }),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  reference: varchar("reference", { length: 64 }),
  supplierId: bigint("supplier_id", { mode: "number" }),
  warehouseId: bigint("warehouse_id", { mode: "number", unsigned: true }),
  status: varchar("status", { length: 16 }).default("draft").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  expectedDate: date("expected_date"),
  note: varchar("note", { length: 255 }),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrderLines = mysqlTable("purchase_order_lines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  purchaseOrderId: bigint("purchase_order_id", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 18, scale: 2 }).default("0").notNull(),
  receivedQuantity: decimal("received_quantity", { precision: 18, scale: 3 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goodsReceipts = mysqlTable("goods_receipts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  purchaseOrderId: bigint("purchase_order_id", { mode: "number", unsigned: true }).notNull(),
  warehouseId: bigint("warehouse_id", { mode: "number", unsigned: true }).notNull(),
  reference: varchar("reference", { length: 64 }),
  receivedBy: bigint("received_by", { mode: "number" }),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const goodsReceiptLines = mysqlTable("goods_receipt_lines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  goodsReceiptId: bigint("goods_receipt_id", { mode: "number", unsigned: true }).notNull(),
  purchaseOrderLineId: bigint("purchase_order_line_id", { mode: "number", unsigned: true }),
  productId: bigint("product_id", { mode: "number" }).notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 3 }).notNull(),
  unitCost: decimal("unit_cost", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ecritures comptables en attente d'approbation (migration 0112).
export const ledgerPendingEntries = mysqlTable("ledger_pending_entries", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  sourceModule: varchar("source_module", { length: 64 }).notNull(),
  relatedId: varchar("related_id", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  journalEntryId: bigint("journal_entry_id", { mode: "number", unsigned: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// Gate d'approbation centralisé (migration 0111) : modules exigeant une approbation workflow.
export const ledgerApprovalRequirements = mysqlTable("ledger_approval_requirements", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  sourceModule: varchar("source_module", { length: 64 }).notNull(),
  workflowKey: varchar("workflow_key", { length: 64 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// === Module Workflow ERP/SIFA (migration 0108) ===
export const workflows = mysqlTable("workflows", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  key: varchar("key", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  steps: json("steps").notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const workflowInstances = mysqlTable("workflow_instances", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  workflowId: bigint("workflow_id", { mode: "number", unsigned: true }).notNull(),
  entityType: varchar("entity_type", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }).notNull(),
  currentStep: int("current_step").default(0).notNull(),
  status: varchar("status", { length: 16 }).default("pending").notNull(),
  submittedBy: bigint("submitted_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const workflowApprovals = mysqlTable("workflow_approvals", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  instanceId: bigint("instance_id", { mode: "number", unsigned: true }).notNull(),
  step: int("step").notNull(),
  approverId: bigint("approver_id", { mode: "number" }),
  decision: varchar("decision", { length: 16 }).notNull(),
  comment: varchar("comment", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === Module Budget ERP/SIFA (migration 0109) ===
export const budgets = mysqlTable("budgets", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  periodId: bigint("period_id", { mode: "number", unsigned: true }),
  projectId: bigint("project_id", { mode: "number" }),
  currencyId: bigint("currency_id", { mode: "number" }),
  status: varchar("status", { length: 16 }).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const budgetLines = mysqlTable("budget_lines", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  budgetId: bigint("budget_id", { mode: "number", unsigned: true }).notNull(),
  accountId: bigint("account_id", { mode: "number" }).notNull(),
  siteId: bigint("site_id", { mode: "number" }),
  departmentId: bigint("department_id", { mode: "number" }),
  projectId: bigint("project_id", { mode: "number" }),
  activityId: bigint("activity_id", { mode: "number" }),
  plannedAmount: decimal("planned_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  label: varchar("label", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const budgetConsumptions = mysqlTable("budget_consumptions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  budgetLineId: bigint("budget_line_id", { mode: "number", unsigned: true }).notNull(),
  journalEntryId: bigint("journal_entry_id", { mode: "number", unsigned: true }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  // Pièce d'identité (type + numéro + copie scannée sur MinIO) — utilisée par le contrat de bail.
  idDocumentType: varchar("id_document_type", { length: 100 }),
  idNumber: varchar("id_number", { length: 100 }),
  idDocumentBucket: varchar("id_document_bucket", { length: 255 }),
  idDocumentKey: varchar("id_document_key", { length: 500 }),
  idDocumentMime: varchar("id_document_mime", { length: 100 }),
  idDocumentName: varchar("id_document_name", { length: 255 }),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  email: varchar("email", { length: 255 }),
  partyType: varchar("party_type", { length: 20 }).default("company").notNull(),
  supplierType: varchar("supplier_type", { length: 50 }).default("general").notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  rccm: varchar("rccm", { length: 100 }),
  nationalId: varchar("national_id", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  notes: text("notes"),
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

// Justificatifs (recus/factures scannes) lies a une ecriture de la table plate.
// Plusieurs pieces par transaction. Soft-delete via status (true/false).
export const transactionAttachments = mysqlTable("transaction_attachments", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  transactionId: bigint("transaction_id", { mode: "number" }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  mimetype: varchar("mimetype", { length: 100 }),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  status: varchar("status", { length: 16 }).default("true").notNull(),
  createdBy: bigint("created_by", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
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
  availableForBooking: tinyint("available_for_booking").default(0).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const realEstatePropertyPhotos = mysqlTable("real_estate_property_photos", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  unitId: bigint("unit_id", { mode: "number" }),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  objectKey: varchar("object_key", { length: 512 }).notNull(),
  originalName: varchar("original_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).default(0).notNull(),
  isPrimary: tinyint("is_primary").default(0).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
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
  availableForBooking: tinyint("available_for_booking").default(0).notNull(),
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
  // Ville de signature du contrat ("Fait à ...") — distincte de la ville du bien.
  signingCity: varchar("signing_city", { length: 255 }),
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

// Bail signé à la main par le locataire, scanné/photographié et importé pour archivage + consultation.
export const realEstateLeaseDocuments = mysqlTable("real_estate_lease_documents", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  leaseId: bigint("lease_id", { mode: "number" }).notNull(),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  objectKey: varchar("object_key", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  notes: varchar("notes", { length: 500 }),
  isActive: tinyint("is_active").default(1).notNull(),
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

// Réservation temporaire type hôtel : un client occupe un bien entier OU une
// unité sur une plage de dates, au tarif par jour. Indépendant du bail longue
// durée (real_estate_leases). Recette comptabilisée au check-out.
export const realEstateReservations = mysqlTable("real_estate_reservations", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  reference: varchar("reference", { length: 255 }).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  // NULL = bien entier ; sinon réservation d'une unité (chambre) du bien.
  unitId: bigint("unit_id", { mode: "number" }),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  guestPhone: varchar("guest_phone", { length: 50 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  // Si le client est déjà un locataire enregistré (facultatif).
  tenantId: bigint("tenant_id", { mode: "number" }),
  checkIn: date("check_in", { mode: "string" }).notNull(),
  checkOut: date("check_out", { mode: "string" }).notNull(),
  // Nombre de jours facturés (check_out − check_in, borne à 1 minimum).
  days: int("days").default(1).notNull(),
  dailyRate: decimal("daily_rate", { precision: 15, scale: 2 }).default("0").notNull(),
  // Coupon de reduction applique (facultatif) + montant de la remise en devise.
  couponId: bigint("coupon_id", { mode: "number" }),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  // totalAmount = NET encaisse (brut jours*tarif - remise). Compta au check-out.
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  depositAmount: decimal("deposit_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  // pending → confirmed → checked_in → checked_out · cancelled à tout moment.
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  // Transaction créée à la comptabilisation de la recette (au check-out).
  transactionId: bigint("transaction_id", { mode: "number" }),
  // Date d'encaissement si payé avant le check-out (indépendant du statut).
  paidAt: date("paid_at", { mode: "string" }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Coupons de reduction reutilisables pour les reservations temporaires (Domus).
// discount_type = percentage (discount_value = %) ou fixed (montant en devise).
export const realEstateCoupons = mysqlTable("real_estate_coupons", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  code: varchar("code", { length: 64 }).notNull(),
  description: varchar("description", { length: 255 }),
  discountType: varchar("discount_type", { length: 16 }).default("percentage").notNull(),
  discountValue: decimal("discount_value", { precision: 15, scale: 2 }).default("0").notNull(),
  // Devise pour les remises fixed (ignoree pour percentage).
  currencyId: bigint("currency_id", { mode: "number" }),
  validFrom: date("valid_from", { mode: "string" }),
  validTo: date("valid_to", { mode: "string" }),
  // Quota d utilisations (NULL = illimite) et compteur d usage.
  maxUses: int("max_uses"),
  usedCount: int("used_count").default(0).notNull(),
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
  // Chantier de travaux = projet analytique (lie au module Projets de la compta).
  projectId: bigint("project_id", { mode: "number" }),
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
  // Lien vers le referentiel central fournisseurs (compta). vendorName reste en fallback texte legacy.
  supplierId: bigint("supplier_id", { mode: "number" }),
  paymentMethod: varchar("payment_method", { length: 50 }).default("cash").notNull(),
  paymentDate: date("payment_date", { mode: "string" }),
  notes: text("notes"),
  receiptUrl: varchar("receipt_url", { length: 500 }),
  // Ventilation analytique : la depense est portee sur le projet du chantier.
  projectId: bigint("project_id", { mode: "number" }),
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
  // Bail signé à la main (papier) : scan/photo importé, lié à real_estate_lease_documents.
  signedDocumentId: bigint("signed_document_id", { mode: "number" }),
  // Message de bienvenue (email/SMS) envoyé au locataire après signature.
  welcomeMessageSentAt: timestamp("welcome_message_sent_at"),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  contractId: bigint("contract_id", { mode: "number" }).notNull(),
  event: varchar("event", { length: 100 }).notNull(),
  ip: varchar("ip", { length: 100 }),
  userAgent: varchar("user_agent", { length: 500 }),
  details: text("details"),
  createdAt: timestamp("created_at"),
});

// RBAC par bien (Domus, Phase 2) : affecte un utilisateur a un ou plusieurs
// biens (real_estate_properties). N IMPORTE QUEL user peut etre limite a 1..N
// biens, INDEPENDAMMENT du role et du poste : le role dit ce qu il peut faire,
// le bien sur quoi (baux/loyers/cautions de ces biens). Roles transverses
// (DG/Directeur/admin/super_owner) ignorent ce filtre (portee = tous biens).
// Scope par organisation. Soft-delete via is_active. unique (user_id, property_id).
export const realEstatePropertyAssignments = mysqlTable("real_estate_property_assignments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  propertyId: bigint("property_id", { mode: "number" }).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// Affectation utilisateur <-> chantier BatiPro (RBAC par chantier, Phase 2).
// Meme principe que farmos_species_assignments / real_estate_property_assignments :
// n importe quel user peut etre limite a 1..N chantiers, independamment du role
// et du poste. project_id -> batipro_projects. Soft-delete via is_active.
export const batiproProjectAssignments = mysqlTable("batipro_project_assignments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const employmentStatuses = mysqlTable("employmentStatus", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  colourValue: varchar("colourValue", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const educations = mysqlTable("education", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const shifts = mysqlTable("shifts", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 10 }).default("true").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const designationHistories = mysqlTable("designation_histories", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  periodStart: date("periodStart", { mode: "string" }),
  periodEnd: date("periodEnd", { mode: "string" }),
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt"),
  submittedBy: bigint("submittedBy", { mode: "number" }),
  approvedBy: bigint("approvedBy", { mode: "number" }),
  approvedAt: timestamp("approvedAt"),
  approvalComment: text("approvalComment"),
  rejectedBy: bigint("rejectedBy", { mode: "number" }),
  rejectedAt: timestamp("rejectedAt"),
  rejectionComment: text("rejectionComment"),
  paidAt: timestamp("paidAt"),
  paidBy: bigint("paidBy", { mode: "number" }),
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
  // Reflet du registre partage `projects` (principe SIFA). source_system='projects'
  // + external_ref = projects.id quand le projet vient de la compta/app projet.
  sourceSystem: varchar("source_system", { length: 40 }).default("hr").notNull(),
  externalRef: varchar("external_ref", { length: 120 }),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  halfDay: tinyint("halfDay").default(0).notNull(),
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
  submittedAt: timestamp("submittedAt"),
  submittedBy: bigint("submittedBy", { mode: "number" }),
  approvedBy: bigint("approvedBy", { mode: "number" }),
  approvedAt: timestamp("approvedAt"),
  approvalComment: text("approvalComment"),
  rejectedBy: bigint("rejectedBy", { mode: "number" }),
  rejectedAt: timestamp("rejectedAt"),
  rejectionComment: text("rejectionComment"),
  signedAt: timestamp("signedAt"),
  signedBy: varchar("signedBy", { length: 255 }),
  contentHash: varchar("contentHash", { length: 64 }),
  signatureToken: varchar("signatureToken", { length: 64 }),
  signatureAlgorithm: varchar("signatureAlgorithm", { length: 40 }),
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

// Évaluations candidat : grille de critères pondérés + score agrégé
export const hrCandidateEvaluations = mysqlTable("hr_candidate_evaluations", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  candidateId: bigint("candidateId", { mode: "number" }).notNull(),
  evaluatorId: bigint("evaluatorId", { mode: "number" }),
  criteria: json("criteria"),
  totalScore: double("total_score").default(0).notNull(),
  maxScore: double("max_score").default(0).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});

export const hrPersonalDocuments = mysqlTable("hr_personal_documents", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  filePath: varchar("filePath", { length: 500 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  version: int("version").default(1).notNull(),
  notes: text("notes"),
  uploadedBy: bigint("uploadedBy", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  // Identité du bailleur pour les contrats — distincte du nom de l'entreprise.
  landlordName: varchar("landlord_name", { length: 255 }),
  landlordPhone: varchar("landlord_phone", { length: 50 }),
  currencyId: bigint("currencyId", { mode: "number" }),
  payrollLockStage: varchar("payrollLockStage", { length: 20 }).default("paid").notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  id: serial("id").primaryKey(),
  date: datetime("date").notNull(),
  amount: double("amount").default(0).notNull(),
  saleInvoiceId: varchar("saleInvoiceId", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const paymentPurchaseInvoices = mysqlTable("paymentPurchaseInvoice", {
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  id: serial("id").primaryKey(),
  date: datetime("date").notNull(),
  amount: double("amount").default(0).notNull(),
  purchaseInvoiceId: varchar("purchaseInvoiceId", { length: 50 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// P2 multi-tenant (Phase 0) : roles isoles par organisation. organization_id=1
// pour tous les roles historiques. L unicite du nom devient (organization_id,
// name) — chaque org peut avoir son propre « manager ». Le permission check et
// l auth resolvent par roleId (jamais par nom), donc l ajout est non destructif.
export const roles = mysqlTable(
  "role",
  {
    id: serial("id").primaryKey(),
    organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    status: varchar("status", { length: 255 }).default("true").notNull(),
    isSystem: tinyint("is_system").default(0).notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => ({
    orgNameUnique: unique("uq_role_org_name").on(table.organizationId, table.name),
  }),
);

export const permissions = mysqlTable("permission", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 255 }).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// P2 multi-tenant (Phase 0) : organization_id denormalise depuis le role parent
// (=1 pour l historique). Le permission check reste par roleId ; ce champ sert au
// scope/coherence et a la copie de jeu de roles a la creation d une organisation.
export const rolePermissions = mysqlTable("rolePermission", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
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
  buildingId: bigint("building_id", { mode: "number" }),
  boxId: bigint("box_id", { mode: "number" }),
  zoneId: bigint("zone_id", { mode: "number" }),
  type: varchar("type", { length: 50 }),
  status: varchar("status", { length: 20 }).default("healthy").notNull(),
  withdrawalUntil: date("withdrawal_until", { mode: "string" }),
  withdrawalKind: varchar("withdrawal_kind", { length: 20 }),
  motherId: varchar("mother_id", { length: 100 }),
  fatherId: varchar("father_id", { length: 100 }),
  estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }),
  lastEvent: varchar("last_event", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosBoxes = mysqlTable("farmos_boxes", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  buildingId: bigint("building_id", { mode: "number" }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  section: varchar("section", { length: 30 }),
  capacity: int("capacity"),
  notes: text("notes"),
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
  // Lien vers le referentiel central fournisseurs (compta). supplier reste en fallback texte legacy.
  supplierId: bigint("supplier_id", { mode: "number" }),
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
  // Devise + facturation client (echeancier previsionnel forecast scope=batipro).
  currencyId: bigint("currency_id", { mode: "number" }),
  contractAmount: decimal("contract_amount", { precision: 14, scale: 2 }).default("0").notNull(),
  billedAmount: decimal("billed_amount", { precision: 14, scale: 2 }).default("0").notNull(),
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
  // Lien vers le referentiel central fournisseurs (compta). Le champ texte ci-dessus reste en fallback legacy.
  supplierId: bigint("supplier_id", { mode: "number" }),
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
  urgencyLevel: varchar("urgency_level", { length: 20 }),
  symptoms: text("symptoms"),
  prevention: text("prevention"),
  vaccineAvailable: tinyint("vaccine_available").default(0).notNull(),
  mortalityRisk: varchar("mortality_risk", { length: 20 }),
  recommendedProtocol: text("recommended_protocol"),
  possibleCauses: text("possible_causes"),
  recommendedExams: text("recommended_exams"),
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
  projectId: bigint("project_id", { mode: "number" }),
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

// Taches assignees a l'equipe (COMP-P1-010) — distinct de farmosWorkLogs.
export const farmosTasks = mysqlTable("farmos_tasks", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("todo").notNull(),
  priority: varchar("priority", { length: 20 }).default("medium").notNull(),
  assignedUserId: bigint("assigned_user_id", { mode: "number" }),
  dueDate: date("due_date", { mode: "string" }),
  animalId: bigint("animal_id", { mode: "number" }),
  lot: varchar("lot", { length: 255 }),
  buildingId: bigint("building_id", { mode: "number" }),
  zoneId: bigint("zone_id", { mode: "number" }),
  photoUrl: text("photo_url"),
  doneAt: timestamp("done_at"),
  createdBy: bigint("created_by", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// Notes terrain geolocalisees (COMP-P1-009).
export const farmosFieldNotes = mysqlTable("farmos_field_notes", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  note: text("note").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  zoneId: bigint("zone_id", { mode: "number" }),
  lot: varchar("lot", { length: 255 }),
  photoUrl: text("photo_url"),
  createdBy: bigint("created_by", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// Rapports personnalises sauvegardes (COMP-P2-017).
export const farmosSavedReports = mysqlTable("farmos_saved_reports", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  baseType: varchar("base_type", { length: 40 }).notNull(),
  config: json("config").$type<{ columns?: string[]; filters?: Record<string, unknown> } | null>(),
  createdBy: bigint("created_by", { mode: "number" }),
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
  examType: varchar("exam_type", { length: 50 }),
  reason: varchar("reason", { length: 500 }),
  anamnesis: text("anamnesis"),
  clinicalExam: text("clinical_exam"),
  differentialDiagnosis: text("differential_diagnosis"),
  protocol: text("protocol"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  diagnosis: text("diagnosis"),
  labTests: text("lab_tests"),
  labResults: text("lab_results"),
  recommendation: text("recommendation"),
  followup: text("followup"),
  notes: text("notes"),
  signature: mediumtext("signature"),
  signedAt: timestamp("signed_at"),
  signedBy: varchar("signed_by", { length: 255 }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosVetPrescriptions = mysqlTable("farmos_vet_prescriptions", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  examId: bigint("exam_id", { mode: "number" }).notNull(),
  medicineId: bigint("medicine_id", { mode: "number" }),
  medicineName: varchar("medicine_name", { length: 255 }),
  dosage: varchar("dosage", { length: 255 }),
  frequency: varchar("frequency", { length: 255 }),
  duration: varchar("duration", { length: 255 }),
  route: varchar("route", { length: 50 }),
  withdrawalMeatDays: int("withdrawal_meat_days"),
  withdrawalMilkHours: int("withdrawal_milk_hours"),
  withdrawalEggsDays: int("withdrawal_eggs_days"),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  eventTime: varchar("event_time", { length: 8 }),
  barn: varchar("barn", { length: 100 }),
  lot: varchar("lot", { length: 100 }),
  confirmedCause: varchar("confirmed_cause", { length: 255 }),
  relatedDiseaseId: bigint("related_disease_id", { mode: "number" }),
  preDeathSymptoms: text("pre_death_symptoms"),
  vetConsulted: varchar("vet_consulted", { length: 255 }),
  estimatedLoss: decimal("estimated_loss", { precision: 12, scale: 2 }),
  necropsyDone: tinyint("necropsy_done").default(0).notNull(),
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

export const farmosDocuments = mysqlTable("farmos_documents", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }),
  examId: bigint("exam_id", { mode: "number" }),
  docType: varchar("doc_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }),
  contentType: varchar("content_type", { length: 100 }),
  sizeBytes: int("size_bytes"),
  dataUrl: mediumtext("data_url").notNull(),
  issuedDate: date("issued_date", { mode: "string" }),
  notes: text("notes"),
  uploadedBy: bigint("uploaded_by", { mode: "number" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const farmosFarms = mysqlTable("farmos_farms", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  hectares: decimal("hectares", { precision: 8, scale: 2 }),
  status: varchar("status", { length: 30 }).default("active").notNull(),
  description: text("description"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosZones = mysqlTable("farmos_zones", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  farmId: bigint("farm_id", { mode: "number" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosBuildings = mysqlTable("farmos_buildings", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  zoneId: bigint("zone_id", { mode: "number" }),
  name: varchar("name", { length: 255 }).notNull(),
  species: varchar("species", { length: 50 }),
  type: varchar("type", { length: 50 }),
  buildingKind: varchar("building_kind", { length: 50 }),
  capacity: int("capacity"),
  posX: decimal("pos_x", { precision: 6, scale: 2 }),
  posY: decimal("pos_y", { precision: 6, scale: 2 }),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  humidity: decimal("humidity", { precision: 5, scale: 2 }),
  manager: varchar("manager", { length: 255 }),
  hygieneStatus: varchar("hygiene_status", { length: 30 }),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

export const farmosLandFeatures = mysqlTable("farmos_land_features", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  zoneId: bigint("zone_id", { mode: "number" }),
  type: varchar("type", { length: 30 }).notNull(),
  label: varchar("label", { length: 255 }),
  posX: decimal("pos_x", { precision: 6, scale: 2 }).default("0").notNull(),
  posY: decimal("pos_y", { precision: 6, scale: 2 }).default("0").notNull(),
  width: decimal("width", { precision: 6, scale: 2 }),
  height: decimal("height", { precision: 6, scale: 2 }),
  meta: json("meta"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
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
  buildingId: bigint("building_id", { mode: "number" }),
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

export const farmosWeighings = mysqlTable("farmos_weighings", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  animalId: bigint("animal_id", { mode: "number" }).notNull(),
  weighDate: date("weigh_date", { mode: "string" }).notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
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
  // Indicateurs de portee / sevrage (COMP-P2-007). offspringCount = nes vivants.
  stillbornCount: int("stillborn_count"),
  mummifiedCount: int("mummified_count"),
  avgBirthWeight: decimal("avg_birth_weight", { precision: 7, scale: 2 }),
  birthDifficulty: varchar("birth_difficulty", { length: 20 }),
  weanedCount: int("weaned_count"),
  weaningDate: date("weaning_date", { mode: "string" }),
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

// RBAC par espece (Phase 2) : affecte un utilisateur a une ou plusieurs especes
// FarmOS. N IMPORTE QUEL user (employe, veterinaire, superviseur...) peut etre
// limite a 1..N especes, INDEPENDAMMENT du role et du poste : le role dit ce
// qu il peut faire, l espece sur quoi. Les roles transverses
// (DG/Directeur/admin/super_owner) ignorent ce filtre (portee = toutes especes).
// Une espece = varchar, coherent avec farmos_animals.species. unique (user_id, species).
export const farmosSpeciesAssignments = mysqlTable("farmos_species_assignments", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  species: varchar("species", { length: 50 }).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});

// Tax / cotisation rules per country
export const hrTaxRules = mysqlTable("hr_tax_rules", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  countryCode: varchar("country_code", { length: 10 }).notNull(),
  countryName: varchar("country_name", { length: 100 }).notNull(),
  cnssEmployeeRate: double("cnss_employee_rate").default(0).notNull(),
  cnssEmployerRate: double("cnss_employer_rate").default(0).notNull(),
  iprRate: double("ipr_rate").default(0).notNull(),
  iprThreshold: double("ipr_threshold").default(0).notNull(),
  iprBrackets: json("ipr_brackets"),
  notes: text("notes"),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});

// Droits de congés par pays/type (country_code='*' = défaut)
export const hrLeaveEntitlements = mysqlTable("hr_leave_entitlements", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  countryCode: varchar("country_code", { length: 10 }).default("*").notNull(),
  leaveType: varchar("leave_type", { length: 80 }).notNull(),
  contractType: varchar("contract_type", { length: 80 }),
  entitlementDays: double("entitlement_days").default(0).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});

// Jours fériés par pays (exclus du décompte de congés)
export const hrPublicHolidays = mysqlTable("hr_public_holidays", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  countryCode: varchar("country_code", { length: 10 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").onUpdateNow(),
});

// Trace des previsions (boucle prevu vs reel) : net prevu pour un mois cible,
// fige a une date donnee. Compare au reel pour mesurer l'ecart (auto-correction).
export const forecastSnapshots = mysqlTable("forecast_snapshots", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  takenAt: date("taken_at", { mode: "string" }).notNull(),
  targetMonth: varchar("target_month", { length: 7 }).notNull(),
  scope: varchar("scope", { length: 20 }).default("all").notNull(),
  mode: varchar("mode", { length: 20 }).default("prudent").notNull(),
  currencyId: bigint("currency_id", { mode: "number" }),
  predictedNet: decimal("predicted_net", { precision: 15, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// References externes (couche 2) saisies a la main : prix marche/region, taux de
// reference, etc. Hypothese affichable avec badge de provenance, jamais du N1.
export const forecastExternalRefs = mysqlTable("forecast_external_refs", {
  id: serial("id").primaryKey(),
  organizationId: bigint("organization_id", { mode: "number" }).default(1).notNull(),
  kind: varchar("kind", { length: 40 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  region: varchar("region", { length: 120 }),
  value: decimal("value", { precision: 15, scale: 4 }).default("0").notNull(),
  unit: varchar("unit", { length: 40 }),
  currencyId: bigint("currency_id", { mode: "number" }),
  source: varchar("source", { length: 40 }).default("manual").notNull(),
  validFrom: date("valid_from", { mode: "string" }),
  isActive: tinyint("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
});
