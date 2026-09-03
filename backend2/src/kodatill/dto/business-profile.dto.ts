import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsNumberString, IsOptional, IsString } from "class-validator";

export const KT_ACTIVITY_TYPES = ["restaurant", "supermarket", "pharmacy", "hardware", "shop"] as const;
export type KtActivityType = (typeof KT_ACTIVITY_TYPES)[number];

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional({ enum: KT_ACTIVITY_TYPES })
  @IsOptional()
  @IsEnum(KT_ACTIVITY_TYPES)
  activityType?: KtActivityType;

  @ApiPropertyOptional({ type: [String], description: "Liste des modules actives (stock, ingredients, ...)" })
  @IsOptional()
  enabledModules?: string[];

  @ApiPropertyOptional({ description: "Code devise ISO 4217, ex: USD, CDF" })
  @IsOptional()
  @IsString()
  defaultCurrencyCode?: string;

  @ApiPropertyOptional({ enum: ["exclusive", "inclusive"] })
  @IsOptional()
  @IsIn(["exclusive", "inclusive"])
  taxMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptFooter?: string;

  @ApiPropertyOptional({ description: "Pourcentage de service, ex: 10.00" })
  @IsOptional()
  @IsNumberString()
  serviceChargeRate?: string;
}
