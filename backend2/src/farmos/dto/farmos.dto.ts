import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export const FARMOS_SPECIES = [
  "cow",
  "pig",
  "chicken",
  "fish",
  "goat",
  "sheep",
  "rabbit",
  "duck",
  "turkey",
] as const;

export type FarmosSpecies = (typeof FARMOS_SPECIES)[number];

export class CreateAnimalDto {
  @ApiPropertyOptional({ example: "BQ-2024-0118" })
  @IsOptional()
  @IsString()
  external_id?: string | null;

  @ApiPropertyOptional({ example: "Marguerite" })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiProperty({ example: "cow", enum: FARMOS_SPECIES })
  @IsString()
  @IsIn(FARMOS_SPECIES as unknown as string[])
  species: FarmosSpecies;

  @ApiPropertyOptional({ example: "Holstein" })
  @IsOptional()
  @IsString()
  race?: string | null;

  @ApiPropertyOptional({ example: "F" })
  @IsOptional()
  @IsString()
  sex?: string | null;

  @ApiPropertyOptional({ example: "2021-03-14" })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string | null;

  @ApiPropertyOptional({ example: 612 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number | null;

  @ApiPropertyOptional({ example: "kg", default: "kg" })
  @IsOptional()
  @IsString()
  weight_unit?: string | null;

  @ApiPropertyOptional({ example: 4200, description: "Nombre d'animaux pour les lots (poulets, canards, dindes, poissons)." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  count?: number | null;

  @ApiPropertyOptional({ example: "Lot A" })
  @IsOptional()
  @IsString()
  lot?: string | null;

  @ApiPropertyOptional({ example: "Étable 1" })
  @IsOptional()
  @IsString()
  barn?: string | null;

  @ApiPropertyOptional({ example: "healthy", default: "healthy" })
  @IsOptional()
  @IsString()
  status?: string | null;

  @ApiPropertyOptional({ example: "Insémination · 14 déc." })
  @IsOptional()
  @IsString()
  last_event?: string | null;
}

export class UpdateAnimalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() external_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string | null;
  @ApiPropertyOptional({ enum: FARMOS_SPECIES }) @IsOptional() @IsString() @IsIn(FARMOS_SPECIES as unknown as string[]) species?: FarmosSpecies;
  @ApiPropertyOptional() @IsOptional() @IsString() race?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() sex?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date_of_birth?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weight?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() weight_unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) count?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() lot?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() barn?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() last_event?: string | null;
}

export class CreateMedicineDto {
  @ApiProperty({ example: "Mastijet Fort" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "med", default: "med" })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiProperty({ example: 18 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: "tubes" })
  @IsOptional()
  @IsString()
  unit?: string | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_quantity?: number | null;

  @ApiPropertyOptional({ example: "Vétoquinol" })
  @IsOptional()
  @IsString()
  supplier?: string | null;

  @ApiPropertyOptional({ example: "2027-03-01" })
  @IsOptional()
  @IsDateString()
  expiry_date?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateMedicineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kind?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) min_quantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiry_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class CreateDiseaseDto {
  @ApiProperty({ example: "cow", enum: FARMOS_SPECIES })
  @IsString()
  @IsIn(FARMOS_SPECIES as unknown as string[])
  species: FarmosSpecies;

  @ApiProperty({ example: "Mammite" })
  @IsString()
  @IsNotEmpty()
  name_fr: string;

  @ApiPropertyOptional({ example: "Mastitis" })
  @IsOptional()
  @IsString()
  name_en?: string | null;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  contagious?: boolean | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity_default?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  common_route?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateDiseaseDto {
  @ApiPropertyOptional({ enum: FARMOS_SPECIES }) @IsOptional() @IsString() @IsIn(FARMOS_SPECIES as unknown as string[]) species?: FarmosSpecies;
  @ApiPropertyOptional() @IsOptional() @IsString() name_fr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_en?: string | null;
  @ApiPropertyOptional() @IsOptional() contagious?: boolean | number;
  @ApiPropertyOptional() @IsOptional() @IsString() severity_default?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() common_route?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class CreateTreatmentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  animal_id: number;

  @ApiProperty({ example: 5, description: "FK vers farmos_diseases" })
  @Type(() => Number)
  @IsInt()
  disease_id: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() medicine_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() medicine_name?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() dosage?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() end_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() vet?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_meat_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_milk_hours?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_eggs_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class UpdateTreatmentDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() disease_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() medicine_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() medicine_name?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() dosage?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() start_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() end_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() vet?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_meat_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_milk_hours?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_eggs_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

// ─── Sales ───────────────────────────────────────────────────────────────
export class CreateSaleDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiPropertyOptional({ enum: FARMOS_SPECIES }) @IsOptional() @IsString() species?: string | null;
  @ApiPropertyOptional({ example: "milk" }) @IsOptional() @IsString() product_type?: string | null;
  @ApiProperty() @Type(() => Number) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) unit_price?: number | null;
  @ApiProperty() @Type(() => Number) total_amount: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() buyer?: string | null;
  @ApiProperty() @IsDateString() sale_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

// ─── Expenses ────────────────────────────────────────────────────────────
export class CreateExpenseDto {
  @ApiProperty({ example: "feed" }) @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) quantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiProperty() @Type(() => Number) amount: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string | null;
  @ApiProperty() @IsDateString() expense_date: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() related_animal_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() related_medicine_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

// ─── Reproduction events ─────────────────────────────────────────────────
export class CreateReproductionEventDto {
  @ApiProperty() @Type(() => Number) @IsInt() animal_id: number;
  @ApiProperty({ example: "insemination" }) @IsString() event_type: string;
  @ApiProperty() @IsDateString() event_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partner_external_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expected_due_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() offspring_count?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() outcome?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

// ─── Production logs ─────────────────────────────────────────────────────
export class CreateProductionLogDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiProperty({ enum: FARMOS_SPECIES }) @IsString() @IsIn(FARMOS_SPECIES as unknown as string[]) species: string;
  @ApiProperty({ example: "milk" }) @IsString() product_type: string;
  @ApiProperty() @IsDateString() log_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period?: string | null;
  @ApiProperty() @Type(() => Number) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional({ description: "Free-form quality JSON: fat, protein, conductivity, broken, size, lay_rate…" })
  @IsOptional() quality?: Record<string, unknown> | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}
