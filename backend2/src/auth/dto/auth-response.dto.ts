import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty() firstName: string | null;
  @ApiProperty() lastName: string | null;
  @ApiProperty() email: string | null;
  @ApiProperty() role: string;
  @ApiProperty() token: string;
}
