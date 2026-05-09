import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

const discountTypes = ["percentage", "flat", "flashSale"] as const;

export class CreateDiscountDto {
  @ApiProperty({ example: "10" })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ example: "percentage", enum: discountTypes })
  @IsIn(discountTypes)
  type: (typeof discountTypes)[number];

  @ApiProperty({ example: "2026-05-01" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2026-05-31" })
  @IsDateString()
  endDate: string;
}

export class UpdateDiscountDto {
  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ example: "percentage", enum: discountTypes })
  @IsOptional()
  @IsIn(discountTypes)
  type?: (typeof discountTypes)[number];

  @ApiPropertyOptional({ example: "2026-05-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-05-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateDiscountStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class DiscountQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all";

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
