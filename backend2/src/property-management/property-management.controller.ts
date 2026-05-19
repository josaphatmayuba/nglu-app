import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { MessageResponseDto } from "../shared/dto/message-response.dto";
import { ContractsService } from "./contracts.service";
import {
  CreateContractDto,
  CreateLeaseDto,
  CreateMaintenanceDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  CreateTenantDto,
  CreateUnitDto,
  GenerateTenantOnboardingDto,
  SaveTenantOnboardingDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
  UpdatePropertyDto,
  UpdateUnitDto,
} from "./dto/property-management.dto";
import { RenewLeaseDto } from "./dto/contract-template.dto";
import { PropertyManagementService } from "./property-management.service";

@ApiTags("property-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("property-management")
export class PropertyManagementController {
  constructor(
    private readonly propertyManagementService: PropertyManagementService,
    private readonly contractsService: ContractsService,
  ) {}

  @ApiOperation({ summary: "Property management dashboard totals" })
  @ApiOkResponse({ description: "Dashboard metrics" })
  @Get("dashboard")
  dashboard() {
    return this.propertyManagementService.dashboard();
  }

  @ApiOperation({ summary: "List active tenants from customers" })
  @ApiOkResponse({ description: "Tenant list" })
  @Get("tenants")
  tenants() {
    return this.propertyManagementService.tenants();
  }

  @ApiOperation({ summary: "Create a tenant customer with extended tenant details" })
  @ApiCreatedResponse({ description: "Created tenant" })
  @Post("tenants")
  createTenant(@Body() body: CreateTenantDto) {
    return this.propertyManagementService.createTenant(body);
  }

  @ApiOperation({ summary: "Generate a secure tenant onboarding link" })
  @Post("onboarding")
  generateTenantOnboarding(@Body() body: GenerateTenantOnboardingDto) {
    return this.propertyManagementService.generateTenantOnboarding(body);
  }

  @ApiOperation({ summary: "List tenant onboarding dossiers" })
  @Get("onboarding")
  tenantOnboardingList() {
    return this.propertyManagementService.onboardingList();
  }

  @ApiOperation({ summary: "Admin update tenant onboarding draft" })
  @Put("onboarding/:id")
  updateTenantOnboarding(@Param("id", ParseIntPipe) id: number, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.saveOnboardingByAdmin(id, body);
  }

  @Patch("onboarding/:id")
  updateTenantOnboardingPatch(@Param("id", ParseIntPipe) id: number, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.saveOnboardingByAdmin(id, body);
  }

  @ApiOperation({ summary: "Validate onboarding dossier and create tenant customer" })
  @Post("onboarding/:id/validate")
  validateTenantOnboarding(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.validateOnboarding(id);
  }

  @ApiOperation({ summary: "List properties with unit counts" })
  @ApiOkResponse({ description: "Property list" })
  @Get("properties")
  properties() {
    return this.propertyManagementService.properties();
  }

  @ApiOperation({ summary: "Get single property by ID" })
  @ApiParam({ name: "id", type: Number })
  @Get("properties/:id")
  findProperty(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findProperty(id);
  }

  @ApiOperation({ summary: "Create a property" })
  @ApiCreatedResponse({ description: "Created property" })
  @Post("properties")
  createProperty(@Body() body: CreatePropertyDto) {
    return this.propertyManagementService.createProperty(body);
  }

  @ApiOperation({ summary: "Update a property" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put("properties/:id")
  updateProperty(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyDto) {
    return this.propertyManagementService.updateProperty(id, body);
  }

  @Patch("properties/:id")
  @Post("properties/:id")
  updatePropertyAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyDto) {
    return this.propertyManagementService.updateProperty(id, body);
  }

  @ApiOperation({ summary: "Delete a property" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("properties/:id")
  @HttpCode(200)
  deleteProperty(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteProperty(id);
  }

  @ApiOperation({ summary: "List rental units" })
  @Get("units")
  units() {
    return this.propertyManagementService.units();
  }

  @ApiOperation({ summary: "Get single unit by ID" })
  @ApiParam({ name: "id", type: Number })
  @Get("units/:id")
  findUnit(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findUnit(id);
  }

  @ApiOperation({ summary: "Create a rental unit" })
  @Post("units")
  createUnit(@Body() body: CreateUnitDto) {
    return this.propertyManagementService.createUnit(body);
  }

  @ApiOperation({ summary: "Update a rental unit" })
  @Put("units/:id")
  updateUnit(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUnitDto) {
    return this.propertyManagementService.updateUnit(id, body);
  }

  @Patch("units/:id")
  @Post("units/:id")
  updateUnitAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUnitDto) {
    return this.propertyManagementService.updateUnit(id, body);
  }

  @ApiOperation({ summary: "Delete a rental unit" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("units/:id")
  @HttpCode(200)
  deleteUnit(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteUnit(id);
  }

  @ApiOperation({ summary: "List leases" })
  @Get("leases")
  leases() {
    return this.propertyManagementService.leases();
  }

  @ApiOperation({ summary: "Get single lease by ID" })
  @ApiParam({ name: "id", type: Number })
  @Get("leases/:id")
  findLease(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findLease(id);
  }

  @ApiOperation({ summary: "Create a lease" })
  @Post("leases")
  createLease(@Body() body: CreateLeaseDto) {
    return this.propertyManagementService.createLease(body);
  }

  @ApiOperation({ summary: "Update a lease" })
  @Put("leases/:id")
  updateLease(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateLeaseDto) {
    return this.propertyManagementService.updateLease(id, body);
  }

  @ApiOperation({ summary: "Delete a lease" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("leases/:id")
  @HttpCode(200)
  deleteLease(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteLease(id);
  }

  @ApiOperation({ summary: "List rent payments" })
  @Get("payments")
  payments() {
    return this.propertyManagementService.payments();
  }

  @ApiOperation({ summary: "Get single rent payment by ID" })
  @ApiParam({ name: "id", type: Number })
  @Get("payments/:id")
  findPayment(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findPayment(id);
  }

  @ApiOperation({ summary: "Create rent payment and linked accounting transaction" })
  @Post("payments")
  createPayment(@Body() body: CreateRentPaymentDto) {
    return this.propertyManagementService.createPayment(body);
  }

  @ApiOperation({ summary: "List maintenance requests" })
  @Permissions("readAll-maintenance")
  @Get("maintenance")
  maintenance() {
    return this.propertyManagementService.listMaintenance();
  }

  @ApiOperation({ summary: "Get single maintenance request by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-maintenance")
  @Get("maintenance/:id")
  findMaintenance(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findMaintenance(id);
  }

  @ApiOperation({ summary: "Create a maintenance request" })
  @Permissions("create-maintenance")
  @Post("maintenance")
  createMaintenance(@Body() body: CreateMaintenanceDto) {
    return this.propertyManagementService.createMaintenance(body);
  }

  @ApiOperation({ summary: "Update a maintenance request" })
  @Permissions("update-maintenance")
  @Put("maintenance/:id")
  updateMaintenance(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMaintenanceDto) {
    return this.propertyManagementService.updateMaintenance(id, body);
  }

  @Permissions("update-maintenance")
  @Patch("maintenance/:id")
  @Post("maintenance/:id")
  updateMaintenanceAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMaintenanceDto) {
    return this.propertyManagementService.updateMaintenance(id, body);
  }

  @ApiOperation({ summary: "Soft-delete a maintenance request (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-maintenance")
  @Delete("maintenance/:id")
  @HttpCode(200)
  deleteMaintenance(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteMaintenance(id);
  }

  // ── Contracts ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List all contracts" })
  @Get("contracts")
  listContracts() {
    return this.contractsService.listContracts();
  }

  @ApiOperation({ summary: "Get single contract with audit log" })
  @ApiParam({ name: "id", type: Number })
  @Get("contracts/:id")
  getContract(@Param("id", ParseIntPipe) id: number) {
    return this.contractsService.getContract(id);
  }

  @ApiOperation({ summary: "Create contract from a lease (auto-generates content)" })
  @Post("contracts")
  createContract(@Body() body: CreateContractDto, @Req() req: Request) {
    const userId = ((req as Request & { user?: { sub?: number } }).user)?.sub;
    return this.contractsService.createContract(body, userId);
  }

  @ApiOperation({ summary: "Send contract for e-signature by email" })
  @ApiParam({ name: "id", type: Number })
  @Post("contracts/:id/send")
  @HttpCode(200)
  sendContract(@Param("id", ParseIntPipe) id: number) {
    return this.contractsService.sendContract(id);
  }

  @ApiOperation({ summary: "Delete a contract" })
  @Delete("contracts/:id")
  @HttpCode(200)
  deleteContract(@Param("id", ParseIntPipe) id: number) {
    return this.contractsService.deleteContract(id);
  }

  @ApiOperation({
    summary: "Renew a lease: clones it and generates a new contract from the active template",
  })
  @ApiParam({ name: "id", type: Number, description: "ID of the lease to renew" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("leases/:id/renew")
  renewLease(@Param("id", ParseIntPipe) id: number, @Body() body: RenewLeaseDto, @Req() req: Request) {
    const userId = ((req as Request & { user?: { sub?: number } }).user)?.sub;
    return this.contractsService.renewLease(id, body, userId);
  }
}
