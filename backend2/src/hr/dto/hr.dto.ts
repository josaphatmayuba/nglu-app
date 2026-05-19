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
