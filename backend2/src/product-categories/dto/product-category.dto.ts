import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateProductCategoryDto {
  @ApiProperty({ example: "Electronics" })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateProductCategoryDto {
  @ApiPropertyOptional({ example: "Electronics" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}
