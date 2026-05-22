import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  DatabaseHealthResponseDto,
  HealthResponseDto,
  RootResponseDto,
} from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@SkipThrottle()
@ApiTags("health")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Backend2 service information" })
  @ApiOkResponse({ type: RootResponseDto })
  @Get()
  root() {
    return this.healthService.root();
  }

  @ApiOperation({ summary: "Backend2 health check" })
  @ApiOkResponse({ type: HealthResponseDto })
  @Get("health")
  health() {
    return this.healthService.health();
  }

  @ApiOperation({ summary: "Database connectivity check" })
  @ApiOkResponse({ type: DatabaseHealthResponseDto })
  @Get("health/db")
  db() {
    return this.healthService.database();
  }
}
