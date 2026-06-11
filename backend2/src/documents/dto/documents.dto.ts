import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class DocumentLinkDto {
  @ApiProperty() @IsString() @IsNotEmpty() entityType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() entityId!: string;
}

export class CreateDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mimeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contentHash?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sizeBytes?: number;

  @ApiPropertyOptional({ type: [DocumentLinkDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DocumentLinkDto)
  links?: DocumentLinkDto[];
}

export class LinkDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() entityType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() entityId!: string;
}
