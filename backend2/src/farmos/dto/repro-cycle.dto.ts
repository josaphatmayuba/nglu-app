import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString } from "class-validator";

// ─── Registre de reproduction porcine — cycles (Etape 1) ─────────────────
// Un cycle = une truie, de la saillie initiale au sevrage. createCycle ne
// couvre que la saillie ; updateCycle ajoute diagnostic / mise bas / sevrage
// au fil de l'eau sur le meme cycle (jamais d'ecrasement, jamais de DELETE).

export class CreateReproCycleDto {
  @ApiProperty({ description: "Truie (farmos_animals.id)." })
  @Type(() => Number)
  @IsInt()
  sow_id: number;

  @ApiProperty({ description: "Date de la saillie initiale." })
  @IsDateString()
  mating_date: string;

  @ApiPropertyOptional({ description: "Male du troupeau utilise pour saillie naturelle." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sire_animal_id?: number | null;

  @ApiPropertyOptional({ description: "Paillette utilisee (banque de semence)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sire_straw_id?: number | null;

  @ApiPropertyOptional({ enum: ["natural", "insemination"] })
  @IsOptional()
  @IsString()
  @IsIn(["natural", "insemination"])
  breeding_type?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateReproCycleDto {
  @ApiPropertyOptional({ description: "Date du diagnostic de gestation." })
  @IsOptional()
  @IsDateString()
  diagnosis_date?: string | null;

  @ApiPropertyOptional({ enum: ["pregnant", "empty", "doubtful"] })
  @IsOptional()
  @IsString()
  @IsIn(["pregnant", "empty", "doubtful"])
  diagnosis_result?: string | null;

  @ApiPropertyOptional({ description: "Date de mise bas." })
  @IsOptional()
  @IsDateString()
  farrowing_date?: string | null;

  @ApiPropertyOptional({ description: "Nombre de nes vivants (mise bas)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offspring_count?: number | null;

  @ApiPropertyOptional({ description: "Date de sevrage." })
  @IsOptional()
  @IsDateString()
  weaning_date?: string | null;

  @ApiPropertyOptional({ description: "Nombre de sevres." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  weaned_count?: number | null;

  @ApiPropertyOptional({ enum: ["in_progress", "farrowed", "weaned", "aborted", "not_pregnant", "culled"] })
  @IsOptional()
  @IsString()
  @IsIn(["in_progress", "farrowed", "weaned", "aborted", "not_pregnant", "culled"])
  outcome?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class SowWatchlistQueryDto {
  @ApiPropertyOptional({ description: "Filtre par batiment/barn." })
  @IsOptional()
  @IsString()
  site?: string;

  @ApiPropertyOptional({ enum: ["nulliparous", "mated", "pregnant", "lactating", "empty", "culled"] })
  @IsOptional()
  @IsString()
  @IsIn(["nulliparous", "mated", "pregnant", "lactating", "empty", "culled"])
  status?: string;

  @ApiPropertyOptional({ description: "Nombre minimum de jours non productifs." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minDays?: number;
}
