import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

const PAYMENT_METHOD_KINDS = ["cash", "card", "mobile", "voucher", "credit"] as const;
type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export class CreatePaymentMethodDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHOD_KINDS })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_KINDS)
  kind?: PaymentMethodKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHOD_KINDS })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_KINDS)
  kind?: PaymentMethodKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresReference?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
