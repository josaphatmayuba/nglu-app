import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TransactionTypeAccountDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Cash" })
  name: string | null;
}

export class TransactionTypeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Rent Payment" })
  name: string;

  @ApiProperty({ example: 1 })
  debitAccountId: number;

  @ApiProperty({ example: 2 })
  creditAccountId: number;

  @ApiPropertyOptional({ example: "Payment for rent", nullable: true })
  description: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: "2026-05-09T03:12:57.000Z", nullable: true })
  createdAt: Date | null;

  @ApiPropertyOptional({ example: "2026-05-09T09:21:30.000Z", nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: TransactionTypeAccountDto, nullable: true })
  debitAccount: TransactionTypeAccountDto | null;

  @ApiProperty({ type: TransactionTypeAccountDto, nullable: true })
  creditAccount: TransactionTypeAccountDto | null;
}
