import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

// L identifiant (username/email) et le mot de passe sont compares via Drizzle
// (requetes parametrees) -> pas d injection possible. On borne la longueur pour
// refuser les payloads geants (abus). Pas de format strict : un identifiant
// legitime peut prendre des formes variees.
export class LoginDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;

  @ApiProperty({ example: "password" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;
}
