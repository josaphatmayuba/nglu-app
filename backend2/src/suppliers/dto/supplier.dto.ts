import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

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

  @ApiPropertyOptional({ example: "construction", description: "Domaine principal : general | construction | real_estate | farm | factory" })
  @IsOptional()
  @IsString()
  supplierType?: string;

  @ApiPropertyOptional({
    example: ["construction", "real_estate"],
    description:
      "Tous les domaines ou le tiers doit apparaitre. Permet a un sous-traitant d etre vu dans BatiPro ET Domus sans etre saisi deux fois. supplierType y est toujours ajoute.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @ApiPropertyOptional({
    example: ["subcontractor"],
    description:
      "Ce que fait le tiers : goods (nous livre des produits) | subcontractor (travaille sur le chantier et facture, tacheron inclus) | service (prestation ponctuelle hors chantier). Un journalier paye a la journee n est pas un tiers : il vit dans batipro_workers.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  natures?: string[];

  @ApiPropertyOptional({ example: "Jean Mukendi" })
  @IsOptional()
  @IsString()
  contactPerson?: string | null;

  @ApiPropertyOptional({ example: "Plomberie" })
  @IsOptional()
  @IsString()
  trade?: string | null;

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

  @ApiPropertyOptional({ example: "construction", description: "Filtre par domaine, CSV (general, construction, real_estate, farm, factory). Un tiers sans domaine reste visible." })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: "subcontractor,service", description: "Filtre par nature, CSV (goods, subcontractor, service). Un tiers sans nature reste visible." })
  @IsOptional()
  @IsString()
  nature?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
