import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentBatiproProject, type BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateBatiproBuildingLevelDto,
  CreateBatiproBuildingModelDto,
  CreateBatiproChangeOrderDto,
  CreateBatiproCrewDto,
  CreateBatiproMaterialDto,
  CreateBatiproPhaseDto,
  CreateBatiproProjectDto,
  CreateBatiproSituationDto,
  CreateBatiproSubcontractorDto,
  CreateBatiproTaskDto,
  UpdateBatiproBuildingLevelDto,
  UpdateBatiproBuildingModelDto,
  UpdateBatiproChangeOrderDto,
  UpdateBatiproCrewDto,
  UpdateBatiproMaterialDto,
  UpdateBatiproPhaseDto,
  UpdateBatiproProjectDto,
  UpdateBatiproSituationDto,
  UpdateBatiproSubcontractorDto,
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

  @ApiOperation({ summary: "List BatiPro phases (optionnel: par chantier)" })
  @Permissions("readAll-batipro")
  @Get("phases")
  phases(@CurrentOrg() orgId: number, @Query("project_id") projectId?: string) {
    return this.batipro.phases(orgId, projectId ? Number(projectId) : undefined);
  }

  @ApiOperation({ summary: "Create BatiPro phase" })
  @Permissions("create-batipro")
  @Post("phases")
  createPhase(@Body() body: CreateBatiproPhaseDto, @CurrentOrg() orgId: number) {
    return this.batipro.createPhase(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro phase" })
  @Permissions("update-batipro")
  @Put("phases/:id")
  updatePhase(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproPhaseDto, @CurrentOrg() orgId: number) {
    return this.batipro.updatePhase(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro phase" })
  @Permissions("delete-batipro")
  @Delete("phases/:id")
  deletePhase(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deletePhase(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro situations (optionnel: par chantier)" })
  @Permissions("readAll-batipro")
  @Get("situations")
  situations(@CurrentOrg() orgId: number, @Query("project_id") projectId?: string) {
    return this.batipro.situations(orgId, projectId ? Number(projectId) : undefined);
  }

  @ApiOperation({ summary: "Create BatiPro situation" })
  @Permissions("create-batipro")
  @Post("situations")
  createSituation(@Body() body: CreateBatiproSituationDto, @CurrentOrg() orgId: number) {
    return this.batipro.createSituation(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro situation" })
  @Permissions("update-batipro")
  @Put("situations/:id")
  updateSituation(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproSituationDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateSituation(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro situation" })
  @Permissions("delete-batipro")
  @Delete("situations/:id")
  deleteSituation(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteSituation(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro change orders (avenants, optionnel: par chantier)" })
  @Permissions("readAll-batipro")
  @Get("change-orders")
  changeOrders(@CurrentOrg() orgId: number, @Query("project_id") projectId?: string) {
    return this.batipro.changeOrders(orgId, projectId ? Number(projectId) : undefined);
  }

  @ApiOperation({ summary: "Create BatiPro change order" })
  @Permissions("create-batipro")
  @Post("change-orders")
  createChangeOrder(@Body() body: CreateBatiproChangeOrderDto, @CurrentOrg() orgId: number) {
    return this.batipro.createChangeOrder(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro change order" })
  @Permissions("update-batipro")
  @Put("change-orders/:id")
  updateChangeOrder(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproChangeOrderDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateChangeOrder(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro change order" })
  @Permissions("delete-batipro")
  @Delete("change-orders/:id")
  deleteChangeOrder(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteChangeOrder(id, orgId);
  }

  @ApiOperation({ summary: "List BatiPro subcontractors" })
  @Permissions("readAll-batipro")
  @Get("subcontractors")
  subcontractors(@CurrentOrg() orgId: number) {
    return this.batipro.subcontractors(orgId);
  }

  @ApiOperation({ summary: "Create BatiPro subcontractor" })
  @Permissions("create-batipro")
  @Post("subcontractors")
  createSubcontractor(@Body() body: CreateBatiproSubcontractorDto, @CurrentOrg() orgId: number) {
    return this.batipro.createSubcontractor(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro subcontractor" })
  @Permissions("update-batipro")
  @Put("subcontractors/:id")
  updateSubcontractor(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproSubcontractorDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateSubcontractor(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro subcontractor" })
  @Permissions("delete-batipro")
  @Delete("subcontractors/:id")
  deleteSubcontractor(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteSubcontractor(id, orgId);
  }

  @ApiOperation({ summary: "Get BatiPro building model (plan 3D) of a project" })
  @Permissions("readAll-batipro")
  @Get("building-model")
  buildingModel(@CurrentOrg() orgId: number, @Query("project_id", ParseIntPipe) projectId: number) {
    return this.batipro.buildingModel(orgId, projectId);
  }

  @ApiOperation({ summary: "Create BatiPro building model" })
  @Permissions("create-batipro")
  @Post("building-model")
  createBuildingModel(@Body() body: CreateBatiproBuildingModelDto, @CurrentOrg() orgId: number) {
    return this.batipro.createBuildingModel(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro building model" })
  @Permissions("update-batipro")
  @Put("building-model/:id")
  updateBuildingModel(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproBuildingModelDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateBuildingModel(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro building model" })
  @Permissions("delete-batipro")
  @Delete("building-model/:id")
  deleteBuildingModel(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteBuildingModel(id, orgId);
  }

  @ApiOperation({ summary: "Create BatiPro building level (etage)" })
  @Permissions("create-batipro")
  @Post("building-levels")
  createBuildingLevel(@Body() body: CreateBatiproBuildingLevelDto, @CurrentOrg() orgId: number) {
    return this.batipro.createBuildingLevel(body, orgId);
  }

  @ApiOperation({ summary: "Update BatiPro building level (etage / geometrie)" })
  @Permissions("update-batipro")
  @Put("building-levels/:id")
  updateBuildingLevel(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproBuildingLevelDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateBuildingLevel(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete BatiPro building level" })
  @Permissions("delete-batipro")
  @Delete("building-levels/:id")
  deleteBuildingLevel(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteBuildingLevel(id, orgId);
  }

  @ApiOperation({ summary: "Upload the architect plan (image/PDF) of a building model" })
  @Permissions("update-batipro")
  @UseInterceptors(FileInterceptor("plan", {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
    },
  }))
  @Post("building-model/:id/plan")
  uploadModelPlan(@Param("id", ParseIntPipe) id: number, @UploadedFile() plan: any, @CurrentOrg() orgId: number) {
    if (!plan) throw new BadRequestException("Aucun fichier.");
    return this.batipro.uploadModelPlan(id, plan, orgId);
  }

  @ApiOperation({ summary: "Stream the imported architect plan (image/PDF)" })
  @Permissions("readAll-batipro")
  @Get("building-model/:id/plan")
  async modelPlanFile(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res({ passthrough: true }) res: Response) {
    const file = await this.batipro.modelPlanFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Remove the imported architect plan (back to parametric)" })
  @Permissions("update-batipro")
  @Delete("building-model/:id/plan")
  deleteModelPlan(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteModelPlan(id, orgId);
  }
}
