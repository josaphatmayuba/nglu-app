import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { env } from "../../config/env";
import { readOrgAppSetting } from "../../app-settings/org-app-setting";
import { DRIZZLE } from "../../database/database.constants";
import {
  appSettings,
  currencies,
  customers,
  domusOrgSettings,
  prescreeningConsentTexts,
  tenantOnboardings,
  tenantPrescreeningConsents,
  tenantPrescreeningReferences,
  tenantPrescreenings,
} from "../../database/schema";
import type { Database } from "../../database/types";
import { normalizePhoneE164 } from "../../common/phone.util";
import { CompatService } from "../../compat/compat.service";
import { OwnerNotificationsService } from "../owner-notifications.service";
import { SystemEmailService } from "../../system-email/system-email.service";
import {
  AddPrescreeningReferenceDto,
  CreatePrescreeningInviteDto,
  DecidePrescreeningDto,
  PRESCREENING_DECISION_REASON_CODES,
  RecordPrescreeningConsentDto,
  SavePrescreeningDraftDto,
  UpdateReferenceContactDto,
} from "./dto/tenant-prescreening.dto";

// Champs sensibles jamais renvoyés par l'API (public ni interne) — même garde-fou
// que adminOnboardingResponse dans property-management.service.ts.
const SENSITIVE_FIELDS = ["tokenHash", "token"] as const;

@Injectable()
export class TenantPrescreeningService {
  private readonly logger = new Logger(TenantPrescreeningService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly emails: SystemEmailService,
    private readonly sms: CompatService,
    private readonly ownerNotifications: OwnerNotificationsService,
  ) {}

  // ---------------------------------------------------------------------
  // Activation par organisation (défaut = désactivé, aucune ligne = false)
  // ---------------------------------------------------------------------
  async isEnabledForOrg(organizationId: number): Promise<boolean> {
    const rows = await this.db
      .select({ prescreeningEnabled: domusOrgSettings.prescreeningEnabled })
      .from(domusOrgSettings)
      .where(eq(domusOrgSettings.organizationId, organizationId))
      .limit(1);
    if (!rows.length) return false;
    return rows[0].prescreeningEnabled === true || Number(rows[0].prescreeningEnabled) === 1;
  }

  private async assertEnabledOrNotFound(organizationId: number) {
    const enabled = await this.isEnabledForOrg(organizationId);
    if (!enabled) throw new NotFoundException("Not found.");
  }

  private async getRetentionMonths(organizationId: number): Promise<number> {
    const rows = await this.db
      .select({ retentionMonthsRejected: domusOrgSettings.retentionMonthsRejected })
      .from(domusOrgSettings)
      .where(eq(domusOrgSettings.organizationId, organizationId))
      .limit(1);
    return rows[0]?.retentionMonthsRejected ?? 6;
  }

  // ---------------------------------------------------------------------
  // Création / invitation
  // ---------------------------------------------------------------------
  async createInvite(organizationId: number, dto: CreatePrescreeningInviteDto) {
    await this.assertEnabledOrNotFound(organizationId);

    const phone = normalizePhoneE164(dto.phone) || dto.phone;
    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + (dto.expiresInDays ?? 7) * 24 * 60 * 60 * 1000);
    const reference = `PSC-${Date.now().toString(36).toUpperCase()}`;

    const [result] = await this.db.insert(tenantPrescreenings).values({
      organizationId,
      propertyId: dto.propertyId ?? null,
      unitId: dto.unitId ?? null,
      reference,
      tokenHash,
      token,
      status: "sent",
      phone,
      email: dto.email ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      expiresAt,
    });
    const id = Number((result as any).insertId);

    // Notification best-effort : réutilise les mêmes services que l'onboarding
    // (CompatService.sendSms / SystemEmailService), pas de nouvelle intégration.
    const url = this.prescreeningUrl(token);
    // Texte pilote depuis Reglages > Messages (evenement "tenant_prescreening").
    // Le meme contenu sert au SMS et a l'email, comme partout dans Domus.
    const text = await this.ownerNotifications.renderMessage(
      "tenant_prescreening",
      "Bonjour {firstName}, veuillez completer votre enquete de prelocation ici : {url}",
      { firstName: dto.firstName ?? "", tenantName: [dto.firstName, dto.lastName].filter(Boolean).join(" "), url },
    );
    if (phone) {
      try {
        await this.sms.sendSms({
          phone,
          message: text,
        });
        await this.db
          .update(tenantPrescreenings)
          .set({ smsSentAt: new Date() })
          .where(eq(tenantPrescreenings.id, id));
      } catch (error) {
        this.logger.warn(`Prescreening SMS error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (dto.email) {
      try {
        await this.emails.send({
          to: dto.email,
          subject: "Enquête de prélocation",
          html: `<p>${text.replace(url, `<a href="${url}">${url}</a>`)}</p>`,
          type: "form_link",
          relatedType: "tenant-prescreening",
        });
        await this.db
          .update(tenantPrescreenings)
          .set({ emailSentAt: new Date() })
          .where(eq(tenantPrescreenings.id, id));
      } catch (error) {
        this.logger.warn(`Prescreening email error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // Accès public par token
  // ---------------------------------------------------------------------
  async getByToken(token: string) {
    const record = await this.getActiveByToken(token, false);
    // Parité avec l'onboarding public (SCRUM-229) : expose la liste des devises
    // actives + la devise par défaut pour éviter un montant sans devise côté formulaire public.
    const activeCurrencies = await this.db
      .select({
        id: currencies.id,
        currencyCode: currencies.currencyCode,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(currencies)
      .where(eq(currencies.status, "true"));
    const setting = await readOrgAppSetting(this.db, record.organizationId, { currencyId: appSettings.currencyId });
    return {
      ...this.publicResponse(record),
      currencies: activeCurrencies,
      defaultCurrencyId: (setting?.currencyId as number | null) ?? null,
    };
  }

  async saveDraft(token: string, data: SavePrescreeningDraftDto) {
    const record = await this.getActiveByToken(token, true);
    const nextStatus = record.status === "sent" ? "opened" : record.status === "opened" ? "opened" : "draft";
    await this.db
      .update(tenantPrescreenings)
      .set({ ...this.sanitizeDraftInput(data), status: nextStatus })
      .where(eq(tenantPrescreenings.id, record.id));
    return this.getByToken(token);
  }

  private sanitizeDraftInput(data: SavePrescreeningDraftDto) {
    const patch: Record<string, any> = { ...data };
    if (data.monthlyIncome !== undefined) patch.monthlyIncome = data.monthlyIncome == null ? null : String(data.monthlyIncome);
    if (data.otherMonthlyIncome !== undefined) patch.otherMonthlyIncome = data.otherMonthlyIncome == null ? null : String(data.otherMonthlyIncome);
    return patch;
  }

  async recordConsent(
    token: string,
    body: RecordPrescreeningConsentDto,
    meta: { ipAddress?: string | null; userAgent?: string | null; locale?: string | null },
  ) {
    const record = await this.getActiveByToken(token, true);

    // Le texte affiché est celui en vigueur cote serveur (org ou global), jamais
    // un texte envoye par le client — sinon la preuve de consentement ne vaut rien.
    const setting = await this.getOrgSettings(record.organizationId);
    const version = setting?.defaultConsentTextVersion ?? "1";
    const locale = meta.locale ?? "fr-CA";
    const text = await this.resolveConsentText(record.organizationId, version, locale, body.consentType);
    if (!text) {
      throw new BadRequestException("Texte de consentement introuvable pour ce type.");
    }

    await this.db.insert(tenantPrescreeningConsents).values({
      organizationId: record.organizationId,
      prescreeningId: record.id,
      consentType: body.consentType,
      granted: body.granted,
      consentTextVersion: text.version,
      consentTextSnapshot: text.body,
      grantedAt: new Date(),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      locale,
    });

    return this.getByToken(token);
  }

  async submit(token: string) {
    const record = await this.getActiveByToken(token, true);

    const consents = await this.db
      .select({ consentType: tenantPrescreeningConsents.consentType, granted: tenantPrescreeningConsents.granted })
      .from(tenantPrescreeningConsents)
      .where(eq(tenantPrescreeningConsents.prescreeningId, record.id));

    const dataProcessing = consents.find((c) => c.consentType === "data_processing");
    if (!dataProcessing || !dataProcessing.granted) {
      throw new BadRequestException("Le consentement au traitement des données est requis pour soumettre le dossier.");
    }

    // v1 : ratio loyer/revenu calculé seulement si un loyer de référence connu
    // (unité liée) — sinon laissé null, pas de calcul obligatoire.
    let rentToIncomeRatio: string | null = null;
    // Aucune source de loyer fiable branchée en v1 (voir spec) ; laissé null.

    await this.db
      .update(tenantPrescreenings)
      .set({
        status: "submitted",
        submittedAt: new Date(),
        rentToIncomeRatio,
      })
      .where(eq(tenantPrescreenings.id, record.id));

    return this.getByToken(token);
  }

  // ---------------------------------------------------------------------
  // Consultation interne (org-scopée)
  // ---------------------------------------------------------------------
  async list(organizationId: number, filters: { status?: string; propertyId?: number } = {}) {
    await this.assertEnabledOrNotFound(organizationId);
    const conditions = [eq(tenantPrescreenings.organizationId, organizationId)];
    if (filters.status) conditions.push(eq(tenantPrescreenings.status, filters.status));
    if (filters.propertyId) conditions.push(eq(tenantPrescreenings.propertyId, filters.propertyId));
    const rows = await this.db
      .select()
      .from(tenantPrescreenings)
      .where(and(...conditions))
      .orderBy(desc(tenantPrescreenings.id));
    return rows.map((row) => this.internalResponse(row));
  }

  async getById(organizationId: number, id: number) {
    await this.assertEnabledOrNotFound(organizationId);
    const record = await this.findOrThrow(organizationId, id);
    const consents = await this.db
      .select()
      .from(tenantPrescreeningConsents)
      .where(eq(tenantPrescreeningConsents.prescreeningId, id))
      .orderBy(desc(tenantPrescreeningConsents.id));
    const references = await this.db
      .select()
      .from(tenantPrescreeningReferences)
      .where(and(eq(tenantPrescreeningReferences.prescreeningId, id), eq(tenantPrescreeningReferences.status, "true")))
      .orderBy(desc(tenantPrescreeningReferences.id));

    return { ...this.internalResponse(record), consents, references };
  }

  async addReference(organizationId: number, id: number, dto: AddPrescreeningReferenceDto) {
    await this.assertEnabledOrNotFound(organizationId);
    await this.findOrThrow(organizationId, id);
    await this.db.insert(tenantPrescreeningReferences).values({
      organizationId,
      prescreeningId: id,
      landlordName: dto.landlordName ?? null,
      landlordPhone: dto.landlordPhone ?? null,
      landlordEmail: dto.landlordEmail ?? null,
      propertyAddress: dto.propertyAddress ?? null,
      tenancyStartDate: dto.tenancyStartDate ?? null,
      tenancyEndDate: dto.tenancyEndDate ?? null,
      monthlyRent: dto.monthlyRent == null ? null : String(dto.monthlyRent),
      currencyId: dto.currencyId ?? null,
    });
    return this.getById(organizationId, id);
  }

  async updateReferenceContact(organizationId: number, id: number, refId: number, dto: UpdateReferenceContactDto, userId?: number) {
    await this.assertEnabledOrNotFound(organizationId);
    await this.findOrThrow(organizationId, id);
    const rows = await this.db
      .select({ id: tenantPrescreeningReferences.id })
      .from(tenantPrescreeningReferences)
      .where(and(
        eq(tenantPrescreeningReferences.id, refId),
        eq(tenantPrescreeningReferences.prescreeningId, id),
        eq(tenantPrescreeningReferences.organizationId, organizationId),
      ))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Référence introuvable.");

    await this.db
      .update(tenantPrescreeningReferences)
      .set({
        contactStatus: dto.contactStatus,
        contactedAt: dto.contactStatus === "not_contacted" ? null : new Date(),
        contactedByUserId: dto.contactStatus === "not_contacted" ? null : userId ?? null,
        feedbackOutcome: dto.feedbackOutcome ?? null,
        feedbackNote: dto.feedbackNote ?? null,
      })
      .where(eq(tenantPrescreeningReferences.id, refId));

    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // Décision
  // ---------------------------------------------------------------------
  async decide(organizationId: number, id: number, dto: DecidePrescreeningDto, userId?: number) {
    await this.assertEnabledOrNotFound(organizationId);
    const record = await this.findOrThrow(organizationId, id);

    if (dto.decision === "rejected" && !dto.decisionReasonCode) {
      throw new BadRequestException("Un motif de refus est requis.");
    }
    if (dto.decisionReasonCode && !(PRESCREENING_DECISION_REASON_CODES as readonly string[]).includes(dto.decisionReasonCode)) {
      throw new BadRequestException("Motif de refus invalide.");
    }

    const decidedAt = new Date();
    let retentionUntil: string | null = null;
    if (dto.decision === "rejected") {
      const months = await this.getRetentionMonths(organizationId);
      const until = new Date(decidedAt);
      until.setMonth(until.getMonth() + months);
      retentionUntil = until.toISOString().slice(0, 10);
    }

    await this.db
      .update(tenantPrescreenings)
      .set({
        decision: dto.decision,
        decisionReasonCode: dto.decisionReasonCode ?? null,
        decisionNote: dto.decisionNote ?? null,
        decidedByUserId: userId ?? null,
        decidedAt,
        retentionUntil,
        status: dto.decision,
      })
      .where(eq(tenantPrescreenings.id, record.id));

    return this.getById(organizationId, id);
  }

  async markCreditCheck(organizationId: number, id: number) {
    await this.assertEnabledOrNotFound(organizationId);
    await this.findOrThrow(organizationId, id);
    const rows = await this.db
      .select({ id: tenantPrescreeningConsents.id })
      .from(tenantPrescreeningConsents)
      .where(and(
        eq(tenantPrescreeningConsents.prescreeningId, id),
        eq(tenantPrescreeningConsents.consentType, "credit_check"),
        eq(tenantPrescreeningConsents.granted, true),
      ))
      .limit(1);
    if (!rows.length) {
      throw new ConflictException("Aucun consentement de vérification de crédit accordé pour ce dossier.");
    }
    await this.db
      .update(tenantPrescreenings)
      .set({ status: "under_review" })
      .where(eq(tenantPrescreenings.id, id));
    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // Conversion en onboarding locataire (réutilise tenantOnboardings existant)
  // ---------------------------------------------------------------------
  async convertToOnboarding(organizationId: number, id: number) {
    await this.assertEnabledOrNotFound(organizationId);
    const record = await this.findOrThrow(organizationId, id);
    if (record.decision !== "accepted") {
      throw new BadRequestException("Seul un dossier accepté peut être converti en inscription locataire.");
    }
    if (record.onboardingId) {
      throw new ConflictException("Ce dossier a déjà été converti en inscription locataire.");
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const data = JSON.stringify({
      firstName: record.firstName ?? null,
      lastName: record.lastName ?? null,
      email: record.email ?? null,
      phone: record.phone ?? null,
      address: record.currentAddress ?? null,
    });

    const [result] = await this.db.insert(tenantOnboardings).values({
      organizationId,
      phone: record.phone ?? "",
      tokenHash,
      token,
      status: "sent",
      data,
      expiresAt,
    });
    const onboardingId = Number((result as any).insertId);

    await this.db
      .update(tenantPrescreenings)
      .set({ onboardingId })
      .where(eq(tenantPrescreenings.id, id));

    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // Purge (soft) — champs sensibles vidés, garde traçabilité
  // ---------------------------------------------------------------------
  async purge(organizationId: number, id: number) {
    await this.assertEnabledOrNotFound(organizationId);
    await this.findOrThrow(organizationId, id);
    await this.db
      .update(tenantPrescreenings)
      .set({
        phone: null,
        email: null,
        firstName: null,
        lastName: null,
        currentAddress: null,
        currentCity: null,
        currentPostalCode: null,
        employerName: null,
        employerContact: null,
        monthlyIncome: null,
        otherMonthlyIncome: null,
        decisionNote: null,
        token: null,
        status: "purged",
        purgedAt: new Date(),
      })
      .where(eq(tenantPrescreenings.id, id));
    return this.getById(organizationId, id);
  }

  // ---------------------------------------------------------------------
  // Textes de consentement
  // ---------------------------------------------------------------------
  async getConsentText(organizationId: number | null, version: string, locale: string, consentType: string) {
    const text = await this.resolveConsentText(organizationId, version, locale, consentType);
    if (!text) throw new NotFoundException("Texte de consentement introuvable.");
    return text;
  }

  async listConsentTexts(organizationId: number) {
    const rows = await this.db
      .select()
      .from(prescreeningConsentTexts)
      .where(eq(prescreeningConsentTexts.status, "true"))
      .orderBy(desc(prescreeningConsentTexts.id));
    // organizationId NULL = global, sinon filtre par org (surcharge).
    return rows.filter((row) => row.organizationId == null || row.organizationId === organizationId);
  }

  private async resolveConsentText(organizationId: number | null, version: string, locale: string, consentType: string) {
    const rows = await this.db
      .select()
      .from(prescreeningConsentTexts)
      .where(and(
        eq(prescreeningConsentTexts.version, version),
        eq(prescreeningConsentTexts.locale, locale),
        eq(prescreeningConsentTexts.consentType, consentType),
        eq(prescreeningConsentTexts.status, "true"),
      ));
    if (!rows.length) return null;
    // Org-spécifique prioritaire sur le texte global.
    return rows.find((r) => r.organizationId === organizationId) ?? rows.find((r) => r.organizationId == null) ?? null;
  }

  // ---------------------------------------------------------------------
  // Helpers privés
  // ---------------------------------------------------------------------
  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private prescreeningUrl(token: string) {
    return `${env.appUrl.replace(/\/$/, "")}/domus/prescreening?token=${token}`;
  }

  private async getOrgSettings(organizationId: number) {
    const rows = await this.db
      .select()
      .from(domusOrgSettings)
      .where(eq(domusOrgSettings.organizationId, organizationId))
      .limit(1);
    return rows[0] ?? null;
  }

  private async findOrThrow(organizationId: number, id: number) {
    const rows = await this.db
      .select()
      .from(tenantPrescreenings)
      .where(and(eq(tenantPrescreenings.id, id), eq(tenantPrescreenings.organizationId, organizationId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Dossier de prélocation introuvable.");
    return rows[0];
  }

  private async getActiveByToken(token: string, forMutation: boolean) {
    const rows = await this.db
      .select()
      .from(tenantPrescreenings)
      .where(eq(tenantPrescreenings.tokenHash, this.hashToken(token)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Lien invalide ou expiré.");

    const record = rows[0];
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      await this.db
        .update(tenantPrescreenings)
        .set({ status: "expired" })
        .where(eq(tenantPrescreenings.id, record.id));
      throw new BadRequestException("Lien invalide ou expiré.");
    }
    if (forMutation && ["submitted", "under_review", "accepted", "rejected", "withdrawn", "purged"].includes(record.status)) {
      throw new BadRequestException("Ce lien n'est plus modifiable.");
    }
    return record;
  }

  // Exclut tokenHash/token de toute réponse publique (parité avec l'onboarding).
  private publicResponse(record: Record<string, any>) {
    const { tokenHash: _tokenHash, token: _token, decisionNote: _decisionNote, decisionReasonCode: _decisionReasonCode, ...rest } = record;
    return rest;
  }

  private internalResponse(record: Record<string, any>) {
    const { tokenHash: _tokenHash, token: _token, ...rest } = record;
    return rest;
  }
}
