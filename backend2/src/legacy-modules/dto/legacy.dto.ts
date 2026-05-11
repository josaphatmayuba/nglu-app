import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class LegacyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  [key: string]: any;
}
