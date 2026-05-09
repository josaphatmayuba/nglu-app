import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubAccountResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Cash" })
  name: string;

  @ApiProperty({ example: 1 })
  accountId: number;

  @ApiProperty({ example: "true" })
  status: string;

  @ApiPropertyOptional({ example: "2026-05-09T03:12:57.000Z", nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ example: "2026-05-09T09:21:30.000Z", nullable: true })
  updatedAt: Date | null;
}
