import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

export class PublicOrderLineInputDto {
  @ApiProperty()
  @IsInt()
  productId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty()
  @IsPositive()
  qty!: number;

  @ApiPropertyOptional({ type: [Number], description: "Ids des modificateurs choisis." })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  modifierIds?: number[];
}

export class CreatePublicOrderDto {
  @ApiProperty({ description: "Jeton opaque du QR code scanne." })
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  @ApiProperty({ description: "UUID genere cote client pour l'idempotence." })
  @IsUUID()
  clientUuid!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ type: [PublicOrderLineInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PublicOrderLineInputDto)
  lines!: PublicOrderLineInputDto[];
}
