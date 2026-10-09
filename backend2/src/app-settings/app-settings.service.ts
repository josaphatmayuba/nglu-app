import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import { existsSync } from "fs";
import { basename, join } from "path";
import { IMAGE_MIME_TYPES, saveValidatedUploadFile } from "../common/upload-security";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { appSettings, currencies } from "../database/schema";
import type { Database } from "../database/types";
import { UpdateAppSettingDto } from "./dto/update-app-setting.dto";

@Injectable()
export class AppSettingsService {
  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findPublic() {
    return {
      companyName: process.env.PUBLIC_APP_NAME || "NgoluApp",
      tagLine: process.env.PUBLIC_APP_TAGLINE || null,
      website: process.env.PUBLIC_APP_WEBSITE || env.appUrl,
      logo: process.env.PUBLIC_APP_LOGO || null,
    };
  }

  async findOne(orgId = 1) {
    const rows = await this.db
      .select({
        id: appSettings.id,
        companyName: appSettings.companyName,
        dashboardType: appSettings.dashboardType,
        tagLine: appSettings.tagLine,
        address: appSettings.address,
        phone: appSettings.phone,
        email: appSettings.email,
        website: appSettings.website,
        footer: appSettings.footer,
        logo: appSettings.logo,
        landlordSignature: appSettings.landlordSignature,
        landlordName: appSettings.landlordName,
        landlordPhone: appSettings.landlordPhone,
        currencyId: appSettings.currencyId,
        isPos: appSettings.isPos,
        isDiscount: appSettings.isDiscount,
        isTax: appSettings.isTax,
        invoicePrefix: appSettings.invoicePrefix,
        leasePrefix: appSettings.leasePrefix,
        defaultVatRate: appSettings.defaultVatRate,
        defaultPaymentTermDays: appSettings.defaultPaymentTermDays,
        rentReminderEnabled: appSettings.rentReminderEnabled,
        rentReminderOverdueDays: appSettings.rentReminderOverdueDays,
        leaseExpiryNoticeDays: appSettings.leaseExpiryNoticeDays,
        rentReminderHour: appSettings.rentReminderHour,
        createdAt: appSettings.createdAt,
        updatedAt: appSettings.updatedAt,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(appSettings)
      .leftJoin(currencies, eq(currencies.id, appSettings.currencyId!))
      .where(sql`(${appSettings.organizationId} = ${orgId} OR ${appSettings.organizationId} = 1)`)
      .orderBy(desc(sql`(${appSettings.organizationId} = ${orgId})`), eq(appSettings.organizationId, 1))
      .limit(1);

    if (!rows.length) throw new NotFoundException("App setting not found");

    const row = rows[0];
    const logo = this.logoIfAvailable(row.logo);

    return {
      ...row,
      logo,
      currency: row.currencyId
        ? { id: row.currencyId, currencyName: row.currencyName, currencySymbol: row.currencySymbol }
        : null,
    };
  }

  async update(dto: UpdateAppSettingDto, files: any[] = [], publicApiBase?: string, orgId = 1) {
    const current = await this.findOne(orgId);
    // Cible la ligne PROPRE a l'org. Si l'org n'a pas encore sa ligne (findOne a
    // renvoye le fallback org #1), on en cree une pour ne pas ecraser org #1.
    const ownRow = await this.ensureOrgRow(orgId);

    const uploadedLogo = this.saveLogo(files, publicApiBase);
    const logo = dto.clearLogo === "true" ? null : (uploadedLogo ?? dto.logo ?? current.logo);
    // Landlord signature : stored inline as a base64 data URL (LONGTEXT).
    // Update only if explicitly cleared or a new value is provided.
    const landlordSignature =
      dto.clearLandlordSignature === "true"
        ? null
        : (dto.landlordSignature ?? current.landlordSignature);

    await this.db
      .update(appSettings)
      .set({
        companyName: dto.companyName ?? current.companyName,
        dashboardType: dto.dashboardType ?? current.dashboardType,
        tagLine: dto.tagLine ?? current.tagLine,
        address: dto.address ?? current.address,
        phone: dto.phone ?? current.phone,
        email: dto.email ?? current.email,
        website: dto.website ?? current.website,
        footer: dto.footer ?? current.footer,
        currencyId: dto.currencyId ?? current.currencyId,
        isPos: dto.isPos ?? current.isPos,
        isDiscount: dto.isDiscount ?? current.isDiscount,
        isTax: dto.isTax ?? current.isTax,
        logo,
        landlordSignature,
        landlordName: dto.landlordName ?? current.landlordName,
        landlordPhone: dto.landlordPhone ?? current.landlordPhone,
        invoicePrefix: dto.invoicePrefix ?? current.invoicePrefix,
        leasePrefix: dto.leasePrefix ?? current.leasePrefix,
        defaultVatRate: dto.defaultVatRate ?? current.defaultVatRate,
        defaultPaymentTermDays: dto.defaultPaymentTermDays ?? current.defaultPaymentTermDays,
        rentReminderEnabled: dto.rentReminderEnabled ?? current.rentReminderEnabled,
        rentReminderOverdueDays: dto.rentReminderOverdueDays ?? current.rentReminderOverdueDays,
        leaseExpiryNoticeDays: dto.leaseExpiryNoticeDays ?? current.leaseExpiryNoticeDays,
        rentReminderHour: dto.rentReminderHour ?? current.rentReminderHour,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(appSettings.id, ownRow));

    return this.findOne(orgId);
  }

  /**
   * Renvoie l'id de la ligne appSetting PROPRE a l'org. La cree (copie des
   * valeurs du fallback org #1) si elle n'existe pas encore. Pour org #1, renvoie
   * directement la ligne existante.
   */
  private async ensureOrgRow(orgId: number): Promise<number> {
    const own = await this.db
      .select({ id: appSettings.id })
      .from(appSettings)
      .where(eq(appSettings.organizationId, orgId))
      .orderBy(appSettings.id)
      .limit(1);
    if (own.length) return own[0].id;

    // Pas de ligne pour cette org : on en provisionne une a partir du fallback.
    const base = await this.findOne(orgId);
    const [res] = await this.db.insert(appSettings).values({
      organizationId: orgId,
      companyName: base.companyName,
      dashboardType: base.dashboardType,
      tagLine: base.tagLine,
      address: base.address,
      phone: base.phone,
      email: base.email,
      website: base.website,
      footer: base.footer,
      landlordName: base.landlordName,
      landlordPhone: base.landlordPhone,
      currencyId: base.currencyId,
      isPos: base.isPos,
      isDiscount: base.isDiscount,
      isTax: base.isTax,
      invoicePrefix: base.invoicePrefix,
      leasePrefix: base.leasePrefix,
      defaultVatRate: base.defaultVatRate,
      defaultPaymentTermDays: base.defaultPaymentTermDays,
      rentReminderEnabled: base.rentReminderEnabled,
      rentReminderOverdueDays: base.rentReminderOverdueDays,
      leaseExpiryNoticeDays: base.leaseExpiryNoticeDays,
      rentReminderHour: base.rentReminderHour,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any);
    return Number((res as any).insertId);
  }

  private saveLogo(files: any[], publicApiBase?: string) {
    const file = files?.find((item) => item?.fieldname === "images" || item?.fieldname === "images[]" || item?.fieldname === "image") ?? files?.[0];
    if (!file?.buffer) return null;

    const { name } = saveValidatedUploadFile(file, this.uploadDir, {
      allowedMimeTypes: IMAGE_MIME_TYPES,
      prefix: "logo",
      maxBytes: 10 * 1024 * 1024,
    });

    const base = publicApiBase?.replace(/\/$/, "");
    return base ? `${base}/files/${name}` : `/files/${name}`;
  }

  private logoIfAvailable(logo?: string | null) {
    if (!logo) return logo ?? null;

    const localFileName = this.localFileNameFromLogo(logo);
    if (!localFileName) return logo;

    return existsSync(join(this.uploadDir, localFileName)) ? logo : null;
  }

  private localFileNameFromLogo(logo: string) {
    if (logo.startsWith("/files/")) return basename(logo);

    try {
      const url = new URL(logo);
      return url.pathname.includes("/files/") ? basename(url.pathname) : null;
    } catch {
      return null;
    }
  }
}
