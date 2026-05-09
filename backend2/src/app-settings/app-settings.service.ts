import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { appSettings, currencies } from "../database/schema";
import type { Database } from "../database/types";
import { UpdateAppSettingDto } from "./dto/update-app-setting.dto";

@Injectable()
export class AppSettingsService {
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

  async update(dto: UpdateAppSettingDto) {
    const current = await this.findOne();

    const logo = dto.clearLogo === "true" ? null : (dto.logo ?? current.logo);

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
}
