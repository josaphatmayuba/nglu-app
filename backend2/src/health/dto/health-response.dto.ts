import { ApiProperty } from "@nestjs/swagger";

export class RootResponseDto {
  @ApiProperty({ example: "nglu-backend2" })
  service: string;

  @ApiProperty({ example: "NestJS" })
  framework: string;

  @ApiProperty({ example: "Drizzle" })
  orm: string;

  @ApiProperty({ example: "ok" })
  status: string;
}

export class HealthResponseDto {
  @ApiProperty({ example: "backend2" })
  service: string;

  @ApiProperty({ example: "ok" })
  status: string;
}

export class DatabaseHealthResponseDto {
  @ApiProperty({ example: "connected" })
  database: string;
}
