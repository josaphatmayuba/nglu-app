import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCurrencyDto {
  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ example: "US Dollar" })
  @IsString()
  @IsNotEmpty()
  currencyName: string;

  @ApiProperty({ example: "$" })
  @IsString()
  @IsNotEmpty()
  currencySymbol: string;
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional({ example: "USD" })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ example: "US Dollar" })
  @IsOptional()
  @IsString()
  currencyName?: string;

  @ApiPropertyOptional({ example: "$" })
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCurrencyStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class CurrencyQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all" | "search";

  @ApiPropertyOptional({ example: "dollar" })
  @IsOptional()
  @IsString()
  key?: string;

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
