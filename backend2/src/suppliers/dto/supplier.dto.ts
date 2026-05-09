import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ example: "Acme Supplies" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "1234567890" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: "123 Supplier St" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "supplier@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: "Acme Supplies" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "123 Supplier St" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "supplier@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;
}

export class UpdateSupplierStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class SupplierQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all" | "info" | "search" | "report";

  @ApiPropertyOptional({ example: "acme" })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: "true,false" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  limit?: string;
}
