import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DRIZZLE } from "../database/database.constants";
import { appSettings, currencies } from "../database/schema";
import type { Database } from "../database/types";
import { UpdateAppSettingDto } from "./dto/update-app-setting.dto";

@Injectable()
export class AppSettingsService {
  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findOne() {
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
        currencyId: appSettings.currencyId,
        isPos: appSettings.isPos,
        isDiscount: appSettings.isDiscount,
        isTax: appSettings.isTax,
        createdAt: appSettings.createdAt,
        updatedAt: appSettings.updatedAt,
        currencyName: currencies.currencyName,
        currencySymbol: currencies.currencySymbol,
      })
      .from(appSettings)
      .leftJoin(currencies, eq(currencies.id, appSettings.currencyId!))
      .where(eq(appSettings.id, 1))
      .limit(1);

    if (!rows.length) throw new NotFoundException("App setting not found");

    const row = rows[0];
    return {
      ...row,
      currency: row.currencyId
        ? { id: row.currencyId, currencyName: row.currencyName, currencySymbol: row.currencySymbol }
        : null,
    };
  }

  async update(dto: UpdateAppSettingDto, files: any[] = [], publicApiBase?: string) {
    const current = await this.findOne();

    const uploadedLogo = this.saveLogo(files, publicApiBase);
    const logo = dto.clearLogo === "true" ? null : (uploadedLogo ?? dto.logo ?? current.logo);

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
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(appSettings.id, 1));

    return this.findOne();
  }

  private saveLogo(files: any[], publicApiBase?: string) {
    const file = files?.find((item) => item?.fieldname === "images" || item?.fieldname === "images[]" || item?.fieldname === "image") ?? files?.[0];
    if (!file?.buffer) return null;

    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });

    const rawExtension = file.originalname?.split(".").pop() || "png";
    const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, "") || "png";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    writeFileSync(join(this.uploadDir, name), file.buffer);

    const base = publicApiBase?.replace(/\/$/, "");
    return base ? `${base}/files/${name}` : `/files/${name}`;
  }
}
