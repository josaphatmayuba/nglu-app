import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

// Format "2026-08" : trie lexicographiquement dans l'ordre chronologique
// (cf. commentaire ktCommissionEntries.periodMonth dans schema.ts).
const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export class ComputeCommissionsDto {
  @ApiProperty({ example: "2026-08", description: "Periode calendaire au format YYYY-MM" })
  @Matches(PERIOD_REGEX, { message: "period doit etre au format YYYY-MM" })
  period!: string;
}
