import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateCustomerDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ example: "john@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "1234567890" })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: "123 Main St" })
  @IsOptional()
  @IsString()
  address?: string | null;
}

export class UpdateCustomerDto extends CreateCustomerDto {
  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCustomerStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class CustomerQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all" | "info" | "search" | "report";

  @ApiPropertyOptional({ example: "john" })
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
