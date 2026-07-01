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
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import type { Response } from "express";
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
import { CurrentDomusProperty, type DomusPropertyScope } from "../auth/decorators/domus-property-scope.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { DomusPropertyGuard } from "../auth/guards/domus-property.guard";
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
  CollectDepositDto,
  ReturnDepositDto,
  CreateTenantDto,
  CreateUnitDto,
  GenerateTenantOnboardingDto,
  SaveTenantOnboardingDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
  UpdatePropertyDto,
  UpdateTenantDto,
  UpdateUnitDto,
  CreateReservationDto,
  UpdateReservationDto,
  CheckOutReservationDto,
  CreateCouponDto,
  UpdateCouponDto,
} from "./dto/property-management.dto";
import { RenewLeaseDto } from "./dto/contract-template.dto";
import { PropertyManagementService } from "./property-management.service";
import { RentReminderService } from "./rent-reminder.service";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("property-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, DomusPropertyGuard)
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
  properties(@CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.propertyManagementService.properties(orgId, scope);
  }

  @ApiOperation({ summary: "All property assignments of the org (map userId -> propertyId[])" })
  @Permissions("readAll-propertyManagement")
  @Get("property-assignments")
  listAllPropertyAssignments(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.listAllPropertyAssignments(orgId);
  }

  @ApiOperation({ summary: "List properties assigned to a user (RBAC par bien)" })
  @Permissions("readAll-propertyManagement")
  @Get("property-assignments/:userId")
  listPropertyAssignments(@Param("userId", ParseIntPipe) userId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.listPropertyAssignments(userId, orgId);
  }

  @ApiOperation({ summary: "Set properties assigned to a user (set complet, RBAC par bien)" })
  @Permissions("update-propertyManagement")
  @Post("property-assignments/:userId")
  setPropertyAssignments(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: { propertyIds: number[] },
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.setPropertyAssignments(userId, Array.isArray(body?.propertyIds) ? body.propertyIds : [], orgId);
  }

  @ApiOperation({ summary: "List property photos for the current org/scope" })
  @Permissions("readAll-propertyManagement")
  @Get("properties/photos")
  propertyPhotos(@CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.propertyManagementService.propertyPhotos(orgId, scope);
  }

  @ApiOperation({ summary: "List photos for one property" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("properties/:id/photos")
  propertyPhotosForProperty(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.propertyPhotos(orgId, scope, id);
  }

  @ApiOperation({ summary: "Upload a property photo to object storage" })
  @Permissions("update-propertyManagement")
  @UseInterceptors(FileInterceptor("photo", {
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP."), false);
      }
    },
  }))
  @Post("properties/:id/photos")
  uploadPropertyPhoto(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { unitId?: string },
    @UploadedFile() photo: any,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    const unitId = body?.unitId != null && body.unitId !== "" ? Number(body.unitId) : null;
    return this.propertyManagementService.uploadPropertyPhoto(id, photo, orgId, scope, unitId);
  }

  @ApiOperation({ summary: "Delete a property photo" })
  @Permissions("update-propertyManagement")
  @Delete("properties/photos/:photoId")
  @HttpCode(200)
  deletePropertyPhoto(
    @Param("photoId", ParseIntPipe) photoId: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.deletePropertyPhoto(photoId, orgId, scope);
  }

  @ApiOperation({ summary: "Stream a property photo from object storage" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("properties/photos/:photoId/file")
  async propertyPhotoFile(
    @Param("photoId", ParseIntPipe) photoId: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.propertyPhotoFile(photoId, orgId, scope);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Réservations temporaires (type hôtel, tarif par jour) ──────────────────
  @ApiOperation({ summary: "List reservations for the current org/scope" })
  @Permissions("readAll-propertyManagement")
  @Get("reservations")
  reservations(@CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.propertyManagementService.reservations(orgId, scope);
  }

  @ApiOperation({ summary: "Check availability of a property/unit for a date range" })
  @Permissions("readAll-propertyManagement")
  @Get("reservations/availability")
  reservationAvailability(
    @Query("propertyId", ParseIntPipe) propertyId: number,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string,
    @Query("unitId") unitId: string | undefined,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    const unit = unitId != null && unitId !== "" ? Number(unitId) : null;
    return this.propertyManagementService.checkReservationAvailability(orgId, propertyId, unit, checkIn, checkOut, scope);
  }

  @ApiOperation({ summary: "List reservations for one property" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("properties/:id/reservations")
  reservationsForProperty(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.reservations(orgId, scope, id);
  }

  @ApiOperation({ summary: "Get a single reservation" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("reservations/:id")
  findReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.findReservation(id, orgId, scope);
  }

  @ApiOperation({ summary: "Create a reservation (quick/temporary booking)" })
  @Permissions("create-propertyManagement")
  @Post("reservations")
  createReservation(
    @Body() body: CreateReservationDto,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.createReservation(body, orgId, scope);
  }

  @ApiOperation({ summary: "Update a reservation" })
  @Permissions("update-propertyManagement")
  @Put("reservations/:id")
  updateReservation(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateReservationDto,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.updateReservation(id, body, orgId, scope);
  }

  @ApiOperation({ summary: "Confirm a reservation" })
  @Permissions("update-propertyManagement")
  @Post("reservations/:id/confirm")
  confirmReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.confirmReservation(id, orgId, scope);
  }

  @ApiOperation({ summary: "Check-in a reservation" })
  @Permissions("update-propertyManagement")
  @Post("reservations/:id/check-in")
  checkInReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.checkInReservation(id, orgId, scope);
  }

  @ApiOperation({ summary: "Check-out a reservation (recognizes revenue at check-out)" })
  @Permissions("update-propertyManagement")
  @Post("reservations/:id/check-out")
  checkOutReservation(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CheckOutReservationDto,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.checkOutReservation(id, body, orgId, scope);
  }

  @ApiOperation({ summary: "Cancel a reservation" })
  @Permissions("update-propertyManagement")
  @Post("reservations/:id/cancel")
  cancelReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.cancelReservation(id, orgId, scope);
  }

  @ApiOperation({ summary: "Delete (soft) a reservation" })
  @Permissions("update-propertyManagement")
  @Delete("reservations/:id")
  @HttpCode(200)
  deleteReservation(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.deleteReservation(id, orgId, scope);
  }

  // ── Coupons de réduction (réservations) ────────────────────────────────────
  @ApiOperation({ summary: "List active discount coupons" })
  @Permissions("readAll-propertyManagement")
  @Get("coupons")
  listCoupons(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.listCoupons(orgId);
  }

  @ApiOperation({ summary: "Validate a coupon code against a gross amount" })
  @Permissions("readAll-propertyManagement")
  @Get("coupons/validate")
  validateCoupon(
    @Query("code") code: string,
    @Query("amount") amount: string,
    @Query("currencyId") currencyId: string | undefined,
    @CurrentOrg() orgId: number,
  ) {
    const cur = currencyId != null && currencyId !== "" ? Number(currencyId) : null;
    return this.propertyManagementService.validateCoupon(code, Number(amount) || 0, orgId, cur);
  }

  @ApiOperation({ summary: "Create a discount coupon" })
  @Permissions("create-propertyManagement")
  @Post("coupons")
  createCoupon(@Body() body: CreateCouponDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createCoupon(body, orgId);
  }

  @ApiOperation({ summary: "Update a discount coupon" })
  @Permissions("update-propertyManagement")
  @Put("coupons/:id")
  updateCoupon(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateCouponDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.updateCoupon(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete (soft) a discount coupon" })
  @Permissions("update-propertyManagement")
  @Delete("coupons/:id")
  @HttpCode(200)
  deleteCoupon(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteCoupon(id, orgId);
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
  leases(@CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.propertyManagementService.leases(orgId, scope);
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

  @ApiOperation({ summary: "List signed lease documents (scanned paper contracts)" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("leases/:id/documents")
  leaseDocuments(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.leaseDocuments(id, orgId);
  }

  @ApiOperation({ summary: "Upload a signed lease document (paper contract scan/photo) to object storage" })
  @Permissions("update-propertyManagement")
  @UseInterceptors(FileInterceptor("document", {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("leases/:id/documents")
  uploadLeaseDocument(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { notes?: string },
    @UploadedFile() document: any,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadLeaseDocument(id, document, orgId, body?.notes ?? null);
  }

  @ApiOperation({ summary: "Delete a signed lease document" })
  @Permissions("update-propertyManagement")
  @Delete("leases/documents/:documentId")
  @HttpCode(200)
  deleteLeaseDocument(@Param("documentId", ParseIntPipe) documentId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteLeaseDocument(documentId, orgId);
  }

  @ApiOperation({ summary: "Stream a signed lease document from object storage" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("leases/documents/:documentId/file")
  async leaseDocumentFile(
    @Param("documentId", ParseIntPipe) documentId: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.leaseDocumentFile(documentId, orgId);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "List security deposits (held + returned)" })
  @Permissions("readAll-propertyManagement")
  @Get("deposits")
  deposits(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.listDeposits(orgId);
  }

  @ApiOperation({ summary: "Collect a security deposit (records a liability accounting transaction)" })
  @Permissions("create-propertyManagement")
  @Post("leases/:id/deposit")
  collectDeposit(@Param("id", ParseIntPipe) id: number, @Body() body: CollectDepositDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.collectDeposit(id, body, orgId);
  }

  @ApiOperation({ summary: "Return a security deposit with optional damage deduction" })
  @Permissions("update-propertyManagement")
  @Post("leases/:id/deposit/return")
  returnDeposit(@Param("id", ParseIntPipe) id: number, @Body() body: ReturnDepositDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.returnDeposit(id, body, orgId);
  }

  @ApiOperation({ summary: "List rent payments" })
  @Permissions("readAll-propertyManagement")
  @Get("payments")
  payments(@CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.propertyManagementService.payments(orgId, scope);
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

  @ApiOperation({ summary: "Approuve un cout de maintenance (comptabilise a l'approbation finale)" })
  @Permissions("update-maintenance-cost")
  @Post("maintenance-cost/:costId/approve")
  approveMaintenanceCost(
    @Param("costId", ParseIntPipe) costId: number,
    @Body() body: { comment?: string },
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.approveMaintenanceCost(costId, body?.comment, orgId);
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
  listContracts(@CurrentOrg() orgId: number) {
    return this.contractsService.listContracts(orgId);
  }

  @ApiOperation({ summary: "Get single contract with audit log" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("contracts/:id")
  getContract(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.contractsService.getContract(id, orgId);
  }

  @ApiOperation({ summary: "Create contract from a lease (auto-generates content)" })
  @Permissions("create-propertyManagement")
  @Post("contracts")
  createContract(@Body() body: CreateContractDto, @CurrentOrg() orgId: number, @Req() req: Request) {
    const userId = ((req as Request & { user?: { sub?: number } }).user)?.sub;
    return this.contractsService.createContract(body, orgId, userId);
  }

  @ApiOperation({ summary: "Send contract for e-signature by email" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Post("contracts/:id/send")
  @HttpCode(200)
  sendContract(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.contractsService.sendContract(id, orgId);
  }

  @ApiOperation({ summary: "Mark a contract as signed manually (paper contract signed by hand, scan/photo imported)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @UseInterceptors(FileInterceptor("document", {
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("contracts/:id/mark-signed-manually")
  @HttpCode(200)
  markContractSignedManually(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() document: any,
    @CurrentOrg() orgId: number,
    @Req() req: Request,
  ) {
    const user = (req as Request & { user?: { firstName?: string; lastName?: string; username?: string } }).user;
    const createdByName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username || null : null;
    return this.contractsService.markSignedManually(id, document, orgId, createdByName);
  }

  @ApiOperation({ summary: "Delete a contract" })
  @Permissions("delete-propertyManagement")
  @Delete("contracts/:id")
  @HttpCode(200)
  deleteContract(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.contractsService.deleteContract(id, orgId);
  }

  @ApiOperation({
    summary: "Renew a lease: clones it and generates a new contract from the active template",
  })
  @ApiParam({ name: "id", type: Number, description: "ID of the lease to renew" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("leases/:id/renew")
  renewLease(@Param("id", ParseIntPipe) id: number, @Body() body: RenewLeaseDto, @CurrentOrg() orgId: number, @Req() req: Request) {
    const userId = ((req as Request & { user?: { sub?: number } }).user)?.sub;
    return this.contractsService.renewLease(id, body, orgId, userId);
  }

  private publicApiBase(req: Request): string {
    const pickFirst = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
    const proto = pickFirst(req.headers["x-forwarded-proto"]);
    const host = pickFirst(req.headers["x-forwarded-host"]) ?? req.headers.host;
    if (proto && host) return `${proto}://${host}/api`;
    return `${req.protocol}://${req.headers.host}`;
  }
}
