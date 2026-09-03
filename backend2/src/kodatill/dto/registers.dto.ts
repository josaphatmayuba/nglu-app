import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class CreateRegisterDto {
  @ApiProperty()
  @IsInt()
  branchId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class UpdateRegisterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class PairWithCodeDto {
  @ApiProperty({ description: "Code numerique a 6 chiffres affiche sur la caisse principale" })
  @IsString()
  @Length(6, 6)
  pairingCode!: string;
}
