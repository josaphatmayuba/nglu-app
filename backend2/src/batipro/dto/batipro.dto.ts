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
