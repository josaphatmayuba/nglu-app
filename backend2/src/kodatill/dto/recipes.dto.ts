import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsInt, IsNumber, IsOptional, IsPositive, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class RecipeLineDto {
  @ApiProperty()
  @IsInt()
  ingredientId!: number;

  @ApiProperty({ description: "Quantite exprimee dans la baseUnit de l'ingredient." })
  @IsNumber()
  @IsPositive()
  qtyBase!: number;
}

export class UpsertRecipeDto {
  @ApiPropertyOptional({ description: "Pourcentage de perte applique au cout matiere." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wastePct?: number;

  @ApiPropertyOptional({ description: "Pourcentage de consommables (emballage, etc.) applique au cout." })
  @IsOptional()
  @IsNumber()
  @Min(0)
  consumablePct?: number;

  @ApiProperty({ type: [RecipeLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  lines!: RecipeLineDto[];
}
