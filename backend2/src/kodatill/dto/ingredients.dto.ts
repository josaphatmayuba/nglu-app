import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateIngredientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: ["kg", "L", "piece"] })
  @IsOptional()
  @IsIn(["kg", "L", "piece"])
  purchaseUnit?: "kg" | "L" | "piece";

  @ApiPropertyOptional({ enum: ["g", "ml", "piece"] })
  @IsOptional()
  @IsIn(["g", "ml", "piece"])
  baseUnit?: "g" | "ml" | "piece";

  @ApiPropertyOptional({ description: "Facteur de conversion purchaseUnit -> baseUnit (ex: kg -> g = 1000)." })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  unitFactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQty?: number;
}

export class UpdateIngredientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: ["kg", "L", "piece"] })
  @IsOptional()
  @IsIn(["kg", "L", "piece"])
  purchaseUnit?: "kg" | "L" | "piece";

  @ApiPropertyOptional({ enum: ["g", "ml", "piece"] })
  @IsOptional()
  @IsIn(["g", "ml", "piece"])
  baseUnit?: "g" | "ml" | "piece";

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  unitFactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentQty?: number;
}
