import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

export class DashboardQueryDto {
  @ApiPropertyOptional({ example: "2026-05-01", description: "Start date (YYYY-MM-DD). Defaults to start of current month." })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-05-31", description: "End date (YYYY-MM-DD). Defaults to end of current month." })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
