import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

// Le symbole est affiche tel quel dans le CRM : pas de balise ni d entite HTML.
const SAFE_SYMBOL = /^[^<>"'&\s][^<>"'&]*$/;

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
  @MaxLength(8)
  @Matches(SAFE_SYMBOL)
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
  @MaxLength(8)
  @Matches(SAFE_SYMBOL)
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

export class BulkUpdateCurrencyStatusDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];

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
