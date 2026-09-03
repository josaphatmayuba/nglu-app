import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export const KT_QR_CODE_TYPES = ["table", "zone", "counter"] as const;
export type KtQrCodeType = (typeof KT_QR_CODE_TYPES)[number];

export class CreateQrCodeDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  branchId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ enum: KT_QR_CODE_TYPES })
  @IsOptional()
  @IsEnum(KT_QR_CODE_TYPES)
  type?: KtQrCodeType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug!: string;
}

export class UpdateQrCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiPropertyOptional({ enum: KT_QR_CODE_TYPES })
  @IsOptional()
  @IsEnum(KT_QR_CODE_TYPES)
  type?: KtQrCodeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;
}
