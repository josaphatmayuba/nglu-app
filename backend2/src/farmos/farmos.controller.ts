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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateAnimalDto,
  CreateDiseaseDto,
  CreateMedicineDto,
  CreateTreatmentDto,
  UpdateAnimalDto,
  UpdateDiseaseDto,
  UpdateMedicineDto,
  UpdateTreatmentDto,
} from "./dto/farmos.dto";
import { FarmosService } from "./farmos.service";

@ApiTags("farmos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("farmos")
export class FarmosController {
  constructor(private readonly farmos: FarmosService) {}

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
}
