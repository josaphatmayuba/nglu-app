import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class GenericStatusDto {
  @ApiPropertyOptional({ example: "false" })
  @IsOptional()
  @IsString()
  status?: string;
}

export class NameStatusDto extends GenericStatusDto {
  @ApiPropertyOptional({ example: "Administration" })
  @IsOptional()
  @IsString()
  name?: string;
}

export class EmploymentStatusDto extends NameStatusDto {
  @ApiPropertyOptional({ example: "#22c55e" })
  @IsOptional()
  @IsString()
  colourValue?: string;

  @ApiPropertyOptional({ example: "Employé actif" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class EducationDto extends GenericStatusDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ example: "Licence" })
  @IsOptional()
  @IsString()
  degree?: string;

  @ApiPropertyOptional({ example: "Université" })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({ example: "Finance" })
  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: "Distinction" })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ example: "2020-01-01" })
  @IsOptional()
  @IsString()
  studyStartDate?: string;

  @ApiPropertyOptional({ example: "2023-01-01" })
  @IsOptional()
  @IsString()
  studyEndDate?: string;
}

export class ColorDto extends NameStatusDto {
  @ApiPropertyOptional({ example: "#ff0000" })
  @IsOptional()
  @IsString()
  colorCode?: string;
}

export class ProductAttributeValueDto extends NameStatusDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  productAttributeId?: number;
}

export class TermsAndConditionDto extends GenericStatusDto {
  @ApiPropertyOptional({ example: "Conditions générales" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: "Texte des conditions" })
  @IsOptional()
  @IsString()
  subject?: string;
}

export class PageSizeDto extends GenericStatusDto {
  @ApiPropertyOptional({ example: "A4" })
  @IsOptional()
  @IsString()
  pageSizeName?: string;

  @ApiPropertyOptional({ example: 8.27 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 11.69 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: "inches" })
  @IsOptional()
  @IsString()
  unit?: string;
}
