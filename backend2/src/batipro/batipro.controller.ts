import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentBatiproProject, type BatiproProjectScope } from "../auth/decorators/batipro-project-scope.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateBatiproBuildingLevelDto,
  CreateBatiproBuildingModelDto,
  CreateBatiproChangeOrderDto,
  CreateBatiproCrewDto,
  CreateBatiproDocumentDto,
  CreateBatiproMaterialDto,
  CreateBatiproPhaseDto,
  CreateBatiproProjectDto,
  CreateBatiproSituationDto,
  CreateBatiproSituationDocumentDto,
  CreateBatiproSubcontractorDto,
  CreateBatiproTaskDto,
  CreateSubcontractorLinkDto,
  RecordPaymentDto,
  ReviewSubmissionDto,
  UpdateBatiproBuildingLevelDto,
  UpdateBatiproBuildingModelDto,
  UpdateBatiproChangeOrderDto,
  UpdateBatiproCrewDto,
  UpdateBatiproDocumentDto,
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

  // ── Portail sous-traitant : lien + revue des soumissions (Phase 0) ───────
  @ApiOperation({ summary: "Generate a subcontractor submission link (token opaque)" })
  @Permissions("create-batipro")
  @Post("documents/subcontractor-link")
  createSubcontractorLink(@Body() body: CreateSubcontractorLinkDto, @CurrentOrg() orgId: number) {
    return this.batipro.createSubcontractorLink(body, orgId);
  }

  @ApiOperation({ summary: "List inbound subcontractor submissions (optionnel: par chantier)" })
  @Permissions("readAll-batipro")
  @Get("documents/submissions")
  submissions(@CurrentOrg() orgId: number, @Query("project_id") projectId?: string) {
    return this.batipro.listInboundSubmissions(orgId, projectId ? Number(projectId) : undefined);
  }

  @ApiOperation({ summary: "Lines of a subcontractor submission" })
  @Permissions("readAll-batipro")
  @Get("documents/submissions/:id/lines")
  submissionLines(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.submissionLines(id, orgId);
  }

  @ApiOperation({ summary: "Validate or return a subcontractor submission" })
  @Permissions("update-batipro")
  @Post("documents/submissions/:id/review")
  reviewSubmission(@Param("id", ParseIntPipe) id: number, @Body() body: ReviewSubmissionDto, @CurrentOrg() orgId: number) {
    return this.batipro.reviewSubmission(id, body, orgId);
  }

  @ApiOperation({ summary: "Stream the file attached to a subcontractor submission" })
  @Permissions("readAll-batipro")
  @Get("documents/submissions/:id/file")
  async submissionFile(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res({ passthrough: true }) res: Response) {
    const file = await this.batipro.submissionFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Documents sortants : devis (Phase 1) ─────────────────────────────────
  // NB : routes litterales (submissions, subcontractor-link) declarees plus haut ;
  // les routes a parametre :id restent en fin de declaration (matching NestJS).
  @ApiOperation({ summary: "List outbound documents (devis par defaut) — filtre type/direction/chantier" })
  @Permissions("readAll-batipro")
  @Get("documents")
  documents(
    @CurrentOrg() orgId: number,
    @Query("project_id") projectId?: string,
    @Query("type") type?: string,
    @Query("direction") direction?: string,
  ) {
    return this.batipro.listDocuments(orgId, {
      projectId: projectId ? Number(projectId) : undefined,
      type: type || undefined,
      direction: direction || undefined,
    });
  }

  @ApiOperation({ summary: "Suivi budgetaire chantier : devis accepte vs BC engages vs budget/contrat" })
  @Permissions("readAll-batipro")
  @Get("documents/budget-summary")
  budgetSummary(@Query("project_id", ParseIntPipe) projectId: number, @CurrentOrg() orgId: number) {
    return this.batipro.projectBudgetSummary(projectId, orgId);
  }

  @ApiOperation({ summary: "Etat d'avancement cumule par phase (pre-remplissage d'une situation)" })
  @Permissions("readAll-batipro")
  @Get("documents/situations-advancement")
  situationsAdvancement(@Query("project_id", ParseIntPipe) projectId: number, @CurrentOrg() orgId: number) {
    return this.batipro.situationsAdvancement(projectId, orgId);
  }

  @ApiOperation({ summary: "Create an outbound document (devis ou bon de commande)" })
  @Permissions("create-batipro")
  @Post("documents")
  createDocument(@Body() body: CreateBatiproDocumentDto, @CurrentOrg() orgId: number) {
    return this.batipro.createDocument(body, orgId);
  }

  @ApiOperation({ summary: "Create a situation de travaux (type=situation, calcul du montant periode)" })
  @Permissions("create-batipro")
  @Post("documents/situations")
  createSituationDocument(@Body() body: CreateBatiproSituationDocumentDto, @CurrentOrg() orgId: number) {
    return this.batipro.createSituationDocument(body, orgId);
  }

  @ApiOperation({ summary: "Generate an invoice from a validated situation (type=invoice)" })
  @Permissions("create-batipro")
  @Post("documents/situations/:id/invoice")
  createInvoiceFromSituation(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.createInvoiceFromSituation(id, orgId);
  }

  @ApiOperation({ summary: "Get an outbound document (+ lignes)" })
  @Permissions("readAll-batipro")
  @Get("documents/:id")
  getDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.getDocument(id, orgId);
  }

  @ApiOperation({ summary: "Update an outbound document (patch partiel, recalcul totaux si lignes)" })
  @Permissions("update-batipro")
  @Put("documents/:id")
  updateDocument(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateBatiproDocumentDto, @CurrentOrg() orgId: number) {
    return this.batipro.updateDocument(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete an outbound document" })
  @Permissions("delete-batipro")
  @Delete("documents/:id")
  deleteDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.deleteDocument(id, orgId);
  }

  @ApiOperation({ summary: "Render the printable HTML preview of a document" })
  @Permissions("readAll-batipro")
  @Get("documents/:id/html")
  async documentHtml(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res({ passthrough: true }) res: Response) {
    const html = await this.batipro.documentHtml(id, orgId);
    res.set({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" });
    return html;
  }

  @ApiOperation({ summary: "Generate/renew the client share token of a document" })
  @Permissions("update-batipro")
  @Post("documents/:id/share")
  shareDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.batipro.shareDocument(id, orgId);
  }

  // ── Phase 4 : emission (comptabilisation ledger) + paiement d'une facture ──
  @ApiOperation({ summary: "Emet une facture et la comptabilise (ledger postByRules, idempotent)" })
  @Permissions("update-batipro")
  @Post("documents/:id/issue")
  issueInvoice(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.batipro.postInvoiceToLedger(id, orgId, userId || undefined);
  }

  @ApiOperation({ summary: "Enregistre un reglement (partiel/total) sur une facture" })
  @Permissions("update-batipro")
  @Post("documents/:id/payment")
  recordPayment(@Param("id", ParseIntPipe) id: number, @Body() body: RecordPaymentDto, @CurrentOrg() orgId: number) {
    return this.batipro.recordPayment(id, body.amount, orgId);
  }
}
