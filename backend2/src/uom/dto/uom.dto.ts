import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUomDto {
  @ApiProperty({ example: "Kilogram" })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateUomDto {
  @ApiPropertyOptional({ example: "Kilogram" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}
