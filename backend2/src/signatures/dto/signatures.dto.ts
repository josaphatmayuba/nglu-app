import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSignatureRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
}

export class SignDto {
  @ApiProperty({ enum: ["bianca", "liam"] })
  @IsString() @IsIn(["bianca", "liam"]) partyKey!: string;

  /** Data URL PNG produit par le canvas ; taille validee dans le service. */
  @ApiProperty() @IsString() @IsNotEmpty() signatureData!: string;

  @ApiPropertyOptional({ description: "Nom de la personne qui signe physiquement" })
  @IsOptional() @IsString() @MaxLength(160) signerName?: string;
}
