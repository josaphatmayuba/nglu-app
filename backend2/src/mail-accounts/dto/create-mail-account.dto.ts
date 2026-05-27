import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateMailAccountDto {
  @IsString()
  @MaxLength(255)
  localPart!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;
}
