import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from "class-validator";

export class CreateWarehouseDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() siteId?: number;
}

export class POLineDto {
  @ApiProperty() @IsInt() productId!: number;
  @ApiProperty() @IsNumber() @IsPositive() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitPrice?: number;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() supplierId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() warehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() currencyId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;

  @ApiProperty({ type: [POLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => POLineDto)
  lines!: POLineDto[];
}

export class SetOrderStatusDto {
  @ApiProperty({ enum: ["draft", "ordered", "received", "cancelled"] })
  @IsIn(["draft", "ordered", "received", "cancelled"])
  status!: string;
}

export class ReceiveLineDto {
  @ApiProperty() @IsInt() productId!: number;
  @ApiProperty() @IsNumber() @IsPositive() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() purchaseOrderLineId?: number;
}

export class ReceiveOrderDto {
  @ApiProperty() @IsInt() warehouseId!: number;
  @ApiProperty({ type: [ReceiveLineDto] })
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ReceiveLineDto)
  lines!: ReceiveLineDto[];
}

export class CreateMovementDto {
  @ApiProperty() @IsInt() warehouseId!: number;
  @ApiProperty() @IsInt() productId!: number;
  @ApiProperty({ enum: ["IN", "OUT", "ADJUST"] }) @IsIn(["IN", "OUT", "ADJUST"]) movementType!: "IN" | "OUT" | "ADJUST";
  @ApiProperty() @IsNumber() @IsPositive() quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
