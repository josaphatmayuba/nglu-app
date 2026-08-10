import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from "class-validator";

export class OpenCashSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  registerId?: number;

  @ApiProperty()
  @IsInt()
  branchId!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  openingFloat!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;
}

export class CloseCashSessionDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  countedCash!: number;
}

export class CreateCashMovementDto {
  @ApiProperty({ enum: ["in", "out"] })
  @IsIn(["in", "out"])
  type!: "in" | "out";

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
