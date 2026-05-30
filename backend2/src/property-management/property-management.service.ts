import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { and, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  realEstateLeases,
  realEstateMaintenanceCosts,
  realEstateMaintenanceRequests,
  realEstateProperties,
  realEstateRentPayments,
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
import type { DataUpdateAction, DataUpdateScope } from "../realtime/data-update-event";
import { CompatService } from "../compat/compat.service";
import { RealtimeDataPublisher } from "../realtime/realtime-data-publisher.service";
import { SystemEmailService } from "../system-email/system-email.service";
import { normalizePhoneE164Strict } from "../common/phone.util";
import {
  CreateLeaseDto,
  CreateMaintenanceCostDto,
  CreateMaintenanceDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  CreateTenantDto,
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
  ) {}

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

    // Send the onboarding link straight to the tenant by SMS and email (best-effort).
    await this.sendOnboardingLink(response.url, phoneE164, input.email ?? null, input.firstName ?? null);

    return response;
  }

  private async sendOnboardingLink(
    url: string | null,
    phone: string | null,
    email: string | null,
    firstName: string | null,
  ) {
    if (!url) return;

    const [company] = await this.db
      .select({ name: appSettings.companyName })
      .from(appSettings)
      .limit(1);
    const companyName = company?.name || "votre gestionnaire";
    const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

    if (phone) {
      const message =
        `${greeting}, voici votre lien d'inscription en tant que locataire : ${url} ` +
        `Merci de le compléter dès que possible. — ${companyName}`;
      try {
        const res = await this.sms.sendSms({ phone, message });
        if (!res?.success) this.logger.warn(`Onboarding link SMS not sent to ${phone}: ${res?.message}`);
      } catch (error) {
        this.logger.warn(`Onboarding link SMS error to ${phone}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (email) {
      const html =
        `<p>${greeting},</p>` +
        `<p>Voici votre lien d'inscription en tant que locataire :</p>` +
        `<p><a href="${url}">${url}</a></p>` +
        `<p>Merci de le compléter dès que possible.</p>` +
        `<p>Cordialement,<br>${companyName}</p>`;
      try {
        await this.emails.send({
          to: email,
          subject: "Votre lien d'inscription locataire",
          html,
          type: "form_link",
          relatedType: "tenant-onboarding",
        });
      } catch (error) {
        this.logger.warn(`Onboarding link email error to ${email}: ${error instanceof Error ? error.message : String(error)}`);
      }
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
    return { message: "Dossier d'inscription supprimé." };
  }

  // SCRUM-229 — normalize every phone field on an onboarding payload to E.164.
  // Empty/optional fields are left null; invalid input throws so the API
  // returns a clear error rather than silently storing a malformed number.
  private normalizeOnboardingPhones<T extends Record<string, any>>(input: T): T {
    const phoneFields = ["phone", "phone2", "partenair_number", "contacted_person_phone_number"] as const;
    const next: Record<string, any> = { ...input };
    for (const f of phoneFields) {
      if (next[f] === undefined) continue;
      next[f] = next[f] ? normalizePhoneE164Strict(next[f]) : null;
    }
    return next as T;
  }

  async saveOnboardingByAdmin(id: number, input: SaveTenantOnboardingDto) {
    const onboarding = await this.findOnboarding(id);
    if (onboarding.status === "validated") {
      throw new BadRequestException("This onboarding dossier has already been validated.");
    }
    const normalized = this.normalizeOnboardingPhones(input);
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
    const [setting] = await this.db
      .select({ currencyId: appSettings.currencyId })
      .from(appSettings)
      .limit(1);
    return {
      id: onboarding.id,
      phone: onboarding.phone,
      status: onboarding.status,
      data: this.parseOnboardingData(onboarding.data),
      expiresAt: onboarding.expiresAt,
      currencies: activeCurrencies,
      defaultCurrencyId: setting?.currencyId ?? null,
    };
  }

  async savePublicOnboarding(token: string, input: SaveTenantOnboardingDto) {
    const onboarding = await this.getActiveOnboardingByToken(token, true);
    const normalized = this.normalizeOnboardingPhones(input);
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
        originProvince: input.origin_province,
        phone2: input.phone2 ?? null,
        contactedPerson: input.contacted_person,
        contactedPersonPhoneNumber: input.contacted_person_phone_number,
        professionalStatus: input.prossional_status,
        mainActivity: input.main_activity,
        entityName: input.entity_name,
        entityAddress: input.entity_address,
        hiringDate: input.hiring_date,
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

  async properties(orgId: number) {
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
      .where(and(ne(realEstateProperties.status, "false"), eq(realEstateProperties.isActive, 1), eq(realEstateProperties.organizationId, orgId)))
      .groupBy(realEstateProperties.id)
      .orderBy(desc(realEstateProperties.id));

    return rows.map((row) => ({ ...row, unitsCount: Number(row.unitsCount) }));
  }

  async createProperty(input: CreatePropertyDto, orgId: number) {
    const code = input.code?.trim() || (await this.nextPropertyCode());
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
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
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
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

  leases(orgId: number) {
    return this.leaseQuery()
      .where(and(
        ne(realEstateLeases.status, "cancelled"),
        ne(leaseProperty.status, "false"),
        eq(leaseProperty.isActive, 1),
        ne(leaseUnit.status, "false"),
        eq(leaseUnit.isActive, 1),
        eq(realEstateLeases.organizationId, orgId),
      ))
      .orderBy(desc(realEstateLeases.id));
  }

  async createLease(input: CreateLeaseDto, orgId: number) {
    await this.ensureLeaseReferences(input.propertyId, input.unitId, input.tenantId, orgId);
    const currencyId = (input as any).currencyId ?? (await this.resolveDefaultCurrency());
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
        ]),
        ...(input.startDate !== undefined ? { startDate: this.requiredDate(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: this.date(input.endDate) } : {}),
        ...(input.nextInvoiceDate !== undefined ? { nextInvoiceDate: this.date(input.nextInvoiceDate) } : {}),
        ...(input.rentAmount !== undefined ? { rentAmount: this.money(input.rentAmount) } : {}),
        ...(input.securityDeposit !== undefined ? { securityDeposit: this.money(input.securityDeposit) } : {}),
        ...(input.moveInMeterReading !== undefined
          ? { moveInMeterReading: input.moveInMeterReading === null ? null : this.money(input.moveInMeterReading) }
          : {}),
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

  payments(orgId: number) {
    return this.paymentQuery(undefined, orgId).orderBy(desc(realEstateRentPayments.id));
  }

  private paymentQuery(id?: number, orgId?: number) {
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
      ));
  }

  async createPayment(input: CreateRentPaymentDto, orgId: number) {
    const lease = await this.getLeaseOrThrow(input.leaseId, orgId);
    const rentPaymentType = await this.getRentPaymentType();
    const debitId = input.paymentAccountId ?? rentPaymentType.debitAccountId;
    await this.ensureExists(subAccounts, debitId, "Payment account not found.");

    // Currency precedence: explicit input → lease's currency → app default
    const paymentCurrencyId =
      (input as any).currencyId
      ?? (lease as any).currencyId
      ?? (await this.resolveDefaultCurrency());

    const [transactionResult] = await this.db.insert(transactions).values({
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
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const paymentId = Number(paymentResult.insertId);
    await this.advanceLeaseInvoiceDateIfCovered(lease, orgId, input.paymentDate);
    await this.publishPaymentUpdate("created", paymentId, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    return this.findPayment(paymentId);
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
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantEmail: customers.email,
      })
      .from(realEstateLeases)
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .where(eq(realEstateLeases.id, leaseId))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const lease = rows[0];
    if (!lease.tenantEmail) throw new BadRequestException("Email du locataire introuvable.");

    const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
    const subject = `Rappel de paiement de loyer — Bail #${lease.reference}`;
    const html = `
      <p>Bonjour ${tenantName},</p>
      <p>Nous vous rappelons que votre loyer pour le bail <strong>#${lease.reference}</strong> est en retard.</p>
      <p><strong>Montant du:</strong> ${lease.rentAmount}</p>
      <p>Merci de régulariser ce paiement au plus tôt possible.</p>
      <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
      <p>Cordialement,<br>L'équipe de gestion immobilière</p>
    `;

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
        assigneeId: realEstateMaintenanceRequests.assigneeId,
        assigneeFirstName: maintenanceAssignee.firstName,
        assigneeLastName: maintenanceAssignee.lastName,
        assigneeUsername: maintenanceAssignee.username,
        description: realEstateMaintenanceRequests.description,
        propertyName: maintenanceProperty.name,
        unitName: maintenanceUnit.name,
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
    return this.findMaintenance(Number(result.insertId));
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
      .select()
      .from(realEstateMaintenanceCosts)
      .where(and(eq(realEstateMaintenanceCosts.ticketId, ticketId), eq(realEstateMaintenanceCosts.isActive, 1)))
      .orderBy(desc(realEstateMaintenanceCosts.id));
  }

  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  private saveReceiptFile(file: any, publicApiBase?: string): string | null {
    if (!file?.buffer) return null;
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
    const ext = (file.originalname?.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "") || "bin";
    const name = `receipt-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    writeFileSync(join(this.uploadDir, name), file.buffer);
    const base = publicApiBase ?? "";
    return `${base}/uploads/${name}`;
  }

  async createMaintenanceCost(ticketId: number, input: CreateMaintenanceCostDto, orgId: number, receipt?: any, publicApiBase?: string) {
    await this.findMaintenance(ticketId, orgId);

    const receiptUrl = this.saveReceiptFile(receipt, publicApiBase) ?? input.receiptUrl ?? null;

    const [result] = await this.db.insert(realEstateMaintenanceCosts).values({
      ticketId,
      type: input.type,
      description: input.description,
      amount: String(input.amount),
      currencyId: input.currencyId ?? null,
      vendorName: input.vendorName ?? null,
      paymentMethod: input.paymentMethod ?? "cash",
      paymentDate: input.paymentDate ?? null,
      notes: input.notes ?? null,
      receiptUrl,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    // Auto-create accounting transaction
    const creditId = input.paymentMethod === "bank" ? 2 : 1; // 2=Bank, 1=Cash
    const maintenanceSubAccount = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(eq(subAccounts.name, "Maintenance"))
      .limit(1);
    const debitId = maintenanceSubAccount[0]?.id ?? 12;

    await this.db.insert(transactions).values({
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

    return this.db
      .select()
      .from(realEstateMaintenanceCosts)
      .where(eq(realEstateMaintenanceCosts.id, Number((result as any).insertId)))
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
        propertyName: leaseProperty.name,
        propertyAddress: leaseProperty.address,
        unitName: leaseUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
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

  private async getRentPaymentType() {
    const rows = await this.db
      .select({
        id: transactionTypes.id,
        debitAccountId: transactionTypes.debitAccountId,
        creditAccountId: transactionTypes.creditAccountId,
      })
      .from(transactionTypes)
      .where(and(eq(transactionTypes.name, "Rent Payment"), eq(transactionTypes.isActive, true)))
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
    const required = [
      "firstName",
      "lastName",
      "phone",
      "address",
      "birth_date",
      "sex",
      "nationality",
      "marital_status",
      "origin_province",
      "contacted_person",
      "contacted_person_phone_number",
      "prossional_status",
      "main_activity",
      "entity_name",
      "entity_address",
      "hiring_date",
      "contract_type",
      "monthly_pay",
      "old_address",
      "old_lessor",
      "moving_reason",
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
      monthly_pay: Number(data.monthly_pay),
      other_monthly_income:
        data.other_monthly_income === undefined || data.other_monthly_income === null || data.other_monthly_income === ""
          ? null
          : Number(data.other_monthly_income),
      occupant_number: Number(data.occupant_number),
      child_number: childNumber,
      child_age: childAges.map((age) => Number(age)),
    } as CreateTenantDto;
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
  private async resolveDefaultCurrency(): Promise<number | null> {
    const [row] = await this.db
      .select({ currencyId: appSettings.currencyId })
      .from(appSettings)
      .limit(1);
    return row?.currencyId ?? null;
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
}
