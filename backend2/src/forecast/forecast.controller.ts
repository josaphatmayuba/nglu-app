import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { ForecastTrackingService } from "./forecast-tracking.service";
import type { ForecastMode } from "./forecast.service";
import { ForecastService } from "./forecast.service";
import type { ForecastScope } from "./forecast.types";

const HORIZONS = new Set([1, 3, 6, 12, 24, 36]);
const MODES = new Set<ForecastMode>(["prudent", "realiste", "optimiste"]);
const SCOPES = new Set<ForecastScope>(["all", "compta", "ventes", "domus", "farmos", "hr", "batipro"]);

@ApiTags("forecast")
@Controller("forecast")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ForecastController {
  constructor(
    private readonly forecast: ForecastService,
    private readonly tracking: ForecastTrackingService,
  ) {}

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
    @Query("adjust") adjust?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 3;
    const safeMode = MODES.has(mode as ForecastMode) ? (mode as ForecastMode) : "prudent";
    const safeScope = SCOPES.has(scope as ForecastScope) ? (scope as ForecastScope) : "all";
    return this.forecast.cashFlow(orgId, {
      horizonMonths,
      mode: safeMode,
      scope: safeScope,
      adjustments: parseAdjust(adjust),
    });
  }

  @ApiOperation({ summary: "Fige la prevision courante (snapshot prevu vs reel)" })
  @ApiOkResponse({ description: "Snapshot enregistre" })
  @Permissions("readAll-transaction")
  @Post("snapshot")
  snapshot(
    @CurrentOrg() orgId: number,
    @Query("horizon") horizon?: string,
    @Query("mode") mode?: string,
    @Query("scope") scope?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 6;
    const safeMode = MODES.has(mode as ForecastMode) ? (mode as ForecastMode) : "realiste";
    const safeScope = SCOPES.has(scope as ForecastScope) ? (scope as ForecastScope) : "ventes";
    return this.tracking.snapshot(orgId, safeMode, safeScope, horizonMonths);
  }

  @ApiOperation({ summary: "Ecart prevu vs reel (mois ecoules)" })
  @ApiOkResponse({ description: "Variance par mois x devise + biais moyen" })
  @Permissions("readAll-transaction")
  @Get("variance")
  variance(@CurrentOrg() orgId: number, @Query("scope") scope?: string) {
    const safeScope = SCOPES.has(scope as ForecastScope) ? (scope as ForecastScope) : "ventes";
    return this.tracking.variance(orgId, safeScope);
  }
}

/**
 * Parse "domus:1.1,hr:0.9" -> { domus: 1.1, hr: 0.9 }. Ignore les scopes
 * inconnus et les facteurs hors [0, 5] (garde-fou contre les valeurs absurdes).
 */
function parseAdjust(raw?: string): Partial<Record<ForecastScope, number>> {
  const out: Partial<Record<ForecastScope, number>> = {};
  if (!raw) return out;
  for (const part of raw.split(",")) {
    const [scope, factorStr] = part.split(":");
    const s = scope?.trim() as ForecastScope;
    const f = Number(factorStr);
    if (SCOPES.has(s) && s !== "all" && Number.isFinite(f) && f >= 0 && f <= 5) {
      out[s] = f;
    }
  }
  return out;
}
