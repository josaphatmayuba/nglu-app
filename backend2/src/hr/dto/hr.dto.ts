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

export class CreateHrPayrollDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractId?: number | null;

  @IsString()
  @IsNotEmpty()
  period: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseSalary?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  transportAllowance?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  housingAllowance?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  riskAllowance?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  otherAllowances?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  overtimeHours?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  overtimeAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unpaidAbsenceDeduction?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  advanceDeduction?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cnssAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  otherDeductions?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  workedDays?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  absenceDays?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paidLeaveDays?: number | null;

  @IsOptional()
  @IsString()
  status?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateHrPayrollDto extends PartialType(CreateHrPayrollDto) {}

export class CreateHrProjectDto {
  @IsOptional()
  @IsString()
  code?: string | null;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  donor?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  managerId?: number | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hrBudget?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

  @IsOptional()
  @IsString()
  status?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateHrProjectDto extends PartialType(CreateHrProjectDto) {}

export class CreateHrProjectAssignmentDto {
  @Type(() => Number)
  @IsNumber()
  projectId: number;

  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  role?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timePercent?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyCost?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

  @IsOptional()
  @IsString()
  status?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateHrProjectAssignmentDto extends PartialType(CreateHrProjectAssignmentDto) {}

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  designationId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  departmentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  managerId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hrResponsibleId?: number | null;

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
  workLocation?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baseSalary?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  transportAllowance?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  housingAllowance?: number | null;

  @IsOptional()
  @IsString()
  payFrequency?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  probationMonths?: number | null;

  @IsOptional()
  @IsDateString()
  probationEndDate?: string | null;

  @IsOptional()
  @IsString()
  workSchedule?: string | null;

  @IsOptional()
  @IsString()
  school?: string | null;

  @IsOptional()
  @IsString()
  supervisor?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stipend?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contractAmount?: number | null;

  @IsOptional()
  @IsString()
  deliverables?: string | null;

  @IsOptional()
  @IsString()
  generatedDocumentUrl?: string | null;

  @IsOptional()
  @IsString()
  signedDocumentUrl?: string | null;

  @IsOptional()
  @IsString()
  amendmentsUrl?: string | null;

  @IsOptional()
  @IsString()
  identityDocumentUrl?: string | null;

  @IsOptional()
  @IsString()
  diplomasUrl?: string | null;

  @IsOptional()
  @IsString()
  status?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateHrContractDto extends PartialType(CreateHrContractDto) {}

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

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
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

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
  @Type(() => Number)
  @IsNumber()
  currencyId?: number | null;

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

  @IsOptional()
  @IsDateString()
  periodStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  periodEndDate?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  projectId?: number | null;

  @IsOptional()
  @IsString()
  project?: string | null;

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

export class CreateHrEmployeeRequestDto {
  @Type(() => Number)
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  requestType: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDateString()
  requestedDate: string;
}

export class UpdateHrEmployeeRequestDto extends PartialType(CreateHrEmployeeRequestDto) {
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
