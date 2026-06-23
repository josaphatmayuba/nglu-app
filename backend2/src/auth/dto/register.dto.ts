import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

// Inscription self-service d un client (P3). Cree une organisation (ou un compte
// solo = org a 1 user) + son 1er administrateur. Voir signup-onboarding-mockup.html.
export class RegisterDto {
  @IsString() @IsNotEmpty() @MaxLength(255)
  firstName: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  lastName: string;

  @IsEmail() @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: "Le mot de passe doit contenir au moins 8 caractères." })
  @MaxLength(64, { message: "Le mot de passe ne peut pas dépasser 64 caractères." })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/, { message: "Le mot de passe doit contenir au moins une lettre et un chiffre." })
  password: string;

  // "org" = entreprise (plusieurs users) ; "solo" = personne seule (org a 1 user).
  @IsIn(["org", "solo"])
  accountType: "org" | "solo";

  // Nom de l organisation. Optionnel pour solo (on prend le nom de la personne).
  @IsOptional() @IsString() @MaxLength(255)
  orgName?: string;

  // Sous-domaine : <slug>.nglu.cloud — minuscules, chiffres, tirets.
  @IsString() @IsNotEmpty()
  @MinLength(3) @MaxLength(63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, { message: "Adresse invalide (minuscules, chiffres, tirets)." })
  slug: string;

  @IsOptional() @IsString() @MaxLength(120)
  sector?: string;

  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @IsBoolean()
  acceptedTerms: boolean;
}
