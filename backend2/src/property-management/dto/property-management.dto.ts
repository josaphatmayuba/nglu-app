import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";

export class CreatePropertyDto {
  @ApiProperty({ example: "Green Tower" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "PROP-001" })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiPropertyOptional({ example: "building", default: "building" })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ example: "available", default: "available" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "120 Main St" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "Montreal" })
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional({ example: "Canada" })
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiPropertyOptional({ example: 4, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floors?: number;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parkingSpaces?: number;

  @ApiPropertyOptional({ example: 2500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultRent?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id for marketValue and defaultRent. Inherited by new units when omitted. Defaults to appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: "Mixed-use rental building" })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export class CreateUnitDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({ example: "A-101" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "apartment", default: "apartment" })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ example: "vacant", default: "vacant" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  floor?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 850, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id for monthly rent and security deposit. Defaults to appSetting.currencyId when omitted." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: "Parking, balcony" })
  @IsOptional()
  @IsString()
  amenities?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

export class CreateLeaseDto {
  @ApiPropertyOptional({ example: "LEASE-202605090001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId: number;

  @ApiProperty({ example: "2026-05-01" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: "2027-04-30" })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  nextInvoiceDate?: string | null;

  @ApiPropertyOptional({ example: "monthly", default: "monthly" })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id. Defaults to the company's appSetting.currencyId when omitted." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: 123.45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  moveInMeterReading?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moveInNotes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string | null;

  @ApiPropertyOptional({ example: "active", default: "draft" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateLeaseDto extends PartialType(CreateLeaseDto) {}

export class CreateRentPaymentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leaseId: number;

  @ApiProperty({ example: "2026-05-09" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: "cash", default: "cash" })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: "REC-001" })
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional({ example: "Payment for rent" })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAccountId?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id. Defaults to the lease's currency, then the company's appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId?: number | null;

  @ApiProperty({ example: "Water leak" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "medium", default: "medium" })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: "open", default: "open" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "2026-05-12" })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @ApiPropertyOptional({ example: 350, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}

export class CreateTenantDto {
  @ApiProperty({ example: "Jean" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Dupont" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: "12 Avenue des Palmiers" })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: "jdupont" })
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiProperty({ example: "1992-03-14" })
  @IsDateString()
  birth_date: string;

  @ApiProperty({ example: "M", enum: ["M", "F"] })
  @IsIn(["M", "F"])
  sex: "M" | "F";

  @ApiProperty({ example: "Congolaise" })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiProperty({ example: "marié" })
  @IsString()
  @IsNotEmpty()
  marital_status: string;

  @ApiProperty({ example: "Kinshasa" })
  @IsString()
  @IsNotEmpty()
  origin_province: string;

  @ApiPropertyOptional({ example: "+243820000000" })
  @IsOptional()
  @IsString()
  phone2?: string | null;

  @ApiProperty({ example: "Marie Dupont" })
  @IsString()
  @IsNotEmpty()
  contacted_person: string;

  @ApiProperty({ example: "+243830000000" })
  @IsString()
  @IsNotEmpty()
  contacted_person_phone_number: string;

  @ApiProperty({ example: "salarié" })
  @IsString()
  @IsNotEmpty()
  prossional_status: string;

  @ApiProperty({ example: "Comptable" })
  @IsString()
  @IsNotEmpty()
  main_activity: string;

  @ApiProperty({ example: "NGLU SARL" })
  @IsString()
  @IsNotEmpty()
  entity_name: string;

  @ApiProperty({ example: "45 Boulevard du 30 Juin" })
  @IsString()
  @IsNotEmpty()
  entity_address: string;

  @ApiProperty({ example: "2021-01-15" })
  @IsDateString()
  hiring_date: string;

  @ApiProperty({ example: "CDI" })
  @IsString()
  @IsNotEmpty()
  contract_type: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthly_pay: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  other_monthly_income?: number | null;

  @ApiProperty({ example: "Ancienne adresse" })
  @IsString()
  @IsNotEmpty()
  old_address: string;

  @ApiProperty({ example: "Monsieur Bailleur" })
  @IsString()
  @IsNotEmpty()
  old_lessor: string;

  @ApiProperty({ example: "Rapprochement du lieu de travail" })
  @IsString()
  @IsNotEmpty()
  moving_reason: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupant_number: number;

  @ApiPropertyOptional({ example: "Jeanne Dupont" })
  @ValidateIf((dto) => ["marié", "marie", "conjoint de fait", "union libre"].includes(String(dto.marital_status).toLowerCase()))
  @IsString()
  @IsNotEmpty()
  partenair_name?: string | null;

  @ApiPropertyOptional({ example: "+243840000000" })
  @ValidateIf((dto) => ["marié", "marie", "conjoint de fait", "union libre"].includes(String(dto.marital_status).toLowerCase()))
  @IsString()
  @IsNotEmpty()
  partenair_number?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  child_number?: number;

  @ApiPropertyOptional({ example: [4, 9] })
  @ValidateIf((dto) => Number(dto.child_number ?? 0) > 0)
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  child_age?: number[];
}

export class GenerateTenantOnboardingDto {
  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}

export class SaveTenantOnboardingDto {
  @ApiPropertyOptional({ example: "Jean" })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: "Dupont" })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: "12 Avenue des Palmiers" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "jdupont" })
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiPropertyOptional({ example: "1992-03-14" })
  @IsOptional()
  @IsDateString()
  birth_date?: string | null;

  @ApiPropertyOptional({ example: "M", enum: ["M", "F"] })
  @IsOptional()
  @IsIn(["M", "F"])
  sex?: "M" | "F";

  @ApiPropertyOptional({ example: "Congolaise" })
  @IsOptional()
  @IsString()
  nationality?: string | null;

  @ApiPropertyOptional({ example: "marié" })
  @IsOptional()
  @IsString()
  marital_status?: string | null;

  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @IsString()
  origin_province?: string | null;

  @ApiPropertyOptional({ example: "+243820000000" })
  @IsOptional()
  @IsString()
  phone2?: string | null;

  @ApiPropertyOptional({ example: "Marie Dupont" })
  @IsOptional()
  @IsString()
  contacted_person?: string | null;

  @ApiPropertyOptional({ example: "+243830000000" })
  @IsOptional()
  @IsString()
  contacted_person_phone_number?: string | null;

  @ApiPropertyOptional({ example: "salarié" })
  @IsOptional()
  @IsString()
  prossional_status?: string | null;

  @ApiPropertyOptional({ example: "Comptable" })
  @IsOptional()
  @IsString()
  main_activity?: string | null;

  @ApiPropertyOptional({ example: "NGLU SARL" })
  @IsOptional()
  @IsString()
  entity_name?: string | null;

  @ApiPropertyOptional({ example: "45 Boulevard du 30 Juin" })
  @IsOptional()
  @IsString()
  entity_address?: string | null;

  @ApiPropertyOptional({ example: "2021-01-15" })
  @IsOptional()
  @IsDateString()
  hiring_date?: string | null;

  @ApiPropertyOptional({ example: "CDI" })
  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthly_pay?: number | null;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  other_monthly_income?: number | null;

  @ApiPropertyOptional({ example: "Ancienne adresse" })
  @IsOptional()
  @IsString()
  old_address?: string | null;

  @ApiPropertyOptional({ example: "Monsieur Bailleur" })
  @IsOptional()
  @IsString()
  old_lessor?: string | null;

  @ApiPropertyOptional({ example: "Rapprochement du lieu de travail" })
  @IsOptional()
  @IsString()
  moving_reason?: string | null;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupant_number?: number | null;

  @ApiPropertyOptional({ example: "Jeanne Dupont" })
  @IsOptional()
  @IsString()
  partenair_name?: string | null;

  @ApiPropertyOptional({ example: "+243840000000" })
  @IsOptional()
  @IsString()
  partenair_number?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  child_number?: number;

  @ApiPropertyOptional({ example: [4, 9] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  child_age?: number[];
}

export class CreateContractDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  leaseId: number;

  @ApiPropertyOptional({ example: "Contrat de bail personnalisé..." })
  @IsOptional()
  @IsString()
  contractContent?: string;

  @ApiPropertyOptional({
    example: 1,
    description: "ID du modèle de contrat à appliquer. Si omis, on prend le modèle actif du type du bien.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;
}

export class SignContractDto {
  @ApiProperty({ example: "data:image/png;base64,iVBORw0KGgo..." })
  @IsString()
  @IsNotEmpty()
  signatureData: string;
}

export class CreateMaintenanceCostDto {
  @IsIn(["service", "labour"])
  type: "service" | "labour";

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsIn(["cash", "bank", "mobile_money", "cheque"])
  paymentMethod?: "cash" | "bank" | "mobile_money" | "cheque";

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
