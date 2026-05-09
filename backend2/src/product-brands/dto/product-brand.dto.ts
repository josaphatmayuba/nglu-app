import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateProductBrandDto {
  @ApiProperty({ example: "Samsung" })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateProductBrandDto {
  @ApiPropertyOptional({ example: "Samsung" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}
