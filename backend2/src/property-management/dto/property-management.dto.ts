import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class CreatePropertyDto {
  @ApiProperty({ example: "Green Tower" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "PROP-001" })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiPropertyOptional({ example: "building", default: "building" })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ example: "available", default: "available" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "120 Main St" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "Montreal" })
  @IsOptional()
  @IsString()
  city?: string | null;

  @ApiPropertyOptional({ example: "Canada" })
  @IsOptional()
  @IsString()
  country?: string | null;

  @ApiPropertyOptional({ example: 4, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  floors?: number;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parkingSpaces?: number;

  @ApiPropertyOptional({ example: 2500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  marketValue?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  defaultRent?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id for marketValue and defaultRent. Inherited by new units when omitted. Defaults to appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: "Mixed-use rental building" })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: false, description: "Afficher dans la page publique de reservation" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableForBooking?: boolean;

  @ApiPropertyOptional({ example: 1, description: "Proprietaire legal du bien (real_estate_owners). NULL = pas de proprietaire assigne, fallback sur les reglages (gestionnaire)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ownerId?: number | null;
}

export class UpdatePropertyDto extends PartialType(CreatePropertyDto) {}

export class PropertyGeocodingDto {
  @ApiPropertyOptional({ example: -11.6609, description: "Latitude geocodee depuis l'adresse (best-effort). Null si non geocode." })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 27.4794, description: "Longitude geocodee depuis l'adresse (best-effort). Null si non geocode." })
  longitude?: number | null;
}

// ── Proprietaires legaux des biens (Domus) ───────────────────────────────────
// Distinct du GESTIONNAIRE mandate (appSettings.landlordName/landlordPhone/landlordSignature,
// champ texte libre inchange). Un proprietaire est rattache a 0..N biens via
// real_estate_properties.owner_id (nullable). Voir property-management.service.ts.
export class CreateOwnerDto {
  @ApiProperty({ example: "Jean Kabila" })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({ example: "individual", enum: ["individual", "company"], default: "individual" })
  @IsOptional()
  @IsIn(["individual", "company"])
  ownerType?: string;

  @ApiPropertyOptional({ example: "Jean" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Kabila" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: "SCI Kabila SARL" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: "Marie Kabila" })
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "+243820000000" })
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional({ example: "jean.kabila@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "12 Avenue des Palmiers" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "RDC" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: "Carte d'électeur" })
  @IsOptional()
  @IsString()
  idDocumentType?: string;

  @ApiPropertyOptional({ example: "CNI-0123456" })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ example: "TAX-0123456" })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: "data:image/png;base64,iVBORw0KGgo..." })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ example: "Proprietaire depuis 2020" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {}

export class CreateUnitDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({ example: "A-101" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "apartment", default: "apartment" })
  @IsOptional()
  @IsString()
  unitType?: string;

  @ApiPropertyOptional({ example: "vacant", default: "vacant" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "1" })
  @IsOptional()
  @IsString()
  floor?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ example: 850, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id for monthly rent and security deposit. Defaults to appSetting.currencyId when omitted." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: "Parking, balcony" })
  @IsOptional()
  @IsString()
  amenities?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: false, description: "Afficher dans la page publique de reservation" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  availableForBooking?: boolean;
}

export class UpdateUnitDto extends PartialType(CreateUnitDto) {}

export class CreateLeaseDto {
  @ApiPropertyOptional({ example: "LEASE-202605090001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId: number;

  @ApiProperty({ example: "2026-05-01" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: "2027-04-30" })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  nextInvoiceDate?: string | null;

  @ApiPropertyOptional({ example: "monthly", default: "monthly" })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentAmount: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id. Defaults to the company's appSetting.currencyId when omitted." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: 1800, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @ApiPropertyOptional({ example: 123.45 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  moveInMeterReading?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  moveInNotes?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms?: string | null;

  @ApiPropertyOptional({ example: "Kinshasa", description: "Ville de signature du contrat (Fait à ...)." })
  @IsOptional()
  @IsString()
  signingCity?: string | null;

  @ApiPropertyOptional({ example: "active", default: "draft" })
  @IsOptional()
  @IsString()
  status?: string;

  // ── Taxe par bail (incluse/informative) ──
  @ApiPropertyOptional({ example: "TVA", description: "Nom de la taxe appliquée au loyer de ce bail." })
  @IsOptional()
  @IsString()
  taxName?: string | null;

  @ApiPropertyOptional({ enum: ["percent", "fixed"], example: "percent" })
  @IsOptional()
  @IsIn(["percent", "fixed"])
  taxType?: "percent" | "fixed" | null;

  @ApiPropertyOptional({ example: 16, description: "Pourcentage (si percent) ou montant fixe (si fixed)." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxValue?: number | null;

  @ApiPropertyOptional({ enum: ["auto", "never"], default: "never", description: "auto = part de taxe calculée à chaque paiement ; never = aucune." })
  @IsOptional()
  @IsIn(["auto", "never"])
  taxApplyMode?: "auto" | "never";

  @ApiPropertyOptional({ default: false, description: "Prorata du loyer par periode (opt-in par bail)." })
  @IsOptional()
  @IsBoolean()
  rentProrationEnabled?: boolean;

  @ApiPropertyOptional({ type: [Number], description: "Autres locataires du bail (en plus de tenantId, le principal)." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  coTenantIds?: number[];
}

export class UpdateLeaseDto extends PartialType(CreateLeaseDto) {}

export class AllocationItemDto {
  @ApiProperty({ example: 123, description: "Id de la ligne echeance (real_estate_rent_payments, rowKind=due)." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dueId: number;

  @ApiPropertyOptional({ example: 1500, description: "Montant impute ; absent = autant que possible." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @Max(1e12)
  amount?: number;
}

export class CreateRentPaymentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leaseId: number;

  @ApiProperty({ example: "2026-05-09" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: 1800 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1e12)
  amount: number;

  @ApiPropertyOptional({ example: "cash", default: "cash" })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: "REC-001" })
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional({ example: "Jean Kabila", description: "Nom de la personne qui a physiquement perçu l'argent (paiement cash)." })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  receivedBy?: string | null;

  @ApiPropertyOptional({ example: "Payment for rent" })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAccountId?: number;

  @ApiPropertyOptional({ example: 16, description: "Currency id. Defaults to the lease's currency, then the company's appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ description: "URL de la preuve de paiement deja hebergee (fallback si aucun fichier envoye)." })
  @IsOptional()
  @IsString()
  proofUrl?: string | null;

  @ApiPropertyOptional({
    enum: ["auto", "manual", "none"],
    description: "Registre d'imputations (baux actives seulement, ignore sinon) : auto = FIFO, manual = allocations explicites, none = pas d'imputation immediate.",
  })
  @IsOptional()
  @IsIn(["auto", "manual", "none"])
  allocationMode?: "auto" | "manual" | "none";

  @ApiPropertyOptional({ type: () => [AllocationItemDto], description: "Imputations explicites (allocationMode=manual). Ignore si le bail n'est pas actif sur le registre." })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return value; }
  })
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  allocations?: AllocationItemDto[];
}

// Confirmation d'une echeance 'pending' generee retroactivement : memes
// champs que CreateRentPaymentDto mais sans leaseId (deja connu via l'ID
// de la ligne pending a confirmer).
export class ConfirmPendingPaymentDto extends OmitType(CreateRentPaymentDto, ["leaseId"] as const) {}

// Refus du justificatif d'une echeance 'pending' : le motif est obligatoire,
// il est montre au locataire (portail + SMS) pour qu'il puisse renvoyer.
export class AllocationPreviewDto {
  @ApiProperty({ example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1e12)
  amount: number;

  @ApiProperty({ example: "2026-10-16" })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ type: () => [AllocationItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  allocations?: AllocationItemDto[];
}

export class UpdatePaymentAllocationItemDto {
  @ApiProperty({ example: 123 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dueId: number;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @Max(1e12)
  amount: number;
}

export class UpdatePaymentAllocationsDto {
  @ApiProperty({ type: () => [UpdatePaymentAllocationItemDto], description: "Jeu complet d'imputations manuelles (remplace l'ancien ; vide = retour au FIFO)." })
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => UpdatePaymentAllocationItemDto)
  allocations: UpdatePaymentAllocationItemDto[];

  @ApiProperty({ example: "Le locataire a precise qu'il payait octobre." })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(400)
  reason: string;
}

export class BackfillAllocationsDto {
  @ApiPropertyOptional({ type: [Number], description: "Baux a traiter ; obligatoire pour appliquer (dryRun=false) ou annuler (revert)." })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @Type(() => Number)
  @IsInt({ each: true })
  leaseIds?: number[];

  @ApiPropertyOptional({ default: true, description: "true (defaut) = apercu sans aucune ecriture." })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: "Applique malgre un ecart avec le calcul legacy." })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({ description: "Annule la reprise (flag NULL, imputations desactivees)." })
  @IsOptional()
  @IsBoolean()
  revert?: boolean;

  @ApiPropertyOptional({ description: "Curseur de pagination de l'apercu sans leaseIds : ne traite que les baux d'id > afterLeaseId (50 par appel)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  afterLeaseId?: number;
}

export class RejectPendingPaymentDto {
  @ApiProperty({ example: "Capture illisible, merci de renvoyer une photo nette." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  // Apercu SMS avant envoi : { preview: true } puis { previewHash } (voir compat/sms-preview.ts).
  @IsOptional()
  @IsBoolean()
  preview?: boolean;

  @IsOptional()
  @IsString()
  previewHash?: string;
}

export class CollectDepositDto {
  @ApiProperty({ example: "2026-06-04" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: 1800, description: "Montant de la caution encaissée." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: "cash", default: "cash", description: "cash → débit Caisse · bank/card/cheque → débit Banque." })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 16, description: "Devise. Par défaut celle du bail, puis appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: "CAU-001" })
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: "URL de la preuve d'encaissement deja hebergee (fallback si aucun fichier envoye)." })
  @IsOptional()
  @IsString()
  proofUrl?: string | null;
}

export class ReturnDepositDto {
  @ApiProperty({ example: "2027-06-04" })
  @IsDateString()
  returnDate: string;

  @ApiPropertyOptional({ example: 0, default: 0, description: "Retenue pour dégâts/réparations, déduite de la caution." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deductionAmount?: number;

  @ApiPropertyOptional({ example: "Réparation mur + nettoyage" })
  @IsOptional()
  @IsString()
  deductionReason?: string | null;

  @ApiPropertyOptional({ example: "bank", default: "bank", description: "Moyen de restitution (crédit Caisse/Banque)." })
  @IsOptional()
  @IsString()
  returnMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: "URL de la preuve de restitution deja hebergee (fallback si aucun fichier envoye)." })
  @IsOptional()
  @IsString()
  proofUrl?: string | null;
}

export class CreateMaintenanceDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId?: number | null;

  @ApiProperty({ example: "Water leak" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: "medium", default: "medium" })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: "open", default: "open" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: "2026-05-12" })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string | null;

  @ApiPropertyOptional({ example: 350, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedCost?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currencyId?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigneeId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}

// Validation conditionnelle selon le type de locataire (entreprise vs personne).
const isCompanyTenant = (o: { tenant_type?: string }) => o.tenant_type === "company";
const isNotCompanyTenant = (o: { tenant_type?: string }) => o.tenant_type !== "company";
// Regex volontairement tolerantes : de vrais RCCM/NIF congolais ont des formats varies.
const RCCM_REGEX = /^[A-Z0-9\/.\-_ °º]{3,60}$/i;
const NIF_REGEX = /^[A-Z0-9\/.\-_ °º]{3,30}$/i;

export class CreateTenantDto {
  @ApiProperty({ example: "Jean" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @ApiProperty({ example: "Dupont" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: "12 Avenue des Palmiers" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiPropertyOptional({ example: "jdupont" })
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiProperty({ example: "1992-03-14" })
  @ValidateIf(isNotCompanyTenant)
  @IsDateString()
  birth_date: string;

  @ApiProperty({ example: "M", enum: ["M", "F"] })
  @ValidateIf(isNotCompanyTenant)
  @IsIn(["M", "F"])
  sex: "M" | "F";

  @ApiProperty({ example: "Congolaise" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nationality: string;

  @ApiProperty({ example: "marié" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  marital_status: string;

  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @IsString()
  origin_province?: string | null;

  @ApiPropertyOptional({ example: "individual", enum: ["individual", "company"], description: "Type de locataire (defaut individual)" })
  @IsOptional()
  @IsIn(["individual", "company"])
  tenant_type?: "individual" | "company";

  @ApiPropertyOptional({ example: "Societe Congo SARL", description: "Raison sociale (requis si tenant_type=company)" })
  @ValidateIf(isCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  company_name?: string | null;

  @ApiPropertyOptional({ example: "SARL", description: "Forme juridique" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  legal_form?: string | null;

  @ApiPropertyOptional({ example: "CD/KIN/RCCM/21-B-00000", description: "Registre du commerce" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(RCCM_REGEX, { message: "rccm invalide" })
  rccm?: string | null;

  @ApiPropertyOptional({ example: "01-123-N12345X", description: "Identification nationale" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_national_id?: string | null;

  @ApiPropertyOptional({ example: "A1234567B", description: "Numero d impot (NIF)" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(NIF_REGEX, { message: "tax_id invalide" })
  tax_id?: string | null;

  @ApiPropertyOptional({ example: "Siege social", description: "Siege de la societe" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  company_address?: string | null;

  @ApiPropertyOptional({ example: "Jean Dupont", description: "Representant legal (requis si tenant_type=company)" })
  @ValidateIf(isCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  representative_name?: string | null;

  @ApiPropertyOptional({ example: "Directeur general", description: "Fonction du representant" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  representative_title?: string | null;

  @ApiPropertyOptional({ example: "+243810000000", description: "Telephone du representant" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  representative_phone?: string | null;

  @ApiPropertyOptional({ example: "rep@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  representative_email?: string | null;

  @ApiPropertyOptional({ example: "CNI-0123456", description: "Piece du representant" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  representative_id_number?: string | null;

  @ApiPropertyOptional({ description: "Confirmer un changement de type alors qu un bail actif existe" })
  @IsOptional()
  @IsBoolean()
  confirm_type_change?: boolean;

  @ApiPropertyOptional({ example: "+243820000000" })
  @IsOptional()
  @IsString()
  phone2?: string | null;

  @ApiPropertyOptional({ example: "Carte d'électeur", description: "Type de pièce d'identité (contrat de bail)" })
  @IsOptional()
  @IsString()
  id_document_type?: string | null;

  @ApiPropertyOptional({ example: "CNI-0123456", description: "Numéro de pièce d'identité (contrat de bail)" })
  @IsOptional()
  @IsString()
  id_number?: string | null;

  @ApiProperty({ example: "Marie Dupont" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contacted_person: string;

  @ApiProperty({ example: "+243830000000" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contacted_person_phone_number: string;

  @ApiProperty({ example: "salarié" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  prossional_status: string;

  @ApiProperty({ example: "Comptable" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  main_activity: string;

  @ApiProperty({ example: "NGLU SARL" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entity_name: string;

  @ApiPropertyOptional({ example: "45 Boulevard du 30 Juin" })
  @IsOptional()
  @IsString()
  entity_address?: string | null;

  @ApiPropertyOptional({ example: "2021-01-15" })
  @IsOptional()
  @IsDateString()
  hiring_date?: string | null;

  @ApiProperty({ example: "CDI" })
  @ValidateIf(isNotCompanyTenant)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  contract_type: string;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthly_pay?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salary_currency_id?: number | null;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  other_monthly_income?: number | null;

  @ApiPropertyOptional({ example: "Ancienne adresse" })
  @IsOptional()
  @IsString()
  old_address?: string | null;

  @ApiPropertyOptional({ example: "Monsieur Bailleur" })
  @IsOptional()
  @IsString()
  old_lessor?: string | null;

  @ApiPropertyOptional({ example: "Rapprochement du lieu de travail" })
  @IsOptional()
  @IsString()
  moving_reason?: string | null;

  @ApiProperty({ example: 3 })
  @ValidateIf(isNotCompanyTenant)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupant_number: number;

  @ApiPropertyOptional({ example: "Jeanne Dupont" })
  @ValidateIf((dto) => ["married", "common_law", "marié", "marie", "conjoint de fait", "union libre"].includes(String(dto.marital_status).toLowerCase()))
  @IsString()
  @IsNotEmpty()
  partenair_name?: string | null;

  @ApiPropertyOptional({ example: "+243840000000" })
  @ValidateIf((dto) => ["married", "common_law", "marié", "marie", "conjoint de fait", "union libre"].includes(String(dto.marital_status).toLowerCase()))
  @IsString()
  @IsNotEmpty()
  partenair_number?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  child_number?: number;

  @ApiPropertyOptional({ example: [4, 9] })
  @ValidateIf((dto) => Number(dto.child_number ?? 0) > 0)
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  child_age?: number[];
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  // Soft delete / reactivation du dossier locataire. Absent de CreateTenantDto
  // (une creation est toujours active). Suppression = status "false", jamais de
  // DELETE physique : l'historique (baux, paiements) doit rester intact.
  @ApiPropertyOptional({ example: "false", enum: ["true", "false"] })
  @IsOptional()
  @IsIn(["true", "false"])
  status?: string;
}

export class GenerateTenantOnboardingDto {
  @ApiPropertyOptional({ example: "Jean" })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: "Dupont" })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: "+243810000000" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 7, default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}

export class SaveTenantOnboardingDto {
  // Locataire entreprise (memes validateurs que CreateTenantDto) ; tous optionnels (brouillon).
  @ApiPropertyOptional({ example: "individual", enum: ["individual", "company"] })
  @IsOptional()
  @IsIn(["individual", "company"])
  tenant_type?: "individual" | "company";

  @ApiPropertyOptional({ example: "Societe Congo SARL" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company_name?: string | null;

  @ApiPropertyOptional({ example: "SARL" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  legal_form?: string | null;

  @ApiPropertyOptional({ example: "CD/KIN/RCCM/21-B-00000" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(RCCM_REGEX, { message: "rccm invalide" })
  rccm?: string | null;

  @ApiPropertyOptional({ example: "01-123-N12345X" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company_national_id?: string | null;

  @ApiPropertyOptional({ example: "A1234567B" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(NIF_REGEX, { message: "tax_id invalide" })
  tax_id?: string | null;

  @ApiPropertyOptional({ example: "Siege social" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  company_address?: string | null;

  @ApiPropertyOptional({ example: "Jean Dupont" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  representative_name?: string | null;

  @ApiPropertyOptional({ example: "Directeur general" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  representative_title?: string | null;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  representative_phone?: string | null;

  @ApiPropertyOptional({ example: "rep@example.com" })
  @IsOptional()
  @IsEmail()
  @MaxLength(191)
  representative_email?: string | null;

  @ApiPropertyOptional({ example: "CNI-0123456" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  representative_id_number?: string | null;

  @ApiPropertyOptional({ example: "Jean" })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: "Dupont" })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ example: "jean.dupont@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ example: "12 Avenue des Palmiers" })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "jdupont" })
  @IsOptional()
  @IsString()
  username?: string | null;

  @ApiPropertyOptional({ example: "1992-03-14" })
  @IsOptional()
  @IsDateString()
  birth_date?: string | null;

  @ApiPropertyOptional({ example: "M", enum: ["M", "F"] })
  @IsOptional()
  @IsIn(["M", "F"])
  sex?: "M" | "F";

  @ApiPropertyOptional({ example: "Congolaise" })
  @IsOptional()
  @IsString()
  nationality?: string | null;

  @ApiPropertyOptional({ example: "marié" })
  @IsOptional()
  @IsString()
  marital_status?: string | null;

  @ApiPropertyOptional({ example: "Kinshasa" })
  @IsOptional()
  @IsString()
  origin_province?: string | null;

  @ApiPropertyOptional({ example: "+243820000000" })
  @IsOptional()
  @IsString()
  phone2?: string | null;

  @ApiPropertyOptional({ example: "Carte d'électeur", description: "Type de pièce d'identité (contrat de bail)" })
  @IsOptional()
  @IsString()
  id_document_type?: string | null;

  @ApiPropertyOptional({ example: "CNI-0123456", description: "Numéro de pièce d'identité (contrat de bail)" })
  @IsOptional()
  @IsString()
  id_number?: string | null;

  @ApiPropertyOptional({ example: "Marie Dupont" })
  @IsOptional()
  @IsString()
  contacted_person?: string | null;

  @ApiPropertyOptional({ example: "+243830000000" })
  @IsOptional()
  @IsString()
  contacted_person_phone_number?: string | null;

  @ApiPropertyOptional({ example: "salarié" })
  @IsOptional()
  @IsString()
  prossional_status?: string | null;

  @ApiPropertyOptional({ example: "Comptable" })
  @IsOptional()
  @IsString()
  main_activity?: string | null;

  @ApiPropertyOptional({ example: "NGLU SARL" })
  @IsOptional()
  @IsString()
  entity_name?: string | null;

  @ApiPropertyOptional({ example: "45 Boulevard du 30 Juin" })
  @IsOptional()
  @IsString()
  entity_address?: string | null;

  @ApiPropertyOptional({ example: "2021-01-15" })
  @IsOptional()
  @IsDateString()
  hiring_date?: string | null;

  @ApiPropertyOptional({ example: "CDI" })
  @IsOptional()
  @IsString()
  contract_type?: string | null;

  @ApiPropertyOptional({ example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthly_pay?: number | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salary_currency_id?: number | null;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  other_monthly_income?: number | null;

  @ApiPropertyOptional({ example: "Ancienne adresse" })
  @IsOptional()
  @IsString()
  old_address?: string | null;

  @ApiPropertyOptional({ example: "Monsieur Bailleur" })
  @IsOptional()
  @IsString()
  old_lessor?: string | null;

  @ApiPropertyOptional({ example: "Rapprochement du lieu de travail" })
  @IsOptional()
  @IsString()
  moving_reason?: string | null;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  occupant_number?: number | null;

  @ApiPropertyOptional({ example: "Jeanne Dupont" })
  @IsOptional()
  @IsString()
  partenair_name?: string | null;

  @ApiPropertyOptional({ example: "+243840000000" })
  @IsOptional()
  @IsString()
  partenair_number?: string | null;

  @ApiPropertyOptional({ example: 2, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  child_number?: number;

  @ApiPropertyOptional({ example: [4, 9] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  child_age?: number[];

  @ApiPropertyOptional({ example: false, description: "Primo-locataire : masque l'historique de location" })
  @IsOptional()
  @IsBoolean()
  first_rental?: boolean;
}

export class CreateContractDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  leaseId: number;

  @ApiPropertyOptional({ example: "Contrat de bail personnalisé..." })
  @IsOptional()
  @IsString()
  contractContent?: string;

  @ApiPropertyOptional({
    example: 1,
    description: "ID du modèle de contrat à appliquer. Si omis, on prend le modèle actif du type du bien.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  templateId?: number;
}

export class SignContractDto {
  @ApiProperty({ example: "data:image/png;base64,iVBORw0KGgo..." })
  @IsString()
  @IsNotEmpty()
  signatureData: string;
}

export class CreateMaintenanceCostDto {
  @IsIn(["service", "labour"])
  type: "service" | "labour";

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currencyId?: number;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number;

  @IsOptional()
  @IsIn(["cash", "bank", "mobile_money", "cheque"])
  paymentMethod?: "cash" | "bank" | "mobile_money" | "cheque";

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

// ── Réservation temporaire type hôtel (courte durée, tarif par jour) ──────────
export class CreateReservationDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1, description: "NULL = bien entier ; sinon une unité du bien." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId?: number | null;

  @ApiProperty({ example: "Jean Kabila" })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiPropertyOptional({ example: "+243812345678" })
  @IsOptional()
  @IsString()
  guestPhone?: string | null;

  @ApiPropertyOptional({ example: "guest@example.com" })
  @IsOptional()
  @IsEmail()
  guestEmail?: string | null;

  @ApiPropertyOptional({ example: 1, description: "Locataire déjà enregistré (facultatif)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number | null;

  @ApiProperty({ example: "2026-07-01" })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: "2026-07-05" })
  @IsDateString()
  checkOut: string;

  @ApiProperty({ example: 50, description: "Tarif par jour." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dailyRate: number;

  @ApiPropertyOptional({ example: 100, default: 0, description: "Caution encaissée à la réservation (info ; pas de compta ici)." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ example: 16, description: "Devise. Par défaut celle du bien, puis appSetting.currencyId." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number;

  @ApiPropertyOptional({ example: "RES-001" })
  @IsOptional()
  @IsString()
  reference?: string | null;

  @ApiPropertyOptional({ example: "ETE2026", description: "Code coupon a appliquer (baisse le total)." })
  @IsOptional()
  @IsString()
  couponCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateReservationDto extends PartialType(CreateReservationDto) {}

export class CreateCouponDto {
  @ApiProperty({ example: "ETE2026" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: "percentage", enum: ["percentage", "fixed"] })
  @IsIn(["percentage", "fixed"])
  discountType: "percentage" | "fixed";

  @ApiProperty({ example: 10, description: "% si percentage, montant en devise si fixed." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 16, description: "Devise (remises fixed)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currencyId?: number | null;

  @ApiPropertyOptional({ example: "2026-07-01" })
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional({ example: 100, description: "Quota d'usage (NULL = illimite)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class PublicReservationRequestDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1, description: "NULL = bien entier ; sinon une unite du bien." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId?: number | null;

  @ApiProperty({ example: "Jean Kabila" })
  @IsString()
  @IsNotEmpty()
  guestName: string;

  @ApiPropertyOptional({ example: "+243812345678" })
  @IsOptional()
  @IsString()
  guestPhone?: string | null;

  @ApiPropertyOptional({ example: "guest@example.com" })
  @IsOptional()
  @IsEmail()
  guestEmail?: string | null;

  @ApiProperty({ example: "2026-07-01" })
  @IsDateString()
  checkIn: string;

  @ApiProperty({ example: "2026-07-05" })
  @IsDateString()
  checkOut: string;

  @ApiPropertyOptional({ example: "ETE2026" })
  @IsOptional()
  @IsString()
  couponCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class PublicLeaseRequestDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitId?: number | null;

  @ApiProperty({ example: "Jean" })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Kabila" })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: "guest@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: "+243812345678" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString()
  desiredMoveIn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string | null;
}

export class CheckOutReservationDto {
  @ApiPropertyOptional({ example: "2026-07-05", description: "Date de comptabilisation de la recette. Défaut = aujourd'hui." })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: "cash", default: "cash", description: "cash → débit Caisse · bank/card/cheque → débit Banque." })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 1, description: "Compte de trésorerie encaisseur (sinon dérivé du moyen)." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAccountId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}

// ── Depenses par propriete (SCRUM-310) ────────────────────────────────────────
// "mortgage" est exclu volontairement de cette v1 (ticket dedie futur).
export const PROPERTY_EXPENSE_CATEGORIES = [
  "insurance",
  "property_tax",
  "hoa",
  "maintenance_general",
  "management_fee",
  "security",
  "cleaning",
  "other",
] as const;
export type PropertyExpenseCategory = (typeof PROPERTY_EXPENSE_CATEGORIES)[number];

export class CreatePropertyExpenseDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaseId?: number;

  @ApiProperty({ example: "insurance", enum: PROPERTY_EXPENSE_CATEGORIES })
  @IsIn(PROPERTY_EXPENSE_CATEGORIES, {
    message:
      "Categorie invalide. Valeurs autorisees: insurance, property_tax, hoa, maintenance_general, management_fee, security, cleaning, other. " +
      "La categorie mortgage n'est pas prise en charge dans cette version, elle fera l'objet d'un ticket dedie.",
  })
  category: PropertyExpenseCategory;

  @ApiProperty({ example: "Assurance annuelle immeuble" })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currencyId?: number;

  @ApiProperty({ example: "2026-09-15" })
  @IsDateString()
  expenseDate: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({ example: "Sonas assurances" })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ example: "cash", default: "cash" })
  @IsOptional()
  @IsIn(["cash", "bank", "mobile_money", "cheque"])
  paymentMethod?: "cash" | "bank" | "mobile_money" | "cheque";

  @ApiPropertyOptional({ example: "paid", default: "paid" })
  @IsOptional()
  @IsIn(["paid", "pending", "overdue"])
  paymentStatus?: "paid" | "pending" | "overdue";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  recurrenceMonths?: number;

  @ApiPropertyOptional({
    example: "single",
    default: "single",
    enum: ["single", "installments", "partial"],
    description:
      "Mode de reglement de la depense. single = comportement historique (aucune echeance). " +
      "installments = genere immediatement recurrenceMonths echeances mensuelles. " +
      "partial = aucune echeance generee, uniquement des paiements libres ajoutes ensuite.",
  })
  @IsOptional()
  @IsIn(["single", "installments", "partial"])
  paymentPlan?: "single" | "installments" | "partial";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePropertyExpenseDto extends PartialType(CreatePropertyExpenseDto) {}

// ── Echeancier de paiement des depenses de propriete (SCRUM-313) ────────────
// Une depense en payment_plan='installments' genere N lignes real_estate_expense_installments
// (kind='scheduled'). Une depense en payment_plan='partial' recoit des paiements
// libres ajoutes un a un (kind='partial'). Voir property-management.service.ts
// pour le detail des regles metier (arrondi, clamp fin de mois, regeneration).

export class GenerateExpenseInstallmentsDto {
  @ApiProperty({ example: 6, description: "Nombre d'echeances mensuelles a generer." })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  recurrenceMonths: number;

  @ApiPropertyOptional({
    default: false,
    description:
      "Force la regeneration meme si aucune echeance n'est payee (mode explicite). " +
      "N'outrepasse PAS le refus si au moins une echeance a deja ete reglee : dans ce cas " +
      "la regeneration reste toujours refusee (409), quelle que soit la valeur de force.",
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class AddExpensePartialPaymentDto {
  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: "2026-09-15" })
  @IsDateString()
  paidDate: string;

  @ApiPropertyOptional({ example: "cash" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayExpenseInstallmentDto {
  @ApiPropertyOptional({ description: "Montant paye. Si absent, utilise le plannedAmount complet de l'echeance." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: "2026-09-15" })
  @IsDateString()
  paidDate: string;

  @ApiPropertyOptional({ example: "cash" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpdateExpenseInstallmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  plannedAmount?: number;

  @ApiPropertyOptional({ example: "2026-10-15" })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Remboursement hypothecaire (SCRUM-311) ───────────────────────────────────
// Invariant metier : total = capital + interets + escrow (tolerance 0.01 pour
// les arrondis decimal(15,2)). Volontairement separe des depenses de propriete :
// seule la part interets (+ escrow) est une charge, le capital solde une dette.

/** Tolerance d arrondi appliquee au controle total = capital + interets + escrow. */
export const MORTGAGE_AMOUNT_TOLERANCE = 0.01;

export class CreateMortgagePaymentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitId?: number;

  @ApiPropertyOptional({ example: 1, description: "Reserve pour une future table de pret. Non exploite en v1." })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mortgageId?: number;

  @ApiPropertyOptional({ example: "Rawbank" })
  @IsOptional()
  @IsString()
  lenderName?: string;

  @ApiProperty({ example: "2026-09-15" })
  @IsDateString()
  paymentDate: string;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiProperty({ example: 1200, description: "Doit egaler principalAmount + interestAmount + escrowAmount." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 800, description: "Part capital : remboursement de dette (compte Liability)." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principalAmount: number;

  @ApiProperty({ example: 400, description: "Part interets : charge financiere (compte Expense)." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestAmount: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: "Part sequestre (assurance/taxes avancees par le preteur)." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  escrowAmount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currencyId?: number;

  @ApiPropertyOptional({ example: "bank", default: "bank" })
  @IsOptional()
  @IsIn(["cash", "bank", "mobile_money", "cheque"])
  paymentMethod?: "cash" | "bank" | "mobile_money" | "cheque";

  @ApiPropertyOptional({ example: "paid", default: "paid" })
  @IsOptional()
  @IsIn(["paid", "pending", "overdue"])
  paymentStatus?: "paid" | "pending" | "overdue";

  @ApiPropertyOptional({ example: "ECH-2026-09" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMortgagePaymentDto extends PartialType(CreateMortgagePaymentDto) {}

// ── Prets hypothecaires (SCRUM-311 phase 2) ─────────────────────────────────
// Table de reference du pret, distincte des echeances (mortgage-payments
// ci-dessus). Le solde restant du se calcule applicativement, jamais stocke ici.
export class CreateMortgageLoanDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  propertyId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitId?: number;

  @ApiPropertyOptional({ example: "Rawbank" })
  @IsOptional()
  @IsString()
  lenderName?: string;

  @ApiPropertyOptional({ example: "PRET-2026-001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 100000, description: "Montant emprunte initial." })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principalAmount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  currencyId?: number;

  @ApiProperty({ example: "2026-01-01" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: "2036-01-01" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 5.25, description: "Taux annuel nominal, ex 5.25 pour 5,25%." })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termMonths?: number;

  @ApiPropertyOptional({ example: "active", default: "active" })
  @IsOptional()
  @IsIn(["active", "paid_off", "refinanced"])
  status?: "active" | "paid_off" | "refinanced";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Si true, rattache automatiquement (apres creation) les paiements orphelins existants (mortgageId NULL) de la meme propriete/devise a ce pret. Jamais applique implicitement.",
  })
  @IsOptional()
  @IsBoolean()
  attachExistingPayments?: boolean;
}

// attachExistingPayments est un flag d'action a la creation (rattachement
// ponctuel des paiements orphelins), pas un champ persistant du pret : on
// l'exclut du DTO d'update pour eviter toute confusion (un PATCH ne doit pas
// re-declencher un rattachement en masse implicitement).
export class UpdateMortgageLoanDto extends PartialType(
  OmitType(CreateMortgageLoanDto, ["attachExistingPayments"] as const),
) {}

// ── Delegues (mandataires charges du suivi de loyer) ───────────────────────
// Un delegue n'est pas le bailleur : il suit un portefeuille pour le compte du
// proprietaire et recoit les memes annonces. userId nullable porte les deux
// Un delegue n'est pas une personne de plus : c'est un employe (userId) ou un
// sous-traitant du registre central (supplierId) a qui on confie le suivi d'un
// portefeuille. Les deux absents = fiche saisie a la main avant le rattachement.
export class CreateDelegateDto {
  @ApiProperty({ example: "Patrick Ilunga" })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiPropertyOptional({ example: "+243810000000" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "+243990000000" })
  @IsOptional()
  @IsString()
  phone2?: string;

  @ApiPropertyOptional({ example: "patrick@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 12, description: "Compte nglu, pour un delegue employe interne" })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    example: 7,
    description:
      "Tiers du registre central (table supplier), pour un delegue sous-traitant ou prestataire. Exclusif avec userId (verifie par DelegatesService.ensurePersonLink) : un delegue est un employe OU un tiers externe, pas les deux.",
  })
  @IsOptional()
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({ example: "Suit les immeubles de Gombe" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDelegateDto extends PartialType(CreateDelegateDto) {}

// Une affectation = un perimetre suivi + les evenements auxquels le delegue est
// abonne. 'owner' couvre tout le portefeuille d'un proprietaire (biens futurs
// compris), 'property' un seul bien.
export class CreateDelegateAssignmentDto {
  @ApiProperty({ example: "property", enum: ["owner", "property"] })
  @IsIn(["owner", "property"])
  scopeType: string;

  @ApiProperty({ example: 3, description: "ID du proprietaire ou du bien selon scopeType" })
  @IsInt()
  scopeId: number;

  @ApiPropertyOptional({ example: true, default: true, description: "Bail cree et fin de bail" })
  @IsOptional()
  @IsBoolean()
  notifyLease?: boolean;

  @ApiPropertyOptional({ example: true, default: true, description: "Loyer en retard" })
  @IsOptional()
  @IsBoolean()
  notifyOverdue?: boolean;

  @ApiPropertyOptional({ example: false, default: false, description: "Loyer encaisse" })
  @IsOptional()
  @IsBoolean()
  notifyPayment?: boolean;
}

export class UpdateDelegateAssignmentDto extends PartialType(
  OmitType(CreateDelegateAssignmentDto, ["scopeType", "scopeId"] as const),
) {}

// ── Etats des lieux (entree / sortie) ───────────────────────────────────────

export const INSPECTION_CONDITION_VALUES = ["new", "good", "fair", "poor", "damaged", "na"] as const;

export class CreateInspectionDto {
  @ApiProperty({ enum: ["entry", "exit"] })
  @IsIn(["entry", "exit"])
  type: "entry" | "exit";

  @ApiProperty({ example: "2026-10-11" })
  @IsDateString()
  inspectionDate: string;
}

export class InspectionItemInputDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  room: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  element: string;

  @IsOptional()
  @IsIn([...INSPECTION_CONDITION_VALUES])
  condition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  // true = retrait logique (is_deleted = 1)
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class InspectionKeyDto {
  @IsString()
  @MaxLength(100)
  label: string;

  @IsInt()
  @Min(0)
  @Max(999)
  count: number;
}

export class UpdateInspectionDto {
  @IsOptional()
  @IsDateString()
  inspectionDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  generalNotes?: string | null;

  @IsOptional()
  @IsObject()
  meters?: Record<string, string | number | null>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionKeyDto)
  keysHanded?: InspectionKeyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspectionItemInputDto)
  items?: InspectionItemInputDto[];
}

export class SignInspectionDto {
  @ApiProperty({ enum: ["landlord", "tenant"] })
  @IsIn(["landlord", "tenant"])
  role: "landlord" | "tenant";

  @ApiProperty({ example: "data:image/png;base64,iVBORw0KGgo..." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(90000)
  signatureData: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  signerName: string;
}

export class CancelScheduledTerminationDto {
  @ApiPropertyOptional({ description: "Motif d'annulation (facultatif)." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class TerminateLeaseDto {
  @ApiProperty({ example: "2027-03-31", description: "Date d'effet de la resiliation (YYYY-MM-DD)." })
  @IsDateString()
  terminationDate: string;

  @ApiProperty({ example: "Depart du locataire", description: "Motif obligatoire (5 a 2000 caracteres)." })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({ default: false, description: "Prevenir le(s) locataire(s) par SMS." })
  @IsOptional()
  @IsBoolean()
  notifyTenant?: boolean;
}
