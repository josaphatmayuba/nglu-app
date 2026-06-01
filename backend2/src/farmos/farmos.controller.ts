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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  ConsumeMedicineDto,
  CreateAnimalDto,
  CreateFarmosStaffDto,
  CreateDiseaseDto,
  CreateExpenseDto,
  CreateMedicineDto,
  CreateMortalityEventDto,
  CreateVaccinationDto,
  CreateVetExamDto,
  CreateWorkLogDto,
  CreateProductionLogDto,
  CreateReproductionEventDto,
  CreateSaleDto,
  CreateSemenStrawDto,
  CreateTreatmentDto,
  UpdateAnimalDto,
  UpdateDiseaseDto,
  UpdateMedicineDto,
  UpdateSemenStrawDto,
  UpdateTreatmentDto,
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
  "staff",
  "semenStraws",
];

@ApiTags("farmos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("farmos")
export class FarmosController {
  constructor(private readonly farmos: FarmosService) {}

  @ApiOperation({ summary: "FarmOS dashboard snapshot grouped in one request" })
  @Permissions("readAll-farmos")
  @Get("dashboard")
  dashboard(@CurrentOrg() orgId: number) {
    return this.farmos.getDashboardSnapshot(orgId);
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
  listAnimals(@CurrentOrg() orgId: number) {
    return this.farmos.listAnimals(orgId);
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
  listTreatments(@CurrentOrg() orgId: number) {
    return this.farmos.listTreatments(orgId);
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
  listReproductionEvents(@CurrentOrg() orgId: number) {
    return this.farmos.listReproductionEvents(orgId);
  }

  // ─── Sales & expenses ────────────────────────────────────────────────────

  @ApiOperation({ summary: "List FarmOS sales for the organisation." })
  @Permissions("readAll-farmos")
  @Get("sales")
  listSales(@CurrentOrg() orgId: number) {
    return this.farmos.listSales(orgId);
  }

  @ApiOperation({ summary: "List FarmOS expenses for the organisation." })
  @Permissions("readAll-farmos")
  @Get("expenses")
  listExpenses(@CurrentOrg() orgId: number) {
    return this.farmos.listExpenses(orgId);
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
  listProductionLogs(@CurrentOrg() orgId: number) {
    return this.farmos.listProductionLogs(orgId);
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
  listVaccinations(@CurrentOrg() orgId: number) {
    return this.farmos.listVaccinations(orgId);
  }

  @Permissions("create-farmos")
  @Post("vaccinations")
  createVaccination(@Body() body: CreateVaccinationDto, @CurrentOrg() orgId: number) {
    return this.farmos.createVaccination(body, orgId);
  }

  @Permissions("readAll-farmos")
  @Get("vet-exams")
  listVetExams(@CurrentOrg() orgId: number) {
    return this.farmos.listVetExams(orgId);
  }

  @Permissions("create-farmos")
  @Post("vet-exams")
  createVetExam(@Body() body: CreateVetExamDto, @CurrentOrg() orgId: number) {
    return this.farmos.createVetExam(body, orgId);
  }

  @Permissions("readAll-farmos")
  @Get("mortality-events")
  listMortalityEvents(@CurrentOrg() orgId: number) {
    return this.farmos.listMortalityEvents(orgId);
  }

  @Permissions("create-farmos")
  @Post("mortality-events")
  createMortalityEvent(@Body() body: CreateMortalityEventDto, @CurrentOrg() orgId: number) {
    return this.farmos.createMortalityEvent(body, orgId);
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

  @ApiOperation({ summary: "Onboard a FarmOS staff member (also visible in CRM /staff)." })
  @Permissions("create-farmos")
  @Post("staff")
  createFarmosStaff(@Body() body: CreateFarmosStaffDto, @CurrentOrg() orgId: number) {
    return this.farmos.createFarmosStaff(body, orgId);
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
