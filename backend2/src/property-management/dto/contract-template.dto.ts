import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from "class-validator";

export const CONTRACT_TEMPLATE_TYPES = ["residential", "commercial", "short_term"] as const;
export type ContractTemplateType = (typeof CONTRACT_TEMPLATE_TYPES)[number];

export class CreateContractTemplateDto {
  @ApiProperty({ example: "Bail résidentiel standard" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: CONTRACT_TEMPLATE_TYPES, example: "residential" })
  @IsIn(CONTRACT_TEMPLATE_TYPES as unknown as string[])
  type!: ContractTemplateType;

  @ApiProperty({ example: "CONTRAT DE BAIL\nARTICLE 1...\n[NOM COMPLET DU BAILLEUR]..." })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ example: "Modèle conforme au droit RDC" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: false,
    description: "Si true, ce modèle devient le modèle actif pour son type (les autres du même type sont désactivés).",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateContractTemplateDto extends PartialType(CreateContractTemplateDto) {}

export class RenewLeaseDto {
  @ApiPropertyOptional({
    example: "2027-03-01",
    description: "Date de début du nouveau bail. Par défaut: lendemain de la fin du bail courant.",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: "2030-02-28",
    description: "Date de fin du nouveau bail. Par défaut: même durée que le bail courant.",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 850000,
    description: "Loyer du nouveau bail. Par défaut: même loyer que le bail courant.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount?: number;

  @ApiPropertyOptional({
    example: 1,
    description: "Modèle de contrat à appliquer. Par défaut: modèle actif du type.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Si true, marque l'ancien bail comme terminé (status=ended).",
  })
  @IsOptional()
  @IsBoolean()
  endCurrentLease?: boolean;

  @ApiPropertyOptional({ example: "monthly", description: "Cycle de facturation. Par défaut: celui du bail courant." })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiPropertyOptional({ example: 1800, description: "Caution du nouveau bail. Ne peut pas être inférieure à la caution déjà détenue." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: "TVA" })
  @IsOptional()
  @IsString()
  taxName?: string | null;

  @ApiPropertyOptional({ enum: ["percent", "fixed"], example: "percent" })
  @IsOptional()
  @IsIn(["percent", "fixed"])
  taxType?: "percent" | "fixed" | null;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxValue?: number | null;

  @ApiPropertyOptional({ enum: ["auto", "never"] })
  @IsOptional()
  @IsIn(["auto", "never"])
  taxApplyMode?: "auto" | "never";

  @ApiPropertyOptional({ description: "Prorata du loyer par période. Par défaut: celui du bail courant." })
  @IsOptional()
  @IsBoolean()
  rentProrationEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string | null;

  @ApiPropertyOptional({ example: "2027-03-01", description: "Première échéance. Avec prorata: jamais avant startDate." })
  @IsOptional()
  @IsDateString()
  nextInvoiceDate?: string;
}
