import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentBatiproProject, type BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateBatiproCrewDto,
  CreateBatiproMaterialDto,
  CreateBatiproProjectDto,
  CreateBatiproTaskDto,
  UpdateBatiproCrewDto,
  UpdateBatiproMaterialDto,
  UpdateBatiproProjectDto,
  UpdateBatiproTaskDto,
} from "./dto/batipro.dto";
import { BatiproService } from "./batipro.service";

@ApiTags("batipro")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, BatiproProjectGuard)
@Controller("batipro")
export class BatiproController {
  constructor(private readonly batipro: BatiproService) {}

  @ApiOperation({ summary: "BatiPro dashboard snapshot" })
  @Permissions("readAll-batipro")
  @Get("dashboard")
  dashboard(@CurrentOrg() orgId: number, @CurrentBatiproProject() scope: BatiproProjectScope) {
    return this.batipro.dashboard(orgId, scope);
  }

  @ApiOperation({ summary: "List BatiPro projects" })
  @Permissions("readAll-batipro")
  @Get("projects")
  projects(@CurrentOrg() orgId: number, @CurrentBatiproProject() scope: BatiproProjectScope) {
    return this.batipro.projects(orgId, scope);
  }

  @ApiOperation({ summary: "All project assignments of the org (map userId -> projectId[])" })
  @Permissions("readAll-batipro")
  @Get("project-assignments")
  listAllProjectAssignments(@CurrentOrg() orgId: number) {
    return this.batipro.listAllProjectAssignments(orgId);
  }

  @ApiOperation({ summary: "List projects assigned to a user (RBAC par chantier)" })
  @Permissions("readAll-batipro")
  @Get("project-assignments/:userId")
  listProjectAssignments(@Param("userId", ParseIntPipe) userId: number, @CurrentOrg() orgId: number) {
    return this.batipro.listProjectAssignments(userId, orgId);
  }

  @ApiOperation({ summary: "Set projects assigned to a user (set complet, RBAC par chantier)" })
  @Permissions("update-batipro")
  @Post("project-assignments/:userId")
  setProjectAssignments(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: { projectIds: number[] },
    @CurrentOrg() orgId: number,
  ) {
    return this.batipro.setProjectAssignments(userId, Array.isArray(body?.projectIds) ? body.projectIds : [], orgId);
  }

  @ApiOperation({ summary: "Create BatiPro project" })
  @Permissions("create-batipro")
  @Post("projects")
  createProject(@Body() body: CreateBatiproProjectDto, @CurrentOrg() orgId: number) {
    return this.batipro.createProject(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro project" })
  @Permissions("update-batipro")
  @Put("projects/:id")
  updateProject(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproProjectDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateProject(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro project" })
  @Permissions("delete-batipro")
  @Delete("projects/:id")
  deleteProject(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteProject(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro tasks" })
  @Permissions("readAll-batipro")
  @Get("tasks")
  tasks(@CurrentOrg() orgId: number, @CurrentBatiproProject() scope: BatiproProjectScope) {
    return this.batipro.tasks(orgId, scope);
  }

  @ApiOperation({ summary: "Create BatiPro task" })
  @Permissions("create-batipro")
  @Post("tasks")
  createTask(@Body() body: CreateBatiproTaskDto, @CurrentOrg() orgId: number) {
    return this.batipro.createTask(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro task" })
  @Permissions("update-batipro")
  @Put("tasks/:id")
  updateTask(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproTaskDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateTask(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro task" })
  @Permissions("delete-batipro")
  @Delete("tasks/:id")
  deleteTask(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteTask(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro materials" })
  @Permissions("readAll-batipro")
  @Get("materials")
  materials(@CurrentOrg() orgId: number) {
    return this.batipro.materials(orgId);
  }

  @ApiOperation({ summary: "Create BatiPro material" })
  @Permissions("create-batipro")
  @Post("materials")
  createMaterial(@Body() body: CreateBatiproMaterialDto, @CurrentOrg() orgId: number) {
    return this.batipro.createMaterial(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro material" })
  @Permissions("update-batipro")
  @Put("materials/:id")
  updateMaterial(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproMaterialDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateMaterial(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro material" })
  @Permissions("delete-batipro")
  @Delete("materials/:id")
  deleteMaterial(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteMaterial(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro crews" })
  @Permissions("readAll-batipro")
  @Get("crews")
  crews(@CurrentOrg() orgId: number) {
    return this.batipro.crews(orgId);
  }

  @ApiOperation({ summary: "Create BatiPro crew" })
  @Permissions("create-batipro")
  @Post("crews")
  createCrew(@Body() body: CreateBatiproCrewDto, @CurrentOrg() orgId: number) {
    return this.batipro.createCrew(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro crew" })
  @Permissions("update-batipro")
  @Put("crews/:id")
  updateCrew(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproCrewDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateCrew(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro crew" })
  @Permissions("delete-batipro")
  @Delete("crews/:id")
  deleteCrew(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteCrew(id, orgId);
  }
}
