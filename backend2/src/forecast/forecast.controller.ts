import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { FARMOS_SPECIES, type FarmosSpecies } from "../farmos/dto/farmos.dto";
import { ForecastLivestockService } from "./forecast-livestock.service";
import { ForecastProductionService } from "./forecast-production.service";
import { ForecastTrackingService } from "./forecast-tracking.service";
import type { ForecastMode } from "./forecast.service";
import { ForecastService } from "./forecast.service";
import type { ForecastScope } from "./forecast.types";

const HORIZONS = new Set([1, 3, 6, 12, 24, 36]);
const LOOKBACKS = new Set([3, 6, 12]);
const MODES = new Set<ForecastMode>(["prudent", "realiste", "optimiste"]);
const SCOPES = new Set<ForecastScope>(["all", "compta", "ventes", "domus", "farmos", "hr", "batipro"]);
const FARMOS_SPECIES_SET = new Set<string>(FARMOS_SPECIES);

@ApiTags("forecast")
@Controller("forecast")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ForecastController {
  constructor(
    private readonly forecast: ForecastService,
    private readonly tracking: ForecastTrackingService,
    private readonly production: ForecastProductionService,
    private readonly livestock: ForecastLivestockService,
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
    @Query("species") species?: string,
    @Query("lookback") lookback?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 3;
    const lookbackMonths = parseLookback(lookback);
    const safeMode = MODES.has(mode as ForecastMode) ? (mode as ForecastMode) : "prudent";
    const safeScope = SCOPES.has(scope as ForecastScope) ? (scope as ForecastScope) : "all";
    const safeSpecies = parseSpecies(species);
    return this.forecast.cashFlow(orgId, {
      horizonMonths,
      mode: safeMode,
      scope: safeScope,
      species: safeSpecies,
      lookbackMonths,
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

  @ApiOperation({ summary: "Projection de production (oeufs, naissances)" })
  @ApiOkResponse({ description: "Series de production par grandeur" })
  @Permissions("readAll-transaction")
  @Get("production")
  productionForecast(
    @CurrentOrg() orgId: number,
    @Query("horizon") horizon?: string,
    @Query("species") species?: string,
    @Query("lookback") lookback?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 6;
    return this.production.production(orgId, horizonMonths, parseSpecies(species), parseLookback(lookback));
  }

  @ApiOperation({ summary: "Projection du cheptel (têtes dans le temps + impact ventes)" })
  @ApiOkResponse({ description: "Effectif projeté par mois + recette de vente déduite" })
  @Permissions("readAll-transaction")
  @Get("livestock")
  livestockForecast(
    @CurrentOrg() orgId: number,
    @Query("horizon") horizon?: string,
    @Query("species") species?: string,
    @Query("lookback") lookback?: string,
  ) {
    const horizonMonths = HORIZONS.has(Number(horizon)) ? Number(horizon) : 6;
    return this.livestock.livestock(orgId, horizonMonths, parseSpecies(species), parseLookback(lookback));
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

function parseSpecies(raw?: string): FarmosSpecies | undefined {
  const species = raw?.trim();
  return species && FARMOS_SPECIES_SET.has(species) ? (species as FarmosSpecies) : undefined;
}

function parseLookback(raw?: string): number {
  const n = Number(raw);
  return LOOKBACKS.has(n) ? n : 6;
}
