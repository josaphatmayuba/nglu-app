import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import { ComputeCommissionsDto } from "./dto/platform-commissions.dto";
import { PlatformCommissionsService } from "./platform-commissions.service";

// Reserve au super_owner : ce module regle les commissions dues par les
// organisations clientes a la plateforme. Pas de scheduler automatique dans
// cette phase (SCRUM-301) — declenchement manuel uniquement via /compute.
@ApiTags("kodatill-platform-commissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperOwnerGuard)
@Controller("kodatill/platform/commissions")
export class PlatformCommissionsController {
  constructor(private readonly platformCommissions: PlatformCommissionsService) {}

  @ApiOperation({ summary: "Calcule et enregistre les commissions dues pour une periode (idempotent)" })
  @ApiCreatedResponse({ description: "Resume : entrees creees + total par devise" })
  @Post("compute")
  compute(@Body() body: ComputeCommissionsDto) {
    return this.platformCommissions.compute(body);
  }

  @ApiOperation({ summary: "Liste les commissions d'une periode" })
  @ApiQuery({ name: "period", required: true, example: "2026-08" })
  @ApiOkResponse({ description: "Entrees de commission" })
  @Get()
  list(@Query("period") period?: string) {
    if (!period) {
      throw new BadRequestException("Le parametre period (YYYY-MM) est requis.");
    }
    return this.platformCommissions.listByPeriod(period);
  }
}
