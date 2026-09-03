import { Controller, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import { PlatformOverviewService } from "./platform-overview.service";

// Vues cross-organisation intrinsequement reservees au super_owner (SCRUM-302).
@ApiTags("kodatill-platform-overview")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperOwnerGuard)
@Controller("kodatill/platform")
export class PlatformOverviewController {
  constructor(private readonly platformOverview: PlatformOverviewService) {}

  @ApiOperation({ summary: "KPI globaux plateforme (organisations, abonnements, ventes, commissions du mois)" })
  @ApiOkResponse({ description: "KPI, montants groupes par devise" })
  @Get("overview")
  getOverview() {
    return this.platformOverview.getOverview();
  }

  @ApiOperation({ summary: "Liste des organisations ayant active KodaTill, avec metriques agregees" })
  @ApiQuery({ name: "limit", required: false, example: 50 })
  @ApiQuery({ name: "offset", required: false, example: 0 })
  @ApiOkResponse({ description: "Organisations + statut d'abonnement + ventes + nombre de commandes" })
  @Get("companies")
  listCompanies(
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.platformOverview.listCompanies(limit ?? 50, offset ?? 0);
  }
}
