import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreateTransactionTypeDto {
  @ApiProperty({ example: "Rent Payment" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  debitAccountId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  creditAccountId: number;

  @ApiPropertyOptional({ example: "Payment for rent" })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
