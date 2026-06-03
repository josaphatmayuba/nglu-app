import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { MessageResponseDto } from "../shared/dto/message-response.dto";
import { ContractsService } from "./contracts.service";
import {
  CreateContractDto,
  CreateLeaseDto,
  CreateMaintenanceCostDto,
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
  UpdateTenantDto,
  UpdateUnitDto,
} from "./dto/property-management.dto";
import { RenewLeaseDto } from "./dto/contract-template.dto";
import { PropertyManagementService } from "./property-management.service";
import { RentReminderService } from "./rent-reminder.service";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("property-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("property-management")
export class PropertyManagementController {
  constructor(
    private readonly propertyManagementService: PropertyManagementService,
    private readonly contractsService: ContractsService,
    private readonly rentReminderService: RentReminderService,
  ) {}

  @ApiOperation({ summary: "Property management dashboard totals" })
  @ApiOkResponse({ description: "Dashboard metrics" })
  @Permissions("readAll-propertyManagement")
  @Get("dashboard")
  dashboard(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.dashboard(orgId);
  }

  @ApiOperation({ summary: "List active tenants from customers" })
  @ApiOkResponse({ description: "Tenant list" })
  @Permissions("readAll-propertyManagement")
  @Get("tenants")
  tenants(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.tenants(orgId);
  }

  @ApiOperation({ summary: "Create a tenant customer with extended tenant details" })
  @ApiCreatedResponse({ description: "Created tenant" })
  @Permissions("create-propertyManagement")
  @Post("tenants")
  createTenant(@Body() body: CreateTenantDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createTenant(body, orgId);
  }

  @ApiOperation({ summary: "Update a tenant customer and extended details" })
  @ApiOkResponse({ description: "Updated tenant" })
  @Permissions("update-propertyManagement")
  @Put("tenants/:id")
  updateTenant(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTenantDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateTenant(id, body, orgId);
  }

  @ApiOperation({ summary: "Generate a secure tenant onboarding link" })
  @Permissions("create-propertyManagement")
  @Post("onboarding")
  generateTenantOnboarding(@Body() body: GenerateTenantOnboardingDto) {
    return this.propertyManagementService.generateTenantOnboarding(body);
  }

  @ApiOperation({ summary: "List tenant onboarding dossiers" })
  @Permissions("readAll-propertyManagement")
  @Get("onboarding")
  tenantOnboardingList() {
    return this.propertyManagementService.onboardingList();
  }

  @ApiOperation({ summary: "Send the onboarding link by email on demand" })
  @Permissions("create-propertyManagement")
  @Post("onboarding/send-email")
  sendOnboardingEmail(
    @Body() body: { email: string; url: string; firstName?: string | null },
  ) {
    return this.propertyManagementService.sendOnboardingEmail(body);
  }

  @ApiOperation({ summary: "Admin update tenant onboarding draft" })
  @Permissions("update-propertyManagement")
  @Put("onboarding/:id")
  updateTenantOnboarding(@Param("id", ParseIntPipe) id: number, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.saveOnboardingByAdmin(id, body);
  }

  @Permissions("update-propertyManagement")
  @Patch("onboarding/:id")
  updateTenantOnboardingPatch(@Param("id", ParseIntPipe) id: number, @Body() body: SaveTenantOnboardingDto) {
    return this.propertyManagementService.saveOnboardingByAdmin(id, body);
  }

  @ApiOperation({ summary: "Validate onboarding dossier and create tenant customer" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("onboarding/:id/validate")
  validateTenantOnboarding(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.validateOnboarding(id, orgId);
  }

  @ApiOperation({ summary: "Delete a tenant onboarding dossier" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("onboarding/:id")
  @HttpCode(200)
  deleteTenantOnboarding(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteOnboarding(id);
  }

  @ApiOperation({ summary: "List properties with unit counts" })
  @ApiOkResponse({ description: "Property list" })
  @Permissions("readAll-propertyManagement")
  @Get("properties")
  properties(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.properties(orgId);
  }

  @ApiOperation({ summary: "Get single property by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("properties/:id")
  findProperty(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findProperty(id);
  }

  @ApiOperation({ summary: "Create a property" })
  @ApiCreatedResponse({ description: "Created property" })
  @Permissions("create-propertyManagement")
  @Post("properties")
  createProperty(@Body() body: CreatePropertyDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createProperty(body, orgId);
  }

  @ApiOperation({ summary: "Update a property" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-propertyManagement")
  @Put("properties/:id")
  updateProperty(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateProperty(id, body, orgId);
  }

  @Permissions("update-propertyManagement")
  @Patch("properties/:id")
  @Post("properties/:id")
  updatePropertyAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateProperty(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete a property" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("properties/:id")
  @HttpCode(200)
  deleteProperty(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteProperty(id, orgId);
  }

  @ApiOperation({ summary: "List rental units" })
  @Permissions("readAll-propertyManagement")
  @Get("units")
  units(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.units(orgId);
  }

  @ApiOperation({ summary: "Get single unit by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("units/:id")
  findUnit(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findUnit(id);
  }

  @ApiOperation({ summary: "Create a rental unit" })
  @Permissions("create-propertyManagement")
  @Post("units")
  createUnit(@Body() body: CreateUnitDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createUnit(body, orgId);
  }

  @ApiOperation({ summary: "Update a rental unit" })
  @Permissions("update-propertyManagement")
  @Put("units/:id")
  updateUnit(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUnitDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateUnit(id, body, orgId);
  }

  @Permissions("update-propertyManagement")
  @Patch("units/:id")
  @Post("units/:id")
  updateUnitAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUnitDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateUnit(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete a rental unit" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("units/:id")
  @HttpCode(200)
  deleteUnit(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteUnit(id, orgId);
  }

  @ApiOperation({ summary: "List leases" })
  @Permissions("readAll-propertyManagement")
  @Get("leases")
  leases(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.leases(orgId);
  }

  @ApiOperation({ summary: "Get single lease by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("leases/:id")
  findLease(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findLease(id);
  }

  @ApiOperation({ summary: "Create a lease" })
  @Permissions("create-propertyManagement")
  @Post("leases")
  createLease(@Body() body: CreateLeaseDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createLease(body, orgId);
  }

  @ApiOperation({ summary: "Update a lease" })
  @Permissions("update-propertyManagement")
  @Put("leases/:id")
  updateLease(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateLeaseDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateLease(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete a lease" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("leases/:id")
  @HttpCode(200)
  deleteLease(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteLease(id, orgId);
  }

  @ApiOperation({ summary: "List rent payments" })
  @Permissions("readAll-propertyManagement")
  @Get("payments")
  payments(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.payments(orgId);
  }

  @ApiOperation({ summary: "Get single rent payment by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("payments/:id")
  findPayment(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.findPayment(id);
  }

  @ApiOperation({ summary: "Create rent payment and linked accounting transaction" })
  @Permissions("create-propertyManagement")
  @Post("payments")
  createPayment(@Body() body: CreateRentPaymentDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createPayment(body, orgId);
  }

  @ApiOperation({ summary: "Send payment reminder email to tenant" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("payments/reminder")
  @HttpCode(200)
  sendPaymentReminder(@Body() body: { leaseId: number }) {
    return this.propertyManagementService.sendPaymentReminder(body.leaseId);
  }

  @ApiOperation({ summary: "Run overdue rent reminders now (SMS + email to late tenants)" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("payments/run-overdue-reminders")
  @HttpCode(200)
  runOverdueReminders() {
    return this.rentReminderService.runOverdueReminders();
  }

  @ApiOperation({ summary: "List maintenance requests" })
  @Permissions("readAll-maintenance")
  @Get("maintenance")
  maintenance(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.listMaintenance(orgId);
  }

  @ApiOperation({ summary: "Get single maintenance request by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-maintenance")
  @Get("maintenance/:id")
  findMaintenance(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.findMaintenance(id, orgId);
  }

  @ApiOperation({ summary: "Create a maintenance request" })
  @Permissions("create-maintenance")
  @Post("maintenance")
  createMaintenance(@Body() body: CreateMaintenanceDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.propertyManagementService.createMaintenance(body, orgId, userId);
  }

  @ApiOperation({ summary: "Update a maintenance request" })
  @Permissions("update-maintenance")
  @Put("maintenance/:id")
  updateMaintenance(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMaintenanceDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateMaintenance(id, body, orgId);
  }

  @Permissions("update-maintenance")
  @Patch("maintenance/:id")
  @Post("maintenance/:id")
  updateMaintenanceAlias(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMaintenanceDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateMaintenance(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a maintenance request (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-maintenance")
  @Delete("maintenance/:id")
  @HttpCode(200)
  deleteMaintenance(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteMaintenance(id, orgId);
  }

  // ── Maintenance Costs ──────────────────────────────────────────────────────

  @ApiOperation({ summary: "List costs for a maintenance ticket" })
  @Permissions("readAll-maintenance-cost")
  @Get("maintenance/:id/costs")
  listMaintenanceCosts(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.listMaintenanceCosts(id, orgId);
  }

  @ApiOperation({ summary: "Record a cost on a maintenance ticket" })
  @Permissions("create-maintenance-cost")
  @UseInterceptors(FileInterceptor("receipt", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("maintenance/:id/costs")
  createMaintenanceCost(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateMaintenanceCostDto,
    @UploadedFile() receipt: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.createMaintenanceCost(id, body, orgId, receipt, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Delete a maintenance cost entry" })
  @Permissions("delete-maintenance-cost")
  @Delete("maintenance/costs/:costId")
  @HttpCode(200)
  deleteMaintenanceCost(@Param("costId", ParseIntPipe) costId: number) {
    return this.propertyManagementService.deleteMaintenanceCost(costId);
  }

  // ── Contracts ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: "List all contracts" })
  @Permissions("readAll-propertyManagement")
  @Get("contracts")
  listContracts() {
    return this.contractsService.listContracts();
  }

  @ApiOperation({ summary: "Get single contract with audit log" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("contracts/:id")
  getContract(@Param("id", ParseIntPipe) id: number) {
    return this.contractsService.getContract(id);
  }

  @ApiOperation({ summary: "Create contract from a lease (auto-generates content)" })
  @Permissions("create-propertyManagement")
  @Post("contracts")
  createContract(@Body() body: CreateContractDto, @Req() req: Request) {
    const userId = ((req as Request & { user?: { sub?: number } }).user)?.sub;
    return this.contractsService.createContract(body, userId);
  }

  @ApiOperation({ summary: "Send contract for e-signature by email" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Post("contracts/:id/send")
  @HttpCode(200)
  sendContract(@Param("id", ParseIntPipe) id: number) {
    return this.contractsService.sendContract(id);
  }

  @ApiOperation({ summary: "Delete a contract" })
  @Permissions("delete-propertyManagement")
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

  private publicApiBase(req: Request): string {
    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
    const proto = pickFirst(req.headers["x-forwarded-proto"]);
    const host = pickFirst(req.headers["x-forwarded-host"]) ?? req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${req.headers.host}`;
  }
}
