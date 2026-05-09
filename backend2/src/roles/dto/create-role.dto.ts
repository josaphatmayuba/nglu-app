import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ example: "manager" })
  @IsString()
  @IsNotEmpty()
  name: string;
}
