import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

// Bornes de plage du resume : ce sont des filtres au jour, pas des instants.
// Un ISO 8601 complet passe @IsDateString() mais n'a aucun sens ici et
// donnerait un filtre trompeur, on le rejette avec un 400 clair.
// NB : expenseDate lui-meme n'utilise plus ce regex depuis le passage de
// kt_expenses.expense_date en DATETIME (l'heure de la depense est saisie).
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ─── Categories ────────────────────────────────────────────────────────────

export class CreateExpenseCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export class CreateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiProperty()
  @IsInt()
  categoryId!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiProperty({ description: "Date-heure de la depense (YYYY-MM-DD HH:mm:ss ou ISO 8601)" })
  @IsDateString()
  expenseDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  branchId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ description: "Date-heure de la depense (YYYY-MM-DD HH:mm:ss ou ISO 8601)" })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

export class ListExpensesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Date de debut (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "Date de fin (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  to?: string;
}

export class ExpensesSummaryQueryDto {
  @ApiProperty({ description: "Date de debut (YYYY-MM-DD)" })
  @IsDateString()
  @Matches(DATE_ONLY_REGEX, { message: "from doit etre au format YYYY-MM-DD (sans heure)." })
  from!: string;

  @ApiProperty({ description: "Date de fin (YYYY-MM-DD)" })
  @IsDateString()
  @Matches(DATE_ONLY_REGEX, { message: "to doit etre au format YYYY-MM-DD (sans heure)." })
  to!: string;
}
