import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

// Codes de motif de refus fermes (CDPDJ exige une justification tracee).
export const PRESCREENING_DECISION_REASON_CODES = [
  "insufficient_income",
  "income_unverifiable",
  "negative_landlord_reference",
  "reference_unreachable",
  "adverse_credit_report",
  "credit_consent_refused",
  "incomplete_application",
  "unit_no_longer_available",
  "other_applicant_selected",
  "withdrawn_by_applicant",
] as const;

export const PRESCREENING_CONSENT_TYPES = [
  "credit_check",
  "landlord_reference_check",
  "employment_verification",
  "data_processing",
] as const;

export class CreatePrescreeningInviteDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  propertyId?: number | null;

  @ApiPropertyOptional({ example: 34 })
  @IsOptional()
  @IsInt()
  unitId?: number | null;

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

  @ApiProperty({ example: "+15145550000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  expiresInDays?: number;
}

export class SavePrescreeningDraftDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAdult?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() currentAddress?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() currentCity?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() currentPostalCode?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() desiredMoveInDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() occupantCount?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasPets?: boolean | null;
  @ApiPropertyOptional() @IsOptional() @IsString() petsDescription?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smoker?: boolean | null;
  @ApiPropertyOptional() @IsOptional() @IsString() employmentStatus?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() employerName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() employerContact?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitle?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() employmentStartDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlyIncome?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() otherMonthlyIncome?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() incomeCurrencyId?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() incomeProofType?: string | null;
}

export class RecordPrescreeningConsentDto {
  @ApiProperty({ enum: PRESCREENING_CONSENT_TYPES })
  @IsIn(PRESCREENING_CONSENT_TYPES as unknown as string[])
  consentType: (typeof PRESCREENING_CONSENT_TYPES)[number];

  @ApiProperty({ example: true })
  @IsBoolean()
  granted: boolean;
}

export class AddPrescreeningReferenceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() landlordName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() landlordPhone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail() landlordEmail?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() propertyAddress?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() tenancyStartDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() tenancyEndDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlyRent?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() currencyId?: number | null;
}

export class UpdateReferenceContactDto {
  @ApiProperty({ enum: ["not_contacted", "contacted", "unreachable", "declined"] })
  @IsIn(["not_contacted", "contacted", "unreachable", "declined"])
  contactStatus: string;

  @ApiPropertyOptional({ enum: ["positive", "neutral", "negative", "no_comment"] })
  @IsOptional()
  @IsIn(["positive", "neutral", "negative", "no_comment"])
  feedbackOutcome?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedbackNote?: string | null;
}

export class DecidePrescreeningDto {
  @ApiProperty({ enum: ["accepted", "rejected"] })
  @IsIn(["accepted", "rejected"])
  decision: "accepted" | "rejected";

  @ApiPropertyOptional({ enum: PRESCREENING_DECISION_REASON_CODES })
  @IsOptional()
  @IsIn(PRESCREENING_DECISION_REASON_CODES as unknown as string[])
  decisionReasonCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  decisionNote?: string | null;
}
