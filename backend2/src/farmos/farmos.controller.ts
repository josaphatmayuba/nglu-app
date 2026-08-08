import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentFarmosSpecies, type FarmosSpeciesScope } from "../auth/decorators/farmos-species-scope.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { FarmosSpeciesGuard } from "../auth/guards/farmos-species.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  ConsumeMedicineDto,
  CreateAnimalDto,
  ImportAnimalsDto,
  CreateFarmosStaffDto,
  CreateDiseaseDto,
  CreateExpenseDto,
  CreateBatchAdjustmentDto,
  CreateBatchTransferDto,
  CreateMedicineDto,
  CreateMortalityEventDto,
  CreateWeighingDto,
  ImportWeighingsDto,
  UpdateFarmosStaffDto,
  SetFarmosStaffStatusDto,
  CreateVaccinationDto,
  CreateVetExamDto,
  SignVetExamDto,
  CreateFarmosDocumentDto,
  UpsertFarmosBuildingDto,
  CreateWorkLogDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateFieldNoteDto,
  SaveReportDto,
  CreateProductionLogDto,
  CreateReproductionEventDto,
  CreateSaleDto,
  CreateSemenStrawDto,
  CreateTreatmentDto,
  DeclareBoxDiseaseDto,
  UpdateAnimalDto,
  UpdateDiseaseDto,
  UpdateFarmosSpeciesSettingsDto,
  UpdateMedicineDto,
  UpdateSemenStrawDto,
  UpdateTreatmentDto,
  UpsertFarmosPriceDto,
} from "./dto/farmos.dto";
import { FarmosService } from "./farmos.service";

const FARMOS_REALTIME_TABLES = [
  "animals",
  "medicines",
  "diseases",
  "treatments",
  "reproductionEvents",
  "sales",
  "expenses",
  "vaccinations",
  "productionLogs",
  "vetExams",
  "mortalityEvents",
  "lookups",
  "priceList",
  "staff",
  "semenStraws",
];

@ApiTags("farmos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, FarmosSpeciesGuard)
@Controller("farmos")
export class FarmosController {
  constructor(private readonly farmos: FarmosService) {}

  @ApiOperation({ summary: "FarmOS dashboard snapshot grouped in one request" })
  @Permissions("readAll-farmos")
  @Get("dashboard")
  dashboard(@CurrentOrg() orgId: number) {
    return this.farmos.getDashboardSnapshot(orgId);
  }

  @ApiOperation({ summary: "Get FarmOS organization settings." })
  @Permissions("readAll-farmos")
  @Get("settings")
  getSettings(@CurrentOrg() orgId: number) {
    return this.farmos.getSettings(orgId);
  }

  @ApiOperation({ summary: "Update enabled species for the organization." })
  @Permissions("update-farmos")
  @Put("settings/species")
  updateSpeciesSettings(@CurrentOrg() orgId: number, @Body() body: UpdateFarmosSpeciesSettingsDto) {
    return this.farmos.updateSpeciesSettings(orgId, body.enabled_species);
  }

  @ApiOperation({ summary: "List FarmOS POS price list." })
  @Permissions("readAll-farmos")
  @Get("prices")
  listPrices(@CurrentOrg() orgId: number) {
    return this.farmos.listPrices(orgId);
  }

  @ApiOperation({ summary: "Create FarmOS POS price." })
  @Permissions("update-farmos")
  @Post("prices")
  createPrice(@CurrentOrg() orgId: number, @Body() body: UpsertFarmosPriceDto) {
    return this.farmos.createPrice(body, orgId);
  }

  @ApiOperation({ summary: "Update FarmOS POS price." })
  @Permissions("update-farmos")
  @Put("prices/:id")
  updatePrice(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Body() body: UpsertFarmosPriceDto) {
    return this.farmos.updatePrice(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete FarmOS POS price." })
  @Permissions("update-farmos")
  @Delete("prices/:id")
  deletePrice(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deletePrice(id, orgId);
  }

  @ApiOperation({ summary: "Fallback realtime version for FarmOS clients when SSE is unavailable." })
  @Permissions("readAll-farmos")
  @Get("events/version")
  eventsVersion(@Query("since") since?: string) {
    return {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      since: since || null,
      tables: FARMOS_REALTIME_TABLES,
    };
  }

  // ─── Animals ─────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List FarmOS animals" })
  @Permissions("readAll-farmos")
  @Get("animals")
  listAnimals(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listAnimals(orgId, species);
  }

  @ApiOperation({ summary: "All species assignments of the org (map userId -> species[])" })
  @Permissions("readAll-farmos")
  @Get("species-assignments")
  listAllSpeciesAssignments(@CurrentOrg() orgId: number) {
    return this.farmos.listAllSpeciesAssignments(orgId);
  }

  @ApiOperation({ summary: "List species assigned to a user (RBAC par espèce)" })
  @Permissions("readAll-farmos")
  @Get("species-assignments/:userId")
  listSpeciesAssignments(@Param("userId", ParseIntPipe) userId: number, @CurrentOrg() orgId: number) {
    return this.farmos.listSpeciesAssignments(userId, orgId);
  }

  @ApiOperation({ summary: "Set species assigned to a user (set complet, RBAC par espèce)" })
  @Permissions("update-farmos")
  @Post("species-assignments/:userId")
  setSpeciesAssignments(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: { species: string[] },
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.setSpeciesAssignments(userId, Array.isArray(body?.species) ? body.species : [], orgId);
  }

  @ApiOperation({ summary: "Get FarmOS animal by id" })
  @Permissions("readAll-farmos")
  @Get("animals/:id")
  getAnimal(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getAnimal(id, orgId);
  }

  @ApiOperation({ summary: "Create a FarmOS animal" })
  @Permissions("create-farmos")
  @Post("animals")
  createAnimal(@Body() body: CreateAnimalDto, @CurrentOrg() orgId: number) {
    return this.farmos.createAnimal(body, orgId);
  }

  @ApiOperation({ summary: "Import animals in bulk from a mapped CSV (COMP-P1-001)." })
  @Permissions("create-farmos")
  @Post("animals/import")
  importAnimals(@Body() body: ImportAnimalsDto, @CurrentOrg() orgId: number) {
    return this.farmos.importAnimals(body, orgId);
  }

  @ApiOperation({ summary: "Update a FarmOS animal" })
  @Permissions("update-farmos")
  @Put("animals/:id")
  updateAnimal(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAnimalDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateAnimal(id, body, orgId);
  }

  @Permissions("update-farmos")
  @Patch("animals/:id")
  patchAnimal(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateAnimalDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateAnimal(id, body, orgId);
  }

  @ApiOperation({ summary: "Remove an animal from POS sale listing when no sale exists." })
  @Permissions("update-farmos")
  @Delete("animals/:id/listing")
  unlistAnimalFromSale(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.unlistAnimalFromSale(id, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a FarmOS animal" })
  @Permissions("delete-farmos")
  @Delete("animals/:id")
  deleteAnimal(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteAnimal(id, orgId);
  }

  // ─── Medicines ───────────────────────────────────────────────────────────

  @Permissions("readAll-farmos")
  @Get("medicines")
  listMedicines(@CurrentOrg() orgId: number) {
    return this.farmos.listMedicines(orgId);
  }

  @Permissions("readAll-farmos")
  @Get("medicines/:id")
  getMedicine(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getMedicine(id, orgId);
  }

  @Permissions("create-farmos")
  @Post("medicines")
  createMedicine(@Body() body: CreateMedicineDto, @CurrentOrg() orgId: number) {
    return this.farmos.createMedicine(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("medicines/:id")
  updateMedicine(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateMedicineDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateMedicine(id, body, orgId);
  }

  @Permissions("update-farmos")
  @Patch("medicines/:id")
  patchMedicine(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateMedicineDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateMedicine(id, body, orgId);
  }

  @ApiOperation({ summary: "Decrement medicine/feed inventory (consumption/sortie)." })
  @Permissions("update-farmos")
  @Post("medicines/:id/consume")
  consumeMedicine(@Param("id", ParseIntPipe) id: number, @Body() body: ConsumeMedicineDto, @CurrentOrg() orgId: number) {
    return this.farmos.consumeMedicine(id, body.quantity, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("medicines/:id")
  deleteMedicine(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteMedicine(id, orgId);
  }

  // ─── Treatments ──────────────────────────────────────────────────────────

  @Permissions("readAll-farmos")
  @Get("treatments")
  listTreatments(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listTreatments(orgId, species);
  }

  @Permissions("readAll-farmos")
  @Get("treatments/:id")
  getTreatment(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getTreatment(id, orgId);
  }

  @Permissions("create-farmos")
  @Post("treatments")
  createTreatment(@Body() body: CreateTreatmentDto, @CurrentOrg() orgId: number) {
    return this.farmos.createTreatment(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("treatments/:id")
  updateTreatment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateTreatmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateTreatment(id, body, orgId);
  }

  @Permissions("update-farmos")
  @Patch("treatments/:id")
  patchTreatment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateTreatmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateTreatment(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("treatments/:id")
  deleteTreatment(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteTreatment(id, orgId);
  }

  // ─── Diseases ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List diseases (global catalogue + organization-specific). Filter by species." })
  @Permissions("readAll-farmos")
  @Get("diseases")
  listDiseases(@CurrentOrg() orgId: number, @Query("species") species?: string) {
    return this.farmos.listDiseases(orgId, species);
  }

  @Permissions("readAll-farmos")
  @Get("diseases/:id")
  getDisease(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getDisease(id, orgId);
  }

  @ApiOperation({ summary: "Add a disease to the organization catalogue." })
  @Permissions("create-farmos")
  @Post("diseases")
  createDisease(@Body() body: CreateDiseaseDto, @CurrentOrg() orgId: number) {
    return this.farmos.createDisease(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("diseases/:id")
  updateDisease(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDiseaseDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateDisease(id, body, orgId);
  }

  @Permissions("update-farmos")
  @Patch("diseases/:id")
  patchDisease(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDiseaseDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.updateDisease(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("diseases/:id")
  deleteDisease(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteDisease(id, orgId);
  }

  // ─── Reproduction events ─────────────────────────────────────────────────

  @ApiOperation({ summary: "List reproduction events for the organisation." })
  @Permissions("readAll-farmos")
  @Get("reproduction-events")
  listReproductionEvents(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listReproductionEvents(orgId, species);
  }

  // ─── Sales & expenses ────────────────────────────────────────────────────

  @ApiOperation({ summary: "Stock œufs disponible (produit - vendu)." })
  @Permissions("readAll-farmos")
  @Get("egg-stock")
  getEggStock(@CurrentOrg() orgId: number) {
    return this.farmos.getEggStock(orgId);
  }

  @ApiOperation({ summary: "List FarmOS sales for the organisation." })
  @Permissions("readAll-farmos")
  @Get("sales")
  listSales(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listSales(orgId, species);
  }

  @ApiOperation({ summary: "List FarmOS expenses for the organisation." })
  @Permissions("readAll-farmos")
  @Get("expenses")
  listExpenses(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listExpenses(orgId, species);
  }

  @Permissions("create-farmos")
  @Post("sales")
  createSale(@Body() body: CreateSaleDto, @CurrentOrg() orgId: number) {
    return this.farmos.createSale(body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("sales/:id")
  deleteSale(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteSale(id, orgId);
  }

  @Permissions("create-farmos")
  @Post("expenses")
  createExpense(@Body() body: CreateExpenseDto, @CurrentOrg() orgId: number) {
    return this.farmos.createExpense(body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("expenses/:id")
  deleteExpense(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteExpense(id, orgId);
  }

  @Permissions("update-farmos")
  @Post("expenses/:id/approve")
  approveExpense(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { comment?: string },
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.farmos.approveExpense(id, body?.comment, orgId, userId);
  }

  @Permissions("create-farmos")
  @Post("reproduction-events")
  createReproductionEvent(@Body() body: CreateReproductionEventDto, @CurrentOrg() orgId: number) {
    return this.farmos.createReproductionEvent(body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("reproduction-events/:id")
  deleteReproductionEvent(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteReproductionEvent(id, orgId);
  }

  // ─── Production logs ─────────────────────────────────────────────────────

  @ApiOperation({ summary: "List production logs for the organisation." })
  @Permissions("readAll-farmos")
  @Get("production-logs")
  listProductionLogs(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listProductionLogs(orgId, species);
  }

  @Permissions("create-farmos")
  @Post("production-logs")
  createProductionLog(@Body() body: CreateProductionLogDto, @CurrentOrg() orgId: number) {
    return this.farmos.createProductionLog(body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("production-logs/:id")
  deleteProductionLog(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteProductionLog(id, orgId);
  }

  // ─── Vaccinations & AI insights ─────────────────────────────────────────

  @ApiOperation({ summary: "List vaccinations." })
  @Permissions("readAll-farmos")
  @Get("vaccinations")
  listVaccinations(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listVaccinations(orgId, species);
  }

  @Permissions("create-farmos")
  @Post("vaccinations")
  createVaccination(@Body() body: CreateVaccinationDto, @CurrentOrg() orgId: number) {
    return this.farmos.createVaccination(body, orgId);
  }

  @ApiOperation({ summary: "Base de donnees de vaccins (catalogue, filtrable par espece)." })
  @Permissions("readAll-farmos")
  @Get("vaccines")
  listVaccines(@CurrentOrg() orgId: number, @Query("species") species?: string) {
    return this.farmos.listVaccines(orgId, species);
  }

  @ApiOperation({ summary: "Fiche complete d'un vaccin (specifications)." })
  @Permissions("readAll-farmos")
  @Get("vaccines/:id")
  getVaccine(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getVaccine(id, orgId);
  }

  @ApiOperation({ summary: "Ajoute un vaccin a la base (personnalise)." })
  @Permissions("create-farmos")
  @Post("vaccines")
  createVaccine(@Body() body: any, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createVaccine(body, orgId, userId);
  }

  @Permissions("readAll-farmos")
  @Get("vet-exams")
  listVetExams(@CurrentOrg() orgId: number) {
    return this.farmos.listVetExams(orgId);
  }

  @Permissions("readAll-farmos")
  @Get("vet-exams/:id")
  getVetExam(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getVetExam(id, orgId);
  }

  @Permissions("create-farmos")
  @Post("vet-exams")
  createVetExam(@Body() body: CreateVetExamDto, @CurrentOrg() orgId: number) {
    return this.farmos.createVetExam(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("vet-exams/:id")
  updateVetExam(@Param("id", ParseIntPipe) id: number, @Body() body: CreateVetExamDto, @CurrentOrg() orgId: number) {
    return this.farmos.updateVetExam(id, body, orgId);
  }

  @Permissions("update-farmos")
  @Post("vet-exams/:id/sign")
  signVetExam(@Param("id", ParseIntPipe) id: number, @Body() body: SignVetExamDto, @CurrentOrg() orgId: number) {
    return this.farmos.signVetExam(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("vet-exams/:id")
  deleteVetExam(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteVetExam(id, orgId);
  }

  // ─── Documents (#3) ───────────────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("documents")
  listDocuments(@CurrentOrg() orgId: number, @Query("animal_id") animalId?: string, @Query("doc_type") docType?: string) {
    return this.farmos.listDocuments(orgId, animalId ? Number(animalId) : null, docType || null);
  }

  @Permissions("readAll-farmos")
  @Get("documents/:id/download")
  async downloadDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res() res: Response) {
    const doc: any = await this.farmos.getDocument(id, orgId);
    const m = /^data:([^;]+);base64,(.*)$/s.exec(doc.dataUrl);
    const buffer = m ? Buffer.from(m[2], "base64") : Buffer.from(doc.dataUrl);
    res.setHeader("Content-Type", doc.contentType || (m ? m[1] : "application/octet-stream"));
    res.setHeader("Content-Disposition", `attachment; filename="${doc.filename || `document-${id}`}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }

  @Permissions("create-farmos")
  @Post("documents")
  createDocument(@Body() body: CreateFarmosDocumentDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createDocument(body, orgId, userId);
  }

  @Permissions("delete-farmos")
  @Delete("documents/:id")
  deleteDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteDocument(id, orgId);
  }

  // ─── Fermes ───────────────────────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("farms")
  listFarms(@CurrentOrg() orgId: number) {
    return this.farmos.listFarms(orgId);
  }

  @Permissions("create-farmos")
  @Post("farms")
  createFarm(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.createFarm(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("farms/:id")
  updateFarm(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.updateFarm(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("farms/:id")
  deleteFarm(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteFarm(id, orgId);
  }

  // ─── Zones ────────────────────────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("zones")
  listZones(@CurrentOrg() orgId: number) {
    return this.farmos.listZones(orgId);
  }

  @Permissions("create-farmos")
  @Post("zones")
  createZone(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.createZone(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("zones/:id")
  updateZone(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.updateZone(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("zones/:id")
  deleteZone(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteZone(id, orgId);
  }

  // ─── Bâtiments ────────────────────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("buildings")
  listBuildings(@CurrentOrg() orgId: number, @Query("species") species?: string, @Query("zone_id") zoneId?: string) {
    return this.farmos.listBuildings(orgId, species || null, zoneId ? Number(zoneId) : null);
  }

  @Permissions("create-farmos")
  @Post("buildings")
  createBuilding(@Body() body: UpsertFarmosBuildingDto, @CurrentOrg() orgId: number) {
    return this.farmos.createBuilding(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("buildings/:id")
  updateBuilding(@Param("id", ParseIntPipe) id: number, @Body() body: UpsertFarmosBuildingDto, @CurrentOrg() orgId: number) {
    return this.farmos.updateBuilding(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("buildings/:id")
  deleteBuilding(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteBuilding(id, orgId);
  }

  // ─── Box (loges/emplacements) ─────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("boxes")
  listBoxes(@CurrentOrg() orgId: number, @Query("building_id") buildingId?: string) {
    return this.farmos.listBoxes(orgId, buildingId ? Number(buildingId) : null);
  }

  @ApiOperation({ summary: "Full box context (box + building + zone + farm + animals) — for label & scan." })
  @Permissions("readAll-farmos")
  @Get("boxes/:id/context")
  getBoxContext(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.getBoxContext(id, orgId);
  }

  @Permissions("create-farmos")
  @Post("boxes")
  createBox(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.createBox(body, orgId);
  }

  @Permissions("create-farmos")
  @Post("boxes/generate")
  generateBoxes(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.generateBoxes(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("boxes/:id")
  updateBox(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.updateBox(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Post("boxes/delete-batch")
  deleteBoxes(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.deleteBoxes(body?.ids, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("boxes/:id")
  deleteBox(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteBox(id, orgId);
  }

  @Permissions("update-farmos")
  @Post("boxes/assign")
  assignAnimalsToBox(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.assignAnimalsToBox(body, orgId);
  }

  @ApiOperation({ summary: "Declare a disease on a whole box (mass treatment)." })
  @Permissions("update-farmos")
  @Post("boxes/:id/declare-disease")
  declareBoxDisease(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: DeclareBoxDiseaseDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.farmos.declareBoxDisease(id, body, orgId);
  }

  // ─── Éléments de terrain (décor du plan) ──────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("land-features")
  listLandFeatures(@CurrentOrg() orgId: number, @Query("zone_id") zoneId?: string) {
    return this.farmos.listLandFeatures(orgId, zoneId ? Number(zoneId) : null);
  }

  @Permissions("create-farmos")
  @Post("land-features")
  createLandFeature(@Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.createLandFeature(body, orgId);
  }

  @Permissions("update-farmos")
  @Put("land-features/:id")
  updateLandFeature(@Param("id", ParseIntPipe) id: number, @Body() body: any, @CurrentOrg() orgId: number) {
    return this.farmos.updateLandFeature(id, body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("land-features/:id")
  deleteLandFeature(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteLandFeature(id, orgId);
  }

  // ─── Rapports imprimables (#3) — HTML, impression côté navigateur ──────────
  @Permissions("readAll-farmos")
  @Get("vet-exams/:id/html")
  async vetExamHtml(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number, @Res() res: Response) {
    const { html, reference } = await this.farmos.vetExamHtml(id, orgId);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${reference}.html"`);
    res.send(html);
  }

  @Permissions("readAll-farmos")
  @Get("reports/finance/html")
  async financeHtml(@CurrentOrg() orgId: number, @Res() res: Response) {
    const { html, reference } = await this.farmos.financeHtml(orgId);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${reference}.html"`);
    res.send(html);
  }

  @Permissions("readAll-farmos")
  @Get("mortality-events")
  listMortalityEvents(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope) {
    return this.farmos.listMortalityEvents(orgId, species);
  }

  @Permissions("readAll-farmos")
  @Get("mortality-events/stats")
  getMortalityStats(@CurrentOrg() orgId: number) {
    return this.farmos.getMortalityStats(orgId);
  }

  @Permissions("create-farmos")
  @Post("mortality-events")
  createMortalityEvent(@Body() body: CreateMortalityEventDto, @CurrentOrg() orgId: number) {
    return this.farmos.createMortalityEvent(body, orgId);
  }

  @ApiOperation({ summary: "Ajuste manuellement le count d'un lot existant (achat, transfert, correction)." })
  @Permissions("create-farmos")
  @Post("batch-adjustments")
  createBatchAdjustment(@Body() body: CreateBatchAdjustmentDto, @CurrentOrg() orgId: number) {
    return this.farmos.createBatchAdjustment(body, orgId);
  }

  @ApiOperation({ summary: "Historique des ajustements manuels d'un lot (animal)." })
  @Permissions("readAll-farmos")
  @Get("animals/:id/batch-adjustments")
  listBatchAdjustments(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.listBatchAdjustments(id, orgId);
  }

  @ApiOperation({ summary: "Transfere N tetes d'un lot vers un autre lot existant (meme espece), en une seule operation atomique et tracee." })
  @Permissions("create-farmos")
  @Post("batch-transfers")
  createBatchTransfer(@Body() body: CreateBatchTransferDto, @CurrentOrg() orgId: number) {
    return this.farmos.createBatchTransfer(body, orgId);
  }

  // ─── Pesées ──────────────────────────────────────────────────────────────
  @Permissions("readAll-farmos")
  @Get("weighings")
  listWeighings(@CurrentOrg() orgId: number, @CurrentFarmosSpecies() species: FarmosSpeciesScope, @Query("animal_id") animalId?: string) {
    return this.farmos.listWeighings(orgId, animalId ? Number(animalId) : undefined, species);
  }

  @Permissions("create-farmos")
  @Post("weighings")
  createWeighing(@Body() body: CreateWeighingDto, @CurrentOrg() orgId: number) {
    return this.farmos.createWeighing(body, orgId);
  }

  @ApiOperation({ summary: "Import weighings in bulk from a mapped CSV (COMP-P2-014)." })
  @Permissions("create-farmos")
  @Post("weighings/import")
  importWeighings(@Body() body: ImportWeighingsDto, @CurrentOrg() orgId: number) {
    return this.farmos.importWeighings(body, orgId);
  }

  @Permissions("delete-farmos")
  @Delete("weighings/:id")
  deleteWeighing(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteWeighing(id, orgId);
  }

  @ApiOperation({ summary: "List AI insights (placeholder until SCRUM-233 ChatGPT integration)." })
  @Permissions("readAll-farmos")
  @Get("ai-insights")
  listAiInsights(@CurrentOrg() orgId: number) {
    return this.farmos.listAiInsights(orgId);
  }

  @ApiOperation({ summary: "Feed-needs forecast rows. Filled by AI worker; empty until then." })
  @Permissions("readAll-farmos")
  @Get("feed-forecasts")
  listFeedForecasts(@CurrentOrg() orgId: number) {
    return this.farmos.listFeedForecasts(orgId);
  }

  @ApiOperation({ summary: "Aggregated finance summary (12-month revenue/expense + by-category)." })
  @Permissions("readAll-farmos")
  @Get("finance-summary")
  getFinanceSummary(@CurrentOrg() orgId: number) {
    return this.farmos.getFinanceSummary(orgId);
  }

  @ApiOperation({ summary: "Profitability per animal and per lot (revenue − cost)." })
  @Permissions("readAll-farmos")
  @Get("profitability")
  getProfitability(@CurrentOrg() orgId: number) {
    return this.farmos.getProfitability(orgId);
  }

  @ApiOperation({ summary: "Intra-org benchmarks: compare this org's lots (internal quartiles)." })
  @Permissions("readAll-farmos")
  @Get("benchmarks")
  getBenchmarks(@CurrentOrg() orgId: number) {
    return this.farmos.getBenchmarks(orgId);
  }

  @ApiOperation({ summary: "List user-editable lookup values (breeds, vets, routes, …)." })
  @Permissions("readAll-farmos")
  @Get("lookups")
  listLookups(
    @CurrentOrg() orgId: number,
    @Query("category") category: string,
    @Query("scope") scope?: string,
  ) {
    return this.farmos.listLookups(orgId, category, scope || null);
  }

  @ApiOperation({ summary: "Create a new lookup value." })
  @Permissions("create-farmos")
  @Post("lookups")
  createLookup(
    @CurrentOrg() orgId: number,
    @Body() body: { category: string; value_fr: string; value_en?: string; scope_key?: string },
  ) {
    return this.farmos.createLookup(body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a lookup value." })
  @Permissions("delete-farmos")
  @Delete("lookups/:id")
  deleteLookup(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.deleteLookup(id, orgId);
  }

  @ApiOperation({ summary: "List FarmOS staff (HR users in the FarmOS department). Optional ?role=vet." })
  @Permissions("readAll-farmos")
  @Get("staff")
  listFarmosStaff(@CurrentOrg() orgId: number, @Query("role") role?: string) {
    return this.farmos.listFarmosStaff(orgId, role || null);
  }

  @ApiOperation({ summary: "Roles assignable to a staff member (permission management)." })
  @Permissions("readAll-farmos")
  @Get("staff/roles")
  listAssignableRoles() {
    return this.farmos.listAssignableRoles();
  }

  @ApiOperation({ summary: "Onboard a FarmOS staff member (also visible in CRM /staff)." })
  @Permissions("create-farmos")
  @Post("staff")
  createFarmosStaff(@Body() body: CreateFarmosStaffDto, @CurrentOrg() orgId: number) {
    return this.farmos.createFarmosStaff(body, orgId);
  }

  @ApiOperation({ summary: "Update a FarmOS staff member (name, phone, designation)." })
  @Permissions("update-farmos")
  @Put("staff/:id")
  updateFarmosStaff(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateFarmosStaffDto, @CurrentOrg() orgId: number) {
    return this.farmos.updateFarmosStaff(id, body, orgId);
  }

  @ApiOperation({ summary: "Set a FarmOS staff member status: active / left / resigned." })
  @Permissions("update-farmos")
  @Patch("staff/:id/status")
  setFarmosStaffStatus(@Param("id", ParseIntPipe) id: number, @Body() body: SetFarmosStaffStatusDto, @CurrentOrg() orgId: number) {
    return this.farmos.setFarmosStaffStatus(id, body, orgId);
  }

  @ApiOperation({ summary: "List daily work logs. Optional ?user_id, ?from, ?to (YYYY-MM-DD)." })
  @Permissions("readAll-farmos")
  @Get("work-logs")
  listWorkLogs(
    @CurrentOrg() orgId: number,
    @Query("user_id") userId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.farmos.listWorkLogs(orgId, userId ? Number(userId) : null, from || null, to || null);
  }

  @ApiOperation({ summary: "Declare daily work (current user by default)." })
  @Permissions("create-farmos")
  @Post("work-logs")
  createWorkLog(@Body() body: CreateWorkLogDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createWorkLog(body, orgId, userId);
  }

  // ─── Tasks (taches equipe, COMP-P1-010) ──────────────────────────────────

  @ApiOperation({ summary: "List team tasks. Optional ?status, ?assigned_user_id." })
  @Permissions("readAll-farmos")
  @Get("tasks")
  listTasks(
    @CurrentOrg() orgId: number,
    @Query("status") status?: string,
    @Query("assigned_user_id") assignedUserId?: string,
  ) {
    return this.farmos.listTasks(orgId, { status: status || null, assignedUserId: assignedUserId ? Number(assignedUserId) : null });
  }

  @ApiOperation({ summary: "Create a team task." })
  @Permissions("create-farmos")
  @Post("tasks")
  createTask(@Body() body: CreateTaskDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createTask(body, orgId, userId);
  }

  @ApiOperation({ summary: "Update a team task (status, assignee, fields)." })
  @Permissions("update-farmos")
  @Patch("tasks/:id")
  updateTask(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTaskDto, @CurrentOrg() orgId: number) {
    return this.farmos.updateTask(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a team task." })
  @Permissions("delete-farmos")
  @Delete("tasks/:id")
  deleteTask(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteTask(id, orgId);
  }

  // ─── Field notes (notes terrain GPS, COMP-P1-009) ─────────────────────────

  @ApiOperation({ summary: "List geolocated field notes." })
  @Permissions("readAll-farmos")
  @Get("field-notes")
  listFieldNotes(@CurrentOrg() orgId: number) {
    return this.farmos.listFieldNotes(orgId);
  }

  @ApiOperation({ summary: "Create a geolocated field note." })
  @Permissions("create-farmos")
  @Post("field-notes")
  createFieldNote(@Body() body: CreateFieldNoteDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createFieldNote(body, orgId, userId);
  }

  @ApiOperation({ summary: "Soft-delete a field note." })
  @Permissions("delete-farmos")
  @Delete("field-notes/:id")
  deleteFieldNote(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteFieldNote(id, orgId);
  }

  // ─── Saved reports (rapports custom, COMP-P2-017) ─────────────────────────

  @ApiOperation({ summary: "List saved custom reports." })
  @Permissions("readAll-farmos")
  @Get("saved-reports")
  listSavedReports(@CurrentOrg() orgId: number) {
    return this.farmos.listSavedReports(orgId);
  }

  @ApiOperation({ summary: "Save a custom report (columns + filters)." })
  @Permissions("create-farmos")
  @Post("saved-reports")
  createSavedReport(@Body() body: SaveReportDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.farmos.createSavedReport(body, orgId, userId);
  }

  @ApiOperation({ summary: "Soft-delete a saved report." })
  @Permissions("delete-farmos")
  @Delete("saved-reports/:id")
  deleteSavedReport(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.farmos.deleteSavedReport(id, orgId);
  }

  // ─── Semen straws (banque IA) ────────────────────────────────────────────

  @ApiOperation({ summary: "List semen straws (optional ?species filter)." })
  @Permissions("readAll-farmos")
  @Get("semen-straws")
  listSemenStraws(@CurrentOrg() orgId: number, @Query("species") species?: string) {
    return this.farmos.listSemenStraws(orgId, species || null);
  }

  @ApiOperation({ summary: "Get a semen straw with usage history + success rate." })
  @Permissions("readAll-farmos")
  @Get("semen-straws/:id")
  getSemenStraw(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.getSemenStraw(id, orgId);
  }

  @ApiOperation({ summary: "Create a semen straw record." })
  @Permissions("create-farmos")
  @Post("semen-straws")
  createSemenStraw(@CurrentOrg() orgId: number, @Body() body: CreateSemenStrawDto) {
    return this.farmos.createSemenStraw(body, orgId);
  }

  @ApiOperation({ summary: "Update a semen straw record." })
  @Permissions("update-farmos")
  @Patch("semen-straws/:id")
  updateSemenStraw(
    @CurrentOrg() orgId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateSemenStrawDto,
  ) {
    return this.farmos.updateSemenStraw(id, body, orgId);
  }

  @ApiOperation({ summary: "Archive a semen straw record." })
  @Permissions("delete-farmos")
  @Delete("semen-straws/:id")
  deleteSemenStraw(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.deleteSemenStraw(id, orgId);
  }

  @ApiOperation({ summary: "List males available for natural breeding (optional ?species)." })
  @Permissions("readAll-farmos")
  @Get("breeding-males")
  listBreedingMales(@CurrentOrg() orgId: number, @Query("species") species?: string) {
    return this.farmos.listBreedingMales(orgId, species || null);
  }

  @ApiOperation({ summary: "Suggest a semen straw for an insemination on a given female. mode = history | genetic." })
  @Permissions("readAll-farmos")
  @Get("breeding-suggestion/:animalId")
  suggestBreeding(
    @CurrentOrg() orgId: number,
    @Param("animalId", ParseIntPipe) animalId: number,
    @Query("mode") mode?: "history" | "genetic",
  ) {
    return this.farmos.suggestBreedingForFemale(animalId, orgId, mode === "genetic" ? "genetic" : "history");
  }

  @ApiOperation({ summary: "List photos for an animal." })
  @Permissions("readAll-farmos")
  @Get("animals/:id/photos")
  listAnimalPhotos(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.listAnimalPhotos(id, orgId);
  }

  @ApiOperation({ summary: "All animals with their photos (capped) — used by client-side face recognition." })
  @Permissions("readAll-farmos")
  @Get("animals-with-photos")
  listAnimalsWithPhotos(@CurrentOrg() orgId: number, @Query("perAnimal") perAnimal?: string) {
    const n = Math.max(1, Math.min(5, Number(perAnimal) || 3));
    return this.farmos.listAnimalsWithPhotos(orgId, n);
  }

  @ApiOperation({ summary: "Upload a photo for an animal (base64 data URL)." })
  @Permissions("create-farmos")
  @Post("animals/:id/photos")
  createAnimalPhoto(
    @CurrentOrg() orgId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { data_url: string; filename?: string; content_type?: string; size_bytes?: number },
  ) {
    return this.farmos.createAnimalPhoto(id, body, orgId, null);
  }

  @ApiOperation({ summary: "Soft-delete a photo." })
  @Permissions("delete-farmos")
  @Delete("animals/photos/:id")
  deleteAnimalPhoto(@CurrentOrg() orgId: number, @Param("id", ParseIntPipe) id: number) {
    return this.farmos.deleteAnimalPhoto(id, orgId);
  }
}
