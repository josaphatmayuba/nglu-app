import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class ListStockQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: ["ok", "low", "out"] })
  @IsOptional()
  @IsIn(["ok", "low", "out"])
  state?: "ok" | "low" | "out";
}

export class RestockDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  qty!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;
}

export class AdjustStockDto {
  @ApiProperty({ description: "Ecart applique a la quantite, peut etre negatif." })
  @IsNumber()
  delta!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
