import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

// Creation d une organisation par le proprietaire de la plateforme (P4 console).
export class CreateOrganizationDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @IsString() @IsNotEmpty()
  @MinLength(3) @MaxLength(63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, { message: "Adresse invalide (minuscules, chiffres, tirets)." })
  slug: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  adminFirstName: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  adminLastName: string;

  @IsEmail() @MaxLength(255)
  adminEmail: string;

  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
  @MaxLength(64)
  adminPassword: string;

  @IsOptional() @IsIn(["active", "trial"])
  status?: "active" | "trial";
}
