import { BadRequestException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { join } from "path";
import { and, desc, eq, getTableColumns, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { extractStoredFileName, IMAGE_OR_PDF_MIME_TYPES, readValidatedUploadFile, saveValidatedUploadFile } from "../common/upload-security";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  emailTemplates,
  realEstateContracts,
  realEstateExpenseInstallments,
  realEstateLeaseDocuments,
  realEstateLeases,
  realEstateMaintenanceCosts,
  realEstateMaintenancePhotos,
  realEstateMaintenanceRequests,
  realEstateMortgageLoans,
  realEstateMortgagePayments,
  realEstateOwners,
  realEstateProperties,
  organizations,
  realEstatePropertyExpenses,
  realEstatePropertyPhotos,
  realEstateReservations,
  realEstateCoupons,
  realEstatePropertyAssignments,
  realEstateRentPayments,
  realEstateSecurityDeposits,
  realEstateUnits,
  roles,
  smsLogs,
  subAccounts,
  systemEmailLogs,
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
import { WhatsappClientService } from "../whatsapp-client/whatsapp-client.service";
import { LedgerService } from "../ledger/ledger.service";
import { ProjectsService } from "../projects/projects.service";
import { WorkflowService } from "../workflow/workflow.service";
import { InvalidPhoneNumberError, normalizePhoneE164, normalizePhoneE164Strict } from "../common/phone.util";
import type { DomusPropertyScope } from "../auth/decorators/domus-property-scope.decorator";
import {
  CreateLeaseDto,
  CreateMaintenanceCostDto,
  CreateMaintenanceDto,
  CreateOwnerDto,
  UpdateOwnerDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  ConfirmPendingPaymentDto,
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
  CreateReservationDto,
  UpdateReservationDto,
  CheckOutReservationDto,
  CreateCouponDto,
  UpdateCouponDto,
  PublicReservationRequestDto,
  PublicLeaseRequestDto,
  CreatePropertyExpenseDto,
  UpdatePropertyExpenseDto,
  GenerateExpenseInstallmentsDto,
  AddExpensePartialPaymentDto,
  PayExpenseInstallmentDto,
  UpdateExpenseInstallmentDto,
  CreateMortgagePaymentDto,
  UpdateMortgagePaymentDto,
  CreateMortgageLoanDto,
  UpdateMortgageLoanDto,
  MORTGAGE_AMOUNT_TOLERANCE,
} from "./dto/property-management.dto";
import { ObjectStorageService } from "./object-storage.service";
import { TenantPortalService } from "./tenant-portal.service";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { GeocodingService } from "./geocoding.service";

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
    private readonly objectStorage: ObjectStorageService,
    private readonly whatsapp: WhatsappClientService,
    private readonly tenantPortal: TenantPortalService,
    private readonly geocoding: GeocodingService,
    private readonly ownerNotifications: OwnerNotificationsService,
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
      .where(and(
        eq(realEstateRentPayments.organizationId, orgId),
        eq(realEstateRentPayments.status, "paid"),
      ));
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
        idDocumentType: tenantDetails.idDocumentType,
        idNumber: tenantDetails.idNumber,
        idDocumentName: tenantDetails.idDocumentName,
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
    // Lecture SANS filtre sur status : findTenant n'expose que les dossiers
    // actifs, ce qui rendrait un locataire desactive introuvable et donc
    // impossible a reactiver (soft delete sans retour possible).
    const [existing] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)))
      .limit(1);
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
    // Soft delete / reactivation : sans ca, PUT /tenants/:id acquittait un
    // status envoye par le client sans jamais l'appliquer (le dossier restait
    // actif). Aucun DELETE physique, l'historique reste intact.
    if (input.status !== undefined) customerSet.status = input.status;
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
    if (input.id_document_type !== undefined) detail.idDocumentType = input.id_document_type ?? null;
    if (input.id_number !== undefined) detail.idNumber = input.id_number ?? null;
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
        idDocumentType: input.id_document_type ?? null,
        idNumber: input.id_number ?? null,
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

    // Apres une desactivation (status "false"), le dossier sort du perimetre de
    // findTenant : on renvoie alors un accuse minimal plutot qu'un 404 sur une
    // mise a jour qui a pourtant reussi.
    if (input.status === "false") {
      return { id, status: "false" };
    }
    return this.findTenant(id, orgId);
  }

  async generateTenantOnboarding(input: GenerateTenantOnboardingDto, orgId: number) {
    // SCRUM-229 — store the phone identifier in canonical E.164.
    const phoneE164 = this.normalizePhoneOrBadRequest(input.phone);
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
      organizationId: orgId,
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

  /**
   * Envoie (ou renvoie) le SMS de lien d'inscription pour un dossier onboarding
   * existant, puis trace `sms_sent_at` afin que le frontend sache distinguer
   * "Envoyer" de "Renvoyer" (le dossier n'a jamais reçu de SMS avant ce champ).
   */
  async sendOnboardingSms(id: number) {
    const onboarding = await this.findOnboarding(id);
    const data = this.parseOnboardingData(onboarding.data);
    const phone = data.phone || onboarding.phone;
    if (!phone) {
      throw new BadRequestException("Aucun numero de telephone pour ce dossier d'inscription.");
    }
    const url = onboarding.token ? this.onboardingUrl(onboarding.token) : null;
    if (!url) {
      throw new BadRequestException("Ce dossier d'inscription n'a pas de lien valide.");
    }

    // Texte pilote depuis Reglages > Messages (evenement "tenant_onboarding").
    const message = await this.ownerNotifications.renderMessage(
      "tenant_onboarding",
      "Bonjour {firstName}, completez votre dossier locataire Domus ici : {url}",
      { firstName: (data.firstName as string) || "", tenantName: "", url, reference: "", amount: "" },
    );
    const result = await this.sms.sendSms({
      phone,
      message,
      // Option A : Twilio rappellera cet endpoint public signe pour tracer la
      // livraison reelle (voir handleSmsStatusCallback).
      statusCallback: `${env.appUrl.replace(/\/$/, "")}/api/tenant-onboarding/sms-status`,
    });
    if (!result?.success) {
      throw new BadRequestException(result?.message || "Impossible d'envoyer le SMS.");
    }

    await this.db
      .update(tenantOnboardings)
      .set({
        smsSentAt: sql`CURRENT_TIMESTAMP`,
        smsSid: result.sid ?? null,
        smsStatus: result.status ?? "queued",
        smsDeliveredAt: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantOnboardings.id, id));

    return this.adminOnboardingResponse(await this.findOnboarding(id));
  }

  /**
   * Envoie (ou renvoie) l'email de lien d'inscription pour un dossier onboarding
   * existant, puis trace `email_sent_at` (voir sendOnboardingSms ci-dessus).
   */
  async sendOnboardingEmail(id: number) {
    const onboarding = await this.findOnboarding(id);
    const data = this.parseOnboardingData(onboarding.data);
    const email = data.email;
    if (!email) {
      throw new BadRequestException("Aucun email pour ce dossier d'inscription.");
    }
    const url = onboarding.token ? this.onboardingUrl(onboarding.token) : null;
    if (!url) {
      throw new BadRequestException("Ce dossier d'inscription n'a pas de lien valide.");
    }

    const company = await readOrgAppSetting(this.db, 1, { name: appSettings.companyName });
    const companyName = (company?.name as string | null) || "votre gestionnaire";
    // Meme texte que le SMS (regle Domus : un seul contenu sert aux deux
    // canaux), pilote par le template "tenant_onboarding" des Reglages.
    const text = await this.ownerNotifications.renderMessage(
      "tenant_onboarding",
      "Bonjour {firstName}, completez votre dossier locataire Domus ici : {url}. " +
        `Merci de le faire des que possible. — ${companyName}`,
      { firstName: (data.firstName as string) || "", tenantName: "", url, reference: "", amount: "" },
    );
    const html = `<p>${text.replace(url, `<a href="${url}">${url}</a>`)}</p>`;
    try {
      await this.emails.send({
        to: email,
        subject: "Votre lien d'inscription locataire",
        html,
        type: "form_link",
        relatedType: "tenant-onboarding",
      });
    } catch (error) {
      this.logger.warn(
        `Onboarding link email error to ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException("Impossible d'envoyer l'email.");
    }

    await this.db
      .update(tenantOnboardings)
      .set({ emailSentAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(tenantOnboardings.id, id));

    return this.adminOnboardingResponse(await this.findOnboarding(id));
  }

  /**
   * Webhook public appele par Twilio (StatusCallback, option A) a chaque
   * changement de statut d'un SMS. Relie le message au dossier via sms_sid et
   * met a jour sms_status / sms_delivered_at. Endpoint public => on valide la
   * signature X-Twilio-Signature avant toute ecriture.
   */
  async handleSmsStatusCallback(fullUrl: string, signature: string, body: Record<string, any>) {
    if (!this.isValidTwilioSignature(fullUrl, signature, body)) {
      throw new UnauthorizedException("Invalid Twilio signature.");
    }
    const sid = body?.MessageSid || body?.SmsSid;
    const status = String(body?.MessageStatus || body?.SmsStatus || "").toLowerCase();
    if (!sid || !status) return { ok: true };

    const patch: Record<string, any> = {
      smsStatus: status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    };
    if (status === "delivered") {
      patch.smsDeliveredAt = sql`CURRENT_TIMESTAMP`;
    }
    await this.db
      .update(tenantOnboardings)
      .set(patch)
      .where(eq(tenantOnboardings.smsSid, String(sid)));
    return { ok: true };
  }

  // Signature Twilio: HMAC-SHA1(authToken, url + concat des params POST tries
  // par cle) encode en base64, compare a X-Twilio-Signature.
  private isValidTwilioSignature(url: string, signature: string, params: Record<string, any>) {
    const authToken = env.twilio.authToken;
    if (!authToken || !signature) return false;
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + String(params[key] ?? ""), url);
    const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }


  async onboardingList(orgId: number) {
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
        smsSentAt: tenantOnboardings.smsSentAt,
        emailSentAt: tenantOnboardings.emailSentAt,
        smsStatus: tenantOnboardings.smsStatus,
        smsDeliveredAt: tenantOnboardings.smsDeliveredAt,
        createdAt: tenantOnboardings.createdAt,
        updatedAt: tenantOnboardings.updatedAt,
      })
      .from(tenantOnboardings)
      .where(and(ne(tenantOnboardings.status, "deleted"), eq(tenantOnboardings.organizationId, orgId)))
      .orderBy(desc(tenantOnboardings.id));

    return rows.map((row) => this.adminOnboardingResponse(row));
  }

  async deleteOnboarding(id: number, orgId: number) {
    const [onboarding] = await this.db
      .select({ id: tenantOnboardings.id, status: tenantOnboardings.status })
      .from(tenantOnboardings)
      .where(and(eq(tenantOnboardings.id, id), eq(tenantOnboardings.organizationId, orgId)))
      .limit(1);
    if (!onboarding) {
      throw new NotFoundException("Onboarding not found");
    }
    if (onboarding.status === "validated") {
      throw new BadRequestException(
        "Impossible de supprimer : ce dossier est validé et lié à un locataire.",
      );
    }
    await this.db
      .update(tenantOnboardings)
      .set({ status: "deleted", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(tenantOnboardings.id, id), eq(tenantOnboardings.organizationId, orgId)));
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
        next[f] = this.normalizePhoneOrBadRequest(next[f]);
      }
    }
    return next as T;
  }

  // SCRUM-229 — un numéro invalide est une erreur de saisie utilisateur (400),
  // pas une panne serveur : InvalidPhoneNumberError n'est pas une HttpException
  // et remontait sinon en 500 générique côté client.
  private normalizePhoneOrBadRequest(raw: string): string {
    try {
      return normalizePhoneE164Strict(raw);
    } catch (err) {
      if (err instanceof InvalidPhoneNumberError) {
        throw new BadRequestException(`Numero de telephone invalide : "${raw}"`);
      }
      throw err;
    }
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
        idDocumentType: input.id_document_type ?? null,
        idNumber: input.id_number ?? null,
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

    const tenant = await this.findTenant(customerId, orgId);
    // Le lien portail est cree systematiquement a l'ouverture du dossier (meme
    // sans telephone) : la fiche locataire doit toujours pouvoir l'afficher
    // sans qu'un gestionnaire ait a cliquer sur "Generer".
    try {
      await this.tenantPortal.generateTenantPortalLink(customerId, orgId);
    } catch (error) {
      this.logger.warn(
        `Portal link not created for tenant ${customerId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await this.sendTenantCreatedSms(customerId, orgId);
    // Tous les proprietaires actifs sont informes de l'ouverture du dossier
    // (SMS + lien portail proprietaire). Le ciblage sur le seul bailleur
    // concerne se fait a la creation du bail, quand le bien est connu.
    await this.ownerNotifications.notifyTenantCreated(customerId, orgId);
    return tenant;
  }

  /**
   * Genere (ou reutilise) le lien portail d'un locataire ET le previent par SMS
   * que son dossier est disponible. Utilise par le bouton "Generer le lien
   * portail" de la fiche locataire, pour les dossiers anterieurs qui n'avaient
   * pas encore de lien : meme resultat qu'une creation de dossier aujourd'hui.
   */
  async generateTenantPortalLinkAndNotify(tenantId: number, orgId: number) {
    const link = await this.tenantPortal.generateTenantPortalLink(tenantId, orgId);
    await this.sendTenantCreatedSms(tenantId, orgId);
    return link;
  }

  /**
   * SMS de confirmation envoye au locataire des que son dossier est cree.
   * Best-effort : un echec d'envoi ne doit jamais faire echouer la creation
   * du dossier (meme principe que sendLeaseWelcome).
   */
  async sendTenantCreatedSms(tenantId: number, orgId: number) {
    try {
      const tenant: any = await this.findTenant(tenantId, orgId);
      const phone = tenant?.phone;
      if (!phone) return;

      // Message volontairement court : appendPortalFooterToSms ajoute ensuite
      // "Cliquez ici pour voir votre dossier : <lien>" (~99 caracteres avec un
      // token court). Objectif = tenir dans UN seul SMS (160 caracteres) pour
      // ne pas doubler le cout d'envoi. D'ou le prenom seul (pas "prenom nom")
      // et pas de nom de societe : l'emetteur est deja identifiable par le
      // domaine du lien.
      const firstName = (tenant.firstName || "").trim().split(/\s+/)[0] || "";
      // Texte pilote depuis Reglages > Messages (evenement "tenant_created").
      // {url} = espace locataire public ; si le modele ne le place pas, le
      // footer standard l'ajoute en fin de message (jamais les deux).
      const portalUrl = await this.tenantPortal.portalUrlForTenant(tenantId, orgId);
      const message = await this.ownerNotifications.renderMessage(
        "tenant_created",
        firstName ? "Bonjour {firstName}, votre dossier locataire est cree." : "Votre dossier locataire est cree.",
        {
          firstName,
          tenantName: [tenant.firstName, tenant.lastName].filter(Boolean).join(" "),
          url: portalUrl,
          reference: "",
          amount: "",
        },
      );

      // fitOneSms apres le footer : le lien est ajoute hors du rendu, il ne
      // doit pas faire basculer le message sur un 2e segment facture.
      const messageWithFooter = this.ownerNotifications.fitOneSms(
        portalUrl && message.includes(portalUrl)
          ? message
          : await this.tenantPortal.appendPortalFooterToSms(message, tenantId, orgId),
      );
      const res = await this.sms.sendSms({
        phone,
        message: messageWithFooter,
        organizationId: orgId,
        smsType: "tenant_created",
        relatedType: "tenant",
        relatedId: tenantId,
      });
      if (!res?.success) {
        this.logger.warn(`Tenant created SMS not sent (tenant ${tenantId}, ${phone}): ${res?.message}`);
      }
    } catch (error) {
      this.logger.warn(
        `Tenant created SMS error (tenant ${tenantId}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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

  private ensurePropertyInScope(propertyId: number, scope: "all" | number[]) {
    if (scope !== "all" && !scope.includes(propertyId)) {
      throw new NotFoundException("Property not found.");
    }
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
        latitude: realEstateProperties.latitude,
        longitude: realEstateProperties.longitude,
        floors: realEstateProperties.floors,
        parkingSpaces: realEstateProperties.parkingSpaces,
        marketValue: realEstateProperties.marketValue,
        defaultRent: realEstateProperties.defaultRent,
        currencyId: realEstateProperties.currencyId,
        ownerId: realEstateProperties.ownerId,
        ownerName: realEstateOwners.displayName,
        description: realEstateProperties.description,
        availableForBooking: realEstateProperties.availableForBooking,
        createdAt: realEstateProperties.createdAt,
        updatedAt: realEstateProperties.updatedAt,
        unitsCount: sql<number>`count(${realEstateUnits.id})`,
      })
      .from(realEstateProperties)
      .leftJoin(
        realEstateUnits,
        and(eq(realEstateUnits.propertyId, realEstateProperties.id), ne(realEstateUnits.status, "false")),
      )
      .leftJoin(realEstateOwners, eq(realEstateOwners.id, realEstateProperties.ownerId))
      .where(and(ne(realEstateProperties.status, "false"), eq(realEstateProperties.isActive, 1), eq(realEstateProperties.organizationId, orgId), scopeFilter))
      .groupBy(realEstateProperties.id)
      .orderBy(desc(realEstateProperties.id));

    return rows.map((row) => ({ ...row, unitsCount: Number(row.unitsCount) }));
  }

  // ── Proprietaires legaux (Domus) ─────────────────────────────────────────
  // Liste allegee (sans signature, trop lourde) + compteur de biens actifs.
  async owners(orgId: number) {
    const rows = await this.db
      .select({
        id: realEstateOwners.id,
        displayName: realEstateOwners.displayName,
        ownerType: realEstateOwners.ownerType,
        firstName: realEstateOwners.firstName,
        lastName: realEstateOwners.lastName,
        companyName: realEstateOwners.companyName,
        representativeName: realEstateOwners.representativeName,
        phone: realEstateOwners.phone,
        phone2: realEstateOwners.phone2,
        email: realEstateOwners.email,
        address: realEstateOwners.address,
        city: realEstateOwners.city,
        country: realEstateOwners.country,
        idDocumentType: realEstateOwners.idDocumentType,
        idNumber: realEstateOwners.idNumber,
        taxId: realEstateOwners.taxId,
        notes: realEstateOwners.notes,
        createdAt: realEstateOwners.createdAt,
        updatedAt: realEstateOwners.updatedAt,
      })
      .from(realEstateOwners)
      .where(and(eq(realEstateOwners.organizationId, orgId), eq(realEstateOwners.isActive, 1)))
      .orderBy(realEstateOwners.displayName);

    if (!rows.length) return [];

    const counts = await this.db
      .select({
        ownerId: realEstateProperties.ownerId,
        count: sql<number>`count(*)`,
      })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.organizationId, orgId),
        eq(realEstateProperties.isActive, 1),
        inArray(realEstateProperties.ownerId, rows.map((r) => r.id)),
      ))
      .groupBy(realEstateProperties.ownerId);
    const countByOwner = new Map(counts.map((c) => [Number(c.ownerId), Number(c.count)]));

    return rows.map((row) => ({ ...row, propertiesCount: countByOwner.get(row.id) ?? 0 }));
  }

  async owner(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateOwners)
      .where(and(eq(realEstateOwners.id, id), eq(realEstateOwners.organizationId, orgId), eq(realEstateOwners.isActive, 1)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Proprietaire introuvable.");

    const properties = await this.db
      .select({ id: realEstateProperties.id, name: realEstateProperties.name })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.organizationId, orgId),
        eq(realEstateProperties.ownerId, id),
        eq(realEstateProperties.isActive, 1),
        ne(realEstateProperties.status, "false"),
      ))
      .orderBy(realEstateProperties.name);

    return { ...rows[0], properties };
  }

  async createOwner(input: CreateOwnerDto, orgId: number) {
    const [result] = await this.db.insert(realEstateOwners).values({
      organizationId: orgId,
      displayName: input.displayName,
      ownerType: input.ownerType ?? "individual",
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      companyName: input.companyName ?? null,
      representativeName: input.representativeName ?? null,
      phone: input.phone ?? null,
      phone2: input.phone2 ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      idDocumentType: input.idDocumentType ?? null,
      idNumber: input.idNumber ?? null,
      taxId: input.taxId ?? null,
      signature: input.signature ?? null,
      notes: input.notes ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.owner(Number(result.insertId), orgId);
  }

  async updateOwner(id: number, input: UpdateOwnerDto, orgId: number) {
    await this.ensureActiveOwner(id, orgId);
    await this.db
      .update(realEstateOwners)
      .set({
        ...this.pick(input, [
          "displayName",
          "ownerType",
          "firstName",
          "lastName",
          "companyName",
          "representativeName",
          "phone",
          "phone2",
          "email",
          "address",
          "city",
          "country",
          "idDocumentType",
          "idNumber",
          "taxId",
          "signature",
          "notes",
        ]),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateOwners.id, id), eq(realEstateOwners.organizationId, orgId)));
    return this.owner(id, orgId);
  }

  async deleteOwner(id: number, orgId: number) {
    await this.ensureActiveOwner(id, orgId);

    const [attachedRow] = await this.db
      .select({ id: realEstateProperties.id })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.organizationId, orgId),
        eq(realEstateProperties.ownerId, id),
        eq(realEstateProperties.isActive, 1),
        ne(realEstateProperties.status, "false"),
      ))
      .limit(1);
    if (attachedRow) {
      throw new BadRequestException(
        "Réassignez ou détachez d'abord les biens rattachés à ce propriétaire avant de le supprimer.",
      );
    }

    await this.db
      .update(realEstateOwners)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateOwners.id, id), eq(realEstateOwners.organizationId, orgId)));
    return { message: "Proprietaire supprime." };
  }

  private async ensureActiveOwner(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateOwners.id })
      .from(realEstateOwners)
      .where(and(eq(realEstateOwners.id, id), eq(realEstateOwners.organizationId, orgId), eq(realEstateOwners.isActive, 1)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Proprietaire introuvable.");
  }

  // Variante 400 (au lieu de 404) utilisée quand ownerId est fourni depuis
  // createProperty/updateProperty : un owner absent/inactif est une erreur de
  // saisie sur le bien, pas une ressource "owner" introuvable en soi.
  private async ensureActiveOwnerForProperty(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateOwners.id })
      .from(realEstateOwners)
      .where(and(eq(realEstateOwners.id, id), eq(realEstateOwners.organizationId, orgId), eq(realEstateOwners.isActive, 1)))
      .limit(1);
    if (!rows.length) throw new BadRequestException("Proprietaire introuvable ou inactif.");
  }

  async propertyPhotos(orgId: number, propertyScope: "all" | number[] = "all", propertyId?: number) {
    const scopeFilter = this.propertyDirectFilter(realEstatePropertyPhotos.propertyId, propertyScope);
    const rows = await this.db
      .select({
        id: realEstatePropertyPhotos.id,
        organizationId: realEstatePropertyPhotos.organizationId,
        propertyId: realEstatePropertyPhotos.propertyId,
        unitId: realEstatePropertyPhotos.unitId,
        bucket: realEstatePropertyPhotos.bucket,
        objectKey: realEstatePropertyPhotos.objectKey,
        originalName: realEstatePropertyPhotos.originalName,
        mimeType: realEstatePropertyPhotos.mimeType,
        sizeBytes: realEstatePropertyPhotos.sizeBytes,
        isPrimary: realEstatePropertyPhotos.isPrimary,
        sortOrder: realEstatePropertyPhotos.sortOrder,
        createdAt: realEstatePropertyPhotos.createdAt,
      })
      .from(realEstatePropertyPhotos)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstatePropertyPhotos.propertyId))
      .where(and(
        eq(realEstatePropertyPhotos.organizationId, orgId),
        eq(realEstatePropertyPhotos.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        propertyId ? eq(realEstatePropertyPhotos.propertyId, propertyId) : undefined,
        scopeFilter,
      ))
      .orderBy(desc(realEstatePropertyPhotos.isPrimary), realEstatePropertyPhotos.sortOrder, desc(realEstatePropertyPhotos.id));

    return rows.map((row) => this.propertyPhotoResponse(row));
  }

  async uploadPropertyPhoto(
    propertyId: number,
    file: any,
    orgId: number,
    propertyScope: "all" | number[] = "all",
    unitId?: number | null,
  ) {
    await this.ensureActiveProperty(propertyId, orgId);
    this.ensurePropertyInScope(propertyId, propertyScope);
    const photoUnitId = unitId != null && Number.isFinite(unitId) && unitId > 0 ? Number(unitId) : null;
    if (photoUnitId != null) {
      await this.ensureActiveUnitInProperty(photoUnitId, propertyId, orgId);
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstatePropertyPhotos)
      .where(and(
        eq(realEstatePropertyPhotos.organizationId, orgId),
        eq(realEstatePropertyPhotos.propertyId, propertyId),
        this.photoUnitFilter(photoUnitId),
        eq(realEstatePropertyPhotos.isActive, 1),
      ));
    const count = Number(countRow?.count || 0);
    const stored = await this.objectStorage.putImage(
      file,
      photoUnitId != null ? `domus/properties/${orgId}/${propertyId}/units/${photoUnitId}` : `domus/properties/${orgId}/${propertyId}`,
    );
    const [result] = await this.db.insert(realEstatePropertyPhotos).values({
      organizationId: orgId,
      propertyId,
      unitId: photoUnitId,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: file?.originalname ? String(file.originalname).slice(0, 255) : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      isPrimary: count === 0 ? 1 : 0,
      sortOrder: count,
      isActive: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    await this.publishPropertyUpdate("updated", propertyId, { propertyId });
    const photo = await this.findPropertyPhoto(Number(result.insertId), orgId, propertyScope);
    return this.propertyPhotoResponse(photo);
  }

  async deletePropertyPhoto(photoId: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const photo = await this.findPropertyPhoto(photoId, orgId, propertyScope);
    await this.objectStorage.deleteObject(photo.objectKey);
    await this.db
      .update(realEstatePropertyPhotos)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstatePropertyPhotos.id, photoId), eq(realEstatePropertyPhotos.organizationId, orgId)));

    if (Number(photo.isPrimary) === 1) {
      const [next] = await this.db
        .select({ id: realEstatePropertyPhotos.id })
        .from(realEstatePropertyPhotos)
        .where(and(
          eq(realEstatePropertyPhotos.organizationId, orgId),
          eq(realEstatePropertyPhotos.propertyId, photo.propertyId),
          this.photoUnitFilter(photo.unitId),
          eq(realEstatePropertyPhotos.isActive, 1),
        ))
        .orderBy(realEstatePropertyPhotos.sortOrder, desc(realEstatePropertyPhotos.id))
        .limit(1);
      if (next) {
        await this.db
          .update(realEstatePropertyPhotos)
          .set({ isPrimary: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(realEstatePropertyPhotos.id, next.id));
      }
    }

    await this.publishPropertyUpdate("updated", photo.propertyId, { propertyId: photo.propertyId });
    return { message: "Photo supprimee." };
  }

  async propertyPhotoFile(photoId: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const photo = await this.findPropertyPhoto(photoId, orgId, propertyScope);
    const object = await this.objectStorage.getObject(photo.objectKey);
    return {
      ...object,
      originalName: photo.originalName || `property-photo-${photo.id}`,
      mimeType: photo.mimeType,
    };
  }

  async publicPropertyPhotoFile(photoId: number, orgId = 1) {
    return this.propertyPhotoFile(photoId, orgId, "all");
  }

  async publicCatalog(orgId = 1) {
    const [properties, units, photos, setting, currencyRows] = await Promise.all([
      this.properties(orgId, "all"),
      this.units(orgId),
      this.propertyPhotos(orgId, "all"),
      readOrgAppSetting(this.db, orgId, {
        companyName: appSettings.companyName,
        tagLine: appSettings.tagLine,
        address: appSettings.address,
        phone: appSettings.phone,
        email: appSettings.email,
        website: appSettings.website,
        currencyId: appSettings.currencyId,
      }),
      this.db
        .select({
          id: currencies.id,
          currencyCode: currencies.currencyCode,
          currencyName: currencies.currencyName,
          currencySymbol: currencies.currencySymbol,
          status: currencies.status,
        })
        .from(currencies)
        .where(ne(currencies.status, "false")),
    ]);

    const photosByProperty = new Map<number, any[]>();
    const photosByUnit = new Map<number, any[]>();
    for (const photo of photos) {
      const publicPhoto = this.publicPhotoResponse(photo);
      if (photo.unitId != null) {
        const unitId = Number(photo.unitId);
        if (!photosByUnit.has(unitId)) photosByUnit.set(unitId, []);
        photosByUnit.get(unitId)!.push(publicPhoto);
      } else {
        const propertyId = Number(photo.propertyId);
        if (!photosByProperty.has(propertyId)) photosByProperty.set(propertyId, []);
        photosByProperty.get(propertyId)!.push(publicPhoto);
      }
    }

    const bookableUnits = units.filter((unit) => Number(unit.availableForBooking) === 1);
    const propsWithUnits = new Set(units.map((unit) => Number(unit.propertyId)));
    const propertyById = new Map(properties.map((property) => [Number(property.id), property]));
    const stays = [
      ...properties
        .filter((property) => !propsWithUnits.has(Number(property.id)) && Number(property.availableForBooking) === 1)
        .map((property) => this.publicStayFromProperty(property, photosByProperty.get(Number(property.id)) || [], setting?.currencyId as number | null | undefined)),
      ...bookableUnits.map((unit) => {
        const property = propertyById.get(Number(unit.propertyId));
        return this.publicStayFromUnit(unit, property, photosByUnit.get(Number(unit.id)) || [], setting?.currencyId as number | null | undefined);
      }),
    ].filter(Boolean);

    return {
      settings: {
        companyName: setting?.companyName || "Domus",
        tagLine: setting?.tagLine || "Logements disponibles a la reservation",
        address: setting?.address || null,
        phone: setting?.phone || null,
        email: setting?.email || null,
        website: setting?.website || null,
        currencyId: setting?.currencyId || null,
      },
      currencies: currencyRows,
      stays,
    };
  }

  async publicStay(key: string, orgId = 1) {
    const catalog = await this.publicCatalog(orgId);
    const stay = catalog.stays.find((item: any) => item.key === key);
    if (!stay) throw new NotFoundException("Bien introuvable.");
    return { ...catalog, stay };
  }

  async createPublicReservation(input: PublicReservationRequestDto, orgId = 1) {
    const stay = await this.resolvePublicStayForRequest(input.propertyId, input.unitId ?? null, orgId);
    return this.createReservation({
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      guestName: input.guestName,
      guestPhone: input.guestPhone ?? null,
      guestEmail: input.guestEmail ?? null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      dailyRate: stay.dailyRate,
      depositAmount: 0,
      currencyId: stay.currencyId ?? undefined,
      couponCode: input.couponCode ?? null,
      notes: [input.notes, "Demande recue depuis la vitrine publique Domus"].filter(Boolean).join("\n"),
    }, orgId, "all");
  }

  async createPublicLeaseRequest(input: PublicLeaseRequestDto, orgId = 1) {
    const stay = await this.resolvePublicStayForRequest(input.propertyId, input.unitId ?? null, orgId);
    const phone = normalizePhoneE164(input.phone) || input.phone;
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const data = JSON.stringify({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email ?? null,
      phone,
      desiredMoveIn: input.desiredMoveIn ?? null,
      message: input.message ?? null,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      listingKey: stay.key,
      listingTitle: stay.title,
      source: "domus-public-listing",
    });
    const [result] = await this.db.insert(tenantOnboardings).values({
      organizationId: orgId,
      phone,
      tokenHash: this.hashToken(token),
      token,
      status: "submitted",
      data,
      expiresAt,
      submittedAt: sql`CURRENT_TIMESTAMP`,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const id = Number((result as any).insertId);
    await this.publishOnboardingUpdate("created", id);
    return {
      id,
      status: "submitted",
      message: "Votre demande de bail a ete envoyee. Nous vous contacterons pour finaliser le dossier.",
    };
  }

  private publicPhotoResponse(photo: { id: number; propertyId: number; unitId?: number | null; isPrimary?: boolean | number; sortOrder?: number }) {
    return {
      id: Number(photo.id),
      propertyId: Number(photo.propertyId),
      unitId: photo.unitId == null ? null : Number(photo.unitId),
      isPrimary: photo.isPrimary === true || Number(photo.isPrimary) === 1,
      sortOrder: Number(photo.sortOrder || 0),
      url: `/api/property-management/public/photos/${photo.id}/file`,
    };
  }

  private publicDailyRate(monthly: string | number | null | undefined) {
    const n = Number(monthly || 0);
    return Number.isFinite(n) ? Math.round((n / 30) * 100) / 100 : 0;
  }

  private publicCover(photos: any[]) {
    return photos.find((photo) => photo.isPrimary) || photos[0] || null;
  }

  private publicStayFromProperty(property: any, photos: any[], defaultCurrencyId?: number | null) {
    return {
      key: `p-${property.id}`,
      propertyId: Number(property.id),
      unitId: null,
      title: property.name || `Bien ${property.id}`,
      propertyName: property.name || `Bien ${property.id}`,
      type: property.propertyType || "Bien entier",
      city: property.city || "",
      country: property.country || "",
      address: [property.address, property.city].filter(Boolean).join(", ") || "Adresse sur demande",
      bedrooms: Number(property.bedrooms || 0),
      bathrooms: Number(property.bathrooms || 0),
      parkingSpaces: Number(property.parkingSpaces || 0),
      floors: Number(property.floors || 0),
      area: null,
      dailyRate: this.publicDailyRate(property.defaultRent),
      monthlyRent: Number(property.defaultRent || 0),
      currencyId: property.currencyId || defaultCurrencyId || null,
      description: property.description || "",
      amenities: "",
      photos,
      cover: this.publicCover(photos),
      bookingMode: "property",
    };
  }

  private publicStayFromUnit(unit: any, property: any, photos: any[], defaultCurrencyId?: number | null) {
    if (!property) return null;
    return {
      key: `u-${unit.id}`,
      propertyId: Number(unit.propertyId),
      unitId: Number(unit.id),
      title: unit.name || `Unite ${unit.id}`,
      propertyName: property.name || unit.propertyName || `Bien ${unit.propertyId}`,
      type: unit.unitType || property.propertyType || "Logement",
      city: property.city || "",
      country: property.country || "",
      address: [property.address, property.city].filter(Boolean).join(", ") || "Adresse sur demande",
      bedrooms: Number(unit.bedrooms || 0),
      bathrooms: Number(unit.bathrooms || 0),
      parkingSpaces: Number(property.parkingSpaces || 0),
      floors: Number(property.floors || 0),
      area: Number(unit.area || 0),
      dailyRate: this.publicDailyRate(unit.monthlyRent || property.defaultRent),
      monthlyRent: Number(unit.monthlyRent || property.defaultRent || 0),
      currencyId: unit.currencyId || property.currencyId || defaultCurrencyId || null,
      description: unit.description || property.description || "",
      amenities: unit.amenities || "",
      photos,
      cover: this.publicCover(photos),
      bookingMode: "unit",
    };
  }

  private async resolvePublicStayForRequest(propertyId: number, unitId: number | null, orgId: number) {
    await this.ensureActiveProperty(propertyId, orgId);
    const [property] = await this.db
      .select()
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.id, propertyId),
        eq(realEstateProperties.organizationId, orgId),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
      ))
      .limit(1);
    if (!property) throw new NotFoundException("Bien introuvable.");
    let unit: any = null;
    if (unitId != null) {
      const rows = await this.db
        .select()
        .from(realEstateUnits)
        .where(and(
          eq(realEstateUnits.id, unitId),
          eq(realEstateUnits.propertyId, propertyId),
          eq(realEstateUnits.organizationId, orgId),
          ne(realEstateUnits.status, "false"),
          eq(realEstateUnits.isActive, 1),
        ))
        .limit(1);
      if (!rows.length) throw new BadRequestException("Cette unite n'appartient pas au bien selectionne.");
      unit = rows[0];
    }
    const stay = unit
      ? this.publicStayFromUnit(unit, property, [], property.currencyId)
      : this.publicStayFromProperty(property, [], property.currencyId);
    if (!stay || !stay.dailyRate) {
      throw new BadRequestException("Ce bien n'a pas de tarif public disponible.");
    }
    return stay;
  }

  async createProperty(input: CreatePropertyDto, orgId: number) {
    const code = input.code?.trim() || (await this.nextPropertyCode());
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency(orgId));
    if (currencyId) {
      await this.ensureExists(currencies, currencyId, "Currency not found.");
    }
    if (input.ownerId != null) {
      await this.ensureActiveOwnerForProperty(input.ownerId, orgId);
    }
    const geo = await this.geocodePropertyAddress(input.address ?? null, input.city ?? null, input.country ?? null);
    const [result] = await this.db.insert(realEstateProperties).values({
      organizationId: orgId,
      name: input.name,
      code,
      propertyType: input.propertyType ?? "building",
      status: input.status ?? "available",
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      latitude: geo ? String(geo.latitude) : null,
      longitude: geo ? String(geo.longitude) : null,
      floors: input.floors ?? 1,
      parkingSpaces: input.parkingSpaces ?? 0,
      marketValue: this.money(input.marketValue),
      defaultRent: this.money(input.defaultRent),
      currencyId,
      ownerId: input.ownerId ?? null,
      description: input.description ?? null,
      availableForBooking: input.availableForBooking ? 1 : 0,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const propertyId = Number(result.insertId);
    await this.publishPropertyUpdate("created", propertyId, { propertyId });
    return this.findProperty(propertyId);
  }

  async updateProperty(id: number, input: UpdatePropertyDto, orgId: number) {
    await this.ensureActiveProperty(id, orgId);
    const [existing] = await this.db
      .select({
        address: realEstateProperties.address,
        city: realEstateProperties.city,
        country: realEstateProperties.country,
      })
      .from(realEstateProperties)
      .where(eq(realEstateProperties.id, id))
      .limit(1);
    if (input.currencyId !== undefined && input.currencyId !== null) {
      await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    }
    if (input.ownerId !== undefined && input.ownerId !== null) {
      await this.ensureActiveOwnerForProperty(input.ownerId, orgId);
    }
    const addressChanged =
      !!existing &&
      ((input.address !== undefined && input.address !== existing.address) ||
        (input.city !== undefined && input.city !== existing.city) ||
        (input.country !== undefined && input.country !== existing.country));
    const geo = addressChanged
      ? await this.geocodePropertyAddress(
          input.address !== undefined ? input.address : existing!.address,
          input.city !== undefined ? input.city : existing!.city,
          input.country !== undefined ? input.country : existing!.country,
        )
      : null;
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
          "ownerId",
        ]),
        ...(addressChanged ? { latitude: geo ? String(geo.latitude) : null, longitude: geo ? String(geo.longitude) : null } : {}),
        ...(input.marketValue !== undefined ? { marketValue: this.money(input.marketValue) } : {}),
        ...(input.defaultRent !== undefined ? { defaultRent: this.money(input.defaultRent) } : {}),
        ...(input.availableForBooking !== undefined ? { availableForBooking: input.availableForBooking ? 1 : 0 } : {}),
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
        availableForBooking: realEstateUnits.availableForBooking,
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
      availableForBooking: input.availableForBooking ? 1 : 0,
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
        ...(input.availableForBooking !== undefined ? { availableForBooking: input.availableForBooking ? 1 : 0 } : {}),
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
  async leases(orgId: number, propertyScope: "all" | number[] = "all") {
    const scopeFilter = this.propertyViaColumnFilter(realEstateLeases.propertyId, propertyScope);
    const rows = await this.leaseQuery()
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
    return this.withOverdueStats(rows);
  }

  async createLease(input: CreateLeaseDto, orgId: number) {
    await this.ensureLeaseReferences(input.propertyId, input.unitId, input.tenantId, orgId);
    if ((input.status ?? "draft") === "active") {
      await this.assertNoLeaseOverlap(
        orgId,
        input.propertyId,
        input.unitId,
        this.requiredDate(input.startDate),
        this.date(input.endDate),
      );
    }
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
      signingCity: input.signingCity ?? null,
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
    const lease = await this.findLease(leaseId);

    // Bienvenue portail locataire : uniquement pour le bail fraichement cree
    // s'il est actif — jamais de backfill des locataires deja en place. Echec
    // d'envoi = warning seulement, ne doit jamais faire echouer la creation.
    if (lease.status === "active") {
      await this.sendTenantPortalWelcome(lease, orgId);
    }
    // Recapitulatif du bail au proprietaire du bien (locataire, adresse, duree,
    // loyer, caution, charges) + lien portail proprietaire. Best-effort.
    await this.ownerNotifications.notifyLeaseCreated(leaseId, orgId);

    return lease;
  }

  /** Genere/reutilise le lien portail du locataire et lui envoie un SMS/email de bienvenue (non bloquant). */
  private async sendTenantPortalWelcome(
    lease: {
      id: number;
      reference: string;
      tenantId: number;
      tenantFirstName: string | null;
      tenantLastName: string | null;
      tenantPhone: string | null;
      tenantEmail: string | null;
      propertyId: number | null;
      propertyName: string | null;
      propertyAddress: string | null;
      unitName: string | null;
      startDate: string | null;
      endDate: string | null;
      rentAmount: string | number | null;
      currencySymbol: string | null;
    },
    orgId: number,
  ) {
    if (!lease.tenantPhone && !lease.tenantEmail) return;

    try {
      const company = await readOrgAppSetting(this.db, orgId, { name: appSettings.companyName });
      const companyName = (company?.name as string | null) || "votre gestionnaire";
      const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
      // Le locataire doit reconnaitre SON logement : adresse + numero
      // d'appartement quand le bail porte sur une unite, et le nom du
      // proprietaire a qui il loue (si le bien en a un d'assigne).
      const place = lease.propertyAddress || lease.propertyName || "votre logement";
      const unitPart = lease.unitName ? ` (appt ${lease.unitName})` : "";
      const ownerName = await this.ownerNotifications.ownerNameForProperty(lease.propertyId, orgId);
      const amount = `${lease.rentAmount}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`;
      const portalUrl = await this.tenantPortal.portalUrlForTenant(lease.tenantId, orgId);

      // Texte pilote depuis Reglages > Messages & notifications (evenement
      // "lease_created"). Le defaut ci-dessous ne sert que si aucun modele
      // actif n'est configure.
      // EXCEPTION a la regle "un seul SMS" : le message de bail au locataire est
      // envoye en DEUX SMS, le contenu puis le lien. Tenir en 160 caracteres
      // avec un lien de ~52 obligeait a sacrifier soit l'adresse, soit le
      // bailleur, soit la formule d'appel ; en scindant, le locataire recoit
      // un message complet et naturel. Le 2e SMS ne part que si un lien existe.
      // Les autres notifications restent volontairement en un seul segment.
      const smsMsg = await this.ownerNotifications.renderMessage(
        "lease_created",
        "Bonjour {firstName}, votre bail {address}, {unit} est actif. " +
          "Du {startDate} au {endDate}. Loyer {amount}. Bailleur {landlordName}.",
        {
          tenantName,
          firstName: lease.tenantFirstName || tenantName,
          reference: lease.reference || String(lease.id),
          address: place,
          unit: lease.unitName ? `Appt ${lease.unitName}` : "",
          startDate: this.ownerNotifications.shortDate(lease.startDate),
          endDate: this.ownerNotifications.shortDate(lease.endDate),
          landlordName: ownerName,
          amount,
          companyName,
          url: portalUrl,
        },
      );

      if (lease.tenantPhone) {
        try {
          // 1er SMS : le contenu. Si un modele personnalise place deja {url}
          // dans le texte, on n'envoie pas de second message (le gestionnaire
          // a choisi de tout mettre dans un seul SMS).
          const inlineLink = Boolean(portalUrl) && smsMsg.includes(portalUrl);
          const res = await this.sms.sendSms({
            phone: lease.tenantPhone,
            message: this.ownerNotifications.fitOneSms(smsMsg),
            organizationId: orgId,
            smsType: "lease_welcome",
            relatedType: "real-estate-lease",
            relatedId: lease.id,
          });
          if (!res?.success) {
            this.logger.warn(`Welcome SMS not sent (lease ${lease.id}, ${lease.tenantPhone}): ${res?.message}`);
          }

          // 2e SMS : le lien seul, pour que le 1er reste complet et lisible.
          if (portalUrl && !inlineLink) {
            const linkRes = await this.sms.sendSms({
              phone: lease.tenantPhone,
              message: this.ownerNotifications.fitOneSms(
                `Consultez votre dossier locataire ici : ${portalUrl}`,
              ),
              organizationId: orgId,
              smsType: "lease_welcome_link",
              relatedType: "real-estate-lease",
              relatedId: lease.id,
            });
            if (!linkRes?.success) {
              this.logger.warn(`Welcome link SMS not sent (lease ${lease.id}): ${linkRes?.message}`);
            }
          }
        } catch (error) {
          this.logger.warn(`Welcome SMS error (lease ${lease.id}, ${lease.tenantPhone}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (lease.tenantEmail) {
        // Meme contenu que le SMS (regle Domus : un seul texte sert d'email et
        // de SMS), simplement enveloppe dans un paragraphe.
        const html = `<p>${smsMsg}</p>`;
        try {
          const htmlWithFooter = await this.tenantPortal.appendPortalFooterToEmail(html, lease.tenantId, orgId);
          await this.emails.send({
            to: lease.tenantEmail,
            subject: "Bienvenue — votre espace locataire",
            html: htmlWithFooter,
            type: "tenant_portal_welcome",
            relatedType: "real-estate-lease",
            relatedId: lease.id,
          });
        } catch (error) {
          this.logger.warn(`Welcome email error (lease ${lease.id}, ${lease.tenantEmail}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Tenant portal welcome failed (lease ${lease.id}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateLease(id: number, input: UpdateLeaseDto, orgId: number) {
    const current = await this.getLeaseOrThrow(id, orgId);
    await this.ensureLeaseReferences(
      input.propertyId ?? current.propertyId,
      input.unitId ?? current.unitId,
      input.tenantId ?? current.tenantId,
      orgId,
    );

    if (input.currencyId !== undefined && input.currencyId !== null) {
      await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    }

    // Double location : si le bail résultant est "active", vérifier qu'aucun
    // autre bail actif ne chevauche ses dates sur la même unité.
    const resultingStatus = input.status ?? current.status;
    if (resultingStatus === "active") {
      const resultingStart =
        input.startDate !== undefined ? this.requiredDate(input.startDate) : (current.startDate as string);
      const resultingEnd =
        input.endDate !== undefined ? this.date(input.endDate) : ((current.endDate as string | null) ?? null);
      await this.assertNoLeaseOverlap(
        orgId,
        input.propertyId ?? current.propertyId,
        input.unitId ?? current.unitId,
        resultingStart,
        resultingEnd,
        id,
      );
    }

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
          "signingCity",
          "status",
          "taxName",
          "taxType",
          "taxApplyMode",
        ]),
        ...(input.currencyId !== undefined && input.currencyId !== null
          ? { currencyId: input.currencyId }
          : {}),
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

  private paymentQuery(id?: number, orgId?: number, propertyScope: "all" | number[] = "all", leaseId?: number) {
    return this.db
      .select({
        id: realEstateRentPayments.id,
        leaseId: realEstateRentPayments.leaseId,
        transactionId: realEstateRentPayments.transactionId,
        paymentDate: realEstateRentPayments.paymentDate,
        amount: realEstateRentPayments.amount,
        method: realEstateRentPayments.method,
        status: realEstateRentPayments.status,
        reference: realEstateRentPayments.reference,
        receivedBy: realEstateRentPayments.receivedBy,
        notes: realEstateRentPayments.notes,
        taxAmount: realEstateRentPayments.taxAmount,
        taxName: realEstateRentPayments.taxName,
        proofUrl: realEstateRentPayments.proofUrl,
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
        ...(leaseId !== undefined ? [eq(realEstateRentPayments.leaseId, leaseId)] : []),
        // RBAC bien : loyers du bien (via le bail). "all" => pas de filtre.
        ...(propertyScope !== "all"
          ? [propertyScope.length ? inArray(paymentLease.propertyId, propertyScope) : sql`1 = 0`]
          : []),
      ));
  }

  async createPayment(input: CreateRentPaymentDto, orgId: number, proof?: any, publicApiBase?: string) {
    const proofUrl = this.saveProofFile(proof, publicApiBase) ?? input.proofUrl ?? null;
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
      receivedBy: input.receivedBy ?? null,
      notes: input.notes || "Payment for rent",
      taxAmount: taxAmt != null ? this.money(taxAmt) : null,
      taxName: taxAmt != null ? ((lease as any).taxName ?? null) : null,
      proofUrl,
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
    // Confirmation d'encaissement : quittance au locataire, avis au
    // proprietaire du bien. Best-effort, jamais bloquant pour le paiement.
    await this.ownerNotifications.notifyPaymentReceivedTenant(paymentId, Number(lease.id), input.amount, orgId);
    await this.ownerNotifications.notifyPaymentReceived(paymentId, Number(lease.id), input.amount, orgId);
    return this.findPayment(paymentId);
  }

  // Genere les echeances de loyer manquantes d'un bail (baux crees
  // retroactivement dont les mois passes n'ont jamais ete saisis), sans les
  // compter comme argent encaisse : pas de transaction comptable, pas de
  // ledger. status='pending' — a confirmer individuellement ensuite via
  // confirmPendingPayment. Idempotent : un mois deja couvert par une ligne
  // (paid OU pending) n'est jamais duplique.
  // upToEnd : étend la génération jusqu'à endDate du bail au lieu du mois
  // courant — utilisé uniquement par rentBook() pour que CHAQUE quittance du
  // carnet imprimé (y compris les mois futurs) ait une ligne réelle en base,
  // donc un id, donc un QR individuel scannable. Comportement par défaut
  // (upToEnd=false) inchangé pour l'appel API existant (baux rétroactifs).
  async generateMissingPayments(leaseId: number, orgId: number, upToEnd = false) {
    const lease = await this.getLeaseOrThrow(leaseId, orgId);

    const existing = await this.db
      .select({ amount: realEstateRentPayments.amount, paymentDate: realEstateRentPayments.paymentDate })
      .from(realEstateRentPayments)
      .where(and(
        eq(realEstateRentPayments.organizationId, orgId),
        eq(realEstateRentPayments.leaseId, lease.id),
      ));

    const start = this.parseDateOnly(lease.startDate);
    const today = this.parseDateOnly(this.formatDateOnly(new Date()));
    const boundary = lease.endDate ? this.parseDateOnly(lease.endDate) : null;

    // upToEnd=false (appel API existant, baux retroactifs) : couverture par
    // MONTANT cumulé, pas par mois calendaire — un seul virement de plusieurs
    // mois de loyer daté d'un seul mois doit quand meme couvrir plusieurs
    // echeances, coherent avec le calcul de couverture du frontend (loyers.jsx).
    // upToEnd=true (rentBook, carnet) : couverture par MOIS CALENDAIRE exact
    // (YYYY-MM deja represente par une ligne, paid ou pending) — plus robuste
    // quand des paiements a montants/dates irreguliers (ex. paiement de test)
    // desynchronisent un simple decompte par montant cumulé, ce qui sautait a
    // tort des mois reels (ex. octobre/novembre) sans jamais leur creer de ligne.
    const existingMonthKeys = new Set(
      existing.map((p) => String(p.paymentDate).slice(0, 7)),
    );
    const rent = Number(lease.rentAmount) || 0;
    const totalCovered = existing.reduce((s, p) => s + Number(p.amount || 0), 0);
    const monthsAlreadyCovered = rent > 0 ? Math.floor((totalCovered + 0.0001) / rent) : existing.length;

    const monthsToCreate: Date[] = [];
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    // upToEnd : va jusqu'à endDate (ou 12 mois par défaut si bail à durée
    // indéterminée) plutôt que de s'arrêter au mois courant — mêmes bornes
    // que buildFullRentSchedule côté frontend (rentBookUtils.js), pour que
    // le carnet et la base restent cohérents.
    const limit = upToEnd
      ? (boundary || new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 11, 1)))
      : today;
    const lastMonth = new Date(Date.UTC(limit.getUTCFullYear(), limit.getUTCMonth(), 1));
    let monthIndex = 0;
    while (cursor.getTime() <= lastMonth.getTime()) {
      if (!boundary || cursor.getTime() <= boundary.getTime()) {
        const monthKey = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
        const covered = upToEnd
          ? existingMonthKeys.has(monthKey)
          : monthIndex < monthsAlreadyCovered;
        if (!covered) monthsToCreate.push(new Date(cursor.getTime()));
      }
      monthIndex += 1;
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }

    const created: number[] = [];
    for (const month of monthsToCreate) {
      const [result] = await this.db.insert(realEstateRentPayments).values({
        organizationId: orgId,
        leaseId: lease.id,
        currencyId: (lease as any).currencyId ?? null,
        transactionId: null,
        paymentDate: this.formatDateOnly(month),
        amount: this.money(Number(lease.rentAmount)),
        method: "pending",
        status: "pending",
        reference: null,
        notes: "Echeance generee automatiquement (bail retroactif) — a confirmer.",
        proofUrl: null,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      created.push(Number((result as any).insertId));
    }

    const payments = created.length
      ? await this.db.select().from(realEstateRentPayments).where(inArray(realEstateRentPayments.id, created))
      : [];

    return { createdCount: created.length, payments };
  }

  // Confirme une echeance 'pending' generee retroactivement : transforme la
  // ligne existante en vrai paiement encaisse (UPDATE, pas de duplication),
  // en creant la transaction comptable + ecriture ledger comme createPayment.
  // Reutilise integralement le meme calcul de taxe / compte de paiement.
  async confirmPendingPayment(paymentId: number, input: ConfirmPendingPaymentDto, orgId: number, proof?: any, publicApiBase?: string) {
    const proofUrl = this.saveProofFile(proof, publicApiBase) ?? input.proofUrl ?? null;

    const [pending] = await this.db
      .select()
      .from(realEstateRentPayments)
      .where(and(eq(realEstateRentPayments.id, paymentId), eq(realEstateRentPayments.organizationId, orgId)))
      .limit(1);
    if (!pending) throw new NotFoundException("Payment not found.");
    if (pending.status !== "pending") {
      throw new BadRequestException("Ce paiement n'est pas en attente de confirmation.");
    }

    const lease = await this.getLeaseOrThrow(pending.leaseId, orgId);
    await this.ensureLeaseContractSigned(pending.leaseId);
    const rentPaymentType = await this.getRentPaymentType(orgId);
    const debitId = input.paymentAccountId
      ?? (await this.resolvePaymentDebitAccount(input.method, rentPaymentType.debitAccountId));
    await this.ensureExists(subAccounts, debitId, "Payment account not found.");

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

    const taxAmt = this.computeInclusiveTax(Number(input.amount), lease as any);

    await this.db
      .update(realEstateRentPayments)
      .set({
        status: "paid",
        currencyId: paymentCurrencyId,
        transactionId: Number(transactionResult.insertId),
        paymentDate: this.requiredDate(input.paymentDate),
        amount: this.money(input.amount),
        method: input.method ?? "cash",
        reference: input.reference ?? null,
        receivedBy: input.receivedBy ?? null,
        notes: input.notes || "Payment for rent",
        taxAmount: taxAmt != null ? this.money(taxAmt) : null,
        taxName: taxAmt != null ? ((lease as any).taxName ?? null) : null,
        proofUrl,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateRentPayments.id, paymentId), eq(realEstateRentPayments.organizationId, orgId)));

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
    await this.publishPaymentUpdate("updated", paymentId, {
      propertyId: lease.propertyId,
      unitId: lease.unitId,
    });
    // Confirmation d'encaissement : quittance au locataire, avis au
    // proprietaire du bien. Best-effort, jamais bloquant pour le paiement.
    await this.ownerNotifications.notifyPaymentReceivedTenant(paymentId, Number(lease.id), input.amount, orgId);
    await this.ownerNotifications.notifyPaymentReceived(paymentId, Number(lease.id), input.amount, orgId);
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

  async collectDeposit(leaseId: number, input: CollectDepositDto, orgId: number, proof?: any, publicApiBase?: string) {
    const proofUrl = this.saveProofFile(proof, publicApiBase) ?? input.proofUrl ?? null;
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
      proofUrl,
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

  async returnDeposit(leaseId: number, input: ReturnDepositDto, orgId: number, proof?: any, publicApiBase?: string) {
    const returnProofUrl = this.saveProofFile(proof, publicApiBase) ?? input.proofUrl ?? null;
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
        returnProofUrl,
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

  // ─── Réservation temporaire type hôtel (courte durée, tarif par jour) ────────
  // Un client occupe un bien entier OU une unité sur une plage de dates.
  // Indépendant du bail longue durée. Recette comptabilisée au check-out.

  async reservations(orgId: number, propertyScope: "all" | number[] = "all", propertyId?: number) {
    const scopeFilter = this.propertyDirectFilter(realEstateReservations.propertyId, propertyScope);
    return this.db
      .select()
      .from(realEstateReservations)
      .where(and(
        eq(realEstateReservations.organizationId, orgId),
        eq(realEstateReservations.isActive, 1),
        propertyId ? eq(realEstateReservations.propertyId, propertyId) : undefined,
        scopeFilter,
      ))
      .orderBy(desc(realEstateReservations.id));
  }

  async findReservation(id: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const rows = await this.db
      .select()
      .from(realEstateReservations)
      .where(and(
        eq(realEstateReservations.id, id),
        eq(realEstateReservations.organizationId, orgId),
        eq(realEstateReservations.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Réservation introuvable.");
    this.ensurePropertyInScope(rows[0].propertyId, propertyScope);
    return rows[0];
  }

  // Nombre de jours facturés entre deux dates (borne à 1 minimum).
  private reservationDays(checkIn: string, checkOut: string) {
    const start = this.parseDateOnly(checkIn);
    const end = this.parseDateOnly(checkOut);
    const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
    return Math.max(1, diff);
  }

  // Rejette la double location : un même bien+unité ne peut avoir deux baux
  // "active" dont les périodes se chevauchent. Un end_date NULL = bail à durée
  // indéterminée (occupe jusqu'à +infini), traité via COALESCE('9999-12-31').
  // [startA, endA) et [startB, endB) se chevauchent si startA < endB ET endA > startB.
  private async assertNoLeaseOverlap(
    orgId: number,
    propertyId: number,
    unitId: number,
    startDate: string,
    endDate: string | null,
    excludeId?: number,
  ) {
    const FAR = "9999-12-31";
    const newEnd = endDate ?? FAR;
    const rows = await this.db
      .select({ id: realEstateLeases.id })
      .from(realEstateLeases)
      .where(and(
        eq(realEstateLeases.organizationId, orgId),
        eq(realEstateLeases.propertyId, propertyId),
        eq(realEstateLeases.unitId, unitId),
        eq(realEstateLeases.status, "active"),
        lt(realEstateLeases.startDate, newEnd),
        sql`COALESCE(${realEstateLeases.endDate}, ${FAR}) > ${startDate}`,
        excludeId ? ne(realEstateLeases.id, excludeId) : undefined,
      ))
      .limit(1);
    if (rows.length) {
      throw new BadRequestException(
        "Un bail actif couvre déjà cette unité sur cette période (double location interdite).",
      );
    }
  }

  // Rejette tout chevauchement de dates sur le même bien+unité pour une
  // réservation active non annulée/soldée. [checkIn, checkOut) se chevauchent si
  // existing.check_in < new.check_out ET existing.check_out > new.check_in.
  private async assertNoOverlap(
    orgId: number,
    propertyId: number,
    unitId: number | null,
    checkIn: string,
    checkOut: string,
    excludeId?: number,
  ) {
    const rows = await this.db
      .select({ id: realEstateReservations.id })
      .from(realEstateReservations)
      .where(and(
        eq(realEstateReservations.organizationId, orgId),
        eq(realEstateReservations.isActive, 1),
        eq(realEstateReservations.propertyId, propertyId),
        unitId == null ? isNull(realEstateReservations.unitId) : eq(realEstateReservations.unitId, unitId),
        inArray(realEstateReservations.status, ["pending", "confirmed", "checked_in"]),
        lt(realEstateReservations.checkIn, checkOut),
        sql`${realEstateReservations.checkOut} > ${checkIn}`,
        excludeId ? ne(realEstateReservations.id, excludeId) : undefined,
      ))
      .limit(1);
    if (rows.length) {
      throw new BadRequestException(
        "Ces dates chevauchent une réservation existante.",
      );
    }
  }

  // Rejette une réservation dont les dates chevauchent un bail longue durée
  // ACTIF sur le même bien/unité. Un bail est toujours rattaché à une unité
  // (lease.unit_id NOT NULL) : réserver le bien entier entre en conflit avec
  // n'importe quel bail actif du bien ; réserver une unité, avec le bail de
  // cette unité. Bail ouvert (end_date NULL) = occupe indéfiniment.
  private async assertNoLeaseConflict(
    orgId: number,
    propertyId: number,
    unitId: number | null,
    checkIn: string,
    checkOut: string,
  ) {
    const rows = await this.db
      .select({ id: realEstateLeases.id })
      .from(realEstateLeases)
      .where(and(
        eq(realEstateLeases.organizationId, orgId),
        eq(realEstateLeases.status, "active"),
        eq(realEstateLeases.propertyId, propertyId),
        unitId == null ? undefined : eq(realEstateLeases.unitId, unitId),
        lt(realEstateLeases.startDate, checkOut),
        or(isNull(realEstateLeases.endDate), sql`${realEstateLeases.endDate} > ${checkIn}`),
      ))
      .limit(1);
    if (rows.length) {
      throw new BadRequestException(
        "Ce bien est loué sur cette période.",
      );
    }
  }

  private async nextReservationReference(orgId: number) {
    const [row] = await this.db
      .select({ id: realEstateReservations.id })
      .from(realEstateReservations)
      .where(eq(realEstateReservations.organizationId, orgId))
      .orderBy(desc(realEstateReservations.id))
      .limit(1);
    const next = (Number(row?.id) || 0) + 1;
    return `RES-${String(next).padStart(4, "0")}`;
  }

  async createReservation(input: CreateReservationDto, orgId: number, propertyScope: "all" | number[] = "all") {
    await this.ensureActiveProperty(input.propertyId, orgId);
    this.ensurePropertyInScope(input.propertyId, propertyScope);
    if (input.unitId != null) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }
    if (this.parseDateOnly(input.checkOut) <= this.parseDateOnly(input.checkIn)) {
      throw new BadRequestException("La date de départ doit être postérieure à l'arrivée.");
    }
    await this.assertNoOverlap(orgId, input.propertyId, input.unitId ?? null, input.checkIn, input.checkOut);
    await this.assertNoLeaseConflict(orgId, input.propertyId, input.unitId ?? null, input.checkIn, input.checkOut);

    const days = this.reservationDays(input.checkIn, input.checkOut);
    const dailyRate = Number(input.dailyRate) || 0;
    const gross = Math.round(days * dailyRate * 100) / 100;
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency(orgId));

    // Coupon facultatif : la remise baisse le total NET comptabilisé au check-out.
    let couponId: number | null = null;
    let discount = 0;
    if (input.couponCode?.trim()) {
      const coupon = await this.resolveCoupon(input.couponCode, orgId, input.checkIn, currencyId ?? null);
      couponId = Number(coupon.id);
      discount = this.couponDiscount(coupon, gross);
    }
    const total = Math.max(0, Math.round((gross - discount) * 100) / 100);

    const [result] = await this.db.insert(realEstateReservations).values({
      organizationId: orgId,
      reference: input.reference?.trim() || (await this.nextReservationReference(orgId)),
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      guestName: input.guestName,
      guestPhone: input.guestPhone ?? null,
      guestEmail: input.guestEmail ?? null,
      tenantId: input.tenantId ?? null,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      days,
      dailyRate: this.money(dailyRate),
      couponId,
      discountAmount: this.money(discount),
      totalAmount: this.money(total),
      currencyId: currencyId ?? null,
      depositAmount: this.money(input.depositAmount),
      status: "pending",
      notes: input.notes ?? null,
      isActive: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    if (couponId != null) {
      await this.bumpCouponUsage(couponId);
    }
    const id = Number(result.insertId);
    await this.publishPaymentUpdate("created", id, { propertyId: input.propertyId, unitId: input.unitId ?? undefined });
    return this.findReservation(id, orgId, propertyScope);
  }

  async updateReservation(id: number, input: UpdateReservationDto, orgId: number, propertyScope: "all" | number[] = "all") {
    const reservation = await this.findReservation(id, orgId, propertyScope);
    if (["checked_out", "cancelled"].includes(reservation.status)) {
      throw new BadRequestException("Une réservation soldée ou annulée n'est plus modifiable.");
    }
    if (input.unitId != null) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    const checkIn = input.checkIn ?? reservation.checkIn;
    const checkOut = input.checkOut ?? reservation.checkOut;
    const propertyId = input.propertyId ?? reservation.propertyId;
    const unitId = input.unitId !== undefined ? (input.unitId ?? null) : reservation.unitId;
    if (input.propertyId != null && input.propertyId !== reservation.propertyId) {
      await this.ensureActiveProperty(input.propertyId, orgId);
      this.ensurePropertyInScope(input.propertyId, propertyScope);
    }
    if (this.parseDateOnly(checkOut) <= this.parseDateOnly(checkIn)) {
      throw new BadRequestException("La date de départ doit être postérieure à l'arrivée.");
    }
    await this.assertNoOverlap(orgId, propertyId, unitId, checkIn, checkOut, id);
    await this.assertNoLeaseConflict(orgId, propertyId, unitId, checkIn, checkOut);

    const days = this.reservationDays(checkIn, checkOut);
    const dailyRate = input.dailyRate != null ? Number(input.dailyRate) : Number(reservation.dailyRate);
    const gross = Math.round(days * dailyRate * 100) / 100;
    const currencyId = input.currencyId ?? reservation.currencyId;

    // Coupon : code fourni non vide → (ré)applique ; chaîne vide → retire ; absent
    // → conserve l'existant mais recalcule la remise sur le nouveau brut.
    let couponId: number | null = reservation.couponId ?? null;
    let discount = Number(reservation.discountAmount) || 0;
    if (input.couponCode !== undefined) {
      if (input.couponCode?.trim()) {
        const coupon = await this.resolveCoupon(input.couponCode, orgId, checkIn, currencyId ?? null);
        if (Number(coupon.id) !== reservation.couponId) {
          await this.bumpCouponUsage(Number(coupon.id));
        }
        couponId = Number(coupon.id);
        discount = this.couponDiscount(coupon, gross);
      } else {
        couponId = null;
        discount = 0;
      }
    } else if (couponId != null) {
      const [coupon] = await this.db
        .select()
        .from(realEstateCoupons)
        .where(eq(realEstateCoupons.id, couponId))
        .limit(1);
      discount = coupon ? this.couponDiscount(coupon, gross) : 0;
    }
    const total = Math.max(0, Math.round((gross - discount) * 100) / 100);

    await this.db
      .update(realEstateReservations)
      .set({
        propertyId,
        unitId,
        guestName: input.guestName ?? reservation.guestName,
        guestPhone: input.guestPhone !== undefined ? input.guestPhone : reservation.guestPhone,
        guestEmail: input.guestEmail !== undefined ? input.guestEmail : reservation.guestEmail,
        tenantId: input.tenantId !== undefined ? (input.tenantId ?? null) : reservation.tenantId,
        checkIn,
        checkOut,
        days,
        dailyRate: this.money(dailyRate),
        couponId,
        discountAmount: this.money(discount),
        totalAmount: this.money(total),
        currencyId,
        depositAmount: input.depositAmount != null ? this.money(input.depositAmount) : reservation.depositAmount,
        notes: input.notes !== undefined ? input.notes : reservation.notes,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateReservations.id, id));

    await this.publishPaymentUpdate("updated", id, { propertyId, unitId: unitId ?? undefined });
    return this.findReservation(id, orgId, propertyScope);
  }

  // Transitions de statut : pending → confirmed → checked_in → checked_out.
  private async setReservationStatus(
    id: number,
    from: string[],
    to: string,
    orgId: number,
    propertyScope: "all" | number[],
  ) {
    const reservation = await this.findReservation(id, orgId, propertyScope);
    if (!from.includes(reservation.status)) {
      throw new BadRequestException(`Transition invalide depuis « ${reservation.status} ».`);
    }
    await this.db
      .update(realEstateReservations)
      .set({ status: to, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateReservations.id, id));
    await this.publishPaymentUpdate("updated", id, { propertyId: reservation.propertyId, unitId: reservation.unitId ?? undefined });
    return this.findReservation(id, orgId, propertyScope);
  }

  confirmReservation(id: number, orgId: number, propertyScope: "all" | number[] = "all") {
    return this.setReservationStatus(id, ["pending"], "confirmed", orgId, propertyScope);
  }

  checkInReservation(id: number, orgId: number, propertyScope: "all" | number[] = "all") {
    return this.setReservationStatus(id, ["pending", "confirmed"], "checked_in", orgId, propertyScope);
  }

  cancelReservation(id: number, orgId: number, propertyScope: "all" | number[] = "all") {
    return this.setReservationStatus(id, ["pending", "confirmed", "checked_in"], "cancelled", orgId, propertyScope);
  }

  // Comptabilise la recette d'un séjour (débit Caisse/Banque, crédit « Short-term
  // Rental Revenue ») via le ledger + la table plate transactions (dual-write), en
  // devise. Utilisé au paiement anticipé (payReservation) et au check-out.
  private async recordReservationPayment(
    reservation: { id: number; reference: string; guestName: string; totalAmount: unknown; currencyId: number | null; transactionId: number | null },
    input: CheckOutReservationDto,
    orgId: number,
    idempotencyKey: string,
  ): Promise<number | null> {
    const amount = Number(reservation.totalAmount) || 0;
    const paymentDate = input.paymentDate || this.formatDateOnly(new Date());
    const currencyId = reservation.currencyId ?? (await this.resolveDefaultCurrency(orgId));
    let transactionId: number | null = reservation.transactionId ?? null;

    if (amount > 0) {
      const debitId = input.paymentAccountId ?? (this.isBankMethod(input.method) ? 2 : 1); // 2=Bank, 1=Cash
      const revenueId = await this.getOrCreateSubAccount("Short-term Rental Revenue", 5, orgId); // 5 = Revenue
      const particulars = input.notes || `Séjour ${reservation.reference} — ${reservation.guestName}`;

      const [txResult] = await this.db.insert(transactions).values({
        organizationId: orgId,
        date: new Date(paymentDate),
        debitId,
        creditId: revenueId,
        particulars,
        amount,
        currencyId: currencyId ?? null,
        type: this.isBankMethod(input.method) ? "BNQ - Short-term Rental" : "CAI - Short-term Rental",
        relatedId: String(reservation.id),
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
      transactionId = Number(txResult.insertId);

      await this.ledger.post(
        {
          date: new Date(paymentDate),
          reference: `RES-${reservation.id}`,
          particulars,
          sourceModule: "rent",
          relatedId: String(reservation.id),
          currencyId: currencyId ?? undefined,
          idempotencyKey,
          lines: [
            { accountId: debitId, side: "DEBIT", amount, description: particulars },
            { accountId: revenueId, side: "CREDIT", amount, description: "Short-term Rental Revenue" },
          ],
        },
        orgId,
      );
    }

    return transactionId;
  }

  // Paiement anticipé (avant le check-out) : comptabilise la recette sans changer
  // le statut de la réservation, pour ne pas confondre paiement et sortie physique.
  async payReservation(id: number, input: CheckOutReservationDto, orgId: number, propertyScope: "all" | number[] = "all") {
    const reservation = await this.findReservation(id, orgId, propertyScope);
    if (reservation.paidAt) {
      throw new BadRequestException("Réservation déjà payée.");
    }
    if (!["pending", "confirmed", "checked_in"].includes(reservation.status)) {
      throw new BadRequestException(`Transition invalide depuis « ${reservation.status} ».`);
    }

    const paymentDate = input.paymentDate || this.formatDateOnly(new Date());
    const transactionId = await this.recordReservationPayment(reservation, input, orgId, `reservation-payment:${reservation.id}`);

    await this.db
      .update(realEstateReservations)
      .set({ paidAt: paymentDate, transactionId, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateReservations.id, id));

    await this.publishPaymentUpdate("updated", id, { propertyId: reservation.propertyId, unitId: reservation.unitId ?? undefined });
    return this.findReservation(id, orgId, propertyScope);
  }

  // Check-out : marque la sortie physique. Si la réservation n'a pas déjà été
  // payée à l'avance (payReservation), comptabilise aussi la recette ici.
  async checkOutReservation(id: number, input: CheckOutReservationDto, orgId: number, propertyScope: "all" | number[] = "all") {
    const reservation = await this.findReservation(id, orgId, propertyScope);
    if (reservation.status === "checked_out") {
      throw new BadRequestException("Réservation déjà soldée.");
    }
    if (!["pending", "confirmed", "checked_in"].includes(reservation.status)) {
      throw new BadRequestException(`Transition invalide depuis « ${reservation.status} ».`);
    }

    let transactionId: number | null = reservation.transactionId ?? null;
    let paidAt: string | null = reservation.paidAt ?? null;

    if (!paidAt) {
      const paymentDate = input.paymentDate || this.formatDateOnly(new Date());
      transactionId = await this.recordReservationPayment(reservation, input, orgId, `reservation-checkout:${reservation.id}`);
      paidAt = paymentDate;
    }

    await this.db
      .update(realEstateReservations)
      .set({ status: "checked_out", transactionId, paidAt, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateReservations.id, id));

    await this.publishPaymentUpdate("updated", id, { propertyId: reservation.propertyId, unitId: reservation.unitId ?? undefined });
    return this.findReservation(id, orgId, propertyScope);
  }

  async deleteReservation(id: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const reservation = await this.findReservation(id, orgId, propertyScope);
    if (reservation.status === "checked_out") {
      throw new BadRequestException("Impossible de supprimer une réservation soldée.");
    }
    await this.db
      .update(realEstateReservations)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateReservations.id, id));
    await this.publishPaymentUpdate("deleted", id, { propertyId: reservation.propertyId, unitId: reservation.unitId ?? undefined });
    return { message: "Réservation supprimée." };
  }

  // ── Coupons de réduction (réservations temporaires) ─────────────────────────

  listCoupons(orgId: number) {
    return this.db
      .select()
      .from(realEstateCoupons)
      .where(and(eq(realEstateCoupons.organizationId, orgId), eq(realEstateCoupons.isActive, 1)))
      .orderBy(desc(realEstateCoupons.id));
  }

  private normalizeCouponCode(code: string) {
    return code.trim().toUpperCase();
  }

  async createCoupon(input: CreateCouponDto, orgId: number) {
    const code = this.normalizeCouponCode(input.code);
    if (!code) {
      throw new BadRequestException("Le code coupon est obligatoire.");
    }
    const [existing] = await this.db
      .select({ id: realEstateCoupons.id })
      .from(realEstateCoupons)
      .where(and(eq(realEstateCoupons.organizationId, orgId), eq(realEstateCoupons.code, code)))
      .limit(1);
    if (existing) {
      throw new BadRequestException(`Le code « ${code} » existe déjà.`);
    }
    const [result] = await this.db.insert(realEstateCoupons).values({
      organizationId: orgId,
      code,
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: this.money(input.discountValue),
      currencyId: input.currencyId ?? null,
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      maxUses: input.maxUses ?? null,
      usedCount: 0,
      isActive: input.isActive === false ? 0 : 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findCoupon(Number(result.insertId), orgId);
  }

  private async findCoupon(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(realEstateCoupons)
      .where(and(
        eq(realEstateCoupons.id, id),
        eq(realEstateCoupons.organizationId, orgId),
        eq(realEstateCoupons.isActive, 1),
      ))
      .limit(1);
    if (!row) {
      throw new NotFoundException("Coupon introuvable.");
    }
    return row;
  }

  async updateCoupon(id: number, input: UpdateCouponDto, orgId: number) {
    const coupon = await this.findCoupon(id, orgId);
    const code = input.code != null ? this.normalizeCouponCode(input.code) : coupon.code;
    if (code !== coupon.code) {
      const [dup] = await this.db
        .select({ id: realEstateCoupons.id })
        .from(realEstateCoupons)
        .where(and(eq(realEstateCoupons.organizationId, orgId), eq(realEstateCoupons.code, code)))
        .limit(1);
      if (dup) {
        throw new BadRequestException(`Le code « ${code} » existe déjà.`);
      }
    }
    await this.db
      .update(realEstateCoupons)
      .set({
        code,
        description: input.description !== undefined ? input.description : coupon.description,
        discountType: input.discountType ?? coupon.discountType,
        discountValue: input.discountValue != null ? this.money(input.discountValue) : coupon.discountValue,
        currencyId: input.currencyId !== undefined ? input.currencyId : coupon.currencyId,
        validFrom: input.validFrom !== undefined ? input.validFrom : coupon.validFrom,
        validTo: input.validTo !== undefined ? input.validTo : coupon.validTo,
        maxUses: input.maxUses !== undefined ? input.maxUses : coupon.maxUses,
        isActive: input.isActive != null ? (input.isActive ? 1 : 0) : coupon.isActive,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateCoupons.id, id));
    return this.findCoupon(id, orgId);
  }

  async deleteCoupon(id: number, orgId: number) {
    await this.findCoupon(id, orgId);
    await this.db
      .update(realEstateCoupons)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateCoupons.id, id));
    return { message: "Coupon désactivé." };
  }

  // Valide un code coupon pour une date/devise donnée. Retourne le coupon ou lève.
  private async resolveCoupon(code: string, orgId: number, onDate: string, currencyId: number | null) {
    const normalized = this.normalizeCouponCode(code);
    const [coupon] = await this.db
      .select()
      .from(realEstateCoupons)
      .where(and(
        eq(realEstateCoupons.organizationId, orgId),
        eq(realEstateCoupons.code, normalized),
        eq(realEstateCoupons.isActive, 1),
      ))
      .limit(1);
    if (!coupon) {
      throw new BadRequestException(`Coupon « ${normalized} » invalide ou inactif.`);
    }
    if (coupon.validFrom && onDate < coupon.validFrom) {
      throw new BadRequestException(`Le coupon « ${normalized} » n'est pas encore valide.`);
    }
    if (coupon.validTo && onDate > coupon.validTo) {
      throw new BadRequestException(`Le coupon « ${normalized} » a expiré.`);
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException(`Le coupon « ${normalized} » a atteint son quota d'utilisation.`);
    }
    if (
      coupon.discountType === "fixed" &&
      coupon.currencyId != null &&
      currencyId != null &&
      Number(coupon.currencyId) !== Number(currencyId)
    ) {
      throw new BadRequestException(`Le coupon « ${normalized} » ne s'applique pas à cette devise.`);
    }
    return coupon;
  }

  // Calcule la remise (bornée au brut) d'un coupon sur un montant brut.
  private couponDiscount(coupon: typeof realEstateCoupons.$inferSelect, gross: number) {
    const value = Number(coupon.discountValue) || 0;
    const raw = coupon.discountType === "percentage" ? (gross * value) / 100 : value;
    return Math.min(gross, Math.max(0, Math.round(raw * 100) / 100));
  }

  // Endpoint public de validation : renvoie la remise/net pour un aperçu UI.
  async validateCoupon(code: string, gross: number, orgId: number, currencyId?: number | null) {
    const onDate = this.formatDateOnly(new Date());
    const coupon = await this.resolveCoupon(code, orgId, onDate, currencyId ?? null);
    const discount = this.couponDiscount(coupon, Number(gross) || 0);
    return {
      couponId: Number(coupon.id),
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount: discount,
      net: Math.max(0, (Number(gross) || 0) - discount),
    };
  }

  private async bumpCouponUsage(couponId: number) {
    await this.db
      .update(realEstateCoupons)
      .set({ usedCount: sql`${realEstateCoupons.usedCount} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(realEstateCoupons.id, couponId));
  }

  // Disponibilité : true si aucune réservation active ne chevauche la plage.
  async checkReservationAvailability(
    orgId: number,
    propertyId: number,
    unitId: number | null,
    checkIn: string,
    checkOut: string,
    propertyScope: "all" | number[] = "all",
  ) {
    this.ensurePropertyInScope(propertyId, propertyScope);
    try {
      await this.assertNoOverlap(orgId, propertyId, unitId, checkIn, checkOut);
      await this.assertNoLeaseConflict(orgId, propertyId, unitId, checkIn, checkOut);
      return { available: true };
    } catch (err) {
      return { available: false, reason: (err as any)?.message || "Indisponible" };
    }
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
        eq(realEstateRentPayments.status, "paid"),
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

  /**
   * Echappe une valeur venant de la base avant de l'inserer dans un email HTML.
   * Les noms de proprietaire et de gestionnaire sont saisis librement : un
   * caractere `<` non echappe casserait le rendu du mail.
   */
  private escapeHtml(value: string | null | undefined) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async sendPaymentReminder(leaseId: number, orgId: number) {
    const rows = await this.db
      .select({
        leaseId: realEstateLeases.id,
        organizationId: realEstateLeases.organizationId,
        tenantId: realEstateLeases.tenantId,
        propertyId: realEstateLeases.propertyId,
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
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);

    if (!rows.length) throw new NotFoundException("Bail introuvable.");

    const lease = rows[0];
    if (!lease.tenantEmail) throw new BadRequestException("Email du locataire introuvable.");

    const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
    // {amount} inclut la devise (ex. « 620000 FC ») — comme le rappel automatique.
    const rentDisplay = `${lease.rentAmount ?? ""}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`.trim();
    // Le locataire est renvoyé vers les personnes en charge de SON immeuble
    // (propriétaire + gestionnaire assigné), comme le rappel automatique, et non
    // vers un « nous » anonyme. Repli sur le contact société si aucun des deux
    // n'est joignable.
    const company = await readOrgAppSetting(this.db, 1, {
      name: appSettings.companyName,
      phone: appSettings.phone,
    });
    const companyName = (company?.name as string | null) || "votre gestionnaire";
    const companyPhone = ((company?.phone as string | null) || "").trim();
    const propertyContacts = await this.ownerNotifications.propertyContactVars(
      lease.propertyId ? Number(lease.propertyId) : null,
      lease.organizationId,
    );
    const contacts =
      propertyContacts.contacts || `${companyName}${companyPhone ? ` au ${companyPhone}` : ""}`;

    let subject = `Rappel de paiement de loyer — Bail #${lease.reference}`;
    let html = `
      <p>Bonjour ${tenantName},</p>
      <p>Nous vous rappelons que votre loyer pour le bail <strong>#${lease.reference}</strong> est en retard.</p>
      <p><strong>Montant du:</strong> ${rentDisplay}</p>
      <p>Merci de régulariser ce paiement au plus tôt possible.</p>
      <p>Pour tout règlement ou question, contactez ${this.escapeHtml(contacts)}.</p>
      <p>Cordialement,<br>${this.escapeHtml(companyName)}</p>
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
          .replace(/\{amount\}/g, rentDisplay)
          .replace(/\{companyName\}/g, companyName)
          .replace(/\{ownerContact\}/g, propertyContacts.ownerContact)
          .replace(/\{managerContact\}/g, propertyContacts.managerContact)
          .replace(/\{contacts\}/g, contacts);
      if (tpl[0].subject) subject = fill(tpl[0].subject);
      if (tpl[0].body) html = fill(tpl[0].body);
    }

    const htmlWithFooter = await this.tenantPortal.appendPortalFooterToEmail(html, lease.tenantId, lease.organizationId);
    const result = await this.emails.send({
      to: lease.tenantEmail,
      subject,
      html: htmlWithFooter,
      type: "payment_reminder",
      relatedType: "real-estate-lease",
      relatedId: leaseId,
    });
    return { message: "success", email: result };
  }

  /**
   * PREAVIS POUR DEFAUT DE PAIEMENT — action manuelle du gestionnaire depuis la
   * page Loyers. Previent formellement le locataire qu'un preavis sera depose
   * s'il ne regularise pas, et informe sa personne de contact ainsi que le
   * proprietaire du bien.
   *
   * Reserve aux locataires qui doivent STRICTEMENT PLUS D'UN MOIS de loyer :
   * le seuil est recalcule ici (meme formule que la carte locataire, par
   * COUVERTURE EN MONTANT) et non repris du client, pour qu'un appel direct a
   * l'API ne puisse pas notifier un locataire a jour.
   */
  async sendDefaultNotice(leaseId: number, orgId: number) {
    const [lease] = await this.db
      .select({
        id: realEstateLeases.id,
        organizationId: realEstateLeases.organizationId,
        tenantId: realEstateLeases.tenantId,
        propertyId: realEstateLeases.propertyId,
        reference: realEstateLeases.reference,
        startDate: realEstateLeases.startDate,
        rentAmount: realEstateLeases.rentAmount,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        noticeSentAt: realEstateLeases.defaultNoticeSentAt,
        currencySymbol: currencies.currencySymbol,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantEmail: customers.email,
        tenantPhone: customers.phone,
        emergencyPhone: tenantDetails.contactedPersonPhoneNumber,
        propertyName: realEstateProperties.name,
        propertyAddress: realEstateProperties.address,
        unitName: realEstateUnits.name,
      })
      .from(realEstateLeases)
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(tenantDetails, eq(tenantDetails.customerId, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateLeases.propertyId))
      .leftJoin(realEstateUnits, eq(realEstateUnits.id, realEstateLeases.unitId))
      .where(and(eq(realEstateLeases.id, leaseId), eq(realEstateLeases.organizationId, orgId)))
      .limit(1);

    if (!lease) throw new NotFoundException("Bail introuvable.");

    // Couverture en montant : total deja verse / loyer mensuel. Les echeances
    // "pending" (generees mais non encaissees) ne comptent pas comme payees.
    const payments = await this.db
      .select({ amount: realEstateRentPayments.amount, status: realEstateRentPayments.status })
      .from(realEstateRentPayments)
      .where(and(eq(realEstateRentPayments.leaseId, leaseId), eq(realEstateRentPayments.organizationId, orgId)));
    const rent = Number(lease.rentAmount) || 0;
    const totalPaid = payments
      .filter((p) => p.status !== "pending")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const monthsCovered = rent > 0 ? Math.floor((totalPaid + 0.0001) / rent) : 0;

    // Mois exigibles depuis le debut du bail, mois courant inclus.
    const now = new Date();
    const start = new Date(`${lease.startDate}T00:00:00`);
    const elapsedPast = Math.max(
      0,
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
    );
    const monthsDue = elapsedPast + 1;
    const monthsBehind = Math.max(0, monthsDue - monthsCovered);
    const balance = Math.max(0, Math.round((monthsDue * rent - totalPaid) * 100) / 100);

    if (monthsBehind <= 1) {
      throw new BadRequestException(
        "Le preavis pour defaut de paiement est reserve aux locataires qui doivent plus d'un mois de loyer.",
      );
    }

    const tenantName = [lease.tenantFirstName, lease.tenantLastName].filter(Boolean).join(" ") || "Locataire";
    const place =
      [lease.propertyName, lease.unitName].filter(Boolean).join(", ") ||
      lease.propertyAddress ||
      "votre logement";
    const daysLate = lease.nextInvoiceDate
      ? Math.max(0, Math.floor((Date.now() - new Date(`${lease.nextInvoiceDate}T00:00:00`).getTime()) / 86_400_000))
      : 0;
    const contacts = await this.ownerNotifications.propertyContactVars(
      lease.propertyId ? Number(lease.propertyId) : null,
      orgId,
    );
    const vars = {
      tenantName,
      firstName: lease.tenantFirstName || tenantName,
      reference: lease.reference || String(lease.id),
      address: place,
      property: place,
      amount: `${balance}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`,
      rentAmount: `${lease.rentAmount ?? ""}${lease.currencySymbol ? ` ${lease.currencySymbol}` : ""}`.trim(),
      monthsBehind: String(monthsBehind),
      daysLate: String(daysLate),
      ownerContact: contacts.ownerContact,
      managerContact: contacts.managerContact,
      contacts: contacts.contacts,
      url: await this.tenantPortal.portalUrlForTenant(lease.tenantId, orgId),
    };

    // Texte pilote depuis Reglages > Messages (evenement "default_notice").
    const tenantMsg = await this.ownerNotifications.renderMessage(
      "default_notice",
      "Bonjour {tenantName}, malgre nos rappels, {monthsBehind} mois de loyer restent impayes pour " +
        "{address} (bail {reference}), soit {amount}. Sans regularisation de votre part, un preavis " +
        "pour defaut de paiement sera depose. Merci de contacter {contacts} sans tarder.",
      vars,
    );

    let smsSent = false;
    if (lease.tenantPhone) {
      const smsWithFooter = this.ownerNotifications.fitOneSms(
        vars.url && tenantMsg.includes(vars.url)
          ? tenantMsg
          : await this.tenantPortal.appendPortalFooterToSms(tenantMsg, lease.tenantId, orgId),
      );
      smsSent = await this.safeNoticeSms(lease.tenantPhone, smsWithFooter, leaseId, orgId);
    }

    let emailSent = false;
    if (lease.tenantEmail) {
      const html = await this.tenantPortal.appendPortalFooterToEmail(
        `<p>${tenantMsg}</p>`,
        lease.tenantId,
        orgId,
      );
      try {
        await this.emails.send({
          to: lease.tenantEmail,
          subject: `Preavis pour defaut de paiement — bail ${vars.reference}`,
          html,
          type: "default_notice",
          relatedType: "real-estate-lease",
          relatedId: leaseId,
        });
        emailSent = true;
      } catch (error) {
        this.logger.warn(
          `Default notice email error (lease ${leaseId}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (!smsSent && !emailSent) {
      throw new BadRequestException("Aucun contact (telephone ou email) disponible pour ce locataire.");
    }

    // La personne de contact est informee, sans lien portail : le message ne
    // s'adresse pas au locataire (meme principe que les relances de retard).
    let contactNotified = false;
    if (lease.emergencyPhone) {
      const contactMsg = await this.ownerNotifications.renderMessage(
        "default_notice_contact",
        "Bonjour, en tant que personne de contact de {tenantName}, nous vous informons que {monthsBehind} mois " +
          "de loyer ({amount}) restent impayes pour {address}. Sans regularisation, un preavis pour defaut de " +
          "paiement sera depose. Merci de l'inviter a contacter {contacts}.",
        vars,
      );
      contactNotified = await this.safeNoticeSms(lease.emergencyPhone, contactMsg, leaseId, orgId);
    }

    // Le proprietaire est prevenu qu'un preavis a ete notifie sur son bien.
    const ownerNotified = await this.ownerNotifications.notifyDefaultNotice(
      leaseId,
      Number(lease.propertyId),
      Number(lease.tenantId),
      vars,
      orgId,
    );

    // Trace : date d'envoi (preuve que le locataire a ete averti) + mois dus a
    // cet instant. Ecrite seulement si au moins un canal locataire a abouti.
    await this.db
      .update(realEstateLeases)
      .set({
        defaultNoticeSentAt: sql`CURRENT_TIMESTAMP`,
        defaultNoticeMonthsBehind: monthsBehind,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(realEstateLeases.id, leaseId));

    return {
      message: "success",
      monthsBehind,
      balance,
      smsSent,
      emailSent,
      contactNotified,
      ownerNotified,
      previousNoticeAt: lease.noticeSentAt ?? null,
    };
  }

  /** Envoi SMS best-effort : un echec n'annule pas le reste du preavis. */
  private async safeNoticeSms(phone: string, message: string, leaseId: number, orgId: number) {
    try {
      const res = await this.sms.sendSms({
        phone,
        message,
        organizationId: orgId,
        smsType: "default_notice",
        relatedType: "real-estate-lease",
        relatedId: leaseId,
      });
      if (!res?.success) {
        this.logger.warn(`Default notice SMS not sent (lease ${leaseId}, ${phone}): ${res?.message}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(
        `Default notice SMS error (lease ${leaseId}, ${phone}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
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
    const created = await this.findMaintenance(ticketId);
    this.notifyMaintenanceStatus(created, created.status).catch((err) =>
      this.logger.warn(`notifyMaintenanceStatus: envoi WhatsApp ignore: ${(err as Error).message}`),
    );
    return created;
  }

  async updateMaintenance(id: number, input: UpdateMaintenanceDto, orgId: number) {
    await this.ensureOrgOwned(realEstateMaintenanceRequests, id, orgId, "Maintenance request not found.");
    const previousStatus = input.status !== undefined ? (await this.findMaintenance(id, orgId)).status : undefined;
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
    const updated = await this.findMaintenance(id);
    if (input.status !== undefined && input.status !== previousStatus) {
      this.notifyMaintenanceStatus(updated, input.status).catch((err) =>
        this.logger.warn(`notifyMaintenanceStatus: envoi WhatsApp ignore: ${(err as Error).message}`),
      );
    }
    return updated;
  }

  /** SCRUM: notifie un groupe WhatsApp a chaque etape du cycle de vie d'un ticket de maintenance Domus. */
  private async notifyMaintenanceStatus(ticket: any, status: string) {
    const groupJid = process.env.WHATSAPP_DOMUS_MAINTENANCE_GROUP_JID;
    if (!groupJid) return;
    if ((await this.whatsapp.getStatus()) !== "connected") return;
    const label =
      status === "done" ? "Maintenance terminee"
      : status === "in_progress" ? "Maintenance en cours"
      : status === "open" ? "Nouveau ticket de maintenance"
      : `Maintenance - statut: ${status}`;
    const lines = [
      label,
      `Ticket: ${ticket.title || `#${ticket.id}`}`,
      ticket.propertyName ? `Propriete: ${ticket.propertyName}` : null,
      ticket.unitName ? `Unite: ${ticket.unitName}` : null,
    ].filter(Boolean);
    const caption = lines.join("\n");

    // A la resolution, joindre la photo "apres travaux" la plus recente du ticket
    // (repli sur la derniere photo dispo tous types confondus) ; sinon comportement
    // texte inchange.
    if (status === "done") {
      const photo = await this.latestMaintenancePhoto(ticket.id, ticket.organizationId).catch(() => null);
      if (photo) {
        try {
          const object = await this.objectStorage.getObject(photo.objectKey);
          const chunks: Buffer[] = [];
          for await (const chunk of object.body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          await this.whatsapp.sendImage(groupJid, Buffer.concat(chunks), caption);
          return;
        } catch (err) {
          this.logger.warn(`notifyMaintenanceStatus: envoi image ignore, repli texte: ${(err as Error).message}`);
        }
      }
    }

    await this.whatsapp.sendMessage(groupJid, caption);
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

  private async findPropertyPhoto(photoId: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const scopeFilter = this.propertyDirectFilter(realEstatePropertyPhotos.propertyId, propertyScope);
    const rows = await this.db
      .select({
        id: realEstatePropertyPhotos.id,
        organizationId: realEstatePropertyPhotos.organizationId,
        propertyId: realEstatePropertyPhotos.propertyId,
        unitId: realEstatePropertyPhotos.unitId,
        bucket: realEstatePropertyPhotos.bucket,
        objectKey: realEstatePropertyPhotos.objectKey,
        originalName: realEstatePropertyPhotos.originalName,
        mimeType: realEstatePropertyPhotos.mimeType,
        sizeBytes: realEstatePropertyPhotos.sizeBytes,
        isPrimary: realEstatePropertyPhotos.isPrimary,
        sortOrder: realEstatePropertyPhotos.sortOrder,
        createdAt: realEstatePropertyPhotos.createdAt,
      })
      .from(realEstatePropertyPhotos)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstatePropertyPhotos.propertyId))
      .where(and(
        eq(realEstatePropertyPhotos.id, photoId),
        eq(realEstatePropertyPhotos.organizationId, orgId),
        eq(realEstatePropertyPhotos.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        scopeFilter,
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Photo introuvable.");
    return rows[0];
  }

  private photoUnitFilter(unitId?: number | null) {
    return unitId == null ? isNull(realEstatePropertyPhotos.unitId) : eq(realEstatePropertyPhotos.unitId, unitId);
  }

  private propertyPhotoResponse(row: {
    id: number;
    propertyId: number;
    unitId?: number | null;
    originalName?: string | null;
    mimeType: string;
    sizeBytes: number;
    isPrimary: number;
    sortOrder: number;
    createdAt?: Date | string | null;
  }) {
    return {
      id: row.id,
      propertyId: row.propertyId,
      unitId: row.unitId ?? null,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes || 0),
      isPrimary: Number(row.isPrimary) === 1,
      sortOrder: Number(row.sortOrder || 0),
      createdAt: row.createdAt,
    };
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
        availableForBooking: realEstateUnits.availableForBooking,
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
    const [enriched] = await this.withOverdueStats(rows);
    return enriched;
  }

  // Carnet de quittances (PDF cote front) : une page de garde + une quittance
  // par paiement/echeance du bail. Filtrage strict organisation + scope bien
  // (meme garde que findReservation/ensurePropertyInScope) pour eviter toute
  // fuite inter-org, contrairement a findLease() qui ne filtre pas par org.
  async rentBook(leaseId: number, orgId: number, propertyScope: "all" | number[] = "all") {
    const [lease] = await this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        startDate: realEstateLeases.startDate,
        endDate: realEstateLeases.endDate,
        rentAmount: realEstateLeases.rentAmount,
        currencyId: realEstateLeases.currencyId,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
        propertyId: realEstateLeases.propertyId,
        propertyName: leaseProperty.name,
        propertyAddress: leaseProperty.address,
        ownerName: realEstateOwners.displayName,
        unitId: realEstateLeases.unitId,
        unitName: leaseUnit.name,
        tenantId: realEstateLeases.tenantId,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantPhone: customers.phone,
        organizationName: organizations.name,
      })
      .from(realEstateLeases)
      .leftJoin(leaseProperty, eq(leaseProperty.id, realEstateLeases.propertyId))
      .leftJoin(leaseUnit, eq(leaseUnit.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .leftJoin(realEstateOwners, eq(realEstateOwners.id, leaseProperty.ownerId))
      .leftJoin(organizations, eq(organizations.id, realEstateLeases.organizationId))
      .where(and(
        eq(realEstateLeases.id, leaseId),
        eq(realEstateLeases.organizationId, orgId),
      ))
      .limit(1);
    if (!lease) throw new NotFoundException("Lease not found.");
    this.ensurePropertyInScope(lease.propertyId, propertyScope);

    // Materialise les echeances manquantes jusqu'a la fin du bail (status
    // 'pending', pas de transaction comptable) AVANT de lire les paiements :
    // sans ca, les mois futurs du carnet n'ont pas d'id reel en base, donc pas
    // de QR individuel possible pour envoyer la preuve de ce mois precis.
    // Idempotent (generateMissingPayments ne duplique jamais un mois deja couvert).
    await this.generateMissingPayments(leaseId, orgId, true);

    const payments = await this.paymentQuery(undefined, orgId, "all", leaseId)
      .orderBy(realEstateRentPayments.paymentDate, realEstateRentPayments.id);

    // URL du portail locataire pour le QR code du carnet : best-effort, comme
    // les autres usages de portalUrlForTenant (rappel SMS/email). Si le
    // locataire n'a pas de tenantId (bail sans locataire rattache) ou si la
    // generation du lien echoue, le carnet s'affiche quand meme sans QR plutot
    // que de bloquer le telechargement.
    const portalUrl = lease.tenantId
      ? await this.tenantPortal.portalUrlForTenant(lease.tenantId, orgId, lease.id)
      : "";

    return { lease, payments, portalUrl: portalUrl || null };
  }

  async leaseDocuments(leaseId: number, orgId: number) {
    await this.findLease(leaseId);
    return this.db
      .select()
      .from(realEstateLeaseDocuments)
      .where(and(
        eq(realEstateLeaseDocuments.leaseId, leaseId),
        eq(realEstateLeaseDocuments.organizationId, orgId),
        eq(realEstateLeaseDocuments.isActive, 1),
      ))
      .orderBy(desc(realEstateLeaseDocuments.id));
  }

  async uploadLeaseDocument(leaseId: number, file: any, orgId: number, notes?: string | null) {
    await this.findLease(leaseId);
    const stored = await this.objectStorage.putDocument(file, `domus/leases/${orgId}/${leaseId}/documents`);

    const [result] = await this.db.insert(realEstateLeaseDocuments).values({
      organizationId: orgId,
      leaseId,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: file?.originalname ? String(file.originalname).slice(0, 255) : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      notes: notes ? String(notes).slice(0, 500) : null,
      isActive: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const [doc] = await this.db
      .select()
      .from(realEstateLeaseDocuments)
      .where(eq(realEstateLeaseDocuments.id, Number(result.insertId)))
      .limit(1);
    return doc;
  }

  async findLeaseDocument(documentId: number, orgId: number) {
    const [doc] = await this.db
      .select()
      .from(realEstateLeaseDocuments)
      .where(and(
        eq(realEstateLeaseDocuments.id, documentId),
        eq(realEstateLeaseDocuments.organizationId, orgId),
        eq(realEstateLeaseDocuments.isActive, 1),
      ))
      .limit(1);
    if (!doc) throw new NotFoundException("Document not found.");
    return doc;
  }

  async deleteLeaseDocument(documentId: number, orgId: number) {
    const doc = await this.findLeaseDocument(documentId, orgId);
    await this.objectStorage.deleteObject(doc.objectKey);
    await this.db
      .update(realEstateLeaseDocuments)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateLeaseDocuments.id, documentId), eq(realEstateLeaseDocuments.organizationId, orgId)));
    // Un contrat peut référencer ce document comme preuve de signature papier
    // (signedDocumentId) : on détache la référence, sinon l'UI garde un bouton
    // « Voir le bail signé importé » qui pointe vers un document supprimé (404).
    const linkedContracts = await this.db
      .select({ id: realEstateContracts.id })
      .from(realEstateContracts)
      .where(and(
        eq(realEstateContracts.signedDocumentId, documentId),
        eq(realEstateContracts.organizationId, orgId),
      ));
    if (linkedContracts.length) {
      await this.db
        .update(realEstateContracts)
        .set({ signedDocumentId: null, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(
          eq(realEstateContracts.signedDocumentId, documentId),
          eq(realEstateContracts.organizationId, orgId),
        ));
      for (const contract of linkedContracts) {
        await this.realtimeData.publishDataUpdated({
          entity: "contract",
          action: "updated",
          entityId: contract.id,
          scope: { module: "propertyManagement" },
        });
      }
    }
    return { message: "Document supprime." };
  }

  async leaseDocumentFile(documentId: number, orgId: number) {
    const doc = await this.findLeaseDocument(documentId, orgId);
    const object = await this.objectStorage.getObject(doc.objectKey);
    return {
      ...object,
      originalName: doc.originalName || `lease-document-${doc.id}`,
      mimeType: doc.mimeType,
    };
  }

  // ── Copie de la pièce d'identité du locataire (MinIO, une copie par locataire) ──
  private async tenantIdDocumentRow(tenantId: number) {
    const [row] = await this.db
      .select({
        idDocumentKey: tenantDetails.idDocumentKey,
        idDocumentMime: tenantDetails.idDocumentMime,
        idDocumentName: tenantDetails.idDocumentName,
      })
      .from(tenantDetails)
      .where(eq(tenantDetails.customerId, tenantId))
      .limit(1);
    return row;
  }

  async uploadTenantIdDocument(tenantId: number, file: any, orgId: number) {
    await this.findTenant(tenantId, orgId);
    const current = await this.tenantIdDocumentRow(tenantId);
    if (!current) throw new NotFoundException("Fiche locataire incomplete.");
    const stored = await this.objectStorage.putDocument(file, `domus/tenants/${orgId}/${tenantId}/id-document`);
    if (current.idDocumentKey) {
      // Remplacement : on efface l ancienne copie du stockage objet.
      await this.objectStorage.deleteObject(current.idDocumentKey).catch(() => undefined);
    }
    await this.db
      .update(tenantDetails)
      .set({
        idDocumentBucket: stored.bucket,
        idDocumentKey: stored.objectKey,
        idDocumentMime: stored.mimeType,
        idDocumentName: file?.originalname ? String(file.originalname).slice(0, 255) : null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantDetails.customerId, tenantId));
    return this.findTenant(tenantId, orgId);
  }

  async tenantIdDocumentFile(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);
    const row = await this.tenantIdDocumentRow(tenantId);
    if (!row?.idDocumentKey) throw new NotFoundException("Aucune copie de piece d identite.");
    const object = await this.objectStorage.getObject(row.idDocumentKey);
    return {
      ...object,
      originalName: row.idDocumentName || `piece-identite-${tenantId}`,
      mimeType: row.idDocumentMime,
    };
  }

  async deleteTenantIdDocument(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);
    const row = await this.tenantIdDocumentRow(tenantId);
    if (row?.idDocumentKey) {
      await this.objectStorage.deleteObject(row.idDocumentKey).catch(() => undefined);
    }
    await this.db
      .update(tenantDetails)
      .set({
        idDocumentBucket: null,
        idDocumentKey: null,
        idDocumentMime: null,
        idDocumentName: null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tenantDetails.customerId, tenantId));
    return { message: "Copie de la piece supprimee." };
  }

  /**
   * Historique fusionne (email + SMS) des communications envoyees a un locataire :
   * bienvenue de bail, rappel de retard, lien de signature de contrat, lien portail,
   * message de bienvenue post-signature, etc.
   * Les logs sont rattaches soit directement au tenant ("tenant" + tenantId), soit
   * a ses baux ("real-estate-lease" + leaseId), soit a ses contrats
   * ("real-estate-contract" + contractId) — on resout donc les baux/contrats du
   * locataire avant d'agreger. Scope strict organisation : findTenant() leve un
   * 404 si le tenant n'appartient pas a orgId.
   */
  async tenantCommunications(tenantId: number, orgId: number) {
    await this.findTenant(tenantId, orgId);

    const leaseRows = await this.db
      .select({ id: realEstateLeases.id })
      .from(realEstateLeases)
      .where(and(eq(realEstateLeases.tenantId, tenantId), eq(realEstateLeases.organizationId, orgId)));
    const leaseIds = leaseRows.map((row) => row.id);

    let contractIds: number[] = [];
    if (leaseIds.length) {
      const contractRows = await this.db
        .select({ id: realEstateContracts.id })
        .from(realEstateContracts)
        .where(and(inArray(realEstateContracts.leaseId, leaseIds), eq(realEstateContracts.organizationId, orgId)));
      contractIds = contractRows.map((row) => row.id);
    }

    const relatedConditions = [
      and(eq(systemEmailLogs.relatedType, "tenant"), eq(systemEmailLogs.relatedId, String(tenantId))),
      ...(leaseIds.length
        ? [and(eq(systemEmailLogs.relatedType, "real-estate-lease"), inArray(systemEmailLogs.relatedId, leaseIds.map(String)))]
        : []),
      ...(contractIds.length
        ? [and(eq(systemEmailLogs.relatedType, "real-estate-contract"), inArray(systemEmailLogs.relatedId, contractIds.map(String)))]
        : []),
    ];

    const emailRows = await this.db
      .select({
        type: systemEmailLogs.emailType,
        recipient: systemEmailLogs.recipient,
        subject: systemEmailLogs.subject,
        status: systemEmailLogs.status,
        errorMessage: systemEmailLogs.errorMessage,
        createdAt: systemEmailLogs.createdAt,
      })
      .from(systemEmailLogs)
      .where(or(...relatedConditions))
      .orderBy(desc(systemEmailLogs.createdAt))
      .limit(100);

    const smsRelatedConditions = [
      and(eq(smsLogs.relatedType, "tenant"), eq(smsLogs.relatedId, String(tenantId))),
      ...(leaseIds.length
        ? [and(eq(smsLogs.relatedType, "real-estate-lease"), inArray(smsLogs.relatedId, leaseIds.map(String)))]
        : []),
      ...(contractIds.length
        ? [and(eq(smsLogs.relatedType, "real-estate-contract"), inArray(smsLogs.relatedId, contractIds.map(String)))]
        : []),
    ];

    const smsRows = await this.db
      .select({
        id: smsLogs.id,
        type: smsLogs.smsType,
        recipient: smsLogs.recipient,
        body: smsLogs.body,
        status: smsLogs.status,
        errorMessage: smsLogs.errorMessage,
        createdAt: smsLogs.createdAt,
      })
      .from(smsLogs)
      .where(and(eq(smsLogs.organizationId, orgId), or(...smsRelatedConditions)))
      .orderBy(desc(smsLogs.createdAt))
      .limit(100);

    const merged = [
      ...emailRows.map((row) => ({
        channel: "email" as const,
        id: null as number | null,
        type: row.type,
        recipient: row.recipient,
        subject: row.subject,
        status: row.status,
        createdAt: row.createdAt,
        errorMessage: row.errorMessage,
      })),
      ...smsRows.map((row) => ({
        channel: "sms" as const,
        // Id du log : permet a l'UI de proposer un renvoi quand l'envoi a echoue.
        id: row.id,
        type: row.type,
        recipient: row.recipient,
        // Texte SMS complet : la troncature a 160 caracteres coupait la fin du
        // message, donc le lien du portail locataire ajoute en pied (SMS bien
        // envoye avec le lien, mais invisible dans l'historique).
        subject: row.body ? String(row.body) : null,
        status: row.status,
        createdAt: row.createdAt,
        errorMessage: row.errorMessage,
      })),
    ];

    merged.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    return merged.slice(0, 100);
  }

  /**
   * Renvoie un SMS deja trace dans sms_logs (typiquement un envoi en echec :
   * passerelle injoignable, compte inactif...). On reprend le destinataire et
   * le corps exacts du log d'origine ; sendSms cree une NOUVELLE ligne de log,
   * l'ancienne reste telle quelle pour garder l'historique des tentatives.
   */
  async resendSmsLog(logId: number, orgId: number) {
    const rows = await this.db
      .select({
        recipient: smsLogs.recipient,
        body: smsLogs.body,
        smsType: smsLogs.smsType,
        relatedType: smsLogs.relatedType,
        relatedId: smsLogs.relatedId,
      })
      .from(smsLogs)
      .where(and(eq(smsLogs.id, logId), eq(smsLogs.organizationId, orgId)))
      .limit(1);
    const log = rows[0];
    if (!log) throw new NotFoundException("SMS log not found.");
    if (!log.body) throw new BadRequestException("Ce SMS n'a pas de contenu a renvoyer.");

    const res = await this.sms.sendSms({
      phone: log.recipient,
      message: log.body,
      organizationId: orgId,
      smsType: log.smsType,
      relatedType: log.relatedType ?? undefined,
      relatedId: log.relatedId ?? undefined,
    });
    return { success: Boolean(res?.success), message: res?.message ?? null };
  }

  async findPayment(id: number) {
    const rows = await this.paymentQuery(id).limit(1);
    if (!rows.length) throw new NotFoundException("Payment not found.");
    return rows[0];
  }

  /**
   * Streame le justificatif (preuve de paiement) d'UN loyer, apres verification
   * que ce paiement appartient bien a l'organisation du JWT courant — meme
   * pattern que TenantPortalService.getPublicPaymentProof / OwnerPortalService.
   * getPublicOwnerPaymentProof, cote gestionnaire authentifie cette fois.
   */
  async paymentProofFile(id: number, orgId: number) {
    const rows = await this.paymentQuery(id, orgId).limit(1);
    if (!rows.length) throw new NotFoundException("Payment not found.");
    const proofUrl = rows[0].proofUrl;
    if (!proofUrl) throw new NotFoundException("Justificatif introuvable.");
    return readValidatedUploadFile(this.uploadDir, extractStoredFileName(proofUrl));
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

  // NB: ne stocke plus d'URL publique /uploads (route statique non
  // authentifiee, supprimee du perimetre Domus) : seul le nom du fichier est
  // garde. Le fichier est ensuite streame via les routes dediees
  // *ReceiptFile (propertyExpenseReceiptFile / expenseInstallmentReceiptFile /
  // mortgagePaymentReceiptFile / maintenanceCostReceiptFile) apres verification
  // d'appartenance a l'organisation — meme pattern que paymentProofFile.
  private saveReceiptFile(file: any, _publicApiBase?: string): string | null {
    if (!file?.buffer) return null;
    const { name } = saveValidatedUploadFile(file, this.uploadDir, {
      allowedMimeTypes: IMAGE_OR_PDF_MIME_TYPES,
      prefix: "receipt",
      maxBytes: 5 * 1024 * 1024,
    });
    return name;
  }

  private saveProofFile(file: any, _publicApiBase?: string): string | null {
    if (!file?.buffer) return null;
    const { name } = saveValidatedUploadFile(file, this.uploadDir, {
      allowedMimeTypes: IMAGE_OR_PDF_MIME_TYPES,
      prefix: "rent-proof",
      maxBytes: 5 * 1024 * 1024,
    });
    return name;
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

  async deleteMaintenanceCost(costId: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(realEstateMaintenanceCosts)
      .where(and(
        eq(realEstateMaintenanceCosts.id, costId),
        eq(realEstateMaintenanceCosts.isActive, 1),
        eq(realEstateMaintenanceCosts.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Maintenance cost not found.");
    await this.db
      .update(realEstateMaintenanceCosts)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMaintenanceCosts.id, costId), eq(realEstateMaintenanceCosts.organizationId, orgId)));
    return { message: "Deleted successfully." };
  }

  /**
   * Streame le justificatif (recu) d'un cout de maintenance, apres
   * verification que ce cout appartient a l'organisation du JWT courant —
   * meme pattern que paymentProofFile.
   */
  async maintenanceCostReceiptFile(costId: number, orgId: number) {
    const rows = await this.db
      .select({ receiptUrl: realEstateMaintenanceCosts.receiptUrl })
      .from(realEstateMaintenanceCosts)
      .where(and(eq(realEstateMaintenanceCosts.id, costId), eq(realEstateMaintenanceCosts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Maintenance cost not found.");
    const receiptUrl = rows[0].receiptUrl;
    if (!receiptUrl) throw new NotFoundException("Justificatif introuvable.");
    return readValidatedUploadFile(this.uploadDir, extractStoredFileName(receiptUrl));
  }

  // ── Depenses par propriete (SCRUM-310) ──────────────────────────────────────
  // Route chaque categorie vers un compte de charge CANONIQUE deja existant
  // (memes comptes que le regroupement 0149 / le sous-compte standard "Maintenance").
  // Pas de nouveau sous-compte cree par cette feature.
  private static readonly PROPERTY_EXPENSE_CATEGORY_ACCOUNT: Record<string, string> = {
    insurance: "Frais de bureau et divers",
    property_tax: "Frais de bureau et divers",
    hoa: "Frais de bureau et divers",
    maintenance_general: "Maintenance",
    management_fee: "Frais de bureau et divers",
    security: "Frais de bureau et divers",
    cleaning: "Frais de bureau et divers",
    other: "Frais de bureau et divers",
  };

  private async getOrCreatePropertyProject(propertyId: number, orgId: number, userId?: number): Promise<number | null> {
    const [property] = await this.db
      .select({ name: realEstateProperties.name })
      .from(realEstateProperties)
      .where(eq(realEstateProperties.id, propertyId))
      .limit(1);
    try {
      const proj = await this.projects.create(
        {
          name: `Bien: ${property?.name ?? propertyId}`,
          code: `PROP-${propertyId}`,
          sourceSystem: "property",
          externalRef: String(propertyId),
        },
        orgId,
        userId,
      );
      return proj.id;
    } catch (err) {
      this.logger.warn(`getOrCreatePropertyProject: liaison projet ignoree: ${(err as Error).message}`);
      return null;
    }
  }

  async listPropertyExpenses(
    orgId: number,
    filters: { propertyId?: number; category?: string; dateFrom?: string; dateTo?: string } = {},
  ) {
    const conditions = [
      eq(realEstatePropertyExpenses.organizationId, orgId),
      eq(realEstatePropertyExpenses.isActive, 1),
    ];
    if (filters.propertyId) conditions.push(eq(realEstatePropertyExpenses.propertyId, filters.propertyId));
    if (filters.category) conditions.push(eq(realEstatePropertyExpenses.category, filters.category));
    if (filters.dateFrom) conditions.push(gte(realEstatePropertyExpenses.expenseDate, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(realEstatePropertyExpenses.expenseDate, filters.dateTo));

    return this.db
      .select({
        ...getTableColumns(realEstatePropertyExpenses),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstatePropertyExpenses)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstatePropertyExpenses.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstatePropertyExpenses.currencyId))
      .where(and(...conditions))
      .orderBy(desc(realEstatePropertyExpenses.expenseDate), desc(realEstatePropertyExpenses.id));
  }

  async getPropertyExpense(id: number, orgId: number) {
    const rows = await this.db
      .select({
        ...getTableColumns(realEstatePropertyExpenses),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstatePropertyExpenses)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstatePropertyExpenses.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstatePropertyExpenses.currencyId))
      .where(and(
        eq(realEstatePropertyExpenses.id, id),
        eq(realEstatePropertyExpenses.isActive, 1),
        eq(realEstatePropertyExpenses.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Property expense not found.");
    return rows[0];
  }

  async createPropertyExpense(input: CreatePropertyExpenseDto, orgId: number, userId?: number) {
    await this.ensureActiveProperty(input.propertyId, orgId);
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    const projectId = await this.getOrCreatePropertyProject(input.propertyId, orgId, userId);

    const [result] = await this.db.insert(realEstatePropertyExpenses).values({
      organizationId: orgId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      leaseId: input.leaseId ?? null,
      category: input.category,
      description: input.description,
      amount: String(input.amount),
      currencyId: input.currencyId ?? null,
      expenseDate: input.expenseDate,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      supplierId: input.supplierId ?? null,
      vendorName: input.vendorName ?? null,
      paymentMethod: input.paymentMethod ?? "cash",
      paymentStatus: input.paymentStatus ?? "paid",
      receiptUrl: input.receiptUrl ?? null,
      projectId,
      isRecurring: input.isRecurring ? 1 : 0,
      recurrenceMonths: input.recurrenceMonths ?? null,
      paymentPlan: input.paymentPlan ?? "single",
      notes: input.notes ?? null,
      isActive: 1,
      createdBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const expenseId = Number((result as any).insertId);

    // Ecriture comptable : debit charge (compte canonique de la categorie) / credit tresorerie.
    const creditId = input.paymentMethod === "bank" ? 2 : 1; // 2=Bank, 1=Cash
    const accountName = PropertyManagementService.PROPERTY_EXPENSE_CATEGORY_ACCOUNT[input.category] ?? "Frais de bureau et divers";
    const debitId = await this.getOrCreateExpenseSubAccount(accountName, orgId);

    let journalEntryId: number | null = null;
    try {
      const posted = await this.ledger.post(
        {
          date: input.expenseDate,
          reference: `PROPEXP-${expenseId}`,
          particulars: `${input.description}${input.vendorName ? ` — ${input.vendorName}` : ""}`,
          sourceModule: "property_expense",
          relatedId: String(expenseId),
          currencyId: input.currencyId ?? undefined,
          idempotencyKey: `property-expense:${expenseId}`,
          lines: [
            { accountId: debitId, side: "DEBIT", amount: Number(input.amount), description: "Property expense", projectId: projectId ?? undefined },
            { accountId: creditId, side: "CREDIT", amount: Number(input.amount), description: input.paymentMethod === "bank" ? "Bank" : "Cash" },
          ],
        },
        orgId,
        userId,
      );
      journalEntryId = posted?.id ? Number(posted.id) : null;
    } catch (err) {
      this.logger.warn(`createPropertyExpense: ecriture ledger ignoree: ${(err as Error).message}`);
    }

    if (journalEntryId) {
      await this.db
        .update(realEstatePropertyExpenses)
        .set({ journalEntryId, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstatePropertyExpenses.id, expenseId));
    }

    // Soumet la depense au circuit d'approbation (effectif si gate), comme les couts de maintenance.
    try {
      await this.workflow.submit(
        { workflowKey: "exp_approval", entityType: "property_expense", entityId: String(expenseId) },
        orgId,
      );
    } catch (err) {
      console.warn("[Domus] submit property expense approval skipped:", (err as Error).message);
    }

    // Echeancier (SCRUM-313) : aucun impact ledger, purement informatif/suivi
    // de reglement. single/partial ne generent rien ici (comportement inchange
    // pour single ; partial attend des paiements libres ajoutes ensuite).
    if (input.paymentPlan === "installments" && input.recurrenceMonths) {
      await this.generateExpenseInstallments(
        expenseId,
        { recurrenceMonths: input.recurrenceMonths },
        orgId,
        userId,
      );
    }

    return this.getPropertyExpense(expenseId, orgId);
  }

  async updatePropertyExpense(id: number, input: UpdatePropertyExpenseDto, orgId: number) {
    await this.ensureOrgOwned(realEstatePropertyExpenses, id, orgId, "Property expense not found.");
    if (input.propertyId !== undefined) {
      await this.ensureActiveProperty(input.propertyId, orgId);
    }
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }
    await this.db
      .update(realEstatePropertyExpenses)
      .set({
        ...this.pick(input, [
          "propertyId",
          "unitId",
          "leaseId",
          "category",
          "description",
          "currencyId",
          "periodStart",
          "periodEnd",
          "supplierId",
          "vendorName",
          "paymentMethod",
          "paymentStatus",
          "receiptUrl",
          "notes",
        ]),
        ...(input.amount !== undefined ? { amount: String(input.amount) } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
        ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring ? 1 : 0 } : {}),
        ...(input.recurrenceMonths !== undefined ? { recurrenceMonths: input.recurrenceMonths } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstatePropertyExpenses.id, id), eq(realEstatePropertyExpenses.organizationId, orgId)));
    return this.getPropertyExpense(id, orgId);
  }

  async deletePropertyExpense(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstatePropertyExpenses, id, orgId, "Property expense not found.");
    await this.db
      .update(realEstatePropertyExpenses)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstatePropertyExpenses.id, id), eq(realEstatePropertyExpenses.organizationId, orgId)));
    return { message: "Deleted successfully." };
  }

  async uploadPropertyExpenseReceipt(id: number, orgId: number, receipt?: any, publicApiBase?: string) {
    await this.ensureOrgOwned(realEstatePropertyExpenses, id, orgId, "Property expense not found.");
    const receiptUrl = this.saveReceiptFile(receipt, publicApiBase);
    if (!receiptUrl) throw new BadRequestException("Aucun fichier reçu.");
    await this.db
      .update(realEstatePropertyExpenses)
      .set({ receiptUrl, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstatePropertyExpenses.id, id), eq(realEstatePropertyExpenses.organizationId, orgId)));
    return this.getPropertyExpense(id, orgId);
  }

  /**
   * Streame le justificatif (recu) d'une depense de propriete, apres
   * verification que cette depense appartient a l'organisation du JWT
   * courant — meme pattern que paymentProofFile.
   */
  async propertyExpenseReceiptFile(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstatePropertyExpenses, id, orgId, "Property expense not found.");
    const [row] = await this.db
      .select({ receiptUrl: realEstatePropertyExpenses.receiptUrl })
      .from(realEstatePropertyExpenses)
      .where(and(eq(realEstatePropertyExpenses.id, id), eq(realEstatePropertyExpenses.organizationId, orgId)))
      .limit(1);
    const receiptUrl = row?.receiptUrl;
    if (!receiptUrl) throw new NotFoundException("Justificatif introuvable.");
    return readValidatedUploadFile(this.uploadDir, extractStoredFileName(receiptUrl));
  }

  // ── Echeancier de paiement des depenses de propriete (SCRUM-313) ───────────
  // payment_plan='installments' : genere N echeances mensuelles a la creation.
  // payment_plan='partial' : aucune echeance generee, paiements libres ajoutes
  // un a un. Les deux types de lignes cohabitent dans real_estate_expense_installments
  // via la colonne kind ('scheduled' | 'partial'). Aucun impact ledger ici : le
  // posting (debit charge / credit tresorerie) reste entierement porte par
  // createPropertyExpense, quel que soit le payment_plan. journalEntryId reste
  // NULL sur les installments en v1 (reserve pour une v2 comptabilisee).

  /**
   * Ajoute `months` mois a `date` en clampant sur le dernier jour du mois cible
   * si necessaire (ex. 31 janvier + 1 mois -> 28/29 fevrier, jamais 3 mars).
   * Meme pattern que addBillingCycle (baux), reimplemente ici en date-only UTC
   * pour rester coherent avec les colonnes `date` (mode "string") des installments.
   */
  private addMonthsClamped(date: string, months: number): string {
    const base = this.parseDateOnly(date);
    const day = base.getUTCDate();
    const next = new Date(base.getTime());
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
    return this.formatDateOnly(next);
  }

  /**
   * Recalcule settled_amount (somme des paidAmount des installments actifs) et
   * payment_status ('paid' si settled >= amount, 'partial' si 0 < settled < amount,
   * sinon la valeur existante est conservee) sur la depense parente.
   * N'est jamais appele pour une depense en mode 'single' (aucune installment
   * n'existe alors), donc ne modifie jamais le comportement actuel du mode single.
   */
  private async recalcExpenseSettlement(expenseId: number, orgId: number) {
    const [expense] = await this.db
      .select({ amount: realEstatePropertyExpenses.amount, paymentStatus: realEstatePropertyExpenses.paymentStatus })
      .from(realEstatePropertyExpenses)
      .where(and(eq(realEstatePropertyExpenses.id, expenseId), eq(realEstatePropertyExpenses.organizationId, orgId)))
      .limit(1);
    if (!expense) return;

    const rows = await this.db
      .select({ paidAmount: realEstateExpenseInstallments.paidAmount })
      .from(realEstateExpenseInstallments)
      .where(and(
        eq(realEstateExpenseInstallments.expenseId, expenseId),
        eq(realEstateExpenseInstallments.organizationId, orgId),
        eq(realEstateExpenseInstallments.isActive, 1),
      ));
    const settled = rows.reduce((sum, r) => sum + Number(r.paidAmount ?? 0), 0);
    const total = Number(expense.amount ?? 0);

    let paymentStatus = expense.paymentStatus;
    if (settled >= total && total > 0) paymentStatus = "paid";
    else if (settled > 0 && settled < total) paymentStatus = "partial";

    await this.db
      .update(realEstatePropertyExpenses)
      .set({
        settledAmount: settled.toFixed(2),
        paymentStatus,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstatePropertyExpenses.id, expenseId), eq(realEstatePropertyExpenses.organizationId, orgId)));
  }

  private async findActiveExpenseForOrg(expenseId: number, orgId: number) {
    const [expense] = await this.db
      .select()
      .from(realEstatePropertyExpenses)
      .where(and(
        eq(realEstatePropertyExpenses.id, expenseId),
        eq(realEstatePropertyExpenses.organizationId, orgId),
        eq(realEstatePropertyExpenses.isActive, 1),
      ))
      .limit(1);
    if (!expense) throw new NotFoundException("Property expense not found.");
    return expense;
  }

  async listExpenseInstallments(expenseId: number, orgId: number) {
    await this.findActiveExpenseForOrg(expenseId, orgId);
    return this.db
      .select()
      .from(realEstateExpenseInstallments)
      .where(and(
        eq(realEstateExpenseInstallments.expenseId, expenseId),
        eq(realEstateExpenseInstallments.organizationId, orgId),
        eq(realEstateExpenseInstallments.isActive, 1),
      ))
      .orderBy(realEstateExpenseInstallments.sequenceNo);
  }

  async generateExpenseInstallments(expenseId: number, input: GenerateExpenseInstallmentsDto, orgId: number, userId?: number) {
    const expense = await this.findActiveExpenseForOrg(expenseId, orgId);

    const existing = await this.db
      .select()
      .from(realEstateExpenseInstallments)
      .where(and(
        eq(realEstateExpenseInstallments.expenseId, expenseId),
        eq(realEstateExpenseInstallments.organizationId, orgId),
        eq(realEstateExpenseInstallments.isActive, 1),
      ));

    const hasPaidInstallment = existing.some((row) => Number(row.paidAmount ?? 0) > 0);
    if (hasPaidInstallment) {
      const paidCount = existing.filter((row) => Number(row.paidAmount ?? 0) > 0).length;
      throw new BadRequestException(
        `${paidCount} echeance(s) deja reglee(s), impossible de regenerer l'echeancier de cette depense.`,
      );
    }

    // Soft-delete des anciennes lignes scheduled (aucun paiement, la regeneration est autorisee).
    if (existing.length) {
      await this.db
        .update(realEstateExpenseInstallments)
        .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(
          eq(realEstateExpenseInstallments.expenseId, expenseId),
          eq(realEstateExpenseInstallments.organizationId, orgId),
        ));
    }

    const n = input.recurrenceMonths;
    const total = Number(expense.amount ?? 0);
    const baseAmount = Math.round((total / n) * 100) / 100;
    const rows: (typeof realEstateExpenseInstallments.$inferInsert)[] = [];
    let allocated = 0;
    for (let k = 1; k <= n; k++) {
      const isLast = k === n;
      // La derniere echeance absorbe le reliquat d'arrondi pour garantir
      // SUM(plannedAmount) === amount exactement.
      const plannedAmount = isLast ? Math.round((total - allocated) * 100) / 100 : baseAmount;
      allocated += plannedAmount;
      rows.push({
        organizationId: orgId,
        expenseId,
        propertyId: expense.propertyId,
        sequenceNo: k,
        kind: "scheduled",
        dueDate: this.addMonthsClamped(expense.expenseDate, k - 1),
        plannedAmount: plannedAmount.toFixed(2),
        paidAmount: "0.00",
        currencyId: expense.currencyId ?? null,
        status: "pending",
        isActive: 1,
        createdBy: userId ?? null,
        createdAt: sql`CURRENT_TIMESTAMP` as any,
        updatedAt: sql`CURRENT_TIMESTAMP` as any,
      });
    }

    await this.db.insert(realEstateExpenseInstallments).values(rows);

    await this.db
      .update(realEstatePropertyExpenses)
      .set({ recurrenceMonths: n, paymentPlan: "installments", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstatePropertyExpenses.id, expenseId), eq(realEstatePropertyExpenses.organizationId, orgId)));

    await this.recalcExpenseSettlement(expenseId, orgId);
    return this.listExpenseInstallments(expenseId, orgId);
  }

  async addExpensePartialPayment(expenseId: number, input: AddExpensePartialPaymentDto, orgId: number, userId?: number) {
    const expense = await this.findActiveExpenseForOrg(expenseId, orgId);

    await this.db.insert(realEstateExpenseInstallments).values({
      organizationId: orgId,
      expenseId,
      propertyId: expense.propertyId,
      sequenceNo: 0,
      kind: "partial",
      dueDate: null,
      plannedAmount: "0.00",
      paidAmount: String(input.amount),
      paidDate: input.paidDate,
      currencyId: expense.currencyId ?? null,
      paymentMethod: input.paymentMethod ?? "cash",
      status: "paid",
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      isActive: 1,
      createdBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP` as any,
      updatedAt: sql`CURRENT_TIMESTAMP` as any,
    });

    await this.recalcExpenseSettlement(expenseId, orgId);
    return this.listExpenseInstallments(expenseId, orgId);
  }

  private async findActiveInstallmentForOrg(installmentId: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(realEstateExpenseInstallments)
      .where(and(
        eq(realEstateExpenseInstallments.id, installmentId),
        eq(realEstateExpenseInstallments.organizationId, orgId),
        eq(realEstateExpenseInstallments.isActive, 1),
      ))
      .limit(1);
    if (!row) throw new NotFoundException("Expense installment not found.");
    return row;
  }

  async payExpenseInstallment(installmentId: number, input: PayExpenseInstallmentDto, orgId: number) {
    const installment = await this.findActiveInstallmentForOrg(installmentId, orgId);
    const plannedAmount = Number(installment.plannedAmount ?? 0);
    const paidAmount = input.amount !== undefined ? input.amount : plannedAmount;
    const status = paidAmount >= plannedAmount ? "paid" : "partial";

    await this.db
      .update(realEstateExpenseInstallments)
      .set({
        paidAmount: paidAmount.toFixed(2),
        paidDate: input.paidDate,
        paymentMethod: input.paymentMethod ?? installment.paymentMethod,
        reference: input.reference ?? installment.reference,
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateExpenseInstallments.id, installmentId), eq(realEstateExpenseInstallments.organizationId, orgId)));

    await this.recalcExpenseSettlement(installment.expenseId, orgId);
    return this.listExpenseInstallments(installment.expenseId, orgId);
  }

  async updateExpenseInstallment(installmentId: number, input: UpdateExpenseInstallmentDto, orgId: number) {
    const installment = await this.findActiveInstallmentForOrg(installmentId, orgId);
    if (installment.status !== "pending") {
      throw new BadRequestException("Impossible de modifier une echeance deja reglee (status != pending).");
    }
    await this.db
      .update(realEstateExpenseInstallments)
      .set({
        ...this.pick(input, ["dueDate", "notes"]),
        ...(input.plannedAmount !== undefined ? { plannedAmount: input.plannedAmount.toFixed(2) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateExpenseInstallments.id, installmentId), eq(realEstateExpenseInstallments.organizationId, orgId)));
    return this.findActiveInstallmentForOrg(installmentId, orgId);
  }

  async deleteExpenseInstallment(installmentId: number, orgId: number) {
    const installment = await this.findActiveInstallmentForOrg(installmentId, orgId);
    await this.db
      .update(realEstateExpenseInstallments)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateExpenseInstallments.id, installmentId), eq(realEstateExpenseInstallments.organizationId, orgId)));
    await this.recalcExpenseSettlement(installment.expenseId, orgId);
    return { message: "Deleted successfully." };
  }

  async uploadExpenseInstallmentReceipt(installmentId: number, orgId: number, receipt?: any, publicApiBase?: string) {
    await this.findActiveInstallmentForOrg(installmentId, orgId);
    const receiptUrl = this.saveReceiptFile(receipt, publicApiBase);
    if (!receiptUrl) throw new BadRequestException("Aucun fichier reçu.");
    await this.db
      .update(realEstateExpenseInstallments)
      .set({ receiptUrl, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateExpenseInstallments.id, installmentId), eq(realEstateExpenseInstallments.organizationId, orgId)));
    return this.findActiveInstallmentForOrg(installmentId, orgId);
  }

  /**
   * Streame le justificatif (recu) d'une echeance de depense, apres
   * verification que cette echeance appartient a l'organisation du JWT
   * courant — meme pattern que paymentProofFile.
   */
  async expenseInstallmentReceiptFile(installmentId: number, orgId: number) {
    const installment = await this.findActiveInstallmentForOrg(installmentId, orgId);
    const receiptUrl = installment.receiptUrl;
    if (!receiptUrl) throw new NotFoundException("Justificatif introuvable.");
    return readValidatedUploadFile(this.uploadDir, extractStoredFileName(receiptUrl));
  }

  // ── Remboursements hypothecaires (SCRUM-311) ──────────────────────────────
  // Un paiement d hypotheque n est pas une charge a 100 pourcent : le capital
  // solde une dette (Liability), seuls les interets (+ escrow) sont des charges.
  // D ou une table et un posting ledger dedies, sans toucher aux depenses de
  // propriete (SCRUM-310).

  /** Compte de dette recevant le remboursement du capital. */
  private static readonly MORTGAGE_LIABILITY_ACCOUNT = "Emprunts hypothecaires";
  /** Compte de charge recevant la part interets. */
  private static readonly MORTGAGE_INTEREST_ACCOUNT = "Interets demprunt";
  /**
   * Compte de charge recevant l escrow (assurance / taxes avancees par le preteur).
   * Reutilise le compte canonique deja utilise par insurance / property_tax
   * (regroupement 0149), aucun nouveau compte n est cree.
   */
  private static readonly MORTGAGE_ESCROW_ACCOUNT = "Frais de bureau et divers";

  /**
   * Controle applicatif de l invariant total = capital + interets + escrow,
   * avec tolerance d arrondi (decimal(15,2)). Pas de contrainte CHECK en base.
   */
  private assertMortgageAmountsConsistent(total: number, principal: number, interest: number, escrow: number) {
    const sum = principal + interest + escrow;
    if (Math.abs(sum - total) > MORTGAGE_AMOUNT_TOLERANCE) {
      throw new BadRequestException(
        `Montants incoherents : capital (${principal}) + interets (${interest}) + escrow (${escrow}) = ${sum.toFixed(2)}, ` +
          `ce qui ne correspond pas au montant total (${total}). Corrigez la ventilation.`,
      );
    }
  }

  async listMortgagePayments(
    orgId: number,
    filters: { propertyId?: number; dateFrom?: string; dateTo?: string } = {},
  ) {
    const conditions = [
      eq(realEstateMortgagePayments.organizationId, orgId),
      eq(realEstateMortgagePayments.isActive, 1),
    ];
    if (filters.propertyId) conditions.push(eq(realEstateMortgagePayments.propertyId, filters.propertyId));
    if (filters.dateFrom) conditions.push(gte(realEstateMortgagePayments.paymentDate, filters.dateFrom));
    if (filters.dateTo) conditions.push(lte(realEstateMortgagePayments.paymentDate, filters.dateTo));

    return this.db
      .select({
        ...getTableColumns(realEstateMortgagePayments),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateMortgagePayments)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateMortgagePayments.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstateMortgagePayments.currencyId))
      .where(and(...conditions))
      .orderBy(desc(realEstateMortgagePayments.paymentDate), desc(realEstateMortgagePayments.id));
  }

  // ── Prets hypothecaires (SCRUM-311 phase 2) ─────────────────────────────────
  // Table de reference du pret (real_estate_mortgage_loans), distincte des
  // echeances payees (real_estate_mortgage_payments). Aucune ecriture
  // comptable ici : creer/modifier/supprimer un pret n'est qu'une donnee de
  // reference pour l'affichage du solde restant du, calcule applicativement a
  // partir des paiements deja poses par createMortgagePayment (inchange).
  private async attachMortgageBalances<T extends { id: number; principalAmount: string; currencyId: number | null }>(
    orgId: number,
    loans: T[],
  ) {
    if (!loans.length) return loans.map((loan) => ({ ...loan, principalRepaid: "0", remainingBalance: loan.principalAmount, otherCurrencyPayments: [] as any[] }));

    const loanIds = loans.map((l) => l.id);
    const paymentRows = await this.db
      .select({
        mortgageId: realEstateMortgagePayments.mortgageId,
        currencyId: realEstateMortgagePayments.currencyId,
        total: sql<string>`SUM(${realEstateMortgagePayments.principalAmount})`,
      })
      .from(realEstateMortgagePayments)
      .where(and(
        eq(realEstateMortgagePayments.organizationId, orgId),
        eq(realEstateMortgagePayments.isActive, 1),
        inArray(realEstateMortgagePayments.mortgageId, loanIds),
      ))
      .groupBy(realEstateMortgagePayments.mortgageId, realEstateMortgagePayments.currencyId);

    // Devises impliquees dans les paiements "autre devise" (jamais fusionnees
    // au solde principal — regle stricte, cf. incident "USD fantome").
    const otherCurrencyIds = Array.from(new Set(
      paymentRows
        .filter((row) => {
          const loan = loans.find((l) => l.id === Number(row.mortgageId));
          return loan && Number(row.currencyId) !== (loan.currencyId ?? null);
        })
        .map((row) => Number(row.currencyId))
        .filter((id) => !Number.isNaN(id)),
    ));
    const otherCurrencyRows = otherCurrencyIds.length
      ? await this.db
          .select({ id: currencies.id, currencyCode: currencies.currencyCode })
          .from(currencies)
          .where(inArray(currencies.id, otherCurrencyIds))
      : [];
    const otherCurrencyById = new Map(otherCurrencyRows.map((c) => [c.id, c.currencyCode]));

    return loans.map((loan) => {
      const rowsForLoan = paymentRows.filter((row) => Number(row.mortgageId) === loan.id);
      const sameCurrencyRow = rowsForLoan.find((row) => (row.currencyId ?? null) === (loan.currencyId ?? null));
      const principalRepaid = Number(sameCurrencyRow?.total ?? 0);
      const remainingBalance = Math.max(0, Number(loan.principalAmount) - principalRepaid);
      const otherCurrencyPayments = rowsForLoan
        .filter((row) => (row.currencyId ?? null) !== (loan.currencyId ?? null))
        .map((row) => ({
          currencyId: row.currencyId,
          currencyCode: row.currencyId ? otherCurrencyById.get(Number(row.currencyId)) ?? null : null,
          total: this.money(Number(row.total ?? 0)),
        }));
      return {
        ...loan,
        principalRepaid: this.money(principalRepaid),
        remainingBalance: this.money(remainingBalance),
        otherCurrencyPayments,
      };
    });
  }

  async listMortgageLoans(orgId: number, filters: { propertyId?: number; status?: string } = {}) {
    const conditions = [
      eq(realEstateMortgageLoans.organizationId, orgId),
      eq(realEstateMortgageLoans.isActive, 1),
    ];
    if (filters.propertyId) conditions.push(eq(realEstateMortgageLoans.propertyId, filters.propertyId));
    if (filters.status) conditions.push(eq(realEstateMortgageLoans.status, filters.status));

    const rows = await this.db
      .select({
        ...getTableColumns(realEstateMortgageLoans),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateMortgageLoans)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateMortgageLoans.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstateMortgageLoans.currencyId))
      .where(and(...conditions))
      .orderBy(desc(realEstateMortgageLoans.startDate), desc(realEstateMortgageLoans.id));

    return this.attachMortgageBalances(orgId, rows as any[]);
  }

  async getMortgageLoan(id: number, orgId: number) {
    const rows = await this.db
      .select({
        ...getTableColumns(realEstateMortgageLoans),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateMortgageLoans)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateMortgageLoans.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstateMortgageLoans.currencyId))
      .where(and(
        eq(realEstateMortgageLoans.id, id),
        eq(realEstateMortgageLoans.isActive, 1),
        eq(realEstateMortgageLoans.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Mortgage loan not found.");
    const [withBalance] = await this.attachMortgageBalances(orgId, rows as any[]);
    return withBalance;
  }

  async createMortgageLoan(input: CreateMortgageLoanDto, orgId: number, userId?: number) {
    await this.ensureActiveProperty(input.propertyId, orgId);
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    const [result] = await this.db.insert(realEstateMortgageLoans).values({
      organizationId: orgId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      lenderName: input.lenderName ?? null,
      reference: input.reference ?? null,
      principalAmount: String(input.principalAmount),
      currencyId: input.currencyId ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      interestRate: input.interestRate !== undefined ? String(input.interestRate) : null,
      termMonths: input.termMonths ?? null,
      status: input.status ?? "active",
      notes: input.notes ?? null,
      isActive: 1,
      createdBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const loanId = Number((result as any).insertId);

    // Rattachement des paiements orphelins existants (meme propriete/devise),
    // uniquement si explicitement demande : jamais automatique.
    if (input.attachExistingPayments === true) {
      await this.db
        .update(realEstateMortgagePayments)
        .set({ mortgageId: loanId, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(and(
          eq(realEstateMortgagePayments.organizationId, orgId),
          eq(realEstateMortgagePayments.propertyId, input.propertyId),
          eq(realEstateMortgagePayments.isActive, 1),
          isNull(realEstateMortgagePayments.mortgageId),
          input.currencyId !== undefined && input.currencyId !== null
            ? eq(realEstateMortgagePayments.currencyId, input.currencyId)
            : isNull(realEstateMortgagePayments.currencyId),
        ));
    }

    return this.getMortgageLoan(loanId, orgId);
  }

  async updateMortgageLoan(id: number, input: UpdateMortgageLoanDto, orgId: number) {
    await this.ensureOrgOwned(realEstateMortgageLoans, id, orgId, "Mortgage loan not found.");
    if (input.propertyId !== undefined) {
      await this.ensureActiveProperty(input.propertyId, orgId);
    }
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    await this.db
      .update(realEstateMortgageLoans)
      .set({
        ...this.pick(input, [
          "propertyId",
          "unitId",
          "lenderName",
          "reference",
          "currencyId",
          "endDate",
          "termMonths",
          "status",
          "notes",
        ]),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.principalAmount !== undefined ? { principalAmount: String(input.principalAmount) } : {}),
        ...(input.interestRate !== undefined ? { interestRate: String(input.interestRate) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateMortgageLoans.id, id), eq(realEstateMortgageLoans.organizationId, orgId)));
    return this.getMortgageLoan(id, orgId);
  }

  async deleteMortgageLoan(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstateMortgageLoans, id, orgId, "Mortgage loan not found.");
    // Soft delete uniquement : pas de DELETE physique, historique des paiements preserve.
    await this.db
      .update(realEstateMortgageLoans)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMortgageLoans.id, id), eq(realEstateMortgageLoans.organizationId, orgId)));
    return { message: "Deleted successfully." };
  }

  // ── P&L par propriete (SCRUM-312) ─────────────────────────────────────────
  // Pas de migration : agregation en memoire sur les 3 tables metier
  // existantes (loyers via bail->propriete, depenses, hypotheque). Les loyers
  // ne sont pas tagues par project_id (contrairement aux depenses/hypotheque),
  // donc pas de passage par le ledger ici - chantier separe, hors scope.
  async getPropertyPnl(
    propertyId: number,
    orgId: number,
    scope: DomusPropertyScope,
    filters: { dateFrom?: string; dateTo?: string } = {},
  ) {
    if (scope !== "all" && !scope.includes(propertyId)) {
      throw new NotFoundException("Property not found.");
    }

    const propertyRows = await this.db
      .select({ id: realEstateProperties.id, name: realEstateProperties.name })
      .from(realEstateProperties)
      .where(and(
        eq(realEstateProperties.id, propertyId),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateProperties.organizationId, orgId),
      ))
      .limit(1);
    if (!propertyRows.length) {
      throw new NotFoundException("Property not found.");
    }
    const property = propertyRows[0];

    const defaultCurrencyId = await this.resolveDefaultCurrency(orgId);

    // Revenus : loyers de ce bien via le bail, meme filtre que l ecran Loyers
    // existant (baux annules exclus), agreges par devise.
    const rentConditions = [
      ne(paymentLease.status, "cancelled"),
      eq(paymentLease.propertyId, propertyId),
      eq(realEstateRentPayments.organizationId, orgId),
      eq(realEstateRentPayments.status, "paid"),
    ];
    if (filters.dateFrom) rentConditions.push(gte(realEstateRentPayments.paymentDate, filters.dateFrom));
    if (filters.dateTo) rentConditions.push(lte(realEstateRentPayments.paymentDate, filters.dateTo));

    const rentRows = await this.db
      .select({
        currencyId: realEstateRentPayments.currencyId,
        total: sql<string>`SUM(${realEstateRentPayments.amount})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(realEstateRentPayments)
      .leftJoin(paymentLease, eq(paymentLease.id, realEstateRentPayments.leaseId))
      .where(and(...rentConditions))
      .groupBy(realEstateRentPayments.currencyId);

    // Depenses actives de ce bien, reutilise le meme filtre que SCRUM-310.
    const expenseRows = await this.listPropertyExpenses(orgId, {
      propertyId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    // Hypotheque active de ce bien, reutilise le meme filtre que SCRUM-311.
    const mortgageRows = await this.listMortgagePayments(orgId, {
      propertyId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });

    // Merge en memoire par devise. currencyId NULL -> devise par defaut de
    // l org (jamais fusionne silencieusement avec une devise reelle existante,
    // cf. incident "USD fantome").
    const resolveCurrencyId = (id: number | null | undefined) => id ?? defaultCurrencyId ?? null;

    type Bucket = {
      currencyId: number | null;
      revenueRent: number;
      revenueCount: number;
      expensesTotal: number;
      expensesCount: number;
      expensesByCategory: Map<string, number>;
      mortgageInterest: number;
      mortgagePrincipal: number;
      mortgageEscrow: number;
      mortgageCount: number;
    };
    const buckets = new Map<number | null, Bucket>();
    const getBucket = (currencyId: number | null) => {
      let bucket = buckets.get(currencyId);
      if (!bucket) {
        bucket = {
          currencyId,
          revenueRent: 0,
          revenueCount: 0,
          expensesTotal: 0,
          expensesCount: 0,
          expensesByCategory: new Map(),
          mortgageInterest: 0,
          mortgagePrincipal: 0,
          mortgageEscrow: 0,
          mortgageCount: 0,
        };
        buckets.set(currencyId, bucket);
      }
      return bucket;
    };

    for (const row of rentRows) {
      const bucket = getBucket(resolveCurrencyId(row.currencyId as number | null));
      bucket.revenueRent += Number(row.total ?? 0);
      bucket.revenueCount += Number(row.count ?? 0);
    }

    for (const row of expenseRows as any[]) {
      const bucket = getBucket(resolveCurrencyId(row.currencyId));
      const amount = Number(row.amount ?? 0);
      bucket.expensesTotal += amount;
      bucket.expensesCount += 1;
      const category = row.category ?? "other";
      bucket.expensesByCategory.set(category, (bucket.expensesByCategory.get(category) ?? 0) + amount);
    }

    for (const row of mortgageRows as any[]) {
      const bucket = getBucket(resolveCurrencyId(row.currencyId));
      bucket.mortgageInterest += Number(row.interestAmount ?? 0);
      bucket.mortgagePrincipal += Number(row.principalAmount ?? 0);
      bucket.mortgageEscrow += Number(row.escrowAmount ?? 0);
      bucket.mortgageCount += 1;
    }

    const currencyIds = Array.from(buckets.keys()).filter((id): id is number => id !== null);
    const currencyRows = currencyIds.length
      ? await this.db
          .select({
            id: currencies.id,
            currencyCode: currencies.currencyCode,
            currencyName: currencies.currencyName,
            currencySymbol: currencies.currencySymbol,
          })
          .from(currencies)
          .where(inArray(currencies.id, currencyIds))
      : [];
    const currencyById = new Map(currencyRows.map((c) => [c.id, c]));

    const byCurrency = Array.from(buckets.values()).map((bucket) => {
      const currency = bucket.currencyId !== null ? currencyById.get(bucket.currencyId) : undefined;
      const netIncome = bucket.revenueRent - bucket.expensesTotal - bucket.mortgageInterest;
      return {
        currencyId: bucket.currencyId,
        currencyCode: currency?.currencyCode ?? null,
        currencyName: currency?.currencyName ?? null,
        currencySymbol: currency?.currencySymbol ?? null,
        revenue: {
          rent: this.money(bucket.revenueRent),
          count: bucket.revenueCount,
        },
        expenses: {
          total: this.money(bucket.expensesTotal),
          count: bucket.expensesCount,
          byCategory: Array.from(bucket.expensesByCategory.entries()).map(([category, amount]) => ({
            category,
            amount: this.money(amount),
          })),
        },
        mortgage: {
          interest: this.money(bucket.mortgageInterest),
          count: bucket.mortgageCount,
          principal: this.money(bucket.mortgagePrincipal),
          escrow: this.money(bucket.mortgageEscrow),
        },
        netIncome: this.money(netIncome),
      };
    });

    return {
      propertyId: property.id,
      propertyName: property.name,
      dateFrom: filters.dateFrom ?? null,
      dateTo: filters.dateTo ?? null,
      byCurrency,
    };
  }

  async getMortgagePayment(id: number, orgId: number) {
    const rows = await this.db
      .select({
        ...getTableColumns(realEstateMortgagePayments),
        propertyName: realEstateProperties.name,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateMortgagePayments)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateMortgagePayments.propertyId))
      .leftJoin(currencies, eq(currencies.id, realEstateMortgagePayments.currencyId))
      .where(and(
        eq(realEstateMortgagePayments.id, id),
        eq(realEstateMortgagePayments.isActive, 1),
        eq(realEstateMortgagePayments.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Mortgage payment not found.");
    return rows[0];
  }

  async createMortgagePayment(input: CreateMortgagePaymentDto, orgId: number, userId?: number) {
    await this.ensureActiveProperty(input.propertyId, orgId);
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    const total = Number(input.totalAmount);
    const principal = Number(input.principalAmount);
    const interest = Number(input.interestAmount);
    const escrow = Number(input.escrowAmount ?? 0);
    this.assertMortgageAmountsConsistent(total, principal, interest, escrow);

    const projectId = await this.getOrCreatePropertyProject(input.propertyId, orgId, userId);

    const [result] = await this.db.insert(realEstateMortgagePayments).values({
      organizationId: orgId,
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      mortgageId: input.mortgageId ?? null,
      lenderName: input.lenderName ?? null,
      paymentDate: input.paymentDate,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      totalAmount: String(total),
      principalAmount: String(principal),
      interestAmount: String(interest),
      escrowAmount: String(escrow),
      currencyId: input.currencyId ?? null,
      paymentMethod: input.paymentMethod ?? "bank",
      paymentStatus: input.paymentStatus ?? "paid",
      reference: input.reference ?? null,
      receiptUrl: input.receiptUrl ?? null,
      projectId,
      notes: input.notes ?? null,
      isActive: 1,
      createdBy: userId ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    const paymentId = Number((result as any).insertId);

    // Ecriture comptable : DEBIT dette (capital) + DEBIT charge (interets)
    // [+ DEBIT charge (escrow)] / CREDIT tresorerie pour le total.
    const paymentMethod = input.paymentMethod ?? "bank";
    const creditId = paymentMethod === "bank" ? 2 : 1; // 2=Bank, 1=Cash
    const liabilityId = await this.getOrCreateLiabilitySubAccount(
      PropertyManagementService.MORTGAGE_LIABILITY_ACCOUNT,
      orgId,
    );
    const interestId = await this.getOrCreateExpenseSubAccount(
      PropertyManagementService.MORTGAGE_INTEREST_ACCOUNT,
      orgId,
    );

    const lines: Array<{
      accountId: number;
      side: "DEBIT" | "CREDIT";
      amount: number;
      description: string;
      projectId?: number;
    }> = [
      { accountId: liabilityId, side: "DEBIT", amount: principal, description: "Mortgage principal", projectId: projectId ?? undefined },
      { accountId: interestId, side: "DEBIT", amount: interest, description: "Mortgage interest", projectId: projectId ?? undefined },
    ];
    if (escrow > 0) {
      const escrowId = await this.getOrCreateExpenseSubAccount(
        PropertyManagementService.MORTGAGE_ESCROW_ACCOUNT,
        orgId,
      );
      lines.push({ accountId: escrowId, side: "DEBIT", amount: escrow, description: "Mortgage escrow", projectId: projectId ?? undefined });
    }
    // Pas de projectId sur la ligne de tresorerie (identique a createPropertyExpense).
    lines.push({ accountId: creditId, side: "CREDIT", amount: total, description: paymentMethod === "bank" ? "Bank" : "Cash" });

    let journalEntryId: number | null = null;
    try {
      const posted = await this.ledger.post(
        {
          date: input.paymentDate,
          reference: `MORTPAY-${paymentId}`,
          particulars: `Echeance hypothecaire${input.lenderName ? ` — ${input.lenderName}` : ""}`,
          sourceModule: "mortgage_payment",
          relatedId: String(paymentId),
          currencyId: input.currencyId ?? undefined,
          idempotencyKey: `mortgage-payment:${paymentId}`,
          lines,
        },
        orgId,
        userId,
      );
      journalEntryId = posted?.id ? Number(posted.id) : null;
    } catch (err) {
      this.logger.warn(`createMortgagePayment: ecriture ledger ignoree: ${(err as Error).message}`);
    }

    if (journalEntryId) {
      await this.db
        .update(realEstateMortgagePayments)
        .set({ journalEntryId, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(realEstateMortgagePayments.id, paymentId));
    }

    // Soumet au circuit d approbation des depenses (effectif si gate active).
    try {
      await this.workflow.submit(
        { workflowKey: "exp_approval", entityType: "mortgage_payment", entityId: String(paymentId) },
        orgId,
      );
    } catch (err) {
      console.warn("[Domus] submit mortgage payment approval skipped:", (err as Error).message);
    }

    return this.getMortgagePayment(paymentId, orgId);
  }

  async updateMortgagePayment(id: number, input: UpdateMortgagePaymentDto, orgId: number) {
    await this.ensureOrgOwned(realEstateMortgagePayments, id, orgId, "Mortgage payment not found.");
    const current = await this.getMortgagePayment(id, orgId);
    if (input.propertyId !== undefined) {
      await this.ensureActiveProperty(input.propertyId, orgId);
    }
    if (input.unitId) {
      await this.ensureActiveUnit(input.unitId, orgId);
    }

    // L invariant est reverifie sur l etat resultant (valeurs fournies fusionnees
    // avec les valeurs en base), pour qu un update partiel ne casse pas la ventilation.
    const total = input.totalAmount !== undefined ? Number(input.totalAmount) : Number(current.totalAmount);
    const principal = input.principalAmount !== undefined ? Number(input.principalAmount) : Number(current.principalAmount);
    const interest = input.interestAmount !== undefined ? Number(input.interestAmount) : Number(current.interestAmount);
    const escrow = input.escrowAmount !== undefined ? Number(input.escrowAmount) : Number(current.escrowAmount);
    this.assertMortgageAmountsConsistent(total, principal, interest, escrow);

    await this.db
      .update(realEstateMortgagePayments)
      .set({
        ...this.pick(input, [
          "propertyId",
          "unitId",
          "mortgageId",
          "lenderName",
          "periodStart",
          "periodEnd",
          "currencyId",
          "paymentMethod",
          "paymentStatus",
          "reference",
          "receiptUrl",
          "notes",
        ]),
        ...(input.paymentDate !== undefined ? { paymentDate: input.paymentDate } : {}),
        ...(input.totalAmount !== undefined ? { totalAmount: String(total) } : {}),
        ...(input.principalAmount !== undefined ? { principalAmount: String(principal) } : {}),
        ...(input.interestAmount !== undefined ? { interestAmount: String(interest) } : {}),
        ...(input.escrowAmount !== undefined ? { escrowAmount: String(escrow) } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(realEstateMortgagePayments.id, id), eq(realEstateMortgagePayments.organizationId, orgId)));
    return this.getMortgagePayment(id, orgId);
  }

  async deleteMortgagePayment(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstateMortgagePayments, id, orgId, "Mortgage payment not found.");
    // Soft delete uniquement : l ecriture comptable liee reste tracable.
    await this.db
      .update(realEstateMortgagePayments)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMortgagePayments.id, id), eq(realEstateMortgagePayments.organizationId, orgId)));
    return { message: "Deleted successfully." };
  }

  async uploadMortgagePaymentReceipt(id: number, orgId: number, receipt?: any, publicApiBase?: string) {
    await this.ensureOrgOwned(realEstateMortgagePayments, id, orgId, "Mortgage payment not found.");
    const receiptUrl = this.saveReceiptFile(receipt, publicApiBase);
    if (!receiptUrl) throw new BadRequestException("Aucun fichier reçu.");
    await this.db
      .update(realEstateMortgagePayments)
      .set({ receiptUrl, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMortgagePayments.id, id), eq(realEstateMortgagePayments.organizationId, orgId)));
    return this.getMortgagePayment(id, orgId);
  }

  /**
   * Streame le justificatif (recu) d'un remboursement hypothecaire, apres
   * verification que ce paiement appartient a l'organisation du JWT courant
   * — meme pattern que paymentProofFile.
   */
  async mortgagePaymentReceiptFile(id: number, orgId: number) {
    await this.ensureOrgOwned(realEstateMortgagePayments, id, orgId, "Mortgage payment not found.");
    const [row] = await this.db
      .select({ receiptUrl: realEstateMortgagePayments.receiptUrl })
      .from(realEstateMortgagePayments)
      .where(and(eq(realEstateMortgagePayments.id, id), eq(realEstateMortgagePayments.organizationId, orgId)))
      .limit(1);
    const receiptUrl = row?.receiptUrl;
    if (!receiptUrl) throw new NotFoundException("Justificatif introuvable.");
    return readValidatedUploadFile(this.uploadDir, extractStoredFileName(receiptUrl));
  }

  // ── Maintenance Photos (miroir de propertyPhotos, liees a ticketId) ────────

  private static readonly MAINTENANCE_PHOTO_TYPES = ["before", "after", "invoice"] as const;

  private normalizeMaintenancePhotoType(value: unknown): "before" | "after" | "invoice" {
    const v = String(value ?? "").trim().toLowerCase();
    return (PropertyManagementService.MAINTENANCE_PHOTO_TYPES as readonly string[]).includes(v)
      ? (v as "before" | "after" | "invoice")
      : "before";
  }

  async maintenancePhotos(ticketId: number, orgId: number) {
    await this.findMaintenance(ticketId, orgId);
    const rows = await this.db
      .select({
        id: realEstateMaintenancePhotos.id,
        organizationId: realEstateMaintenancePhotos.organizationId,
        ticketId: realEstateMaintenancePhotos.ticketId,
        photoType: realEstateMaintenancePhotos.photoType,
        bucket: realEstateMaintenancePhotos.bucket,
        objectKey: realEstateMaintenancePhotos.objectKey,
        originalName: realEstateMaintenancePhotos.originalName,
        mimeType: realEstateMaintenancePhotos.mimeType,
        sizeBytes: realEstateMaintenancePhotos.sizeBytes,
        isPrimary: realEstateMaintenancePhotos.isPrimary,
        sortOrder: realEstateMaintenancePhotos.sortOrder,
        createdAt: realEstateMaintenancePhotos.createdAt,
      })
      .from(realEstateMaintenancePhotos)
      .where(and(
        eq(realEstateMaintenancePhotos.organizationId, orgId),
        eq(realEstateMaintenancePhotos.ticketId, ticketId),
        eq(realEstateMaintenancePhotos.isActive, 1),
      ))
      .orderBy(desc(realEstateMaintenancePhotos.isPrimary), realEstateMaintenancePhotos.sortOrder, desc(realEstateMaintenancePhotos.id));

    return rows.map((row) => this.maintenancePhotoResponse(row));
  }

  async uploadMaintenancePhoto(ticketId: number, file: any, orgId: number, photoType?: string) {
    await this.findMaintenance(ticketId, orgId);
    const type = this.normalizeMaintenancePhotoType(photoType);

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(realEstateMaintenancePhotos)
      .where(and(
        eq(realEstateMaintenancePhotos.organizationId, orgId),
        eq(realEstateMaintenancePhotos.ticketId, ticketId),
        eq(realEstateMaintenancePhotos.isActive, 1),
      ));
    const count = Number(countRow?.count || 0);
    const stored = await this.objectStorage.putImage(file, `domus/maintenance/${orgId}/${ticketId}`);
    const [result] = await this.db.insert(realEstateMaintenancePhotos).values({
      organizationId: orgId,
      ticketId,
      photoType: type,
      bucket: stored.bucket,
      objectKey: stored.objectKey,
      originalName: file?.originalname ? String(file.originalname).slice(0, 255) : null,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      isPrimary: count === 0 ? 1 : 0,
      sortOrder: count,
      isActive: 1,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const photo = await this.findMaintenancePhoto(Number(result.insertId), orgId);
    return this.maintenancePhotoResponse(photo);
  }

  async deleteMaintenancePhoto(photoId: number, orgId: number) {
    const photo = await this.findMaintenancePhoto(photoId, orgId);
    await this.objectStorage.deleteObject(photo.objectKey);
    await this.db
      .update(realEstateMaintenancePhotos)
      .set({ isActive: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(realEstateMaintenancePhotos.id, photoId), eq(realEstateMaintenancePhotos.organizationId, orgId)));

    if (Number(photo.isPrimary) === 1) {
      const [next] = await this.db
        .select({ id: realEstateMaintenancePhotos.id })
        .from(realEstateMaintenancePhotos)
        .where(and(
          eq(realEstateMaintenancePhotos.organizationId, orgId),
          eq(realEstateMaintenancePhotos.ticketId, photo.ticketId),
          eq(realEstateMaintenancePhotos.isActive, 1),
        ))
        .orderBy(realEstateMaintenancePhotos.sortOrder, desc(realEstateMaintenancePhotos.id))
        .limit(1);
      if (next) {
        await this.db
          .update(realEstateMaintenancePhotos)
          .set({ isPrimary: 1, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(realEstateMaintenancePhotos.id, next.id));
      }
    }

    return { message: "Photo supprimee." };
  }

  async maintenancePhotoFile(photoId: number, orgId: number) {
    const photo = await this.findMaintenancePhoto(photoId, orgId);
    const object = await this.objectStorage.getObject(photo.objectKey);
    return {
      ...object,
      originalName: photo.originalName || `maintenance-photo-${photo.id}`,
      mimeType: photo.mimeType,
    };
  }

  private async findMaintenancePhoto(photoId: number, orgId: number) {
    const rows = await this.db
      .select({
        id: realEstateMaintenancePhotos.id,
        organizationId: realEstateMaintenancePhotos.organizationId,
        ticketId: realEstateMaintenancePhotos.ticketId,
        photoType: realEstateMaintenancePhotos.photoType,
        bucket: realEstateMaintenancePhotos.bucket,
        objectKey: realEstateMaintenancePhotos.objectKey,
        originalName: realEstateMaintenancePhotos.originalName,
        mimeType: realEstateMaintenancePhotos.mimeType,
        sizeBytes: realEstateMaintenancePhotos.sizeBytes,
        isPrimary: realEstateMaintenancePhotos.isPrimary,
        sortOrder: realEstateMaintenancePhotos.sortOrder,
        createdAt: realEstateMaintenancePhotos.createdAt,
      })
      .from(realEstateMaintenancePhotos)
      .where(and(
        eq(realEstateMaintenancePhotos.id, photoId),
        eq(realEstateMaintenancePhotos.organizationId, orgId),
        eq(realEstateMaintenancePhotos.isActive, 1),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Photo introuvable.");
    return rows[0];
  }

  private maintenancePhotoResponse(row: {
    id: number;
    ticketId: number;
    photoType?: string | null;
    originalName?: string | null;
    mimeType: string;
    sizeBytes: number;
    isPrimary: number;
    sortOrder: number;
    createdAt?: Date | string | null;
  }) {
    return {
      id: row.id,
      ticketId: row.ticketId,
      photoType: row.photoType || "before",
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes || 0),
      isPrimary: Number(row.isPrimary) === 1,
      sortOrder: Number(row.sortOrder || 0),
      createdAt: row.createdAt,
    };
  }

  /**
   * Photo pour l'envoi WhatsApp a la resolution du ticket : priorite a la photo
   * "after" (etat apres travaux) la plus recente, sinon repli sur la derniere
   * photo disponible tous types confondus (comportement historique).
   */
  private async latestMaintenancePhoto(ticketId: number, orgId: number) {
    const base = () =>
      this.db
        .select({
          id: realEstateMaintenancePhotos.id,
          objectKey: realEstateMaintenancePhotos.objectKey,
          mimeType: realEstateMaintenancePhotos.mimeType,
        })
        .from(realEstateMaintenancePhotos);

    const [afterRow] = await base()
      .where(and(
        eq(realEstateMaintenancePhotos.organizationId, orgId),
        eq(realEstateMaintenancePhotos.ticketId, ticketId),
        eq(realEstateMaintenancePhotos.isActive, 1),
        eq(realEstateMaintenancePhotos.photoType, "after"),
      ))
      .orderBy(desc(realEstateMaintenancePhotos.isPrimary), desc(realEstateMaintenancePhotos.id))
      .limit(1);
    if (afterRow) return afterRow;

    const [anyRow] = await base()
      .where(and(
        eq(realEstateMaintenancePhotos.organizationId, orgId),
        eq(realEstateMaintenancePhotos.ticketId, ticketId),
        eq(realEstateMaintenancePhotos.isActive, 1),
      ))
      .orderBy(desc(realEstateMaintenancePhotos.isPrimary), desc(realEstateMaintenancePhotos.id))
      .limit(1);
    return anyRow ?? null;
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
    const { tokenHash: _tokenHash, token, smsSid: _smsSid, ...payload } = onboarding;
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
        signingCity: realEstateLeases.signingCity,
        status: realEstateLeases.status,
        taxName: realEstateLeases.taxName,
        taxType: realEstateLeases.taxType,
        taxValue: realEstateLeases.taxValue,
        taxApplyMode: realEstateLeases.taxApplyMode,
        // Trace du preavis pour defaut de paiement : la page Loyers s'en sert
        // pour afficher la date du dernier preavis notifie sur ce bail.
        defaultNoticeSentAt: realEstateLeases.defaultNoticeSentAt,
        defaultNoticeMonthsBehind: realEstateLeases.defaultNoticeMonthsBehind,
        propertyName: leaseProperty.name,
        propertyAddress: leaseProperty.address,
        unitName: leaseUnit.name,
        tenantFirstName: customers.firstName,
        tenantLastName: customers.lastName,
        tenantPhone: customers.phone,
        tenantEmail: customers.email,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateLeases)
      .leftJoin(leaseProperty, eq(leaseProperty.id, realEstateLeases.propertyId))
      .leftJoin(leaseUnit, eq(leaseUnit.id, realEstateLeases.unitId))
      .leftJoin(customers, eq(customers.id, realEstateLeases.tenantId))
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId));
  }

  // Retard historique par bail (badge "Mauvais payeur" côté front) :
  // dérive les échéances mensuelles (billingCycle) depuis startDate jusqu'à
  // aujourd'hui (bornées à endDate), rapproche par ordre chronologique avec
  // les paiements du bail, délai de grâce 5 jours. Batch les paiements par
  // leaseId en une seule requête (pas de N+1).
  private static readonly OVERDUE_GRACE_DAYS = 5;

  private async withOverdueStats<T extends { id: number; startDate: string; endDate: string | null; billingCycle: string | null; status: string }>(
    rows: T[],
  ): Promise<Array<T & { lateCount: number; dueCount: number; lateRatio: number; isOverdue: boolean; overdueDueDate: string | null }>> {
    if (!rows.length) return [];
    const leaseIds = rows.map((r) => r.id);
    const payments = await this.db
      .select({
        leaseId: realEstateRentPayments.leaseId,
        paymentDate: realEstateRentPayments.paymentDate,
      })
      .from(realEstateRentPayments)
      .where(and(
        inArray(realEstateRentPayments.leaseId, leaseIds),
        eq(realEstateRentPayments.status, "paid"),
      ))
      .orderBy(realEstateRentPayments.paymentDate);

    const paymentsByLease = new Map<number, string[]>();
    for (const p of payments) {
      const list = paymentsByLease.get(p.leaseId) ?? [];
      list.push(p.paymentDate);
      paymentsByLease.set(p.leaseId, list);
    }

    const today = this.parseDateOnly(this.formatDateOnly(new Date()));
    return rows.map((row) => {
      const stats = this.computeLeaseOverdueStats(
        row.startDate,
        row.endDate,
        row.billingCycle,
        paymentsByLease.get(row.id) ?? [],
        today,
      );
      return { ...row, ...stats };
    });
  }

  // Dérive les échéances mensuelles depuis startDate jusqu'à today (bornées à
  // endDate si présent) et rapproche avec les paiements par ordre chronologique :
  // une échéance est couverte par le 1er paiement non encore consommé dont la
  // paymentDate correspond au mois de l'échéance. Retard si payé >5j après
  // l'échéance, ou dépassée de >5j et toujours non couverte.
  private computeLeaseOverdueStats(
    startDate: string,
    endDate: string | null,
    billingCycle: string | null,
    paymentDates: string[],
    today: Date,
  ): { lateCount: number; dueCount: number; lateRatio: number; isOverdue: boolean; overdueDueDate: string | null } {
    const start = this.parseDateOnly(startDate);
    const boundary = endDate ? this.parseDateOnly(endDate) : null;
    const payments = paymentDates.map((d) => this.parseDateOnly(d));
    const usedPaymentIndexes = new Set<number>();

    let dueCount = 0;
    let lateCount = 0;
    let isOverdue = false;
    // Date de la 1ere echeance non couverte en retard (affichee au front a la
    // place de nextInvoiceDate quand isOverdue=true, qui peut deja pointer sur
    // une echeance future si le total paye couvre la fenetre sans rapprochement
    // mois par mois - voir advanceLeaseInvoiceDateIfCovered).
    let overdueDueDate: string | null = null;
    // Chaque échéance est ancrée sur `start` + N cycles (et non chaînée sur la
    // date précédente) pour éviter que le clamp fin-de-mois (ex. 31 -> 28 en
    // février) ne fige les échéances suivantes sur le jour raboté.
    let period = 0;
    let dueDate = start;

    while (dueDate.getTime() <= today.getTime() && (!boundary || dueDate.getTime() <= boundary.getTime())) {
      dueCount += 1;

      // 1er paiement non consommé du même mois/année que l'échéance.
      const matchIndex = payments.findIndex(
        (p, idx) =>
          !usedPaymentIndexes.has(idx) &&
          p.getUTCFullYear() === dueDate.getUTCFullYear() &&
          p.getUTCMonth() === dueDate.getUTCMonth(),
      );

      if (matchIndex >= 0) {
        usedPaymentIndexes.add(matchIndex);
        const paidAt = payments[matchIndex];
        const graceLimit = new Date(dueDate.getTime());
        graceLimit.setUTCDate(graceLimit.getUTCDate() + PropertyManagementService.OVERDUE_GRACE_DAYS);
        if (paidAt.getTime() > graceLimit.getTime()) {
          lateCount += 1;
        }
      } else {
        const graceLimit = new Date(dueDate.getTime());
        graceLimit.setUTCDate(graceLimit.getUTCDate() + PropertyManagementService.OVERDUE_GRACE_DAYS);
        if (today.getTime() > graceLimit.getTime()) {
          lateCount += 1;
          isOverdue = true;
          if (overdueDueDate === null) overdueDueDate = this.formatDateOnly(dueDate);
        }
      }

      period += 1;
      dueDate = this.addBillingCycle(start, billingCycle, period);
    }

    return {
      lateCount,
      dueCount,
      lateRatio: dueCount > 0 ? lateCount / dueCount : 0,
      isOverdue,
      overdueDueDate,
    };
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
    // On ignore les locataires soft-deletes (status='false') : un email libere
    // par une suppression logique doit pouvoir etre reutilise.
    const rows = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.email, email), eq(customers.status, "true")))
      .limit(1);
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
    // Codes canoniques (voir migration 0207) ; on tolère les anciennes valeurs FR legacy par sécurité.
    return ["married", "common_law", "marié", "marie", "conjoint de fait", "union libre"].includes(
      String(value ?? "").trim().toLowerCase(),
    );
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

  private async ensureActiveUnitInProperty(id: number, propertyId: number, orgId: number) {
    const rows = await this.db
      .select({ id: realEstateUnits.id })
      .from(realEstateUnits)
      .leftJoin(realEstateProperties, eq(realEstateProperties.id, realEstateUnits.propertyId))
      .where(and(
        eq(realEstateUnits.id, id),
        eq(realEstateUnits.propertyId, propertyId),
        ne(realEstateUnits.status, "false"),
        eq(realEstateUnits.isActive, 1),
        ne(realEstateProperties.status, "false"),
        eq(realEstateProperties.isActive, 1),
        eq(realEstateUnits.organizationId, orgId),
      ))
      .limit(1);
    if (!rows.length) {
      throw new BadRequestException("Cette unite n'appartient pas au bien selectionne.");
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

  /** Geocode best-effort une adresse de bien (Nominatim) ; ne jamais throw. */
  private async geocodePropertyAddress(
    address?: string | null,
    city?: string | null,
    country?: string | null,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const query = this.geocoding.buildQuery(address, city, country);
    if (!query) return null;
    try {
      return await this.geocoding.geocode(query);
    } catch {
      return null;
    }
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

  private addBillingCycle(value: Date, billingCycle?: string | null, periods = 1) {
    const next = new Date(value.getTime());
    const normalized = String(billingCycle || "monthly").toLowerCase();
    const months =
      normalized === "yearly" || normalized === "annual" ? 12 :
      normalized === "quarterly" ? 3 :
      1;
    // On fixe le jour à 1 avant le décalage de mois pour éviter le débordement
    // (ex. 31 janv + 1 mois -> 3 mars) puis on cale sur le jour d'origine borné
    // au dernier jour du mois cible (28/29/30). Sans ça, les échéances d'un bail
    // dont startDate tombe en fin de mois dérivent et faussent lateCount/dueCount.
    const day = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + months * periods);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
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
