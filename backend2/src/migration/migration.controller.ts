import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MigrationService } from "./migration.service";

// Migration Cockpit — API LECTURE SEULE pour piloter/contrôler la migration
// legacy PostgreSQL -> Drizzle/MySQL. Servie sous /api/migration/* (whitelist
// middleware requise). Le RUN reste manuel (Python).
@ApiTags("migration")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("migration")
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @ApiOperation({ summary: "État de la migration par domaine (compta/immo/commercial/users)" })
  @ApiOkResponse({ description: "Liste des domaines + avancement" })
  @Get("domains")
  domains() {
    return this.migrationService.domains();
  }

  @ApiOperation({ summary: "Aperçu d'une table source de l'export legacy" })
  @ApiParam({ name: "table", example: "account" })
  @ApiQuery({ name: "limit", required: false, example: 25 })
  @Get("source/:table/preview")
  preview(
    @Param("table") table: string,
    @Query("limit", new DefaultValuePipe(25), ParseIntPipe) limit: number,
  ) {
    return this.migrationService.sourcePreview(table, Math.min(Math.max(limit, 1), 200));
  }

  @ApiOperation({ summary: "Rapport de validation / dry-run d'un domaine" })
  @ApiParam({ name: "domain", example: "compta" })
  @Get("validate/:domain")
  validate(@Param("domain") domain: string) {
    return this.migrationService.validate(domain);
  }

  @ApiOperation({ summary: "Commande Python à lancer pour migrer un domaine (n'exécute rien)" })
  @ApiParam({ name: "domain", example: "immobilier" })
  @Get("run-command/:domain")
  runCommand(@Param("domain") domain: string) {
    return this.migrationService.runCommand(domain);
  }
}
