import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";

export class CreateBudgetDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  periodId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  currencyId?: number;
}

export class CreateBudgetLineDto {
  @ApiProperty()
  @IsInt()
  accountId!: number;

  @ApiProperty()
  @IsNumber()
  plannedAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  siteId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  activityId?: number;
}

export class ConsumeBudgetDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  journalEntryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
