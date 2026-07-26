import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Max, Min, ValidateNested, IsDateString } from "class-validator";
import { Type } from "class-transformer";
import type { BatiproLevelGeometry } from "../../database/schema";

export class CreateBatiproProjectDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsString() manager?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
  @IsOptional() @IsNumber() @Min(0) spent?: number;
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsNumber() @Min(0) contract_amount?: number;
  @IsOptional() @IsNumber() @Min(0) billed_amount?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() risk?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBatiproProjectDto extends CreateBatiproProjectDto {
  @IsOptional() @IsString() declare code: string;
  @IsOptional() @IsString() declare name: string;
}

export class CreateBatiproTaskDto {
  @IsOptional() @IsInt() project_id?: number;
  @IsString() label!: string;
  @IsOptional() @IsString() owner?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsDateString() task_date?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBatiproTaskDto extends CreateBatiproTaskDto {
  @IsOptional() @IsString() declare label: string;
}

export class CreateBatiproMaterialDto {
  @IsString() name!: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) stock?: number;
  @IsOptional() @IsNumber() @Min(0) min_stock?: number;
  @IsOptional() @IsNumber() @Min(0) reserved?: number;
  @IsOptional() @IsString() supplier?: string;
  @IsOptional() @IsNumber() supplier_id?: number;
}

export class UpdateBatiproMaterialDto extends CreateBatiproMaterialDto {
  @IsOptional() @IsString() declare name: string;
}

export class CreateBatiproCrewDto {
  @IsString() name!: string;
  @IsOptional() @IsInt() @Min(0) people?: number;
  @IsOptional() @IsString() site?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() lead?: string;
}

export class UpdateBatiproCrewDto extends CreateBatiproCrewDto {
  @IsOptional() @IsString() declare name: string;
}

export class CreateBatiproPhaseDto {
  @IsInt() project_id!: number;
  @IsString() label!: string;
  @IsOptional() @IsInt() @Min(0) position?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
}

export class UpdateBatiproPhaseDto extends CreateBatiproPhaseDto {
  @IsOptional() @IsInt() declare project_id: number;
  @IsOptional() @IsString() declare label: string;
}

export class CreateBatiproSituationDto {
  @IsInt() project_id!: number;
  @IsInt() number!: number;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsString() status?: string;
}

export class UpdateBatiproSituationDto extends CreateBatiproSituationDto {
  @IsOptional() @IsInt() declare project_id: number;
  @IsOptional() @IsInt() declare number: number;
}

export class CreateBatiproChangeOrderDto {
  @IsInt() project_id!: number;
  @IsString() title!: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsInt() @Min(0) delay_days?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBatiproChangeOrderDto extends CreateBatiproChangeOrderDto {
  @IsOptional() @IsInt() declare project_id: number;
  @IsOptional() @IsString() declare title: string;
}

export class CreateBatiproSubcontractorDto {
  @IsString() name!: string;
  @IsOptional() @IsInt() project_id?: number;
  @IsOptional() @IsInt() supplier_id?: number;
  @IsOptional() @IsString() trade?: string;
  @IsOptional() @IsNumber() @Min(0) contract_amount?: number;
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
}

export class UpdateBatiproSubcontractorDto extends CreateBatiproSubcontractorDto {
  @IsOptional() @IsString() declare name: string;
}

export class CreateBatiproBuildingModelDto {
  @IsInt() project_id!: number;
  @IsOptional() @IsString() source_type?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) storey_height?: number;
  @IsOptional() @IsString() roof_type?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBatiproBuildingModelDto extends CreateBatiproBuildingModelDto {
  @IsOptional() @IsInt() declare project_id: number;
}

export class CreateBatiproBuildingLevelDto {
  @IsInt() model_id!: number;
  @IsInt() project_id!: number;
  @IsOptional() @IsInt() level_index?: number;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() elevation?: number;
  @IsOptional() @IsNumber() @Min(0) height?: number;
  @IsOptional() @IsObject() geometry?: BatiproLevelGeometry;
}

export class UpdateBatiproBuildingLevelDto extends CreateBatiproBuildingLevelDto {
  @IsOptional() @IsInt() declare model_id: number;
  @IsOptional() @IsInt() declare project_id: number;
}

/* ── Socle documentaire + portail sous-traitant (Phase 0) ──────────────── */

// Generation d'un lien sous-traitant (cote gestionnaire, authentifie).
export class CreateSubcontractorLinkDto {
  @IsInt() project_id!: number;
  @IsOptional() @IsInt() subcontractor_id?: number; // present = lien nominatif
  @IsOptional() @IsInt() @Min(1) @Max(90) expiry_days?: number; // defaut J+7
}

// Une ligne d'une soumission sous-traitant (formulaire public).
export class SubcontractorLineDto {
  @IsString() @MaxLength(500) designation!: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) unit_price?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vat_rate?: number;
  @IsOptional() @IsInt() phase_id?: number;
}

// Soumission d'un document par un sous-traitant via le token public.
export class SubmitSubcontractorDocumentDto {
  @IsOptional() @IsIn(["quote", "invoice"]) type?: "quote" | "invoice";
  @IsOptional() @IsInt() currency_id?: number;
  // Mode generique : le sous-traitant s'identifie lui-meme.
  @IsOptional() @IsString() @MaxLength(255) submitted_by_name?: string;
  @IsOptional() @IsString() @MaxLength(255) submitted_by_company?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SubcontractorLineDto)
  lines!: SubcontractorLineDto[];
}

// Revue d'une soumission (cote gestionnaire) : validation ou renvoi.
export class ReviewSubmissionDto {
  @IsIn(["validate", "return"]) action!: "validate" | "return";
  @IsOptional() @IsString() @MaxLength(1000) motif?: string;
}

/* ── Documents sortants : devis (Phase 1) ──────────────────────────────── */

// Une ligne d'un devis (cote gestionnaire). Les totaux sont recalcules serveur.
export class DocumentLineDto {
  @IsString() @MaxLength(500) designation!: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) unit_price?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vat_rate?: number;
  @IsOptional() @IsInt() phase_id?: number;
}

// Creation d'un devis ou d'un bon de commande (direction=outbound impose cote
// service). BC (type=purchase_order) peut cibler un fournisseur et/ou un
// sous-traitant existants.
export class CreateBatiproDocumentDto {
  @IsInt() project_id!: number;
  @IsOptional() @IsIn(["quote", "purchase_order", "invoice"]) type?: "quote" | "purchase_order" | "invoice";
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsInt() supplier_id?: number;
  @IsOptional() @IsInt() subcontractor_id?: number;
  @IsOptional() @IsDateString() issue_date?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  // Photo/scan source (batipro_site_photos.id, kind='source_document') dont ce document est issu (scan OCR).
  // Optionnel : si fourni, le document cree est relie a la photo (linkedDocumentId).
  @IsOptional() @IsInt() sourcePhotoId?: number;
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DocumentLineDto)
  lines!: DocumentLineDto[];
}

/* ── Situations de travaux (Phase 3, type=situation, direction=outbound) ──
 * Une situation = decompte periodique d'avancement. Chaque ligne reference une
 * PHASE du chantier + un % d'avancement CUMULE. Le montant de la periode est
 * calcule cote serveur : montant_marche_phase * (%_courant - %_precedent).
 */

// Une ligne de situation : une phase + son % d'avancement cumule courant.
// `contract_amount` optionnel = montant de marche de la phase saisi manuellement
// (sinon deduit du devis parent / des devis acceptes du chantier).
export class SituationLineDto {
  @IsInt() phase_id!: number;
  @IsNumber() @Min(0) @Max(100) progress_pct!: number;
  @IsOptional() @IsNumber() @Min(0) contract_amount?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vat_rate?: number;
  @IsOptional() @IsString() @MaxLength(500) designation?: string;
}

// Creation d'une situation de travaux (documentaire, type=situation).
export class CreateBatiproSituationDocumentDto {
  @IsInt() project_id!: number;
  @IsOptional() @IsString() @MaxLength(100) period?: string;
  @IsOptional() @IsInt() parent_document_id?: number; // devis de reference
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsDateString() issue_date?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SituationLineDto)
  lines!: SituationLineDto[];
}

// Enregistrement d'un reglement (partiel/total) sur une facture (Phase 4).
export class RecordPaymentDto {
  @IsNumber() @Min(0) amount!: number;
}

// Galerie photo de chantier (site + documents sources scannes).
export class UpdateBatiproSitePhotoDto {
  @IsOptional() @IsString() @MaxLength(255) caption?: string;
  @IsOptional() @IsDateString() taken_at?: string;
  @IsOptional() @IsInt() task_id?: number;
}

// Ouvriers nominatifs (pointage/presence), rattaches optionnellement a une equipe.
export class CreateBatiproWorkerDto {
  @IsString() @MaxLength(255) full_name!: string;
  @IsOptional() @IsInt() crew_id?: number;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsNumber() @Min(0) daily_rate?: number;
  @IsOptional() @IsInt() currency_id?: number;
}

export class UpdateBatiproWorkerDto {
  @IsOptional() @IsString() @MaxLength(255) full_name?: string;
  @IsOptional() @IsInt() crew_id?: number;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsNumber() @Min(0) daily_rate?: number;
  @IsOptional() @IsInt() currency_id?: number;
}

// Pointage journalier : une ligne par ouvrier soumise en lot pour une date donnee.
export class AttendanceEntryDto {
  @IsInt() worker_id!: number;
  @IsOptional() @IsIn(["present", "absent", "partiel", "conge"]) status?: string;
  @IsOptional() @IsNumber() @Min(0) hours?: number;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}

export class BulkUpsertAttendanceDto {
  @IsDateString() attendance_date!: string;
  @IsOptional() @IsInt() crew_id?: number;
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class UpdateBatiproAttendanceDto {
  @IsOptional() @IsIn(["present", "absent", "partiel", "conge"]) status?: string;
  @IsOptional() @IsNumber() @Min(0) hours?: number;
  @IsOptional() @IsString() @MaxLength(255) notes?: string;
}

// Mise a jour partielle d'un devis/BC. Si `lines` est fourni, remplace
// l'ensemble des lignes et recalcule les totaux.
export class UpdateBatiproDocumentDto {
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsInt() supplier_id?: number;
  @IsOptional() @IsInt() subcontractor_id?: number;
  @IsOptional() @IsDateString() issue_date?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() @MaxLength(40) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DocumentLineDto)
  lines?: DocumentLineDto[];
}
