import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";

export class CreateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;

  @ApiProperty() @IsString() @IsNotEmpty() username: string;
  @ApiProperty({ description: "Min 12 chars, max 64, au moins une lettre et un chiffre" })
  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: "Le mot de passe doit contenir au moins 12 caractères." })
  @MaxLength(64, { message: "Le mot de passe ne peut pas dépasser 64 caractères." })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, { message: "Le mot de passe doit contenir au moins une lettre et un chiffre." })
  password: string;

  @ApiProperty() @IsInt() roleId: number;

  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() maritalStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() childrenCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergencyContactRelationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() personalDocumentsUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() joinDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leaveDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bloodGroup?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() image?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() designationId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() employmentStatusId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() departmentId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() shiftId?: number;
}
