import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { VaccineRegistryService } from "./vaccine-registry.service";

@ApiTags("vaccine-registry")
@Controller("vaccine-registry")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VaccineRegistryController {
  constructor(private readonly registry: VaccineRegistryService) {}

  @ApiOperation({ summary: "Especes du referentiel" })
  @Permissions("readAll-farmos")
  @Get("species")
  species() {
    return this.registry.listSpecies();
  }

  @ApiOperation({ summary: "Pathogenes / maladies cibles" })
  @Permissions("readAll-farmos")
  @Get("pathogens")
  pathogens() {
    return this.registry.listPathogens();
  }

  @ApiOperation({ summary: "Regions / pays reglementaires" })
  @Permissions("readAll-farmos")
  @Get("regions")
  regions() {
    return this.registry.listRegions();
  }

  @ApiOperation({ summary: "Catalogue vaccins (filtrable par espece / texte)" })
  @ApiOkResponse({ description: "Vaccins" })
  @Permissions("readAll-farmos")
  @Get("vaccines")
  vaccines(@Query("speciesId") speciesId?: string, @Query("q") q?: string) {
    return this.registry.listVaccines({
      speciesId: speciesId ? Number(speciesId) : undefined,
      q,
    });
  }

  @ApiOperation({ summary: "Fiche complete d'un vaccin (composition, homologations, delais)" })
  @Permissions("readAll-farmos")
  @Get("vaccines/:id")
  vaccine(@Param("id", ParseIntPipe) id: number) {
    return this.registry.getVaccine(id);
  }

  @ApiOperation({ summary: "Protocole applicable selon le contexte animal (moteur de regles)" })
  @Permissions("readAll-farmos")
  @Get("vaccines/:id/protocol")
  protocol(
    @Param("id", ParseIntPipe) id: number,
    @Query("speciesId", ParseIntPipe) speciesId: number,
    @Query("ageDays") ageDays?: string,
    @Query("riskZone") riskZone?: string,
    @Query("productionType") productionType?: string,
    @Query("pregnant") pregnant?: string,
  ) {
    return this.registry.resolveProtocol(id, speciesId, {
      ageDays: ageDays ? Number(ageDays) : undefined,
      riskZone,
      productionType,
      pregnant: pregnant === "true",
    });
  }
}
