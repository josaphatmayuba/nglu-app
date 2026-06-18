import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { ForecastMode } from "./forecast.service";
import { ForecastService } from "./forecast.service";
import type { ForecastScope } from "./forecast.types";

const HORIZONS = new Set([1, 3, 6, 12, 24, 36]);
const MODES = new Set<ForecastMode>(["prudent", "realiste", "optimiste"]);
const SCOPES = new Set<ForecastScope>(["all", "compta", "domus", "farmos", "hr", "batipro"]);

@ApiTags("forecast")
@Controller("forecast")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ForecastController {
  constructor(private readonly forecast: ForecastService) {}

  @ApiOperation({ summary: "Projection de tresorerie (par mois x devise)" })
  @ApiOkResponse({ description: "Cash-flow previsionnel" })
  // Donnee sensible (cash consolide) : meme garde que les rapports comptables.
  @Permissions("readAll-transaction")
  @Get("cash-flow")
  cashFlow(
    @CurrentOrg() orgId: number,
    @Query("horizon") horizon?: string,
    @Query("mode") mode?: string,
    @Query("scope") scope?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 3;
    const safeMode = MODES.has(mode as ForecastMode) ? (mode as ForecastMode) : "prudent";
    const safeScope = SCOPES.has(scope as ForecastScope) ? (scope as ForecastScope) : "all";
    return this.forecast.cashFlow(orgId, {
      horizonMonths,
      mode: safeMode,
      scope: safeScope,
    });
  }
}
