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
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

export const ORDER_STATUSES = [
  "draft",
  "received",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export class OrderLineInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  qty!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lineDiscount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  /** Marque la ligne pour suppression lors d'un PATCH lines. */
  @ApiPropertyOptional()
  @IsOptional()
  remove?: boolean;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsInt()
  branchId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  registerId?: number;

  @ApiPropertyOptional({ enum: ["pos", "qr", "mobile", "kitchen"] })
  @IsOptional()
  @IsIn(["pos", "qr", "mobile", "kitchen"])
  channel?: "pos" | "qr" | "mobile" | "kitchen";

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  tableId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ description: "UUID genere cote client (POS offline) pour idempotence." })
  @IsUUID()
  clientUuid!: string;

  @ApiPropertyOptional({ type: [OrderLineInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines?: OrderLineInputDto[];
}

export class UpdateOrderLinesDto {
  @ApiProperty({ type: [OrderLineInputDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => OrderLineInputDto)
  lines!: OrderLineInputDto[];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}

export class CreateOrderPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  methodId?: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayStatus?: string;
}

export const KITCHEN_LINE_STATUSES = ["pending", "preparing", "ready", "served"] as const;
export type KitchenLineStatus = (typeof KITCHEN_LINE_STATUSES)[number];

export class UpdateKitchenLineStatusDto {
  @ApiProperty({ enum: KITCHEN_LINE_STATUSES })
  @IsIn(KITCHEN_LINE_STATUSES)
  status!: KitchenLineStatus;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;
}
