import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
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

export class UpdateFarmosSpeciesSettingsDto {
  @ApiProperty({ enum: FARMOS_SPECIES, isArray: true })
  @IsArray()
  @IsString({ each: true })
  @IsIn(FARMOS_SPECIES as unknown as string[], { each: true })
  enabled_species: FarmosSpecies[];
}

export class UpsertFarmosPriceDto {
  @ApiPropertyOptional({ example: "production", enum: ["animal", "production", "stock", "other"] })
  @IsOptional()
  @IsString()
  sale_source?: string | null;

  @ApiPropertyOptional({ enum: FARMOS_SPECIES })
  @IsOptional()
  @IsString()
  @IsIn(FARMOS_SPECIES as unknown as string[])
  species?: FarmosSpecies | null;

  @ApiProperty({ example: "eggs" })
  @IsString()
  @IsNotEmpty()
  product_type: string;

  @ApiPropertyOptional({ example: "oeufs" })
  @IsOptional()
  @IsString()
  unit?: string | null;

  @ApiProperty({ example: 0.25 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currency_id?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

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

  @ApiPropertyOptional({ example: "Salle 3", description: "Salle/room within the building." })
  @IsOptional()
  @IsString()
  room?: string | null;

  @ApiPropertyOptional({ example: "Truie", description: "Animal type/classification (e.g. pig: truie, verrat, porcelet)." })
  @IsOptional()
  @IsString()
  type?: string | null;

  @ApiPropertyOptional({ example: "healthy", default: "healthy" })
  @IsOptional()
  @IsString()
  status?: string | null;

  @ApiPropertyOptional({ example: "BQ-2022-0007", description: "Mère (external_id ou nom de l'animal mère)." })
  @IsOptional()
  @IsString()
  mother_id?: string | null;

  @ApiPropertyOptional({ example: "BQ-2021-0003", description: "Père (external_id ou nom de l'animal père)." })
  @IsOptional()
  @IsString()
  father_id?: string | null;

  @ApiPropertyOptional({ example: 1500, description: "Valeur estimée de l'animal." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimated_value?: number | null;

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
  @ApiPropertyOptional() @IsOptional() @IsString() room?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() mother_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() father_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimated_value?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() last_event?: string | null;
}

export class ImportAnimalsDto {
  @ApiProperty({ type: [CreateAnimalDto], description: "Lignes d'animaux à importer (issues d'un CSV mappé côté client)." })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnimalDto)
  rows: CreateAnimalDto[];

  @ApiPropertyOptional({ default: false, description: "Import test : valide et détecte les doublons sans rien écrire." })
  @IsOptional()
  dryRun?: boolean;
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

  @ApiPropertyOptional({ example: 12, description: "Lien vers le fournisseur central (compta)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplier_id?: number | null;

  @ApiPropertyOptional({ example: "2027-03-01" })
  @IsOptional()
  @IsDateString()
  expiry_date?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: ["cow", "pig"], description: "Espèces concernées. Vide/absent = toutes espèces." })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  species?: string[] | null;
}

export class CreateVaccinationDto {
  @ApiProperty({ example: "cow", enum: FARMOS_SPECIES })
  @IsString() species: string;
  @ApiProperty({ example: "Newcastle" }) @IsString() @IsNotEmpty() vaccine: string;
  @ApiProperty() @IsDateString() due_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() target?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_count?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class VetPrescriptionDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() medicine_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() medicine_name?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() dosage?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() duration?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() route?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_meat_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_milk_hours?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() withdrawal_eggs_days?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class CreateVetExamDto {
  @ApiProperty() @IsDateString() exam_date: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() species?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() vet?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() vet_user_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() exam_type?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() clinical_exam?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() protocol?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() temperature?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() weight?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() diagnosis?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional({ type: [VetPrescriptionDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VetPrescriptionDto)
  prescriptions?: VetPrescriptionDto[];
}

export class SignVetExamDto {
  @ApiProperty() @IsString() @IsNotEmpty() signature: string;
  @ApiPropertyOptional() @IsOptional() @IsString() signed_by?: string | null;
}

export class UpsertFarmosBuildingDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() species?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() capacity?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() temperature?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() humidity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() manager?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() hygiene_status?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() zone_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pos_x?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pos_y?: number | null;
}

export class CreateFarmosDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty() @IsString() @IsNotEmpty() data_url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doc_type?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() exam_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() filename?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() content_type?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() size_bytes?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issued_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class CreateMortalityEventDto {
  @ApiProperty() @IsString() species: string;
  @ApiProperty() @IsDateString() event_date: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) count?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cause?: string | null;
  @ApiPropertyOptional({ default: false }) @IsOptional() necropsy_requested?: boolean;
  @ApiPropertyOptional({ example: "06:30" }) @IsOptional() @IsString() event_time?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() barn?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() lot?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() confirmed_cause?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() related_disease_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() pre_death_symptoms?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() vet_consulted?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimated_loss?: number | null;
  @ApiPropertyOptional({ default: false }) @IsOptional() necropsy_done?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class CreateWeighingDto {
  @ApiProperty() @Type(() => Number) @IsInt() animal_id: number;
  @ApiProperty({ example: "2026-06-10" }) @IsDateString() weigh_date: string;
  @ApiProperty({ example: 612 }) @Type(() => Number) @IsNumber() @Min(0) weight: number;
  @ApiPropertyOptional({ default: "kg" }) @IsOptional() @IsString() weight_unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

export class UpdateFarmosStaffDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string | null;
  @ApiPropertyOptional({ example: "Vétérinaire" }) @IsOptional() @IsString() designation?: string | null;
  @ApiPropertyOptional({ description: "Rôle CRM (permissions) à assigner." }) @IsOptional() @Type(() => Number) @IsInt() role_id?: number | null;
}

export class SetFarmosStaffStatusDto {
  @ApiProperty({ enum: ["active", "left", "resigned"], example: "resigned" })
  @IsIn(["active", "left", "resigned"])
  status: "active" | "left" | "resigned";

  @ApiPropertyOptional({ example: "2026-06-30" }) @IsOptional() @IsDateString() leave_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() leave_reason?: string | null;
}

export class CreateWorkLogDto {
  @ApiProperty() @IsDateString() work_date: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() user_id?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional({ description: "Optionnel : ventilation par tâche.", type: [Object] })
  @IsOptional() @IsArray() tasks?: any[] | null;
}

export class CreateFarmosStaffDto {
  @ApiProperty() @IsString() @IsNotEmpty() email: string;
  @ApiProperty({ example: "Vétérinaire" }) @IsString() @IsNotEmpty() designation: string;
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ description: "Min 12 chars. Si omis, un mot de passe est généré et retourné une fois." })
  @IsOptional() @IsString() password?: string;
}

export class ConsumeMedicineDto {
  @ApiProperty({ example: 5, description: "Quantity to deduct from current stock." })
  @Type(() => Number) @IsNumber() @Min(0.001)
  quantity: number;
}

export class UpdateMedicineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kind?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) min_quantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() supplier_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiry_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) species?: string[] | null;
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

  @ApiPropertyOptional() @IsOptional() @IsString() urgency_level?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() symptoms?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() prevention?: string | null;
  @ApiPropertyOptional() @IsOptional() vaccine_available?: boolean | number;
  @ApiPropertyOptional() @IsOptional() @IsString() mortality_risk?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() recommended_protocol?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() possible_causes?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() recommended_exams?: string | null;

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
  @ApiPropertyOptional() @IsOptional() @IsString() urgency_level?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() symptoms?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() prevention?: string | null;
  @ApiPropertyOptional() @IsOptional() vaccine_available?: boolean | number;
  @ApiPropertyOptional() @IsOptional() @IsString() mortality_risk?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() recommended_protocol?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() possible_causes?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() recommended_exams?: string | null;
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
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() medicine_quantity?: number | null;
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
  @ApiPropertyOptional({ example: "production", enum: ["animal", "production", "stock", "other"] }) @IsOptional() @IsString() sale_source?: string | null;
  @ApiProperty() @Type(() => Number) @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() unit_price?: number | null;
  @ApiProperty() @Type(() => Number) @IsNumber() total_amount: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() buyer?: string | null;
  @ApiProperty() @IsDateString() sale_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}

// ─── Expenses ────────────────────────────────────────────────────────────
export class CreateExpenseDto {
  @ApiProperty({ example: "feed" }) @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() quantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() supplier?: string | null;
  @ApiProperty() @IsDateString() expense_date: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() related_animal_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() related_medicine_id?: number | null;
  @ApiPropertyOptional({ description: "Projet/bailleur (axe analytique)." }) @IsOptional() @Type(() => Number) @IsInt() project_id?: number | null;
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
  @ApiPropertyOptional({ enum: ["ai", "natural", "unknown"] })
    @IsOptional() @IsString() @IsIn(["ai", "natural", "unknown"]) breeding_type?: string | null;
  @ApiPropertyOptional({ description: "Paillette utilisée (banque de semence). Décrémente straws_remaining." })
    @IsOptional() @Type(() => Number) @IsInt() sire_straw_id?: number | null;
  @ApiPropertyOptional({ description: "Mâle du troupeau utilisé pour saillie naturelle." })
    @IsOptional() @Type(() => Number) @IsInt() sire_animal_id?: number | null;
}

// ─── Semen straws (banque de semence pour IA) ───────────────────────────
export class CreateSemenStrawDto {
  @ApiProperty({ example: "CIAQ-HOLM-1H10567" }) @IsString() code: string;
  @ApiProperty() @IsString() sire_name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sire_registration?: string | null;
  @ApiProperty({ enum: FARMOS_SPECIES }) @IsString() @IsIn(FARMOS_SPECIES as unknown as string[]) species: string;
  @ApiPropertyOptional() @IsOptional() @IsString() breed?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() supplier_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() collection_center?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() collection_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() batch_number?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() motility_pct?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() concentration_million_per_ml?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() straws_per_dose?: number | null;
  @ApiPropertyOptional({ description: "Traits génétiques (JSON libre, ex: {milk_kg:1200, longevity:105})" })
    @IsOptional() genetic_traits?: Record<string, unknown> | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiProperty() @Type(() => Number) @IsInt() straws_total: number;
  @ApiPropertyOptional({ description: "Si omis, initialisé à straws_total." })
    @IsOptional() @Type(() => Number) @IsInt() straws_remaining?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() tank_location?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) price_per_dose?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
}

export class UpdateSemenStrawDto {
  @ApiPropertyOptional() @IsOptional() @IsString() sire_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sire_registration?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() breed?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() supplier_id?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() collection_center?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsDateString() collection_date?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() batch_number?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() motility_pct?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() concentration_million_per_ml?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() straws_per_dose?: number | null;
  @ApiPropertyOptional() @IsOptional() genetic_traits?: Record<string, unknown> | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() straws_total?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() straws_remaining?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() tank_location?: string | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) price_per_dose?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() currency_id?: number | null;
  @ApiPropertyOptional({ enum: ["active", "archived"] })
    @IsOptional() @IsString() @IsIn(["active", "archived"]) status?: string;
}

// ─── Production logs ─────────────────────────────────────────────────────
export class CreateProductionLogDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() animal_id?: number | null;
  @ApiPropertyOptional({ description: "Bâtiment (poulailler) source de la récolte." }) @IsOptional() @Type(() => Number) @IsInt() building_id?: number | null;
  @ApiProperty({ enum: FARMOS_SPECIES }) @IsString() @IsIn(FARMOS_SPECIES as unknown as string[]) species: string;
  @ApiProperty({ example: "milk" }) @IsString() product_type: string;
  @ApiProperty() @IsDateString() log_date: string;
  @ApiPropertyOptional() @IsOptional() @IsString() period?: string | null;
  @ApiProperty() @Type(() => Number) @IsNumber() quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string | null;
  @ApiPropertyOptional({ description: "Free-form quality JSON: fat, protein, conductivity, broken, size, lay_rate…" })
  @IsOptional() quality?: Record<string, unknown> | null;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string | null;
}
