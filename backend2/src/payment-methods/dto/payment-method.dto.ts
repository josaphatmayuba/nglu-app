import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  subAccountId: number;

  @ApiProperty({ example: "Cash" })
  @IsString()
  @IsNotEmpty()
  methodName: string;

  @ApiPropertyOptional({ example: "cash.png" })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiPropertyOptional({ example: "Main cash drawer" })
  @IsOptional()
  @IsString()
  ownerAccount?: string | null;

  @ApiPropertyOptional({ example: "Use for cash payments" })
  @IsOptional()
  @IsString()
  instruction?: string | null;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  subAccountId?: number;

  @ApiPropertyOptional({ example: "Cash" })
  @IsOptional()
  @IsString()
  methodName?: string;

  @ApiPropertyOptional({ example: "cash.png" })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiPropertyOptional({ example: "Main cash drawer" })
  @IsOptional()
  @IsString()
  ownerAccount?: string | null;

  @ApiPropertyOptional({ example: "Use for cash payments" })
  @IsOptional()
  @IsString()
  instruction?: string | null;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiPropertyOptional({ example: "true" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePaymentMethodStatusDto {
  @ApiProperty({ example: "false" })
  @IsString()
  status: string;
}

export class PaymentMethodQueryDto {
  @ApiPropertyOptional({ example: "all" })
  @IsOptional()
  @IsString()
  query?: "all" | "search";

  @ApiPropertyOptional({ example: "cash" })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({ example: "true" })
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
