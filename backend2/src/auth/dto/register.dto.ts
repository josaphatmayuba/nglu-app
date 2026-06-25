import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";

// Inscription self-service d un client (P3). Cree une organisation (ou un compte
// solo = org a 1 user) + son 1er administrateur. Voir signup-onboarding-mockup.html.
//
// Durcissement entrees : chaque champ texte a un format strict (allowlist de
// caracteres) pour rejeter le contenu parasite (ex: "Bob');DROP TABLE...",
// balises HTML). Defense en profondeur : Drizzle parametre deja les requetes
// (pas d injection SQL possible), mais on refuse aussi les donnees sales / XSS stocke.

// Lettres (avec accents/unicode), espaces, tirets, apostrophes, points. Pas de
// chiffres ni de ponctuation technique (< > ( ) { } ; " etc.).
const NAME_RE = /^[\p{L}][\p{L} '.-]*$/u;
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(120)
  @Matches(NAME_RE, { message: "Prénom invalide." })
  firstName: string;

  @Transform(trim)
  @IsString() @IsNotEmpty() @MaxLength(120)
  @Matches(NAME_RE, { message: "Nom invalide." })
  lastName: string;

  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
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
  // Lettres/chiffres/espaces + ponctuation business sure (& . , ' -). Pas de < > ; etc.
  @Transform(trim)
  @IsOptional() @IsString() @MaxLength(255)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N} &.,'-]*$/u, { message: "Nom d'entreprise invalide." })
  orgName?: string;

  // Sous-domaine : <slug>.nglu.cloud — minuscules, chiffres, tirets.
  @IsString() @IsNotEmpty()
  @MinLength(3) @MaxLength(63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, { message: "Adresse invalide (minuscules, chiffres, tirets)." })
  slug: string;

  // Secteur : valeurs connues de la grille d inscription (allowlist stricte).
  @IsOptional() @IsIn(["agri", "immo", "btp", "commerce", "autre"])
  sector?: string;

  // Telephone : + et chiffres, espaces/tirets/parentheses tolere. Pas de lettres.
  @Transform(trim)
  @IsOptional() @IsString() @MaxLength(40)
  @Matches(/^\+?[0-9 ()-]{6,40}$/, { message: "Numéro de téléphone invalide." })
  phone?: string;

  // Plan d abonnement choisi sur la grille de prix (defaut: free).
  @IsOptional() @IsIn(["free", "starter", "business", "enterprise"])
  plan?: "free" | "starter" | "business" | "enterprise";

  @IsBoolean()
  acceptedTerms: boolean;
}
