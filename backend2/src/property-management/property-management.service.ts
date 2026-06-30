import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { join } from "path";
import { and, desc, eq, getTableColumns, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { IMAGE_OR_PDF_MIME_TYPES, saveValidatedUploadFile } from "../common/upload-security";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  emailTemplates,
  realEstateContracts,
  realEstateLeases,
  realEstateMaintenanceCosts,
  realEstateMaintenanceRequests,
  realEstateProperties,
  realEstatePropertyAssignments,
  realEstateRentPayments,
  realEstateSecurityDeposits,
  realEstateUnits,
  roles,
  subAccounts,
  tenantDetails,
  tenantOnboardings,
  transactions,
  transactionTypes,
  users,
} from "../database/schema";
import type { Database } from "../database/types";
import { readOrgAppSetting } from "../app-settings/org-app-setting";
import type { DataUpdateAction, DataUpdateScope } from "../realtime/data-update-event";
import { CompatService } from "../compat/compat.service";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import { SystemEmailService } from "../system-email/system-email.service";
import { LedgerService } from "../ledger/ledger.service";
import { ProjectsService } from "../projects/projects.service";
import { WorkflowService } from "../workflow/workflow.service";
import { normalizePhoneE164, normalizePhoneE164Strict } from "../common/phone.util";
import {
  CreateLeaseDto,
  CreateMaintenanceCostDto,
  CreateMaintenanceDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  CollectDepositDto,
  ReturnDepositDto,
  CreateTenantDto,
  UpdateTenantDto,
  CreateUnitDto,
  GenerateTenantOnboardingDto,
  SaveTenantOnboardingDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
  UpdatePropertyDto,
  UpdateUnitDto,
} from "./dto/property-management.dto";

const leaseProperty = alias(realEstateProperties, "leaseProperty");
const leaseUnit = alias(realEstateUnits, "leaseUnit");
const paymentLease = alias(realEstateLeases, "paymentLease");
const paymentProperty = alias(realEstateProperties, "paymentProperty");
const paymentUnit = alias(realEstateUnits, "paymentUnit");
const maintenanceProperty = alias(realEstateProperties, "maintenanceProperty");
const maintenanceUnit = alias(realEstateUnits, "maintenanceUnit");
const maintenanceAssignee = alias(users, "maintenanceAssignee");
const unitCurrency = alias(currencies, "unitCurrency");

@Injectable()
export class PropertyManagementService {
  private readonly logger = new Logger(PropertyManagementService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtimeData: RealtimeDataPublisher,
    private readonly emails: SystemEmailService,
    private readonly sms: CompatService,
    private readonly ledger: LedgerService,
    private readonly workflow: WorkflowService,
    private readonly projects: ProjectsService,
  ) {}

  /** Approuve un cout de maintenance ; comptabilise a l'approbation finale. */
  async approveMaintenanceCost(costId: number, comment: string | undefined, orgId: number, userId?: number) {
    const instances = await this.workflow.listInstances(orgId, "pending");
    const inst = instances.find(
      (i: any) => i.entityType === "maintenance" && i.entityId === String(costId),
    );
    if (!inst) throw new BadRequestException("Aucune instance d'approbation en attente pour ce cout.");
    const result = await this.workflow.approve((inst as any).id, comment, orgId, userId);
    if (result.status === "approved") {
      await this.ledger.approveAndPost("maintenance", String(costId), orgId, userId);
    }
    return { costId, approval: result };
  }

  async dashboard(orgId: number) {
    const [properties] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateProperties)
      .where(and(ne(realEstateProperties.status, "false"), eq(realEstateProperties.isActive, 1), eq(realEstateProperties.organizationId, orgId)));
    const [units] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .where(and(
        ne(realEstateUnits.status, "false"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateUnits.organizationId, orgId),
      ));
    const [vacantUnits] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .where(and(
        eq(realEstateUnits.status, "vacant"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateUnits.organizationId, orgId),
      ));
    const [occupiedUnits] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .where(and(
        eq(realEstateUnits.status, "occupied"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateUnits.organizationId, orgId),
      ));
    const [activeLeases] = await this.db
      .select({
        count: sql<number>`count(*)`,
        monthlyRent: sql<string>`coalesce(sum(${realEstateLeases.rentAmount}), 0)`,
      })
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.status, "active"), eq(realEstateLeases.organizationId, orgId)));
    const [collectedRent] = await this.db
      .select({ total: sql<string>`coalesce(sum(${realEstateRentPayments.amount}), 0)` })
      .from(realEstateRentPayments)
      .where(eq(realEstateRentPayments.organizationId, orgId));
    const [openMaintenance] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateMaintenanceRequests)
      .where(and(
        inArray(realEstateMaintenanceRequests.status, ["open", "in_progress"]),
        eq(realEstateMaintenanceRequests.isActive, true),
        eq(realEstateMaintenanceRequests.organizationId, orgId),
      ));

    return {
      properties: Number(properties.count),
      units: Number(units.count),
      vacantUnits: Number(vacantUnits.count),
      occupiedUnits: Number(occupiedUnits.count),
      activeLeases: Number(activeLeases.count),
      monthlyRent: Number(activeLeases.monthlyRent),
      collectedRent: Number(collectedRent.total),
      openMaintenance: Number(openMaintenance.count),
    };
  }

  tenants(orgId: number) {
    return this.tenantQuery(undefined, orgId).orderBy(desc(customers.id));
  }

  private tenantQuery(customerId?: number, orgId?: number) {
    const tenantWhere = and(
      eq(customers.status, "true"),
      inArray(roles.name, ["Locataire", "locataire", "tenant"]),
      ...(orgId !== undefined ? [eq(customers.organizationId, orgId)] : []),
    );
    const where = customerId ? and(tenantWhere, eq(customers.id, customerId)) : tenantWhere;

    return this.db
      .select({
        id: customers.id,
        username: customers.username,
        firstName: customers.firstName,
        lastName: customers.lastName,
        email: customers.email,
        phone: customers.phone,
        address: customers.address,
        roleId: customers.roleId,
        status: customers.status,
        birthDate: tenantDetails.birthDate,
        sex: tenantDetails.sex,
        nationality: tenantDetails.nationality,
        maritalStatus: tenantDetails.maritalStatus,
        originProvince: tenantDetails.originProvince,
        phone2: tenantDetails.phone2,
        contactedPerson: tenantDetails.contactedPerson,
        contactedPersonPhoneNumber: tenantDetails.contactedPersonPhoneNumber,
        professionalStatus: tenantDetails.professionalStatus,
        mainActivity: tenantDetails.mainActivity,
        entityName: tenantDetails.entityName,
        entityAddress: tenantDetails.entityAddress,
        hiringDate: tenantDetails.hiringDate,
        contractType: tenantDetails.contractType,
        monthlyPay: tenantDetails.monthlyPay,
        salaryCurrencyId: tenantDetails.salaryCurrencyId,
        otherMonthlyIncome: tenantDetails.otherMonthlyIncome,
        oldAddress: tenantDetails.oldAddress,
        oldLessor: tenantDetails.oldLessor,
        movingReason: tenantDetails.movingReason,
        occupantNumber: tenantDetails.occupantNumber,
        partenairName: tenantDetails.partenairName,
        partenairNumber: tenantDetails.partenairNumber,
        childNumber: tenantDetails.childNumber,
        childAges: tenantDetails.childAges,
      })
      .from(customers)
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, customers.id))
      .leftJoin(roles, eq(roles.id, customers.roleId))
      .where(where);
  }

  async createTenant(input: CreateTenantDto, orgId: number) {
    return this.createTenantRecord(input, orgId);
  }

  async updateTenant(id: number, input: UpdateTenantDto, orgId: number) {
    const existing = await this.findTenant(id, orgId);
    if (!existing) {
      throw new NotFoundException("Locataire introuvable.");
    }

    // Champs de base sur le customer (uniquement ceux fournis).
    const customerSet: Record<string, unknown> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    if (input.firstName !== undefined) customerSet.firstName = input.firstName;
    if (input.lastName !== undefined) customerSet.lastName = input.lastName;
    if (input.email !== undefined) customerSet.email = input.email || null;
    if (input.phone !== undefined) customerSet.phone = input.phone;
    if (input.address !== undefined) customerSet.address = input.address;
    await this.db
      .update(customers)
      .set(customerSet)
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)));

    // Détails locataire (uniquement les champs fournis).
    const detail: Record<string, unknown> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    if (input.birth_date !== undefined) detail.birthDate = input.birth_date;
    if (input.sex !== undefined) detail.sex = input.sex;
    if (input.nationality !== undefined) detail.nationality = input.nationality;
    if (input.marital_status !== undefined) detail.maritalStatus = input.marital_status;
    if (input.origin_province !== undefined) detail.originProvince = input.origin_province ?? "";
    if (input.phone2 !== undefined) detail.phone2 = input.phone2 ?? null;
    if (input.contacted_person !== undefined) detail.contactedPerson = input.contacted_person;
    if (input.contacted_person_phone_number !== undefined) detail.contactedPersonPhoneNumber = input.contacted_person_phone_number;
    if (input.prossional_status !== undefined) detail.professionalStatus = input.prossional_status;
    if (input.main_activity !== undefined) detail.mainActivity = input.main_activity;
    if (input.entity_name !== undefined) detail.entityName = input.entity_name;
    if (input.entity_address !== undefined) detail.entityAddress = input.entity_address ?? "";
    if (input.hiring_date !== undefined) detail.hiringDate = input.hiring_date ?? null;
    if (input.contract_type !== undefined) detail.contractType = input.contract_type;
    if (input.monthly_pay !== undefined) detail.monthlyPay = this.money(input.monthly_pay);
    if (input.salary_currency_id !== undefined) detail.salaryCurrencyId = input.salary_currency_id ?? null;
    if (input.other_monthly_income !== undefined)
      detail.otherMonthlyIncome = input.other_monthly_income == null ? null : this.money(input.other_monthly_income);
    if (input.old_address !== undefined) detail.oldAddress = input.old_address;
    if (input.old_lessor !== undefined) detail.oldLessor = input.old_lessor;
    if (input.moving_reason !== undefined) detail.movingReason = input.moving_reason;
    if (input.occupant_number !== undefined) detail.occupantNumber = input.occupant_number;
    if (input.partenair_name !== undefined) detail.partenairName = input.partenair_name ?? null;
    if (input.partenair_number !== undefined) detail.partenairNumber = input.partenair_number ?? null;
    if (input.child_number !== undefined) detail.childNumber = input.child_number ?? 0;
    if (input.child_age !== undefined) detail.childAges = input.child_age?.length ? JSON.stringify(input.child_age) : null;

    const detailRows = await this.db
      .select({ id: tenantDetails.id })
      .from(tenantDetails)
      .where(eq(tenantDetails.customerId, id));
    if (detailRows.length) {
      await this.db.update(tenantDetails).set(detail).where(eq(tenantDetails.customerId, id));
    } else {
      // Cas défensif : le locataire n'a pas (encore) de ligne tenant_details.
      await this.db.insert(tenantDetails).values({
        customerId: id,
        birthDate: input.birth_date ?? "1970-01-01",
        sex: input.sex ?? "M",
        nationality: input.nationality ?? "",
        maritalStatus: input.marital_status ?? "",
        originProvince: input.origin_province ?? "",
        phone2: input.phone2 ?? null,
        contactedPerson: input.contacted_person ?? "",
        contactedPersonPhoneNumber: input.contacted_person_phone_number ?? "",
        professionalStatus: input.prossional_status ?? "",
        mainActivity: input.main_activity ?? "",
        entityName: input.entity_name ?? "",
        entityAddress: input.entity_address ?? "",
        hiringDate: input.hiring_date ?? null,
        contractType: input.contract_type ?? "",
        monthlyPay: this.money(input.monthly_pay),
        salaryCurrencyId: input.salary_currency_id ?? null,
        otherMonthlyIncome:
          input.other_monthly_income === undefined || input.other_monthly_income === null
            ? null
            : this.money(input.other_monthly_income),
        oldAddress: input.old_address ?? null,
        oldLessor: input.old_lessor ?? null,
        movingReason: input.moving_reason ?? null,
        occupantNumber: input.occupant_number ?? 1,
        partenairName: input.partenair_name ?? null,
        partenairNumber: input.partenair_number ?? null,
        childNumber: input.child_number ?? 0,
        childAges: input.child_age?.length ? JSON.stringify(input.child_age) : null,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    return this.findTenant(id, orgId);
  }

  async generateTenantOnboarding(input: GenerateTenantOnboardingDto) {
    // SCRUM-229 — store the phone identifier in canonical E.164.
    const phoneE164 = normalizePhoneE164Strict(input.phone);
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
    const data = JSON.stringify({
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email ?? null,
      phone: phoneE164,
    });

    const [result] = await this.db.insert(tenantOnboardings).values({
      phone: phoneE164,
      tokenHash,
      token,
      status: "sent",
      data,
      expiresAt,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const onboarding = await this.findOnboarding(Number(result.insertId));
    const response = this.adminOnboardingResponse(onboarding);

    await this.publishOnboardingUpdate("created", onboarding.id);

    // L'envoi SMS/email se fait uniquement quand l'utilisateur clique sur les
    // boutons dédiés dans la modal (TenantOnboardingLinkModal).
    return response;
  }

  async sendOnboardingEmail(input: { email: string; url: string; firstName?: string | null }) {
    if (!input?.email || !input?.url) {
      throw new BadRequestException("email and url are required.");
    }
    const company = await readOrgAppSetting(this.db, 1, { name: appSettings.companyName });
    const companyName = (company?.name as string | null) || "votre gestionnaire";
    const greeting = input.firstName ? `Bonjour ${input.firstName}` : "Bonjour";
    const html =
      `<p>${greeting},</p>` +
      `<p>Voici votre lien d'inscription en tant que locataire. Veuillez cliquer sur ce lien :</p>` +
      `<p><a href="${input.url}">${input.url}</a></p>` +
      `<p>Merci de le compléter dès que possible.</p>` +
      `<p>Cordialement,<br>${companyName}</p>`;
    try {
      await this.emails.send({
        to: input.email,
        subject: "Votre lien d'inscription locataire",
        html,
        type: "form_link",
        relatedType: "tenant-onboarding",
      });
      return { success: true, message: "Email envoyé." };
    } catch (error) {
      this.logger.warn(
        `Onboarding link email error to ${input.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { success: false, message: "Impossible d'envoyer l'email." };
    }
  }


  async onboardingList() {
    const rows = await this.db
      .select({
        id: tenantOnboardings.id,
        phone: tenantOnboardings.phone,
        token: tenantOnboardings.token,
        status: tenantOnboardings.status,
        data: tenantOnboardings.data,
        expiresAt: tenantOnboardings.expiresAt,
        submittedAt: tenantOnboardings.submittedAt,
        validatedAt: tenantOnboardings.validatedAt,
        customerId: tenantOnboardings.customerId,
        createdAt: tenantOnboardings.createdAt,
        updatedAt: tenantOnboardings.updatedAt,
      })
      .from(tenantOnboardings)
      .where(ne(tenantOnboardings.status, "deleted"))
      .orderBy(desc(tenantOnboardings.id));

    return rows.map((row) => this.adminOnboardingResponse(row));
  }

  async deleteOnboarding(id: number) {
    const onboarding = await this.findOnboarding(id);
    if (onboarding.status === "validated") {
      throw new BadRequestException(
        "Impossible de supprimer : ce dossier est validé et lié à un locataire.",
      );
    }
    await this.db
      .update(tenantOnboardings)
      .set({ status: "deleted", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(tenantOnboardings.id, id));
    await this.publishOnboardingUpdate("deleted", id);
    return { message: "Dossier d'inscription supprimé." };
  }

  // SCRUM-229 — normalize every phone field on an onboarding payload to E.164.
  // Empty/optional fields are left null; invalid input throws so the API
  // returns a clear error rather than silently storing a malformed number.
  private normalizeOnboardingPhones<T extends Record<string, any>>(
    input: T,
    options: { lenient?: boolean } = {},
  ): T {
    const phoneFields = ["phone", "phone2", "partenair_number", "contacted_person_phone_number"] as const;
    const next: Record<string, any> = { ...input };
    for (const f of phoneFields) {
      if (next[f] === undefined) continue;
      if (!next[f]) { next[f] = null; continue; }
      if (options.lenient) {
        const cleaned = normalizePhoneE164(next[f]);
        next[f] = cleaned ?? next[f];
      } else {
        next[f] = normalizePhoneE164Strict(next[f]);
      }
    }
    return next as T;
  }

  async saveOnboardingByAdmin(id: number, input: SaveTenantOnboardingDto) {
    const onboarding = await this.findOnboarding(id);
    if (onboarding.status === "validated") {
      throw new BadRequestException("This onboarding dossier has already been validated.");
    }
    const normalized = this.normalizeOnboardingPhones(input, { lenient: true });
    await this.updateOnboardingData(id, { ...this.parseOnboardingData(onboarding.data), ...normalized }, "draft");
    return this.adminOnboardingResponse(await this.findOnboarding(id));
  }

  async validateOnboarding(id: number, orgId: number) {
    const onboarding = await this.findOnboarding(id);
    if (onboarding.status === "validated") {
      throw new BadRequestException("This onboarding dossier has already been validated.");
    }

    const payload = this.validatedTenantPayload(this.parseOnboardingData(onboarding.data), onboarding.phone);
    const customer = await this.createTenantRecord(payload, orgId);

    await this.db
      .update(tenantOnboardings)
      .set({
        status: "validated",
        customerId: customer.id,
        validatedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantOnboardings.id, id));

    await this.publishOnboardingUpdate("status_changed", id);

    return { ...this.adminOnboardingResponse(await this.findOnboarding(id)), customer };
  }

  async getPublicOnboarding(token: string) {
    const onboarding = await this.getActiveOnboardingByToken(token, false);
    // SCRUM-229 — expose the active currency list + company default so the
    // public form can render a currency picker next to the salary fields
    // without needing an authenticated /currency call.
    const activeCurrencies = await this.db
      .select({
        id: currencies.id,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(currencies)
      .where(eq(currencies.status, "true"));
    const setting = await readOrgAppSetting(this.db, 1, { currencyId: appSettings.currencyId });
    return {
      id: onboarding.id,
      phone: onboarding.phone,
      status: onboarding.status,
      data: this.parseOnboardingData(onboarding.data),
      expiresAt: onboarding.expiresAt,
      currencies: activeCurrencies,
      defaultCurrencyId: (setting?.currencyId as number | null) ?? null,
    };
  }

  async savePublicOnboarding(token: string, input: SaveTenantOnboardingDto) {
    const onboarding = await this.getActiveOnboardingByToken(token, true);
    const normalized = this.normalizeOnboardingPhones(input, { lenient: true });
    const nextData = { ...this.parseOnboardingData(onboarding.data), ...normalized, phone: onboarding.phone };
    await this.updateOnboardingData(onboarding.id, nextData, "draft");
    return this.getPublicOnboarding(token);
  }

  async submitPublicOnboarding(token: string, input: SaveTenantOnboardingDto) {
    const onboarding = await this.getActiveOnboardingByToken(token, true);
    const normalized = this.normalizeOnboardingPhones(input);
    const nextData = { ...this.parseOnboardingData(onboarding.data), ...normalized, phone: onboarding.phone };
    this.validatedTenantPayload(nextData, onboarding.phone);
    await this.db
      .update(tenantOnboardings)
      .set({
        data: JSON.stringify(nextData),
        status: "submitted",
        submittedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantOnboardings.id, onboarding.id));

    await this.publishOnboardingUpdate("status_changed", onboarding.id);

    return {
      id: onboarding.id,
      status: "submitted",
      message: "Dossier soumis avec succès.",
    };
  }

  private async createTenantRecord(input: CreateTenantDto, orgId: number) {
    await this.ensureTenantForm(input);
    if (input.email) {
      await this.ensureCustomerEmailAvailable(input.email);
    }

    const tenantRole = await this.getTenantRole();
    const password = await bcrypt.hash(randomBytes(12).toString("hex"), 10);
    const username = input.username || this.usernameFromEmail(input.email) || input.phone || `${input.firstName}${input.lastName}`;

    const customerId = await this.db.transaction(async (tx) => {
      const [customerResult] = await tx.insert(customers).values({
        organizationId: orgId,
        username,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone,
        address: input.address,
        password,
        roleId: tenantRole.id,
        isLogin: "false",
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });

      const createdCustomerId = Number(customerResult.insertId);
      await tx.insert(tenantDetails).values({
        customerId: createdCustomerId,
        birthDate: input.birth_date,
        sex: input.sex,
        nationality: input.nationality,
        maritalStatus: input.marital_status,
        originProvince: input.origin_province ?? "",
        phone2: input.phone2 ?? null,
        contactedPerson: input.contacted_person,
        contactedPersonPhoneNumber: input.contacted_person_phone_number,
        professionalStatus: input.prossional_status,
        mainActivity: input.main_activity,
        entityName: input.entity_name,
        entityAddress: input.entity_address ?? "",
        hiringDate: input.hiring_date ?? null,
        contractType: input.contract_type,
        monthlyPay: this.money(input.monthly_pay),
        salaryCurrencyId: input.salary_currency_id ?? null,
        otherMonthlyIncome:
          input.other_monthly_income === undefined || input.other_monthly_income === null
            ? null
            : this.money(input.other_monthly_income),
        oldAddress: input.old_address,
        oldLessor: input.old_lessor,
        movingReason: input.moving_reason,
        occupantNumber: input.occupant_number,
        partenairName: input.partenair_name ?? null,
        partenairNumber: input.partenair_number ?? null,
        childNumber: input.child_number ?? 0,
        childAges: input.child_age?.length ? JSON.stringify(input.child_age) : null,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });

      return createdCustomerId;
    });

    return this.findTenant(customerId, orgId);
  }

  // ── Helpers RBAC par bien (Domus, Phase 2) ───────────────────────────────
  // Filtre DIRECT sur l id du bien (table real_estate_properties). "all" => pas
  // de filtre ; liste vide => aucun resultat.
  private propertyDirectFilter(column: any, scope: "all" | number[]) {
    if (scope === "all") return undefined;
    return scope.length ? inArray(column, scope) : sql`1 = 0`;
  }

  // Filtre VIA une colonne property_id (baux : property_id direct). Les lignes
  // sans property_id restent visibles (fail-open).
  private propertyViaColumnFilter(propertyIdColumn: any, scope: "all" | number[]) {
    if (scope === "all") return undefined;
    if (!scope.length) return sql`1 = 0`;
    return inArray(propertyIdColumn, scope);
  }

  async properties(orgId: number, propertyScope: "all" | number[] = "all") {
    const scopeFilter = this.propertyDirectFilter(realEstateProperties.id, propertyScope);
    const rows = await this.db
      .select({
        id: realEstateProperties.id,
        name: realEstateProperties.name,
        code: realEstateProperties.code,
        propertyType: realEstateProperties.propertyType,
        status: realEstateProperties.status,
        isActive: realEstateProperties.isActive,
        address: realEstateProperties.address,
        city: realEstateProperties.city,
        country: realEstateProperties.country,
        floors: realEstateProperties.floors,
        parkingSpaces: realEstateProperties.parkingSpaces,
        marketValue: realEstateProperties.marketValue,
        defaultRent: realEstateProperties.defaultRent,
        currencyId: realEstateProperties.currencyId,
        description: realEstateProperties.description,
        createdAt: realEstateProperties.createdAt,
        updatedAt: realEstateProperties.updatedAt,
        unitsCount: sql<number>`count(${realEstateUnits.id})`,
      })
      .from(realEstateProperties)
      .leftJoin(
        realEstateUnits,
        and(eq(realEstateUnits.propertyId, realEstateProperties.id), ne(realEstateUnits.status, "false")),
      )
      .where(and(ne(realEstateProperties.status, "false"), eq(realEstateProperties.isActive, 1), eq(realEstateProperties.organizationId, orgId), scopeFilter))
      .groupBy(realEstateProperties.id)
      .orderBy(desc(realEstateProperties.id));

    return rows.map((row) => ({ ...row, unitsCount: Number(row.unitsCount) }));
  }

  async createProperty(input: CreatePropertyDto, orgId: number) {
    const code = input.code?.trim() || (await this.nextPropertyCode());
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency(orgId));
    if (currencyId) {
      await this.ensureExists(currencies, currencyId, "Currency not found.");
    }
    const [result] = await this.db.insert(realEstateProperties).values({
      organizationId: orgId,
      name: input.name,
      code,
      propertyType: input.propertyType ?? "building",
      status: input.status ?? "available",
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      floors: input.floors ?? 1,
      parkingSpaces: input.parkingSpaces ?? 0,
      marketValue: this.money(input.marketValue),
      defaultRent: this.money(input.defaultRent),
      currencyId,
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const propertyId = Number(result.insertId);
    await this.publishPropertyUpdate("created", propertyId, { propertyId });
    return this.findProperty(propertyId);
  }

  async updateProperty(id: number, input: UpdatePropertyDto, orgId: number) {
    await this.ensureActiveProperty(id, orgId);
    if (input.currencyId !== undefined && input.currencyId !== null) {
      await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    }
    await this.db
      .update(realEstateProperties)
      .set({
        ...this.pick(input, [
          "name",
          "code",
          "propertyType",
          "status",
          "address",
          "city",
          "country",
          "floors",
          "parkingSpaces",
          "description",
          "currencyId",
        ]),
        ...(input.marketValue !== undefined ? { marketValue: this.money(input.marketValue) } : {}),
        ...(input.defaultRent !== undefined ? { defaultRent: this.money(input.defaultRent) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateProperties.id, id), eq(realEstateProperties.organizationId, orgId)));

    await this.publishPropertyUpdate("updated", id, { propertyId: id });
    return this.findProperty(id);
  }

  async deleteProperty(id: number, orgId: number) {
    await this.ensureActiveProperty(id, orgId);

    // Block if any unit in this property has an active lease
    const units = await this.db
      .select({ id: realEstateUnits.id })
      .from(realEstateUnits)
      .where(eq(realEstateUnits.propertyId, id));

    if (units.length > 0) {
      const unitIds = units.map((u) => u.id);
      const [activeLeaseRow] = await this.db
        .select({ id: realEstateLeases.id })
        .from(realEstateLeases)
        .where(and(inArray(realEstateLeases.unitId, unitIds), eq(realEstateLeases.status, "active")))
        .limit(1);
      if (activeLeaseRow) {
        throw new BadRequestException(
          "Impossible de supprimer : cette propriété contient des unités avec des baux actifs.",
        );
      }
    }

    await this.db
      .update(realEstateProperties)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateProperties.id, id), eq(realEstateProperties.organizationId, orgId)));
    await this.publishPropertyUpdate("deleted", id, { propertyId: id });
    return { message: "Property deleted successfully." };
  }

  units(orgId: number) {
    return this.db
      .select({
        id: realEstateUnits.id,
        propertyId: realEstateUnits.propertyId,
        name: realEstateUnits.name,
        unitType: realEstateUnits.unitType,
        status: realEstateUnits.status,
        isActive: realEstateUnits.isActive,
        floor: realEstateUnits.floor,
        bedrooms: realEstateUnits.bedrooms,
        bathrooms: realEstateUnits.bathrooms,
        area: realEstateUnits.area,
        monthlyRent: realEstateUnits.monthlyRent,
        currencyId: realEstateUnits.currencyId,
        currencyName: unitCurrency.currencyName,
        currencySymbol: unitCurrency.currencySymbol,
        securityDeposit: realEstateUnits.securityDeposit,
        amenities: realEstateUnits.amenities,
        description: realEstateUnits.description,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        propertyIsActive: realEstateProperties.isActive,
      })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .leftJoin(unitCurrency, eq(unitCurrency.id, realEstateUnits.currencyId))
      .where(and(
        ne(realEstateUnits.status, "false"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateUnits.organizationId, orgId),
      ))
      .orderBy(desc(realEstateUnits.id));
  }

  async createUnit(input: CreateUnitDto, orgId: number) {
    await this.ensureActiveProperty(input.propertyId, orgId);
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency(orgId));
    if (currencyId) {
      await this.ensureExists(currencies, currencyId, "Currency not found.");
    }
    const [result] = await this.db.insert(realEstateUnits).values({
      organizationId: orgId,
      propertyId: input.propertyId,
      name: input.name,
      unitType: input.unitType ?? "apartment",
      status: input.status ?? "vacant",
      floor: input.floor ?? null,
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      area: this.money(input.area),
      monthlyRent: this.money(input.monthlyRent),
      currencyId,
      securityDeposit: this.money(input.securityDeposit),
      amenities: input.amenities ?? null,
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const unitId = Number(result.insertId);
    await this.publishUnitUpdate("created", unitId, { propertyId: input.propertyId, unitId });
    return this.findUnit(unitId);
  }

  async updateUnit(id: number, input: UpdateUnitDto, orgId: number) {
    await this.ensureActiveUnit(id, orgId);
    if (input.propertyId !== undefined) {
      await this.ensureActiveProperty(input.propertyId, orgId);
    }
    if (input.currencyId !== undefined && input.currencyId !== null) {
      await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    }
    await this.db
      .update(realEstateUnits)
      .set({
        ...this.pick(input, [
          "propertyId",
          "name",
          "unitType",
          "status",
          "floor",
          "bedrooms",
          "bathrooms",
          "currencyId",
          "amenities",
          "description",
        ]),
        ...(input.area !== undefined ? { area: this.money(input.area) } : {}),
        ...(input.monthlyRent !== undefined ? { monthlyRent: this.money(input.monthlyRent) } : {}),
        ...(input.securityDeposit !== undefined ? { securityDeposit: this.money(input.securityDeposit) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateUnits.id, id), eq(realEstateUnits.organizationId, orgId)));
    await this.publishUnitUpdate("updated", id, { propertyId: input.propertyId ?? null, unitId: id });
    return this.findUnit(id);
  }

  async deleteUnit(id: number, orgId: number) {
    await this.ensureActiveUnit(id, orgId);

    // Block if this unit has an active lease
    const [activeLease] = await this.db
      .select({ id: realEstateLeases.id })
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.unitId, id), eq(realEstateLeases.status, "active")))
      .limit(1);
    if (activeLease) {
      throw new BadRequestException(
        "Impossible de supprimer : cette unité a un bail actif. Résiliez le bail d'abord.",
      );
    }

    await this.db
      .update(realEstateUnits)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateUnits.id, id), eq(realEstateUnits.organizationId, orgId)));
    await this.publishUnitUpdate("deleted", id, { unitId: id });
    return { message: "Unit deleted successfully." };
  }

  // RBAC bien : filtre direct sur le property_id du bail.
  leases(orgId: number, propertyScope: "all" | number[] = "all") {
    const scopeFilter = this.propertyViaColumnFilter(realEstateLeases.propertyId, propertyScope);
    return this.leaseQuery()
      .where(and(
        ne(realEstateLeases.status, "cancelled"),
        ne(leaseProperty.status, "false"),
        eq(leaseProperty.isActive, 1),
        ne(leaseUnit.status, "false"),
        eq(leaseUnit.isActive, 1),
        eq(realEstateLeases.organizationId, orgId),
        scopeFilter,
      ))
      .orderBy(desc(realEstateLeases.id));
  }

  async createLease(input: CreateLeaseDto, orgId: number) {
    await this.ensureLeaseReferences(input.propertyId, input.unitId, input.tenantId, orgId);
    const currencyId = (input as any).currencyId ?? (await this.resolveDefaultCurrency(orgId));
    const [result] = await this.db.insert(realEstateLeases).values({
      organizationId: orgId,
      reference: input.reference || `LEASE-${Date.now()}`,
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId: input.tenantId,
      currencyId,
      startDate: this.requiredDate(input.startDate),
      endDate: this.date(input.endDate),
      nextInvoiceDate: this.date(input.nextInvoiceDate),
      billingCycle: input.billingCycle ?? "monthly",
      rentAmount: this.money(input.rentAmount),
      securityDeposit: this.money(input.securityDeposit),
      moveInMeterReading:
        input.moveInMeterReading !== undefined && input.moveInMeterReading !== null
          ? this.money(input.moveInMeterReading)
          : null,
      moveInNotes: input.moveInNotes ?? null,
      terms: input.terms ?? null,
      status: input.status ?? "draft",
      taxName: input.taxName ?? null,
      taxType: input.taxType ?? null,
      taxValue: input.taxValue !== undefined && input.taxValue !== null ? String(input.taxValue) : null,
      taxApplyMode: input.taxApplyMode ?? "never",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    if ((input.status ?? "draft") === "active") {
      await this.setUnitStatus(input.unitId, "occupied");
    }

    const leaseId = Number(result.insertId);
    await this.publishLeaseUpdate("created", leaseId, {
      propertyId: input.propertyId,
      unitId: input.unitId,
    });
    return this.findLease(leaseId);
  }

  async updateLease(id: number, input: UpdateLeaseDto, orgId: number) {
    const current = await this.getLeaseOrThrow(id, orgId);
    await this.ensureLeaseReferences(
      input.propertyId ?? current.propertyId,
      input.unitId ?? current.unitId,
      input.tenantId ?? current.tenantId,
      orgId,
    );

    await this.db
      .update(realEstateLeases)
      .set({
        ...this.pick(input, [
          "reference",
          "propertyId",
          "unitId",
          "tenantId",
          "billingCycle",
          "moveInNotes",
          "terms",
          "status",
          "taxName",
          "taxType",
          "taxApplyMode",
        ]),
        ...(input.startDate !== undefined ? { startDate: this.requiredDate(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: this.date(input.endDate) } : {}),
        ...(input.nextInvoiceDate !== undefined ? { nextInvoiceDate: this.date(input.nextInvoiceDate) } : {}),
        ...(input.rentAmount !== undefined ? { rentAmount: this.money(input.rentAmount) } : {}),
        ...(input.securityDeposit !== undefined ? { securityDeposit: this.money(input.securityDeposit) } : {}),
        ...(input.moveInMeterReading !== undefined
          ? { moveInMeterReading: input.moveInMeterReading === null ? null : this.money(input.moveInMeterReading) }
          : {}),
        ...(input.taxValue !== undefined ? { taxValue: input.taxValue === null ? null : String(input.taxValue) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateLeases.id, id), eq(realEstateLeases.organizationId, orgId)));

    const nextUnitId = input.unitId ?? current.unitId;
    if (input.unitId !== undefined && input.unitId !== current.unitId) {
      await this.setUnitStatus(current.unitId, "vacant");
    }
    if ((input.status ?? current.status) === "active") {
      await this.setUnitStatus(nextUnitId, "occupied");
    }
    if (["inactive", "ended", "cancelled"].includes(input.status ?? "")) {
      await this.setUnitStatus(nextUnitId, "vacant");
    }

    await this.publishLeaseUpdate("updated", id, {
      propertyId: input.propertyId ?? current.propertyId,
      unitId: input.unitId ?? current.unitId,
    });
    return this.findLease(id);
  }

  async deleteLease(id: number, orgId: number) {
    const lease = await this.getLeaseOrThrow(id, orgId);
    await this.setUnitStatus(lease.unitId, "vacant");
    await this.db
      .update(realEstateLeases)
      .set({ status: "cancelled", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateLeases.id, id), eq(realEstateLeases.organizationId, orgId)));
    await this.publishLeaseUpdate("deleted", id, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    return { message: "Lease deleted successfully." };
  }

  payments(orgId: number, propertyScope: "all" | number[] = "all") {
    return this.paymentQuery(undefined, orgId, propertyScope).orderBy(desc(realEstateRentPayments.id));
  }

  private paymentQuery(id?: number, orgId?: number, propertyScope: "all" | number[] = "all") {
    return this.db
      .select({
        id: realEstateRentPayments.id,
        leaseId: realEstateRentPayments.leaseId,
        transactionId: realEstateRentPayments.transactionId,
        paymentDate: realEstateRentPayments.paymentDate,
        amount: realEstateRentPayments.amount,
        method: realEstateRentPayments.method,
        reference: realEstateRentPayments.reference,
        notes: realEstateRentPayments.notes,
        taxAmount: realEstateRentPayments.taxAmount,
        taxName: realEstateRentPayments.taxName,
        currencyId: realEstateRentPayments.currencyId,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
        leaseReference: paymentLease.reference,
        propertyName: paymentProperty.name,
        unitName: paymentUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
      })
      .from(realEstateRentPayments)
      .leftJoin(paymentLease, eq(paymentLease.id, realEstateRentPayments.leaseId))
      .leftJoin(paymentProperty, eq(paymentProperty.id, paymentLease.propertyId))
      .leftJoin(paymentUnit, eq(paymentUnit.id, paymentLease.unitId))
      .leftJoin(customers, eq(customers.id, paymentLease.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateRentPayments.currencyId))
      .where(and(
        ne(paymentLease.status, "cancelled"),
        ne(paymentProperty.status, "false"),
        eq(paymentProperty.isActive, 1),
        ne(paymentUnit.status, "false"),
        eq(paymentUnit.isActive, 1),
        ...(id ? [eq(realEstateRentPayments.id, id)] : []),
        ...(orgId !== undefined ? [eq(realEstateRentPayments.organizationId, orgId)] : []),
        // RBAC bien : loyers du bien (via le bail). "all" => pas de filtre.
        ...(propertyScope !== "all"
          ? [propertyScope.length ? inArray(paymentLease.propertyId, propertyScope) : sql`1 = 0`]
          : []),
      ));
  }

  async createPayment(input: CreateRentPaymentDto, orgId: number) {
    const lease = await this.getLeaseOrThrow(input.leaseId, orgId);
    // Un bail ne « démarre » pas tant que le locataire n'a pas signé : on
    // refuse d'enregistrer un paiement si le contrat lié n'est pas signé.
    await this.ensureLeaseContractSigned(input.leaseId);
    const rentPaymentType = await this.getRentPaymentType(orgId);
    // Le compte débité (où arrive l'argent) dépend du moyen de paiement :
    // Espèces → Cash, Bancaire/Carte/Chèque → Banque, Mobile money → Mobile Money.
    const debitId = input.paymentAccountId
      ?? (await this.resolvePaymentDebitAccount(input.method, rentPaymentType.debitAccountId));
    await this.ensureExists(subAccounts, debitId, "Payment account not found.");

    // Currency precedence: explicit input → lease's currency → app default
    const paymentCurrencyId =
      (input as any).currencyId
      ?? (lease as any).currencyId
      ?? (await this.resolveDefaultCurrency(orgId));

    const [transactionResult] = await this.db.insert(transactions).values({
      organizationId: orgId,
      date: new Date(input.paymentDate),
      debitId,
      creditId: rentPaymentType.creditAccountId,
      particulars: input.notes || "Payment for rent",
      amount: input.amount,
      currencyId: paymentCurrencyId ?? null,
      type: "Rent Payment",
      relatedId: String(lease.id),
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Taxe par bail (incluse/informative) : on enregistre la part de taxe
    // contenue dans le paiement, sans changer le montant payé.
    const taxAmt = this.computeInclusiveTax(Number(input.amount), lease as any);

    const [paymentResult] = await this.db.insert(realEstateRentPayments).values({
      organizationId: orgId,
      leaseId: lease.id,
      currencyId: paymentCurrencyId,
      transactionId: Number(transactionResult.insertId),
      paymentDate: this.requiredDate(input.paymentDate),
      amount: this.money(input.amount),
      method: input.method ?? "cash",
      reference: input.reference ?? null,
      notes: input.notes || "Payment for rent",
      taxAmount: taxAmt != null ? this.money(taxAmt) : null,
      taxName: taxAmt != null ? ((lease as any).taxName ?? null) : null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const paymentId = Number(paymentResult.insertId);

    // Comptabilisation de la part de taxe (type dédié "Real Estate Tax").
    if (taxAmt != null && taxAmt > 0) {
      const taxType = await this.getRealEstateTaxTypeOptional(orgId);
      if (taxType) {
        await this.db.insert(transactions).values({
          organizationId: orgId,
          date: new Date(input.paymentDate),
          debitId: taxType.debitAccountId,
          creditId: taxType.creditAccountId,
          particulars: `${(lease as any).taxName || "Taxe"} sur loyer (bail ${lease.reference || lease.id})`,
          amount: taxAmt,
          currencyId: paymentCurrencyId ?? null,
          type: "Real Estate Tax",
          relatedId: String(lease.id),
          status: "true",
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
      }
    }

    // Ecriture comptable moderne (partie double) via LedgerService — dual-write,
    // idempotent par paiement. Loyer + part de taxe regroupes dans une ecriture.
    const rentLines = [
      { accountId: debitId, side: "DEBIT" as const, amount: Number(input.amount), description: input.notes || "Payment for rent" },
      { accountId: rentPaymentType.creditAccountId, side: "CREDIT" as const, amount: Number(input.amount), description: input.notes || "Payment for rent" },
    ];
    if (taxAmt != null && taxAmt > 0) {
      const taxType = await this.getRealEstateTaxTypeOptional(orgId);
      if (taxType) {
        rentLines.push(
          { accountId: taxType.debitAccountId, side: "DEBIT" as const, amount: taxAmt, description: `${(lease as any).taxName || "Taxe"} sur loyer (bail ${lease.reference || lease.id})` },
          { accountId: taxType.creditAccountId, side: "CREDIT" as const, amount: taxAmt, description: `${(lease as any).taxName || "Taxe"} sur loyer` },
        );
      }
    }
    await this.ledger.post(
      {
        date: new Date(input.paymentDate),
        reference: `RENT-${paymentId}`,
        particulars: input.notes || `Payment for rent — bail ${lease.reference || lease.id}`,
        sourceModule: "rent",
        relatedId: String(lease.id),
        currencyId: paymentCurrencyId ?? undefined,
        idempotencyKey: `rent-payment:${paymentId}`,
        lines: rentLines,
      },
      orgId,
    );

    await this.advanceLeaseInvoiceDateIfCovered(lease, orgId, input.paymentDate);
    await this.publishPaymentUpdate("created", paymentId, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    return this.findPayment(paymentId);
  }

  // ─── Caution / dépôt de garantie ────────────────────────────────────────────
  async listDeposits(orgId: number) {
    return this.db
      .select()
      .from(realEstateSecurityDeposits)
      .where(and(
        eq(realEstateSecurityDeposits.organizationId, orgId),
        eq(realEstateSecurityDeposits.isActive, 1),
      ))
      .orderBy(desc(realEstateSecurityDeposits.id));
  }

  private async getTransactionTypeByName(name: string, orgId: number) {
    const rows = await this.db
      .select({
        id: transactionTypes.id,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
      })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, name), eq(transactionTypes.isActive, true), eq(transactionTypes.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new BadRequestException(`Transaction type "${name}" is missing.`);
    return rows[0];
  }

  // true si le moyen renvoie vers la banque (virement/carte/chèque), false → caisse.
  private isBankMethod(method?: string | null) {
    const m = (method || "").toLowerCase().replace(/[éèê]/g, "e");
    return /(banc|bank|carte|card|cheque|virement)/.test(m);
  }

  async collectDeposit(leaseId: number, input: CollectDepositDto, orgId: number) {
    const lease = await this.getLeaseOrThrow(leaseId, orgId);

    // Une seule caution active détenue par bail.
    const existing = await this.db
      .select({ id: realEstateSecurityDeposits.id })
      .from(realEstateSecurityDeposits)
      .where(and(
        eq(realEstateSecurityDeposits.leaseId, leaseId),
        eq(realEstateSecurityDeposits.status, "held"),
        eq(realEstateSecurityDeposits.isActive, 1),
      ))
      .limit(1);
    if (existing.length) {
      throw new BadRequestException("Une caution est déjà détenue pour ce bail.");
    }

    // Caution = passif : on débite Caisse/Banque, on crédite « Tenant Deposits ».
    // Comptes résolus directement (robuste même si les types ne sont pas seedés).
    const bank = this.isBankMethod(input.method);
    const debitId = bank ? 2 : 1; // 2=Bank, 1=Cash
    const creditId = await this.getOrCreateLiabilitySubAccount("Tenant Deposits", orgId);
    const currencyId =
      (input as any).currencyId ?? (lease as any).currencyId ?? (await this.resolveDefaultCurrency(orgId));

    const [txResult] = await this.db.insert(transactions).values({
      organizationId: orgId,
      date: new Date(input.paymentDate),
      debitId,
      creditId,
      particulars: input.notes || `Caution reçue — bail ${lease.reference || lease.id}`,
      amount: input.amount,
      currencyId: currencyId ?? null,
      type: this.isBankMethod(input.method) ? "BNQ - Security Deposit Receipt" : "CAI - Security Deposit Receipt",
      relatedId: String(lease.id),
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const [depResult] = await this.db.insert(realEstateSecurityDeposits).values({
      organizationId: orgId,
      leaseId: lease.id,
      currencyId: currencyId ?? null,
      transactionId: Number(txResult.insertId),
      amount: this.money(input.amount)!,
      method: input.method ?? "cash",
      paymentDate: this.requiredDate(input.paymentDate),
      status: "held",
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const depositId = Number(depResult.insertId);
    // Ecriture moderne (dual-write) : caution recue, debit Caisse/Banque / credit passif.
    await this.ledger.post(
      {
        date: new Date(input.paymentDate),
        reference: `DEPOSIT-${depositId}`,
        particulars: input.notes || `Caution reçue — bail ${lease.reference || lease.id}`,
        sourceModule: "rent",
        relatedId: String(lease.id),
        currencyId: currencyId ?? undefined,
        idempotencyKey: `deposit-receipt:${depositId}`,
        lines: [
          { accountId: debitId, side: "DEBIT", amount: Number(input.amount), description: "Caution reçue" },
          { accountId: creditId, side: "CREDIT", amount: Number(input.amount), description: "Tenant Deposits" },
        ],
      },
      orgId,
    );

    await this.publishPaymentUpdate("created", depositId, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    return this.findDeposit(depositId);
  }

  async returnDeposit(leaseId: number, input: ReturnDepositDto, orgId: number) {
    const lease = await this.getLeaseOrThrow(leaseId, orgId);
    const rows = await this.db
      .select()
      .from(realEstateSecurityDeposits)
      .where(and(
        eq(realEstateSecurityDeposits.leaseId, leaseId),
        eq(realEstateSecurityDeposits.status, "held"),
        eq(realEstateSecurityDeposits.isActive, 1),
      ))
      .orderBy(desc(realEstateSecurityDeposits.id))
      .limit(1);
    if (!rows.length) throw new BadRequestException("Aucune caution détenue à restituer pour ce bail.");
    const deposit = rows[0];

    const held = Number(deposit.amount);
    const deduction = Math.min(Math.max(0, Number(input.deductionAmount ?? 0)), held);
    const returned = Math.round((held - deduction) * 100) / 100;

    // Restitution : on solde le passif « Tenant Deposits » (débit) ; la part rendue
    // sort de Caisse/Banque (crédit) et la retenue couvre la maintenance (crédit).
    const tenantDeposits = await this.getOrCreateLiabilitySubAccount("Tenant Deposits", orgId);
    const refundCredit = this.isBankMethod(input.returnMethod) ? 2 : 1; // 2=Bank, 1=Cash
    const currencyId = (deposit as any).currencyId ?? (lease as any).currencyId ?? (await this.resolveDefaultCurrency(orgId));

    let returnTransactionId: number | null = null;
    if (returned > 0) {
      const [txResult] = await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(input.returnDate),
        debitId: tenantDeposits,
        creditId: refundCredit,
        particulars: input.notes || `Caution restituée — bail ${lease.reference || lease.id}`,
        amount: returned,
        currencyId: currencyId ?? null,
        type: "Security Deposit Return",
        relatedId: String(lease.id),
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      returnTransactionId = Number(txResult.insertId);
    }
    // Retenue pour dégâts : le passif est soldé (débit) contre un revenu/compensation
    // de maintenance (crédit Maintenance expense → réduit la charge).
    if (deduction > 0) {
      const maintenance = await this.getOrCreateExpenseSubAccount("Maintenance", orgId);
      await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(input.returnDate),
        debitId: tenantDeposits,
        creditId: maintenance,
        particulars: input.deductionReason || `Retenue sur caution (dégâts) — bail ${lease.reference || lease.id}`,
        amount: deduction,
        currencyId: currencyId ?? null,
        type: "Security Deposit Return",
        relatedId: String(lease.id),
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    }

    await this.db
      .update(realEstateSecurityDeposits)
      .set({
        status: "returned",
        returnTransactionId,
        deductionAmount: deduction > 0 ? this.money(deduction) : null,
        deductionReason: input.deductionReason ?? null,
        returnedAmount: this.money(returned),
        returnMethod: input.returnMethod ?? "bank",
        returnDate: this.requiredDate(input.returnDate),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateSecurityDeposits.id, deposit.id));

    // Ecriture moderne (dual-write) : restitution caution. Le passif soldé (débit)
    // = part rendue (crédit caisse/banque) + retenue (crédit maintenance). Equilibree.
    const returnLines: Array<{ accountId: number; side: "DEBIT" | "CREDIT"; amount: number; description?: string }> = [];
    if (returned > 0) {
      returnLines.push(
        { accountId: tenantDeposits, side: "DEBIT", amount: returned, description: "Solde passif caution (restitution)" },
        { accountId: refundCredit, side: "CREDIT", amount: returned, description: input.notes || "Caution restituée" },
      );
    }
    if (deduction > 0) {
      const maintenance = await this.getOrCreateExpenseSubAccount("Maintenance", orgId);
      returnLines.push(
        { accountId: tenantDeposits, side: "DEBIT", amount: deduction, description: "Solde passif caution (retenue)" },
        { accountId: maintenance, side: "CREDIT", amount: deduction, description: input.deductionReason || "Retenue sur caution (dégâts)" },
      );
    }
    if (returnLines.length >= 2) {
      await this.ledger.post(
        {
          date: new Date(input.returnDate),
          reference: `DEPOSIT-RET-${deposit.id}`,
          particulars: `Restitution caution — bail ${lease.reference || lease.id}`,
          sourceModule: "rent",
          relatedId: String(lease.id),
          currencyId: currencyId ?? undefined,
          idempotencyKey: `deposit-return:${deposit.id}`,
          lines: returnLines,
        },
        orgId,
      );
    }

    await this.publishPaymentUpdate("updated", deposit.id, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    return this.findDeposit(deposit.id);
  }

  private async findDeposit(id: number) {
    const rows = await this.db
      .select()
      .from(realEstateSecurityDeposits)
      .where(eq(realEstateSecurityDeposits.id, id))
      .limit(1);
    return rows[0];
  }

  private async getOrCreateLiabilitySubAccount(name: string, orgId: number) {
    return this.getOrCreateSubAccount(name, 2, orgId); // 2 = Liability
  }

  private async getOrCreateExpenseSubAccount(name: string, orgId: number) {
    return this.getOrCreateSubAccount(name, 6, orgId); // 6 = Expense
  }

  private async getOrCreateSubAccount(name: string, accountId: number, orgId: number): Promise<number> {
    // Recherche ET creation scopees a l org (isolation P2) : un meme libelle
    // (ex "Maintenance") peut exister dans plusieurs organisations.
    const existing = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(eq(subAccounts.name, name), eq(subAccounts.organizationId, orgId)))
      .limit(1);
    if (existing.length) return existing[0].id;
    const [result] = await this.db.insert(subAccounts).values({
      organizationId: orgId,
      name,
      accountId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any);
    return Number((result as any).insertId);
  }

  private async advanceLeaseInvoiceDateIfCovered(
    lease: typeof realEstateLeases.$inferSelect,
    orgId: number,
    paymentDate: string,
  ) {
    if (!lease.nextInvoiceDate) return;

    const due = this.parseDateOnly(lease.nextInvoiceDate);
    const paidAt = this.parseDateOnly(paymentDate);
    const today = this.parseDateOnly(this.formatDateOnly(new Date()));
    const periodStart = this.addBillingCycle(due, lease.billingCycle, -1);
    const periodEnd = new Date(Math.max(due.getTime(), paidAt.getTime(), today.getTime()));

    const [row] = await this.db
      .select({ total: sql<string>`coalesce(sum(${realEstateRentPayments.amount}), 0)` })
      .from(realEstateRentPayments)
      .where(and(
        eq(realEstateRentPayments.organizationId, orgId),
        eq(realEstateRentPayments.leaseId, lease.id),
        gte(realEstateRentPayments.paymentDate, this.formatDateOnly(periodStart)),
        lte(realEstateRentPayments.paymentDate, this.formatDateOnly(periodEnd)),
      ));

    if (Number(row?.total || 0) < Number(lease.rentAmount || 0)) return;

    await this.db
      .update(realEstateLeases)
      .set({
        nextInvoiceDate: this.formatDateOnly(this.addBillingCycle(due, lease.billingCycle, 1)),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateLeases.id, lease.id), eq(realEstateLeases.organizationId, orgId)));
  }

  async sendPaymentReminder(leaseId: number) {
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        reference: realEstateLeases.reference,
        rentAmount: realEstateLeases.rentAmount,
        currencySymbol: currencies.currencySymbol,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantEmail: customers.email,
      })
      .from(realEstateLeases)
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(eq(realEstateLeases.id, leaseId))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const lease = rows[0];
    if (!lease.tenantEmail) throw new BadRequestException("Email du locataire introuvable.");

    const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
    // {amount} inclut la devise (ex. « 620000 FC ») — comme le rappel automatique.
    const rentDisplay = `${lease.rentAmount ?? ""}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`.trim();
    let subject = `Rappel de paiement de loyer — Bail #${lease.reference}`;
    let html = `
      <p>Bonjour ${tenantName},</p>
      <p>Nous vous rappelons que votre loyer pour le bail <strong>#${lease.reference}</strong> est en retard.</p>
      <p><strong>Montant du:</strong> ${rentDisplay}</p>
      <p>Merci de régulariser ce paiement au plus tôt possible.</p>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe de gestion immobilière</p>
    `;

    // Message configurable (Réglages → Messages) : si un template "payment_reminder"
    // actif existe, on l'utilise avec substitution des placeholders.
    const tpl = await this.db
      .select({ subject: emailTemplates.subject, body: emailTemplates.body })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.eventType, "payment_reminder"), eq(emailTemplates.status, "true")))
      .limit(1);
    if (tpl.length) {
      const fill = (s: string | null) =>
        String(s || "")
          .replace(/\{tenantName\}/g, tenantName)
          .replace(/\{firstName\}/g, lease.tenantFirstName || tenantName)
          .replace(/\{reference\}/g, lease.reference || "")
          .replace(/\{amount\}/g, rentDisplay);
      if (tpl[0].subject) subject = fill(tpl[0].subject);
      if (tpl[0].body) html = fill(tpl[0].body);
    }

    const result = await this.emails.send({
      to: lease.tenantEmail,
      subject,
      html,
      type: "payment_reminder",
      relatedType: "real-estate-lease",
      relatedId: leaseId,
    });
    return { message: "success", email: result };
  }

  maintenance(_orgId?: number) {
    return this.db
      .select({
        id: realEstateMaintenanceRequests.id,
        propertyId: realEstateMaintenanceRequests.propertyId,
        unitId: realEstateMaintenanceRequests.unitId,
        title: realEstateMaintenanceRequests.title,
        priority: realEstateMaintenanceRequests.priority,
        status: realEstateMaintenanceRequests.status,
        scheduledDate: realEstateMaintenanceRequests.scheduledDate,
        estimatedCost: realEstateMaintenanceRequests.estimatedCost,
        currencyId: realEstateMaintenanceRequests.currencyId,
        // Somme des coûts réels déjà saisis pour ce ticket, dans SA devise (SIFA : pas de mélange).
        spentCost: sql<string>`coalesce((select sum(${realEstateMaintenanceCosts.amount}) from ${realEstateMaintenanceCosts} where ${realEstateMaintenanceCosts.ticketId} = ${realEstateMaintenanceRequests.id} and ${realEstateMaintenanceCosts.isActive} = 1 and (${realEstateMaintenanceCosts.currencyId} = ${realEstateMaintenanceRequests.currencyId} or ${realEstateMaintenanceCosts.currencyId} is null)), 0)`,
        // Dépense réelle groupée PAR devise (SIFA : pas de somme inter-devises) : [{ currencyId, symbol, amount }].
        spentByCurrency: sql<string>`coalesce((select json_arrayagg(json_object('currencyId', mc.currencyId, 'symbol', cur.currencySymbol, 'amount', mc.total)) from (select coalesce(${realEstateMaintenanceCosts.currencyId}, ${realEstateMaintenanceRequests.currencyId}) as currencyId, sum(${realEstateMaintenanceCosts.amount}) as total from ${realEstateMaintenanceCosts} where ${realEstateMaintenanceCosts.ticketId} = ${realEstateMaintenanceRequests.id} and ${realEstateMaintenanceCosts.isActive} = 1 group by coalesce(${realEstateMaintenanceCosts.currencyId}, ${realEstateMaintenanceRequests.currencyId})) mc left join ${currencies} cur on cur.id = mc.currencyId), json_array())`,
        assigneeId: realEstateMaintenanceRequests.assigneeId,
        assigneeFirstName: maintenanceAssignee.firstName,
        assigneeLastName: maintenanceAssignee.lastName,
        assigneeUsername: maintenanceAssignee.username,
        description: realEstateMaintenanceRequests.description,
        projectId: realEstateMaintenanceRequests.projectId,
        propertyName: maintenanceProperty.name,
        unitName: maintenanceUnit.name,
        createdAt: realEstateMaintenanceRequests.createdAt,
        updatedAt: realEstateMaintenanceRequests.updatedAt,
      })
      .from(realEstateMaintenanceRequests)
      .leftJoin(maintenanceProperty, eq(maintenanceProperty.id, realEstateMaintenanceRequests.propertyId))
      .leftJoin(maintenanceUnit, eq(maintenanceUnit.id, realEstateMaintenanceRequests.unitId))
      .leftJoin(maintenanceAssignee, eq(maintenanceAssignee.id, realEstateMaintenanceRequests.assigneeId))
      .orderBy(desc(realEstateMaintenanceRequests.id));
  }

  listMaintenance(orgId: number) {
    return this.maintenance().where(and(eq(realEstateMaintenanceRequests.isActive, true), eq(realEstateMaintenanceRequests.organizationId, orgId)));
  }

  async createMaintenance(input: CreateMaintenanceDto, orgId: number, userId?: number) {
    await this.ensureActiveProperty(input.propertyId, orgId);
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }
    // Default assignee = ticket creator; explicit input.assigneeId wins.
    const assigneeId = input.assigneeId ?? (userId && userId > 0 ? userId : null);
    const [result] = await this.db.insert(realEstateMaintenanceRequests).values({
      organizationId: orgId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      title: input.title,
      priority: input.priority ?? "medium",
      status: input.status ?? "open",
      scheduledDate: this.date(input.scheduledDate),
      estimatedCost: this.money(input.estimatedCost),
      currencyId: input.currencyId ?? null,
      assigneeId,
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const ticketId = Number(result.insertId);

    // Un chantier de travaux = un projet analytique. On cree (ou reutilise, via le
    // registre partage source_system=maintenance) un projet et on lie le ticket.
    try {
      const proj = await this.projects.create(
        {
          name: `Travaux: ${input.title}`,
          code: `MNT-${ticketId}`,
          budgetAmount: input.estimatedCost ? Number(input.estimatedCost) : undefined,
          currencyId: input.currencyId ?? undefined,
          sourceSystem: "maintenance",
          externalRef: String(ticketId),
        },
        orgId,
        userId,
      );
      await this.db
        .update(realEstateMaintenanceRequests)
        .set({ projectId: proj.id })
        .where(eq(realEstateMaintenanceRequests.id, ticketId));
    } catch (err) {
      this.logger.warn(`createMaintenance: liaison projet ignoree: ${(err as Error).message}`);
    }
    return this.findMaintenance(ticketId);
  }

  async updateMaintenance(id: number, input: UpdateMaintenanceDto, orgId: number) {
    await this.ensureOrgOwned(realEstateMaintenanceRequests, id, orgId, "Maintenance request not found.");
    if (input.propertyId !== undefined) {
      await this.ensureActiveProperty(input.propertyId, orgId);
    }
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }
    await this.db
      .update(realEstateMaintenanceRequests)
      .set({
        ...this.pick(input, ["propertyId", "unitId", "title", "priority", "status", "description", "currencyId", "assigneeId"]),
        ...(input.scheduledDate !== undefined ? { scheduledDate: this.date(input.scheduledDate) } : {}),
        ...(input.estimatedCost !== undefined ? { estimatedCost: this.money(input.estimatedCost) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateMaintenanceRequests.id, id), eq(realEstateMaintenanceRequests.organizationId, orgId)));
    return this.findMaintenance(id);
  }

  async deleteMaintenance(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstateMaintenanceRequests, id, orgId, "Maintenance request not found.");
    await this.db
      .update(realEstateMaintenanceRequests)
      .set({ isActive: false, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMaintenanceRequests.id, id), eq(realEstateMaintenanceRequests.organizationId, orgId)));
    return { message: "Maintenance request deleted successfully." };
  }

  async findProperty(id: number) {
    const rows = await this.db
      .select()
      .from(realEstateProperties)
      .where(and(eq(realEstateProperties.id, id), ne(realEstateProperties.status, "false")))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Property not found.");
    return rows[0];
  }

  private async nextPropertyCode() {
    const rows = await this.db.select({ code: realEstateProperties.code }).from(realEstateProperties);
    const maxCode = rows.reduce((max, row) => {
      const code = String(row.code || "").trim();
      if (!/^\d+$/.test(code)) return max;
      return Math.max(max, Number(code));
    }, 0);

    return String(maxCode + 1);
  }

  async findUnit(id: number) {
    const rows = await this.db
      .select({
        id: realEstateUnits.id,
        propertyId: realEstateUnits.propertyId,
        name: realEstateUnits.name,
        unitType: realEstateUnits.unitType,
        status: realEstateUnits.status,
        floor: realEstateUnits.floor,
        bedrooms: realEstateUnits.bedrooms,
        bathrooms: realEstateUnits.bathrooms,
        area: realEstateUnits.area,
        monthlyRent: realEstateUnits.monthlyRent,
        currencyId: realEstateUnits.currencyId,
        currencyName: unitCurrency.currencyName,
        currencySymbol: unitCurrency.currencySymbol,
        securityDeposit: realEstateUnits.securityDeposit,
        amenities: realEstateUnits.amenities,
        description: realEstateUnits.description,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
      })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .leftJoin(unitCurrency, eq(unitCurrency.id, realEstateUnits.currencyId))
      .where(and(
        eq(realEstateUnits.id, id),
        ne(realEstateUnits.status, "false"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Unit not found.");
    return rows[0];
  }

  async findLease(id: number) {
    const rows = await this.leaseQuery()
      .where(and(
        ne(realEstateLeases.status, "cancelled"),
        eq(realEstateLeases.id, id),
        ne(leaseProperty.status, "false"),
        eq(leaseProperty.isActive, 1),
        ne(leaseUnit.status, "false"),
        eq(leaseUnit.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Lease not found.");
    return rows[0];
  }

  async findPayment(id: number) {
    const rows = await this.paymentQuery(id).limit(1);
    if (!rows.length) throw new NotFoundException("Payment not found.");
    return rows[0];
  }

  async findMaintenance(id: number, orgId?: number) {
    const where = orgId !== undefined
      ? and(eq(realEstateMaintenanceRequests.id, id), eq(realEstateMaintenanceRequests.organizationId, orgId))
      : eq(realEstateMaintenanceRequests.id, id);
    const rows = await this.maintenance().where(where).limit(1);
    if (!rows.length) throw new NotFoundException("Maintenance request not found.");
    return rows[0];
  }

  async listMaintenanceCosts(ticketId: number, orgId: number) {
    await this.findMaintenance(ticketId, orgId);
    return this.db
      .select({
        ...getTableColumns(realEstateMaintenanceCosts),
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateMaintenanceCosts)
      .leftJoin(currencies, eq(currencies.id, realEstateMaintenanceCosts.currencyId))
      .where(and(eq(realEstateMaintenanceCosts.ticketId, ticketId), eq(realEstateMaintenanceCosts.isActive, 1)))
      .orderBy(desc(realEstateMaintenanceCosts.id));
  }

  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  private saveReceiptFile(file: any, publicApiBase?: string): string | null {
    if (!file?.buffer) return null;
    const { name } = saveValidatedUploadFile(file, this.uploadDir, {
      allowedMimeTypes: IMAGE_OR_PDF_MIME_TYPES,
      prefix: "receipt",
      maxBytes: 5 * 1024 * 1024,
    });
    const base = publicApiBase ?? "";
    return `${base}/uploads/${name}`;
  }

  async createMaintenanceCost(ticketId: number, input: CreateMaintenanceCostDto, orgId: number, receipt?: any, publicApiBase?: string) {
    await this.findMaintenance(ticketId, orgId);

    // Projet analytique du chantier (pour ventiler la depense au grand livre).
    const [ticket] = await this.db
      .select({ projectId: realEstateMaintenanceRequests.projectId })
      .from(realEstateMaintenanceRequests)
      .where(eq(realEstateMaintenanceRequests.id, ticketId))
      .limit(1);
    const projectId = ticket?.projectId ?? null;

    const receiptUrl = this.saveReceiptFile(receipt, publicApiBase) ?? input.receiptUrl ?? null;

    const [result] = await this.db.insert(realEstateMaintenanceCosts).values({
      ticketId,
      type: input.type,
      description: input.description,
      amount: String(input.amount),
      currencyId: input.currencyId ?? null,
      vendorName: input.vendorName ?? null,
      supplierId: input.supplierId ?? null,
      paymentMethod: input.paymentMethod ?? "cash",
      paymentDate: input.paymentDate ?? null,
      notes: input.notes ?? null,
      receiptUrl,
      projectId,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Auto-create accounting transaction
    const creditId = input.paymentMethod === "bank" ? 2 : 1; // 2=Bank, 1=Cash
    // Sous-compte "Maintenance" de CETTE org (isolation P2).
    const maintenanceSubAccount = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(eq(subAccounts.name, "Maintenance"), eq(subAccounts.organizationId, orgId)))
      .limit(1);
    const debitId = maintenanceSubAccount[0]?.id ?? 12;

    await this.db.insert(transactions).values({
      organizationId: orgId,
      date: input.paymentDate ? new Date(input.paymentDate) : sql`CURRENT_TIMESTAMP` as any,
      debitId,
      creditId,
      particulars: `${input.type === "labour" ? "Labour" : "Service"}: ${input.description}${input.vendorName ? ` — ${input.vendorName}` : ""}`,
      amount: input.amount,
      type: "BNQM - Maintenance Journal",
      relatedId: String(Number((result as any).insertId)),
      status: "true",
      currencyId: input.currencyId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const maintenanceCostId = Number((result as any).insertId);
    // Ecriture moderne (dual-write) : depense maintenance, debit charge / credit caisse.
    await this.ledger.post(
      {
        date: input.paymentDate ? new Date(input.paymentDate) : undefined,
        reference: `MAINT-${maintenanceCostId}`,
        particulars: `${input.type === "labour" ? "Labour" : "Service"}: ${input.description}${input.vendorName ? ` — ${input.vendorName}` : ""}`,
        sourceModule: "maintenance",
        relatedId: String(maintenanceCostId),
        currencyId: input.currencyId ?? undefined,
        idempotencyKey: `maintenance-cost:${maintenanceCostId}`,
        lines: [
          // La charge porte le projet du chantier (ventilation analytique).
          { accountId: debitId, side: "DEBIT", amount: Number(input.amount), description: "Maintenance expense", projectId: projectId ?? undefined },
          { accountId: creditId, side: "CREDIT", amount: Number(input.amount), description: input.paymentMethod === "bank" ? "Bank" : "Cash" },
        ],
      },
      orgId,
    );

    // Soumet le cout de maintenance au circuit d'approbation (effectif si gate).
    try {
      await this.workflow.submit(
        { workflowKey: "exp_approval", entityType: "maintenance", entityId: String(maintenanceCostId) },
        orgId,
      );
    } catch (err) {
      console.warn("[Domus] submit maintenance approval skipped:", (err as Error).message);
    }

    return this.db
      .select()
      .from(realEstateMaintenanceCosts)
      .where(eq(realEstateMaintenanceCosts.id, maintenanceCostId))
      .limit(1)
      .then((rows) => rows[0]);
  }

  async deleteMaintenanceCost(costId: number) {
    const rows = await this.db
      .select()
      .from(realEstateMaintenanceCosts)
      .where(and(eq(realEstateMaintenanceCosts.id, costId), eq(realEstateMaintenanceCosts.isActive, 1)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Maintenance cost not found.");
    await this.db
      .update(realEstateMaintenanceCosts)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateMaintenanceCosts.id, costId));
    return { message: "Deleted successfully." };
  }

  private async findTenant(id: number, orgId: number) {
    const rows = await this.tenantQuery(id, orgId).limit(1);
    if (!rows.length) throw new NotFoundException("Tenant not found.");
    return rows[0];
  }

  private async findOnboarding(id: number) {
    const rows = await this.db.select().from(tenantOnboardings).where(eq(tenantOnboardings.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Tenant onboarding not found.");
    return rows[0];
  }

  private adminOnboardingResponse(onboarding: any) {
    const { tokenHash: _tokenHash, token, ...payload } = onboarding;
    return {
      ...payload,
      url: token ? this.onboardingUrl(token) : null,
    };
  }

  private leaseQuery() {
    return this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        propertyId: realEstateLeases.propertyId,
        unitId: realEstateLeases.unitId,
        tenantId: realEstateLeases.tenantId,
        currencyId: realEstateLeases.currencyId,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        billingCycle: realEstateLeases.billingCycle,
        rentAmount: realEstateLeases.rentAmount,
        securityDeposit: realEstateLeases.securityDeposit,
        moveInMeterReading: realEstateLeases.moveInMeterReading,
        moveInNotes: realEstateLeases.moveInNotes,
        terms: realEstateLeases.terms,
        status: realEstateLeases.status,
        taxName: realEstateLeases.taxName,
        taxType: realEstateLeases.taxType,
        taxValue: realEstateLeases.taxValue,
        taxApplyMode: realEstateLeases.taxApplyMode,
        propertyName: leaseProperty.name,
        propertyAddress: leaseProperty.address,
        unitName: leaseUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantPhone: customers.phone,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateLeases)
      .leftJoin(leaseProperty, eq(leaseProperty.id, realEstateLeases.propertyId))
      .leftJoin(leaseUnit, eq(leaseUnit.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId));
  }

  private async getLeaseOrThrow(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.id, id), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Lease not found.");
    return rows[0];
  }

  // Le contrat du bail doit être signé par le locataire avant tout paiement.
  private async ensureLeaseContractSigned(leaseId: number) {
    const [contract] = await this.db
      .select({ status: realEstateContracts.status })
      .from(realEstateContracts)
      .where(and(eq(realEstateContracts.leaseId, leaseId), ne(realEstateContracts.status, "deleted")))
      .orderBy(desc(realEstateContracts.id))
      .limit(1);
    if (!contract || contract.status !== "signed") {
      throw new BadRequestException(
        "Le contrat doit être signé par le locataire avant d'enregistrer un paiement.",
      );
    }
  }

  // Le compte d'actif débité dépend du moyen de paiement, pour que la compta
  // (Balance / Bilan) ventile Caisse / Banque / Mobile Money au lieu de tout
  // mettre dans « Cash ». Repli sur le compte par défaut du type "Rent Payment".
  private async resolvePaymentDebitAccount(
    method: string | null | undefined,
    fallbackId: number,
  ): Promise<number> {
    const m = (method || "")
      .toLowerCase()
      .replace(/[éèê]/g, "e"); // é è ê → e (espèce, chèque)
    const has = (...keys: string[]) => keys.some((k) => m.includes(k));
    if (has("banc", "carte", "cheque", "virement", "bank")) {
      return this.getOrCreateAssetSubAccount("Bank");
    }
    if (has("pesa", "airtel", "orange", "mobile", "mtn", "momo")) {
      return this.getOrCreateAssetSubAccount("Mobile Money");
    }
    if (has("espece", "cash", "liquide")) {
      return this.getOrCreateAssetSubAccount("Cash");
    }
    return fallbackId;
  }

  // get-or-create d'un sous-compte d'actif par nom (idempotent, sans seeder).
  private async getOrCreateAssetSubAccount(name: string): Promise<number> {
    const ASSET = 1;
    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(eq(subAccounts.name, name))
      .limit(1);
    if (rows.length) return rows[0].id;
    const [result] = await this.db.insert(subAccounts).values({
      name,
      accountId: ASSET,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return Number((result as any).insertId);
  }

  private async getRealEstateTaxTypeOptional(orgId: number) {
    const rows = await this.db
      .select({
        id: transactionTypes.id,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
      })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, "Real Estate Tax"), eq(transactionTypes.isActive, true), eq(transactionTypes.organizationId, orgId)))
      .limit(1);
    return rows[0] || null;
  }

  private async getRentPaymentType(orgId: number) {
    const rows = await this.db
      .select({
        id: transactionTypes.id,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
      })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, "Rent Payment"), eq(transactionTypes.isActive, true), eq(transactionTypes.organizationId, orgId)))
      .limit(1);

    if (!rows.length) {
      throw new BadRequestException("Rent Payment transaction type is missing.");
    }

    return rows[0];
  }

  private async ensureLeaseReferences(propertyId: number, unitId: number, tenantId: number, orgId: number) {
    await this.ensureActiveProperty(propertyId, orgId);
    const units = await this.db
      .select({ id: realEstateUnits.id, propertyId: realEstateUnits.propertyId })
      .from(realEstateUnits)
      .where(and(eq(realEstateUnits.id, unitId), ne(realEstateUnits.status, "false")))
      .limit(1);
    if (!units.length) {
      throw new NotFoundException("Unit not found.");
    }
    if (units[0].propertyId !== propertyId) {
      throw new BadRequestException("Cette unité n'appartient pas au bien sélectionné.");
    }
    await this.findTenant(tenantId, orgId);
  }

  private async getTenantRole() {
    const rows = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(inArray(roles.name, ["Locataire", "locataire", "tenant"]))
      .limit(1);

    if (!rows.length) {
      throw new BadRequestException("Role 'Locataire' not found.");
    }

    return rows[0];
  }

  private async ensureCustomerEmailAvailable(email: string) {
    const rows = await this.db.select({ id: customers.id }).from(customers).where(eq(customers.email, email)).limit(1);
    if (rows.length) {
      throw new BadRequestException("Customer email already exists.");
    }
  }

  private async getActiveOnboardingByToken(token: string, forMutation: boolean) {
    const rows = await this.db
      .select()
      .from(tenantOnboardings)
      .where(eq(tenantOnboardings.tokenHash, this.hashToken(token)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Lien invalide ou expiré.");
    }

    const onboarding = rows[0];
    if (onboarding.expiresAt && new Date(onboarding.expiresAt).getTime() < Date.now()) {
      await this.db
        .update(tenantOnboardings)
        .set({ status: "expired", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(tenantOnboardings.id, onboarding.id));
      throw new BadRequestException("Lien invalide ou expiré.");
    }

    if (["submitted", "validated"].includes(onboarding.status)) {
      throw new BadRequestException("Ce lien n'est plus modifiable.");
    }

    return onboarding;
  }

  private updateOnboardingData(id: number, data: Record<string, unknown>, status: string) {
    return this.db
      .update(tenantOnboardings)
      .set({
        data: JSON.stringify(data),
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantOnboardings.id, id));
  }

  private parseOnboardingData(data?: string | null): Record<string, any> {
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private validatedTenantPayload(data: Record<string, any>, expectedPhone: string): CreateTenantDto {
    // SCRUM-onboarding: champs obligatoires alignés avec le formulaire actuel
    // (origin_province, entity_address, hiring_date, contract_type, monthly_pay,
    // old_address/lessor, moving_reason sont retirés — les colonnes NOT NULL sont
    // défaultées plus bas pour éviter une migration lourde).
    const required = [
      "firstName",
      "lastName",
      "phone",
      "address",
      "birth_date",
      "sex",
      "nationality",
      "marital_status",
      "contacted_person",
      "contacted_person_phone_number",
      "prossional_status",
      "main_activity",
      "entity_name",
      "occupant_number",
    ];
    const missing = required.filter((key) => data[key] === undefined || data[key] === null || data[key] === "");
    if (missing.length) {
      throw new BadRequestException(`Missing required tenant fields: ${missing.join(", ")}.`);
    }
    if (data.phone !== expectedPhone) {
      throw new BadRequestException("Le numéro de téléphone ne correspond pas au lien d'inscription.");
    }
    if (data.sex !== "M" && data.sex !== "F") {
      throw new BadRequestException("Sex must be M or F.");
    }
    const childNumber = Number(data.child_number ?? 0);
    const childAges = Array.isArray(data.child_age) ? data.child_age : [];
    if (childNumber > 0 && childAges.length !== childNumber) {
      throw new BadRequestException("Child ages count must match child_number.");
    }
    if (this.isCoupleStatus(String(data.marital_status)) && (!data.partenair_name || !data.partenair_number)) {
      throw new BadRequestException("Partner name and phone number are required for couple marital statuses.");
    }

    return {
      ...data,
      origin_province: data.origin_province ?? "",
      entity_address: data.entity_address ?? "",
      contract_type: data.contract_type ?? "",
      hiring_date: data.hiring_date || null,
      monthly_pay: data.monthly_pay == null || data.monthly_pay === "" ? 0 : Number(data.monthly_pay),
      other_monthly_income:
        data.other_monthly_income === undefined || data.other_monthly_income === null || data.other_monthly_income === ""
          ? null
          : Number(data.other_monthly_income),
      occupant_number: Number(data.occupant_number),
      child_number: childNumber,
      child_age: childAges.map((age) => Number(age)),
    } as CreateTenantDto;
  }

  // Part de taxe contenue dans un paiement de loyer (taxe incluse/informative).
  // percent → tax = montant - montant/(1+taux/100) ; fixed → min(valeur, montant).
  // Renvoie null si la taxe du bail n'est pas en mode "auto" ou si invalide.
  private computeInclusiveTax(
    amount: number,
    lease: { taxApplyMode?: string | null; taxType?: string | null; taxValue?: string | number | null },
  ): number | null {
    if (!lease || lease.taxApplyMode !== "auto") return null;
    const value = Number(lease.taxValue);
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(amount) || amount <= 0) return null;
    if (lease.taxType === "percent") {
      const tax = amount - amount / (1 + value / 100);
      return Math.round(tax * 100) / 100;
    }
    if (lease.taxType === "fixed") {
      return Math.round(Math.min(value, amount) * 100) / 100;
    }
    return null;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private onboardingUrl(token: string) {
    return `${env.appUrl.replace(/\/$/, "")}/onboarding/tenant?token=${token}`;
  }

  private ensureTenantForm(input: CreateTenantDto) {
    if (this.isCoupleStatus(input.marital_status) && (!input.partenair_name || !input.partenair_number)) {
      throw new BadRequestException("Partner name and phone number are required for couple marital statuses.");
    }

    const childNumber = input.child_number ?? 0;
    const childAges = input.child_age ?? [];
    if (childNumber > 0 && childAges.length !== childNumber) {
      throw new BadRequestException("Child ages count must match child_number.");
    }
  }

  private isCoupleStatus(value: string) {
    return ["marié", "marie", "conjoint de fait", "union libre"].includes(value.trim().toLowerCase());
  }

  private usernameFromEmail(email?: string | null) {
    return email ? email.split("@")[0] : null;
  }

  private async ensureExists(table: any, id: number, message: string) {
    const rows = await this.db.select({ id: table.id }).from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException(message);
    }
  }

  private async ensureActiveProperty(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateProperties.id })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.id, id),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateProperties.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Property not found.");
    }
  }

  private async ensureActiveUnit(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateUnits.id })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .where(and(
        eq(realEstateUnits.id, id),
        ne(realEstateUnits.status, "false"),
        ne(realEstateProperties.status, "false"),
        eq(realEstateUnits.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Unit not found.");
    }
  }

  private async ensureOrgOwned(table: any, id: number, orgId: number, message: string) {
    const rows = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException(message);
    }
  }

  private setUnitStatus(id: number, status: string) {
    return this.db
      .update(realEstateUnits)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateUnits.id, id));
  }

  // Returns the appSetting's currencyId or null if no row exists yet.
  // Used as fallback when a transaction is created without an explicit
  // currencyId (legacy clients).
  private async resolveDefaultCurrency(orgId = 1): Promise<number | null> {
    const row = await readOrgAppSetting(this.db, orgId, { currencyId: appSettings.currencyId });
    return (row?.currencyId as number | null) ?? null;
  }

  private money(value: number | undefined | null) {
    return String(value ?? 0);
  }

  private date(value: string | null | undefined) {
    return value || null;
  }

  private requiredDate(value: string) {
    return value;
  }

  private parseDateOnly(value: string | Date) {
    if (value instanceof Date) {
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private addBillingCycle(value: Date, billingCycle?: string | null, direction = 1) {
    const next = new Date(value.getTime());
    const normalized = String(billingCycle || "monthly").toLowerCase();
    const months =
      normalized === "yearly" || normalized === "annual" ? 12 :
      normalized === "quarterly" ? 3 :
      1;
    next.setUTCMonth(next.getUTCMonth() + months * direction);
    return next;
  }

  private pick(input: object, keys: string[]) {
    const source = input as Record<string, unknown>;
    return keys.reduce<Record<string, unknown>>((result, key) => {
      if (source[key] !== undefined) {
        result[key] = source[key];
      }
      return result;
    }, {});
  }

  private publishPropertyUpdate(action: DataUpdateAction, entityId: number, scope: Partial<DataUpdateScope>) {
    return this.realtimeData.publishDataUpdated({
      entity: "property",
      action,
      entityId,
      scope,
    });
  }

  private publishUnitUpdate(action: DataUpdateAction, entityId: number, scope: Partial<DataUpdateScope>) {
    return this.realtimeData.publishDataUpdated({
      entity: "unit",
      action,
      entityId,
      scope,
    });
  }

  private publishLeaseUpdate(action: DataUpdateAction, entityId: number, scope: Partial<DataUpdateScope>) {
    return this.realtimeData.publishDataUpdated({
      entity: "lease",
      action,
      entityId,
      scope,
    });
  }

  private publishPaymentUpdate(action: DataUpdateAction, entityId: number, scope: Partial<DataUpdateScope>) {
    return this.realtimeData.publishDataUpdated({
      entity: "payment",
      action,
      entityId,
      scope,
    });
  }

  private publishOnboardingUpdate(action: DataUpdateAction, entityId: number) {
    return this.realtimeData.publishDataUpdated({
      entity: "tenantOnboarding",
      action,
      entityId,
      scope: {},
    });
  }

  // ── Affectation par bien (RBAC par bien, Domus, Phase 2) ──────────────────
  // Affecte/lit les biens d un utilisateur (real_estate_property_assignments).
  // Concerne N IMPORTE QUEL user, independamment du role et du poste.

  // Toutes les affectations actives de l org : map userId -> propertyId[].
  async listAllPropertyAssignments(orgId: number) {
    const rows = await this.db
      .select({ userId: realEstatePropertyAssignments.userId, propertyId: realEstatePropertyAssignments.propertyId })
      .from(realEstatePropertyAssignments)
      .where(and(eq(realEstatePropertyAssignments.organizationId, orgId), eq(realEstatePropertyAssignments.isActive, 1)));
    const byUser: Record<number, number[]> = {};
    for (const r of rows) (byUser[r.userId] ??= []).push(r.propertyId);
    return byUser;
  }

  async listPropertyAssignments(userId: number, orgId: number) {
    return this.db
      .select({ id: realEstatePropertyAssignments.id, propertyId: realEstatePropertyAssignments.propertyId })
      .from(realEstatePropertyAssignments)
      .where(and(
        eq(realEstatePropertyAssignments.userId, userId),
        eq(realEstatePropertyAssignments.organizationId, orgId),
        eq(realEstatePropertyAssignments.isActive, 1),
      ));
  }

  // Remplace l ensemble des biens d un user (set complet). Soft-delete des
  // retires, reactivation/insert des nouveaux (idempotent).
  async setPropertyAssignments(userId: number, propertyIds: number[], orgId: number) {
    const wanted = Array.from(new Set(propertyIds.filter((id) => Number.isInteger(id) && id > 0)));

    const existing = await this.db
      .select({ id: realEstatePropertyAssignments.id, propertyId: realEstatePropertyAssignments.propertyId, isActive: realEstatePropertyAssignments.isActive })
      .from(realEstatePropertyAssignments)
      .where(and(eq(realEstatePropertyAssignments.userId, userId), eq(realEstatePropertyAssignments.organizationId, orgId)));
    const byProperty = new Map(existing.map((row) => [row.propertyId, row]));

    for (const row of existing) {
      if (row.isActive === 1 && !wanted.includes(row.propertyId)) {
        await this.db.update(realEstatePropertyAssignments).set({ isActive: 0 }).where(eq(realEstatePropertyAssignments.id, row.id));
      }
    }
    for (const pid of wanted) {
      const row = byProperty.get(pid);
      if (row) {
        if (row.isActive !== 1) {
          await this.db.update(realEstatePropertyAssignments).set({ isActive: 1 }).where(eq(realEstatePropertyAssignments.id, row.id));
        }
      } else {
        await this.db.insert(realEstatePropertyAssignments).values({ userId, propertyId: pid, organizationId: orgId, isActive: 1 });
      }
    }
    return this.listPropertyAssignments(userId, orgId);
  }
}
