import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Programme Nutrition 2026" }) @IsString() name: string;
  @ApiPropertyOptional({ example: "NUT-2026" }) @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional({ example: "UNICEF" }) @IsOptional() @IsString() donor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ example: "2026-01-01" }) @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ example: "2026-12-31" }) @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({ example: 50000000 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currencyId?: number;
}

export class UpdateProjectDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() donor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currencyId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
