import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateTransactionDto {
  @ApiProperty({ example: "2026-05-09T10:00:00.000Z" })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  debitId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  creditId: number;

  @ApiProperty({ example: "Manual transaction" })
  @IsString()
  particulars: string;

  @ApiProperty({ example: 125.5 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 1, description: "Devise de la transaction (currency.id)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  currencyId?: number | null;

  @ApiPropertyOptional({ example: "transaction" })
  @IsOptional()
  @IsString()
  type?: string | null;

  @ApiPropertyOptional({ example: "0" })
  @IsOptional()
  @IsString()
  relatedId?: string | null;

  @ApiPropertyOptional({ example: "true", default: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class UpdateTransactionStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "info" | "all" | "inactive" | "search";

  @ApiPropertyOptional({ example: "Rent" })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: "true,false" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1,2" })
  @IsOptional()
  @IsString()
  debitId?: string;

  @ApiPropertyOptional({ example: "1,2" })
  @IsOptional()
  @IsString()
  creditId?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
