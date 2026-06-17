import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateSubAccountDto {
  @ApiProperty({ example: "Petty Cash" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  accountId: number;
}

export class UpdateSubAccountDto {
  @ApiPropertyOptional({ example: "Petty Cash" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  accountId?: number;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateSubAccountStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class AccountQueryDto {
  @ApiPropertyOptional({ example: "ma" })
  @IsOptional()
  @IsString()
  query?: "ma" | "tb" | "bs" | "is" | "all" | "search";

  @ApiPropertyOptional({ example: "sa" })
  @IsOptional()
  @IsString()
  type?: "sa";

  @ApiPropertyOptional({ example: "Cash" })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: "true,false" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1,2" })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: "2026-01-01", description: "Borne basse (incluse) sur la date des ecritures" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31", description: "Borne haute (incluse) sur la date des ecritures" })
  @IsOptional()
  @IsString()
  endDate?: string;
}
