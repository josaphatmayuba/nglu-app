import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

export class LedgerLineDto {
  @ApiProperty()
  @IsInt()
  accountId!: number;

  @ApiProperty({ enum: ["DEBIT", "CREDIT"] })
  @IsIn(["DEBIT", "CREDIT"])
  side!: "DEBIT" | "CREDIT";

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

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

export class CreateJournalEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  particulars!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceModule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  currencyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiPropertyOptional({ description: "Cle d'idempotence metier (ex: sale:1042)" })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ type: [LedgerLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LedgerLineDto)
  lines!: LedgerLineDto[];
}

export class ReverseEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ApprovalRequirementDto {
  @ApiProperty({ example: "farmos_expense" })
  @IsString()
  @IsNotEmpty()
  sourceModule!: string;

  @ApiPropertyOptional({ example: "exp_approval" })
  @IsOptional()
  @IsString()
  workflowKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePeriodDto {
  @ApiProperty({ example: "2026-Q2" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "2026-04-01" })
  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: "2026-06-30" })
  @IsString()
  @IsNotEmpty()
  endDate!: string;
}

export class PostByRulesDto {
  @ApiProperty({ description: "Type metier (ex: sale, purchase)" })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: "Montants par role (ex: { receivable: 116, revenue: 100, vat_output: 16 })" })
  @IsObject()
  @IsNotEmpty()
  amountsByRole!: Record<string, number>;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  particulars!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  currencyId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
