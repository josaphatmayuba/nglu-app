import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class SaleInvoiceProductItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  productQuantity: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  productUnitSalePrice: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  productDiscount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class PaymentItemDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1, description: "subAccount id for payment type (default 1 = cash)" })
  @IsOptional()
  @IsInt()
  paymentType?: number;
}

export class CreateSaleInvoiceDto {
  @ApiProperty({ example: "2024-01-15" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  customerId: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id. Defaults to the company's appSetting.currencyId when omitted." })
  @IsOptional()
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ type: [SaleInvoiceProductItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleInvoiceProductItemDto)
  saleInvoiceProduct: SaleInvoiceProductItemDto[];

  @ApiPropertyOptional({ type: [PaymentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  paidAmount?: PaymentItemDto[];

  @ApiPropertyOptional({ example: "INV-001" })
  @IsOptional()
  @IsString()
  invoiceMemoNo?: string;

  @ApiPropertyOptional({ example: "Thank you for your purchase" })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: "2024-02-15" })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ example: "Payment due within 30 days" })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}

export class UpdateSaleInvoiceDto {
  @ApiPropertyOptional({ example: "2024-01-15" })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  customerId?: number;

  @ApiPropertyOptional({ example: "INV-001" })
  @IsOptional()
  @IsString()
  invoiceMemoNo?: string;

  @ApiPropertyOptional({ example: "Thank you" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateHoldDto {
  @ApiProperty({ example: "true" })
  @IsString()
  @IsNotEmpty()
  isHold: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ example: "completed" })
  @IsString()
  @IsNotEmpty()
  orderStatus: string;

  @ApiProperty({ example: "SI-XXXXXXXXXXXXX" })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class CreatePaymentSaleInvoiceDto {
  @ApiProperty({ example: "2024-01-15" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: "SI-XXXXXXXXXXXXX" })
  @IsString()
  @IsNotEmpty()
  saleInvoiceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
