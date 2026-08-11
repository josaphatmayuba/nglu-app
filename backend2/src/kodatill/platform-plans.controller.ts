import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import { CreatePlatformPlanDto, UpdatePlatformPlanDto } from "./dto/platform-plans.dto";
import { PlatformPlansService } from "./platform-plans.service";

// Lecture ouverte a tout utilisateur authentifie (un client doit pouvoir voir
// les plans disponibles) ; ecriture reservee au super_owner (seul proprietaire
// de la grille tarifaire de la plateforme). Meme pattern que OrganizationsController
// pour SuperOwnerGuard, mais applique route par route ici (pas au niveau classe).
@ApiTags("kodatill-platform-plans")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kodatill/platform/plans")
export class PlatformPlansController {
  constructor(private readonly platformPlans: PlatformPlansService) {}

  @ApiOperation({ summary: "Liste les plans actifs de la plateforme (public authentifie)" })
  @ApiOkResponse({ description: "Plans" })
  @Get()
  list() {
    return this.platformPlans.list();
  }

  @ApiOperation({ summary: "Cree un plan (super_owner)" })
  @ApiCreatedResponse({ description: "Plan cree" })
  @UseGuards(SuperOwnerGuard)
  @Post()
  create(@Body() body: CreatePlatformPlanDto) {
    return this.platformPlans.create(body);
  }

  @ApiOperation({ summary: "Modifie un plan (super_owner)" })
  @ApiParam({ name: "id", type: Number })
  @UseGuards(SuperOwnerGuard)
  @Patch(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePlatformPlanDto) {
    return this.platformPlans.update(id, body);
  }

  @ApiOperation({ summary: "Desactive un plan (soft delete, super_owner)" })
  @ApiParam({ name: "id", type: Number })
  @UseGuards(SuperOwnerGuard)
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.platformPlans.remove(id);
  }
}
