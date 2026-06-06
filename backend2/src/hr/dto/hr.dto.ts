import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateDesignationDto extends PartialType(CreateDesignationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateAwardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateAwardDto extends PartialType(CreateAwardDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateDesignationHistoryDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @Type(() => Number)
  @IsNumber()
  designationId: number;

  @IsOptional()
  @IsDateString()
  designationStartDate?: string;

  @IsOptional()
  @IsDateString()
  designationEndDate?: string | null;

  @IsOptional()
  @IsString()
  designationComment?: string | null;
}

export class UpdateDesignationHistoryDto extends PartialType(CreateDesignationHistoryDto) {}

export class CreateSalaryHistoryDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salary: number;

  @IsOptional()
  @IsDateString()
  salaryStartDate?: string;

  @IsOptional()
  @IsDateString()
  salaryEndDate?: string | null;

  @IsOptional()
  @IsString()
  salaryComment?: string | null;

  /** Sub-account used to credit the payment: 1=Cash, 2=Bank (default) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paymentAccountId?: number;

  /** Currency ID for this salary (defaults to app setting if not provided) */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number;
}

export class UpdateSalaryHistoryDto extends PartialType(CreateSalaryHistoryDto) {}

export class CreateAwardHistoryDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @Type(() => Number)
  @IsNumber()
  awardId: number;

  @IsDateString()
  awardedDate: string;

  @IsOptional()
  @IsString()
  comment?: string | null;
}

export class UpdateAwardHistoryDto extends PartialType(CreateAwardHistoryDto) {}

export class CreateHrLeaveRequestDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string | null;
}

export class UpdateHrLeaveRequestDto extends PartialType(CreateHrLeaveRequestDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  decisionComment?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  decidedBy?: number | null;
}

export class CreateHrContractDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  contractType: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateHrContractDto extends PartialType(CreateHrContractDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrDocumentDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  documentType: string;

  @IsOptional()
  @IsString()
  reference?: string | null;

  @IsOptional()
  @IsString()
  fileUrl?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateHrDocumentDto extends PartialType(CreateHrDocumentDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrExpenseRequestDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  requestDate: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateHrExpenseRequestDto extends PartialType(CreateHrExpenseRequestDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  decisionComment?: string | null;
}

export class CreateHrSocialDeclarationDto {
  @IsString()
  @IsNotEmpty()
  period: string;

  @IsString()
  @IsNotEmpty()
  organism: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @IsOptional()
  @IsString()
  rate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateHrSocialDeclarationDto extends PartialType(CreateHrSocialDeclarationDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrPerformanceReviewDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  managerId?: number | null;

  @IsString()
  @IsNotEmpty()
  cycle: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score?: number | null;

  @IsOptional()
  @IsString()
  objectives?: string | null;

  @IsOptional()
  @IsString()
  comments?: string | null;
}

export class UpdateHrPerformanceReviewDto extends PartialType(CreateHrPerformanceReviewDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrTrainingSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  audience?: string | null;

  @IsOptional()
  @IsDateString()
  sessionDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateHrTrainingSessionDto extends PartialType(CreateHrTrainingSessionDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrTimesheetDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsDateString()
  workDate: string;

  @IsOptional()
  @IsString()
  period?: string | null;

  @IsString()
  @IsNotEmpty()
  project: string;

  @IsOptional()
  @IsString()
  donor?: string | null;

  @IsOptional()
  @IsString()
  activity?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours: number;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateHrTimesheetDto extends PartialType(CreateHrTimesheetDto) {
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateHrRecruitmentOfferDto {
  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number | null;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateHrRecruitmentOfferDto extends PartialType(CreateHrRecruitmentOfferDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
