import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateProjectDto, UpdateProjectDto } from "./dto/projects.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@Controller("projects")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @ApiOperation({ summary: "Liste les projets (axes analytiques / bailleurs)" })
  @ApiOkResponse({ description: "Projets" })
  @Permissions("readAll-transaction")
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.projects.list(orgId);
  }

  @ApiOperation({ summary: "Cree un projet" })
  @ApiCreatedResponse({ description: "Projet cree" })
  @Permissions("create-transaction")
  @Post()
  create(
    @Body() body: CreateProjectDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.projects.create(body, orgId, userId);
  }

  @ApiOperation({ summary: "Rapport analytique + bailleur d'un projet (depuis le grand livre)" })
  @ApiOkResponse({ description: "Rapport projet" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-transaction")
  @Get(":id/report")
  report(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.projects.ledgerReport(id, orgId);
  }

  @ApiOperation({ summary: "Detail d'un projet" })
  @ApiOkResponse({ description: "Projet" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-transaction")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.projects.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Met a jour un projet" })
  @ApiOkResponse({ description: "Projet mis a jour" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateProjectDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.projects.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Archive (soft delete) un projet" })
  @ApiOkResponse({ description: "Projet archive" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("delete-transaction")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.projects.remove(id, orgId);
  }
}
