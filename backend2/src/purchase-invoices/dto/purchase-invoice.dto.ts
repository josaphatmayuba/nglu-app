import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class PurchaseInvoiceProductItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  productQuantity: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  productUnitPurchasePrice: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  productUnitSalePrice?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class PurchasePaymentItemDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1, description: "subAccount id for payment type (default 1 = cash)" })
  @IsOptional()
  @IsInt()
  paymentType?: number;
}

export class CreatePurchaseInvoiceDto {
  @ApiProperty({ example: "2024-01-15" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  supplierId: number;

  @ApiPropertyOptional({ type: [PurchaseInvoiceProductItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceProductItemDto)
  purchaseInvoiceProduct?: PurchaseInvoiceProductItemDto[];

  @ApiPropertyOptional({ type: [PurchasePaymentItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchasePaymentItemDto)
  paidAmount?: PurchasePaymentItemDto[];

  @ApiPropertyOptional({ example: "PI-001" })
  @IsOptional()
  @IsString()
  invoiceMemoNo?: string;

  @ApiPropertyOptional({ example: "SUP-001" })
  @IsOptional()
  @IsString()
  supplierMemoNo?: string;

  @ApiPropertyOptional({ example: "Purchase note" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePaymentPurchaseInvoiceDto {
  @ApiProperty({ example: "2024-01-15" })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: "P_XXXXXXXXXXXXX" })
  @IsString()
  @IsNotEmpty()
  purchaseInvoiceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
