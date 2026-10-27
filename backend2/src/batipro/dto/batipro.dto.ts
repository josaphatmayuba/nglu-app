import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsPositive, IsString, MaxLength, MinLength, Max, Min, ValidateNested, IsDateString, Matches, ValidateIf } from "class-validator";
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
  // Ignore par updateProject (risque = calcule serveur via EVM par phase, voir
  // recomputeProjectRisk). Reste accepte a la creation uniquement (valeur initiale
  // "Faible" avant qu'aucune phase/BC n'existe).
  @IsOptional() @IsString() risk?: string;
  @IsOptional() @IsString() notes?: string;
  // Nom du proprietaire (formule d'accueil des SMS). ""/null = effacer.
  @IsOptional() @IsString() @MaxLength(255) owner_name?: string | null;
  // SMS au proprietaire du chantier. null/"" = effacer le numero.
  @ValidateIf((o) => o.owner_phone !== undefined && o.owner_phone !== null && o.owner_phone !== "")
  @IsString() @MaxLength(32) @Matches(/^\+\d{6,15}$/, { message: "owner_phone doit etre au format international (+243...)." })
  owner_phone?: string | null;
  @IsOptional() @IsIn([true, false, 0, 1]) owner_sms_enabled?: boolean | number;
  // Coche : le chantier apparait dans Domus comme bien "en construction".
  @IsOptional() @IsIn([true, false, 0, 1]) domus_visible?: boolean | number;
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
  @IsOptional() @IsNumber() @Min(0) planned_budget?: number;
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsInt() @Min(1) planned_duration_days?: number;
  @IsOptional() @IsIn(["planning", "manual", "off"]) cap_mode?: string;
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
  @IsOptional() @IsInt() currency_id?: number;
}

// Soumission d'un document par un sous-traitant via le token public.
export class SubmitSubcontractorDocumentDto {
  @IsOptional() @IsIn(["quote", "invoice"]) type?: "quote" | "invoice";
  @IsOptional() @IsInt() currency_id?: number;
  // Mode generique : le sous-traitant s'identifie lui-meme.
  @IsOptional() @IsString() @MaxLength(255) submitted_by_name?: string;
  @IsOptional() @IsString() @MaxLength(255) submitted_by_company?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  // Si le sous-traitant ne detaille pas les lignes, il doit indiquer un montant total.
  @IsOptional() @IsNumber() @Min(0) total_amount?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SubcontractorLineDto)
  lines?: SubcontractorLineDto[];
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
  // Prix negatif admis UNIQUEMENT si is_adjustment=true (ligne de remise/ajustement) ;
  // controle applique par le service (computeDocumentTotals), avec total >= 0.
  @IsOptional() @IsNumber() unit_price?: number;
  @IsOptional() @IsBoolean() is_adjustment?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vat_rate?: number;
  @IsOptional() @IsInt() phase_id?: number;
  @IsOptional() @IsInt() material_id?: number;
  @IsOptional() @IsInt() currency_id?: number;
}

// Decision prise hors ligne sur un devis (negocie/accepte ou refuse hors du lien client).
export class DecideBatiproQuoteDto {
  @IsIn(["accepted", "refused"]) decision!: "accepted" | "refused";
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
  @IsOptional() @IsInt() currency_id?: number;
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

// Fonds du chantier : apport recu (proprietaire, associe, autre). Montant exact
// au centime, devise obligatoire (jamais de devise par defaut en dur).
export const FUND_CONTRIBUTOR_KINDS = ["owner", "partner", "other"] as const;
export const FUND_NATURES = ["client_advance", "partner_account", "equity"] as const;
export const FUND_PAYMENT_METHODS = ["cash", "bank", "mobile_money"] as const;

export class CreateBatiproFundDto {
  @IsDateString() received_at!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() @Max(999999999999.99) amount!: number;
  @Type(() => Number) @IsInt() @Min(1) currency_id!: number;
  @IsIn(FUND_CONTRIBUTOR_KINDS as unknown as string[]) contributor_kind!: (typeof FUND_CONTRIBUTOR_KINDS)[number];
  @IsOptional() @IsIn(FUND_NATURES as unknown as string[]) funding_nature?: (typeof FUND_NATURES)[number];
  @IsIn(FUND_PAYMENT_METHODS as unknown as string[]) payment_method!: (typeof FUND_PAYMENT_METHODS)[number];
  @IsOptional() @IsString() @MaxLength(255) contributor_name?: string;
  @IsOptional() @IsString() @MaxLength(32) @Matches(/^\+\d{6,15}$/, { message: "contributor_phone doit etre au format international (+243...)." })
  contributor_phone?: string;
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class CancelBatiproFundDto {
  @IsString() @MinLength(3) @MaxLength(255) reason!: string;
}

// Creation d'une facture FOURNISSEUR (type=invoice, direction=inbound) depuis
// un bon de commande. Deux modes exclusifs : `lines` (facturation ligne par
// ligne) OU `amount_ht`/`amount_ttc` (facturation par montant global, le mode
// le plus courant). Si rien n'est fourni, facture le solde restant du BC.
export class CreateInvoiceFromPurchaseOrderDto {
  @IsOptional() @IsNumber() @Min(0) amount_ht?: number;
  @IsOptional() @IsNumber() @Min(0) amount_ttc?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DocumentLineDto)
  lines?: DocumentLineDto[];
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

// Statuts admis via le PUT generique (tous types de documents confondus).
// "confirmed"/"partially_received"/"received" (cycle BC, migration 0231) sont
// EXCLUS ici volontairement : ils ne doivent etre atteints que via les
// endpoints dedies /confirm et /receive, jamais par un simple PUT qui
// contournerait les controles metier (idempotence, ledger avance fournisseur).
const UPDATABLE_DOCUMENT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "refused",
  "expired",
  "cancelled",
  "submitted",
  "validated",
  "returned",
  "invoiced",
  "issued",
  "paid",
] as const;

// Mise a jour partielle d'un devis/BC. Si `lines` est fourni, remplace
// l'ensemble des lignes et recalcule les totaux.
export class UpdateBatiproDocumentDto {
  @IsOptional() @IsInt() currency_id?: number;
  @IsOptional() @IsInt() supplier_id?: number;
  @IsOptional() @IsInt() subcontractor_id?: number;
  @IsOptional() @IsDateString() issue_date?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsIn(UPDATABLE_DOCUMENT_STATUSES) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DocumentLineDto)
  lines?: DocumentLineDto[];
}

// Confirmation fournisseur d'un BC (accuse de reception, status sent -> confirmed).
export class ConfirmBatiproDocumentDto {
  @IsOptional() @IsString() @MaxLength(120) supplier_reference?: string;
  @IsOptional() @IsDateString() expected_delivery_date?: string;
}

// Une ligne receptionnee : quantite physiquement recue sur cette ligne du BC
// (peut etre appelee plusieurs fois/partiellement, cumul controle cote service).
export class ReceiveDocumentLineDto {
  @IsInt() line_id!: number;
  @IsNumber() @IsPositive() quantity!: number;
}

// Reception physique (partielle ou totale) d'un BC, decouplee de l'emission.
export class ReceiveBatiproDocumentDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReceiveDocumentLineDto)
  lines!: ReceiveDocumentLineDto[];
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsOptional() @IsDateString() received_date?: string;
}

// Declaration d'une consommation manuelle de materiau sur un chantier (Stock,
// Phase 2). movement_type est force serveur a 'consumption' : cet endpoint ne
// permet jamais de creer une reception (reservee au flux BC automatique).
export class CreateStockMovementDto {
  @IsInt() project_id!: number;
  @IsInt() material_id!: number;
  @IsOptional() @IsInt() phase_id?: number;
  @IsNumber() @Min(0.001) quantity!: number;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

// Lien public de suivi financier (Lot 1 : proprietaire). expires_in_days : 30, 90 (defaut) ou 365 ("sans expiration", 1 an max).
export class CreateBatiproShareLinkDto {
  @IsOptional() @IsString() @MaxLength(255) recipient_name?: string;
  @IsOptional() @IsString() @MaxLength(32) recipient_phone?: string;
  @IsOptional() @IsIn([30, 90, 365]) expires_in_days?: number;
  @IsOptional() @IsBoolean() send_sms?: boolean;
}
