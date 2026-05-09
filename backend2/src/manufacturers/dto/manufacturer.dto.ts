import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateManufacturerDto {
  @ApiProperty({ example: "Acme Corp" })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateManufacturerDto {
  @ApiPropertyOptional({ example: "Acme Corp" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}
