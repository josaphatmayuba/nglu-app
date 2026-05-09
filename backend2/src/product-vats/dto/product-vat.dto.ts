import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateProductVatDto {
  @ApiProperty({ example: "VAT 15%" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @Min(0)
  percentage: number;
}

export class UpdateProductVatDto {
  @ApiPropertyOptional({ example: "VAT 15%" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}
