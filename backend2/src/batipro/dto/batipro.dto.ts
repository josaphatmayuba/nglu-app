import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

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
