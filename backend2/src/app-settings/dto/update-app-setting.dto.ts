import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateAppSettingDto {
  @ApiPropertyOptional({ example: "My Company" }) @IsOptional() @IsString() companyName?: string;
  @ApiPropertyOptional({ example: "default" }) @IsOptional() @IsString() dashboardType?: string;
  @ApiPropertyOptional({ example: "Best ERP" }) @IsOptional() @IsString() tagLine?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() footer?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() currencyId?: number;
  @ApiPropertyOptional({ example: "false" }) @IsOptional() @IsString() isPos?: string;
  @ApiPropertyOptional({ example: "false" }) @IsOptional() @IsString() isDiscount?: string;
  @ApiPropertyOptional({ example: "false" }) @IsOptional() @IsString() isTax?: string;
  @ApiPropertyOptional({ description: "Set to 'true' to clear the logo" }) @IsOptional() @IsString() clearLogo?: string;
  @ApiPropertyOptional({ description: "Landlord signature image as data URL (PNG/JPG base64)" }) @IsOptional() @IsString() landlordSignature?: string;
  @ApiPropertyOptional({ description: "Set to 'true' to clear the landlord signature" }) @IsOptional() @IsString() clearLandlordSignature?: string;
  @ApiPropertyOptional({ description: "Nom du bailleur pour les contrats (distinct du nom de l'entreprise)" }) @IsOptional() @IsString() landlordName?: string;
  @ApiPropertyOptional({ description: "Téléphone du bailleur pour les contrats" }) @IsOptional() @IsString() landlordPhone?: string;
  @ApiPropertyOptional({ example: "INV-" }) @IsOptional() @IsString() invoicePrefix?: string;
  @ApiPropertyOptional({ example: "LEASE-" }) @IsOptional() @IsString() leasePrefix?: string;
  @ApiPropertyOptional({ example: 16 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() defaultVatRate?: number;
  @ApiPropertyOptional({ example: 14 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() defaultPaymentTermDays?: number;
  @ApiPropertyOptional({ example: 1 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() @Max(1) rentReminderEnabled?: number;
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() @Min(1) @Max(365) rentReminderOverdueDays?: number;
  @ApiPropertyOptional({ example: 90 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() @Min(1) @Max(365) leaseExpiryNoticeDays?: number;
  @ApiPropertyOptional({ example: 9 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() @Max(23) rentReminderHour?: number;
  @ApiPropertyOptional({ example: 5 }) @IsOptional() @Transform(({ value }) => (value === undefined || value === "" ? undefined : Number(value))) @IsInt() @Min(0) @Max(60) rentOverdueGraceDays?: number;
}
