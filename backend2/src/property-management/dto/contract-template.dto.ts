import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: "2030-02-28",
    description: "Date de fin du nouveau bail. Par défaut: même durée que le bail courant.",
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 850000,
    description: "Loyer du nouveau bail. Par défaut: même loyer que le bail courant.",
  })
  @IsOptional()
  @Type(() => Number)
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
}
