import { ApiProperty } from "@nestjs/swagger";

export class MessageResponseDto {
  @ApiProperty({ example: "Transaction type deleted successfully." })
  message: string;
}
