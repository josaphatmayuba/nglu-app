import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
  @IsInt()
  @Min(0)
  floors?: number;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  parkingSpaces?: number;

  @ApiPropertyOptional({ example: 2500000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultRent?: number;

  @ApiPropertyOptional({ example: "Mixed-use rental building" })
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export class CreateUnitDto {
  @ApiProperty({ example: 1 })
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
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 850, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
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
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  unitId: number;

  @ApiProperty({ example: 1 })
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
  @IsNumber()
  @Min(0)
  rentAmount: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: 123.45 })
  @IsOptional()
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
  @IsInt()
  @Min(1)
  leaseId: number;

  @ApiProperty({ example: "2026-05-09" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: 1800 })
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
  @IsInt()
  @Min(1)
  paymentAccountId?: number;
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
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
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}

export class CreateContractDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  leaseId: number;

  @ApiPropertyOptional({ example: "Contrat de bail personnalisé..." })
  @IsOptional()
  @IsString()
  contractContent?: string;
}

export class SignContractDto {
  @ApiProperty({ example: "data:image/png;base64,iVBORw0KGgo..." })
  @IsString()
  @IsNotEmpty()
  signatureData: string;
}
