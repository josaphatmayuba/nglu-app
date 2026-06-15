import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ example: "Acme Supplies" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "1234567890" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: "123 Supplier St" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "supplier@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "company", description: "company (entreprise) | individual (personne)" })
  @IsOptional()
  @IsString()
  partyType?: string;

  @ApiPropertyOptional({ example: "construction", description: "general | construction | real_estate | farm | factory" })
  @IsOptional()
  @IsString()
  supplierType?: string;

  @ApiPropertyOptional({ example: "Jean Mukendi" })
  @IsOptional()
  @IsString()
  contactPerson?: string | null;

  @ApiPropertyOptional({ example: "CD/KIN/RCCM/22-B-1234" })
  @IsOptional()
  @IsString()
  rccm?: string | null;

  @ApiPropertyOptional({ example: "01-G4567-N89012K" })
  @IsOptional()
  @IsString()
  nationalId?: string | null;

  @ApiPropertyOptional({ example: "A1234567B" })
  @IsOptional()
  @IsString()
  taxId?: string | null;

  @ApiPropertyOptional({ example: "30 jours" })
  @IsOptional()
  @IsString()
  paymentTerms?: string | null;

  @ApiPropertyOptional({ example: "Fournit le bois pour les chantiers." })
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class UpdateSupplierStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class SupplierQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all" | "info" | "search" | "report";

  @ApiPropertyOptional({ example: "acme" })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: "true,false" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "construction", description: "Filtre par type de fournisseur (general, construction, real_estate, farm, factory)" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
