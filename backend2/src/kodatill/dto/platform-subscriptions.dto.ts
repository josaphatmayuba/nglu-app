import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

const SUB_STATUSES = ["trial", "active", "past_due", "suspended", "cancelled"] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];

export class UpsertPlatformSubscriptionDto {
  @ApiProperty({ description: "Id interne de l'organisation" })
  @IsInt()
  @Min(1)
  organizationId!: number;

  @ApiProperty({ description: "Code du plan (kt_plans.code)" })
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @ApiPropertyOptional({ description: "Fin de periode d'essai (ISO 8601)" })
  @IsOptional()
  @IsISO8601()
  trialEndsAt?: string;
}

export class UpdatePlatformSubscriptionDto {
  @ApiPropertyOptional({ description: "Nouveau plan (kt_plans.code)" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  planCode?: string;

  @ApiPropertyOptional({ enum: SUB_STATUSES })
  @IsOptional()
  @IsIn(SUB_STATUSES)
  subStatus?: SubStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  trialEndsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  renewsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  cancelledAt?: string;
}
