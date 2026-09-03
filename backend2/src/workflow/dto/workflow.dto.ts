import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class WorkflowStepDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permission?: string;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: "purchase_expense" })
  @IsString()
  @IsNotEmpty()
  key!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}

export class SubmitWorkflowDto {
  @ApiProperty({ example: "purchase_expense" })
  @IsString()
  @IsNotEmpty()
  workflowKey!: string;

  @ApiProperty({ example: "purchase_invoice" })
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiProperty({ example: "1042" })
  @IsString()
  @IsNotEmpty()
  entityId!: string;
}

export class DecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
