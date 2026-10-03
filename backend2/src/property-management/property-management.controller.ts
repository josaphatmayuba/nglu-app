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
import { DelegatePortalService } from "./delegate-portal.service";
import { DelegatesService } from "./delegates.service";
import { TenantPortalService } from "./tenant-portal.service";
import {
  CreateContractDto,
  CreateLeaseDto,
  CreateMaintenanceCostDto,
  CreateMaintenanceDto,
  CreateDelegateAssignmentDto,
  CreateDelegateDto,
  CreateOwnerDto,
  UpdateDelegateAssignmentDto,
  UpdateDelegateDto,
  UpdateOwnerDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  ConfirmPendingPaymentDto,
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
  CreatePropertyExpenseDto,
  UpdatePropertyExpenseDto,
  GenerateExpenseInstallmentsDto,
  AddExpensePartialPaymentDto,
  PayExpenseInstallmentDto,
  UpdateExpenseInstallmentDto,
  CreateMortgagePaymentDto,
  UpdateMortgagePaymentDto,
  CreateMortgageLoanDto,
  UpdateMortgageLoanDto,
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
    private readonly tenantPortalService: TenantPortalService,
    private readonly delegatesService: DelegatesService,
    private readonly delegatePortalService: DelegatePortalService,
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

  @ApiOperation({ summary: "Upload the tenant identity document copy (scan/photo)" })
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
  @Post("tenants/:id/id-document")
  uploadTenantIdDocument(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() document: any,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadTenantIdDocument(id, document, orgId);
  }

  @ApiOperation({ summary: "Stream the tenant identity document copy from object storage" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("tenants/:id/id-document/file")
  async tenantIdDocumentFile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.tenantIdDocumentFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Delete the tenant identity document copy" })
  @Permissions("update-propertyManagement")
  @Delete("tenants/:id/id-document")
  @HttpCode(200)
  deleteTenantIdDocument(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteTenantIdDocument(id, orgId);
  }

  @ApiOperation({ summary: "Chronological history of communications (email + SMS) sent to a tenant" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("tenants/:id/communications")
  tenantCommunications(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.tenantCommunications(id, orgId);
  }

  @ApiOperation({ summary: "Resend an SMS already logged (e.g. after a gateway failure)" })
  @Permissions("update-propertyManagement")
  @Post("sms-logs/:id/resend")
  @HttpCode(200)
  resendSmsLog(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.resendSmsLog(id, orgId);
  }

  @ApiOperation({ summary: "List tenant personal-data change requests submitted from the portal" })
  @Permissions("readAll-propertyManagement")
  @Get("tenant-change-requests")
  tenantChangeRequests(@CurrentOrg() orgId: number, @Query("status") status?: string) {
    return this.tenantPortalService.listChangeRequests(orgId, status || "pending");
  }

  @ApiOperation({ summary: "Approve a change request and apply it to the tenant record" })
  @Permissions("update-propertyManagement")
  @Post("tenant-change-requests/:id/approve")
  approveTenantChangeRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
    @Body() body: { note?: string },
  ) {
    return this.tenantPortalService.approveChangeRequest(id, orgId, userId, body?.note);
  }

  @ApiOperation({ summary: "Reject a change request without touching the tenant record" })
  @Permissions("update-propertyManagement")
  @Post("tenant-change-requests/:id/reject")
  @HttpCode(200)
  rejectTenantChangeRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
    @Body() body: { note?: string },
  ) {
    return this.tenantPortalService.rejectChangeRequest(id, orgId, userId, body?.note);
  }

  @ApiOperation({ summary: "Read the existing tenant portal link without creating one" })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("tenants/:id/portal-link")
  tenantPortalLink(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.tenantPortalService.getTenantPortalLink(id, orgId);
  }

  @ApiOperation({ summary: "Generate a secure tenant portal link and notify the tenant by SMS" })
  @Permissions("update-propertyManagement")
  @Post("tenants/:id/portal-link")
  generateTenantPortalLink(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.generateTenantPortalLinkAndNotify(id, orgId);
  }

  @ApiOperation({ summary: "Revoke the tenant portal link (soft invalidation)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("update-propertyManagement")
  @Delete("tenants/:id/portal-link")
  @HttpCode(200)
  revokeTenantPortalLink(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.tenantPortalService.revokeTenantPortalLink(id, orgId);
  }

  @ApiOperation({ summary: "Generate a secure tenant onboarding link" })
  @Permissions("create-propertyManagement")
  @Post("onboarding")
  generateTenantOnboarding(@Body() body: GenerateTenantOnboardingDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.generateTenantOnboarding(body, orgId);
  }

  @ApiOperation({ summary: "List tenant onboarding dossiers" })
  @Permissions("readAll-propertyManagement")
  @Get("onboarding")
  tenantOnboardingList(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.onboardingList(orgId);
  }

  @ApiOperation({ summary: "Send the onboarding link by SMS on demand" })
  @Permissions("create-propertyManagement")
  @Post("onboarding/:id/send-sms")
  sendOnboardingSms(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.sendOnboardingSms(id);
  }

  @ApiOperation({ summary: "Send the onboarding link by email on demand" })
  @Permissions("create-propertyManagement")
  @Post("onboarding/:id/send-email")
  sendOnboardingEmail(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.sendOnboardingEmail(id);
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
  deleteTenantOnboarding(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteOnboarding(id, orgId);
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

  @ApiOperation({ summary: "Record payment for a reservation ahead of check-out" })
  @Permissions("update-propertyManagement")
  @Post("reservations/:id/pay")
  payReservation(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CheckOutReservationDto,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.payReservation(id, body, orgId, scope);
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

  // ── Proprietaires legaux des biens ───────────────────────────────────────
  @ApiOperation({ summary: "List active owners (proprietaires legaux)" })
  @Permissions("readAll-propertyManagement")
  @Get("owners")
  owners(@CurrentOrg() orgId: number) {
    return this.propertyManagementService.owners(orgId);
  }

  @ApiOperation({ summary: "Get single owner by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("owners/:id")
  owner(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.owner(id, orgId);
  }

  @ApiOperation({ summary: "Create an owner" })
  @ApiCreatedResponse({ description: "Created owner" })
  @Permissions("create-propertyManagement")
  @Post("owners")
  createOwner(@Body() body: CreateOwnerDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.createOwner(body, orgId);
  }

  @ApiOperation({ summary: "Update an owner" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-propertyManagement")
  @Put("owners/:id")
  updateOwner(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateOwnerDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateOwner(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete (soft) an owner" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("owners/:id")
  @HttpCode(200)
  deleteOwner(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteOwner(id, orgId);
  }

  // -- Delegues (mandataires charges du suivi de loyer) ---------------------
  // Memes permissions que les proprietaires : gerer un delegue, c'est gerer le
  // parc, pas une operation comptable.
  @ApiOperation({ summary: "List active delegates (mandataires de suivi de loyer)" })
  @Permissions("readAll-propertyManagement")
  @Get("delegates")
  delegates(@CurrentOrg() orgId: number) {
    return this.delegatesService.list(orgId);
  }

  // DOIT rester declaree AVANT delegates/:id : sinon Nest fait correspondre
  // "candidates" au parametre :id et ParseIntPipe rejette la requete en 400.
  @ApiOperation({ summary: "List people who can be designated as delegate (staff + external providers)" })
  @Permissions("readAll-propertyManagement")
  @Get("delegates/candidates")
  delegateCandidates(@CurrentOrg() orgId: number) {
    return this.delegatesService.candidates(orgId);
  }

  @ApiOperation({ summary: "Get single delegate with its assignments" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("delegates/:id")
  delegate(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.delegatesService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Create a delegate" })
  @ApiCreatedResponse({ description: "Created delegate" })
  @Permissions("create-propertyManagement")
  @Post("delegates")
  createDelegate(@Body() body: CreateDelegateDto, @CurrentOrg() orgId: number) {
    return this.delegatesService.create(body, orgId);
  }

  @ApiOperation({ summary: "Update a delegate" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-propertyManagement")
  @Put("delegates/:id")
  updateDelegate(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateDelegateDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.delegatesService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Delete (soft) a delegate" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("delegates/:id")
  @HttpCode(200)
  deleteDelegate(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.delegatesService.remove(id, orgId);
  }

  @ApiOperation({ summary: "Assign a delegate to an owner portfolio or a property" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-propertyManagement")
  @Post("delegates/:id/assignments")
  addDelegateAssignment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateDelegateAssignmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.delegatesService.addAssignment(id, body, orgId);
  }

  @ApiOperation({ summary: "Update the event subscriptions of one assignment" })
  @Permissions("update-propertyManagement")
  @Put("delegates/:id/assignments/:assignmentId")
  updateDelegateAssignment(
    @Param("id", ParseIntPipe) id: number,
    @Param("assignmentId", ParseIntPipe) assignmentId: number,
    @Body() body: UpdateDelegateAssignmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.delegatesService.updateAssignment(id, assignmentId, body, orgId);
  }

  @ApiOperation({ summary: "Remove (soft) one assignment of a delegate" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("update-propertyManagement")
  @Delete("delegates/:id/assignments/:assignmentId")
  @HttpCode(200)
  removeDelegateAssignment(
    @Param("id", ParseIntPipe) id: number,
    @Param("assignmentId", ParseIntPipe) assignmentId: number,
    @CurrentOrg() orgId: number,
  ) {
    return this.delegatesService.removeAssignment(id, assignmentId, orgId);
  }

  @ApiOperation({ summary: "List rent checks sent to delegates and their answers" })
  @Permissions("readAll-propertyManagement")
  @Get("delegate-rent-checks")
  delegateRentChecks(@CurrentOrg() orgId: number, @Query("answer") answer?: string) {
    return this.delegatePortalService.listRentChecks(orgId, answer);
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

  @ApiOperation({ summary: "Rent book (carnet de quittances) data for a lease: lease/tenant/property/unit + all payments" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("leases/:id/rent-book")
  rentBook(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.propertyManagementService.rentBook(id, orgId, scope);
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
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("leases/:id/deposit")
  collectDeposit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CollectDepositDto,
    @UploadedFile() proof: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.collectDeposit(id, body, orgId, proof, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Return a security deposit with optional damage deduction" })
  @Permissions("update-propertyManagement")
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("leases/:id/deposit/return")
  returnDeposit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ReturnDepositDto,
    @UploadedFile() proof: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.returnDeposit(id, body, orgId, proof, this.publicApiBase(req));
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

  @ApiOperation({ summary: "Stream the proof file of one rent payment (verified against the current org, no public URL)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("leases/payments/:id/proof-file")
  async paymentProofFile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.paymentProofFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  @ApiOperation({ summary: "Create rent payment and linked accounting transaction" })
  @Permissions("create-propertyManagement")
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("payments")
  createPayment(
    @Body() body: CreateRentPaymentDto,
    @UploadedFile() proof: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.createPayment(body, orgId, proof, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Generate missing (pending) monthly rent payment rows for a retroactive lease — no accounting impact" })
  @Permissions("create-propertyManagement")
  @Post("leases/:id/generate-missing-payments")
  generateMissingPayments(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.generateMissingPayments(id, orgId);
  }

  @ApiOperation({ summary: "Confirm a pending rent payment row (records the real accounting transaction)" })
  @Permissions("create-propertyManagement")
  @UseInterceptors(FileInterceptor("proof", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException("Type de fichier non autorise. Formats acceptes : JPEG, PNG, WebP, PDF."), false);
      }
    },
  }))
  @Post("payments/:id/confirm")
  confirmPendingPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConfirmPendingPaymentDto,
    @UploadedFile() proof: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.confirmPendingPayment(id, body, orgId, proof, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Send payment reminder email to tenant" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("payments/reminder")
  @HttpCode(200)
  sendPaymentReminder(@Body() body: { leaseId: number }, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.sendPaymentReminder(body.leaseId, orgId);
  }

  // Preavis pour defaut de paiement : action grave et tracee, donc reservee aux
  // memes permissions que les relances. Le service refuse le bail qui doit
  // 1 mois ou moins, quelle que soit la demande du client.
  @ApiOperation({ summary: "Notify tenant that a default-of-payment notice will be filed (>1 month unpaid)" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post("payments/default-notice")
  @HttpCode(200)
  sendDefaultNotice(@Body() body: { leaseId: number }, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.sendDefaultNotice(body.leaseId, orgId);
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
  deleteMaintenanceCost(@Param("costId", ParseIntPipe) costId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteMaintenanceCost(costId, orgId);
  }

  @ApiOperation({ summary: "Stream the receipt file of one maintenance cost (verified against the current org, no public URL)" })
  @ApiParam({ name: "costId", type: Number })
  @Permissions("readAll-maintenance-cost")
  @Get("maintenance/costs/:costId/receipt-file")
  async maintenanceCostReceiptFile(
    @Param("costId", ParseIntPipe) costId: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.maintenanceCostReceiptFile(costId, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Depenses par propriete (SCRUM-310) ──────────────────────────────────────

  @ApiOperation({ summary: "List property expenses (filters: propertyId, category, dateFrom, dateTo)" })
  @Permissions("readAll-propertyManagement")
  @Get("property-expenses")
  listPropertyExpenses(
    @CurrentOrg() orgId: number,
    @Query("propertyId") propertyId?: string,
    @Query("category") category?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.propertyManagementService.listPropertyExpenses(orgId, {
      propertyId: propertyId ? Number(propertyId) : undefined,
      category,
      dateFrom,
      dateTo,
    });
  }

  @ApiOperation({ summary: "Get single property expense by ID" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("property-expenses/:id")
  getPropertyExpense(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.getPropertyExpense(id, orgId);
  }

  @ApiOperation({ summary: "Create a property expense" })
  @ApiCreatedResponse({ description: "Created property expense" })
  @Permissions("create-propertyManagement")
  @Post("property-expenses")
  createPropertyExpense(@Body() body: CreatePropertyExpenseDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.propertyManagementService.createPropertyExpense(body, orgId, userId);
  }

  @ApiOperation({ summary: "Update a property expense" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Patch("property-expenses/:id")
  updatePropertyExpense(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyExpenseDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updatePropertyExpense(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a property expense (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("property-expenses/:id")
  @HttpCode(200)
  deletePropertyExpense(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deletePropertyExpense(id, orgId);
  }

  @ApiOperation({ summary: "Upload/replace the receipt (justificatif) for a property expense" })
  @Permissions("update-propertyManagement")
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
  @Post("property-expenses/:id/receipt")
  uploadPropertyExpenseReceipt(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() receipt: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadPropertyExpenseReceipt(id, orgId, receipt, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Stream the receipt file of one property expense (verified against the current org, no public URL)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("property-expenses/:id/receipt-file")
  async propertyExpenseReceiptFile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.propertyExpenseReceiptFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Echeancier de paiement des depenses de propriete (SCRUM-313) ───────────
  // Note ordre des routes NestJS : les routes "installments/:installmentId..."
  // utilisent un segment litteral "installments" different du :id numerique de
  // "property-expenses/:id", donc pas de collision de matching possible ici
  // (le param s'appelle differemment et le segment litteral est explicite).

  @ApiOperation({ summary: "List installments (echeances/paiements) of a property expense" })
  @Permissions("readAll-propertyManagement")
  @Get("property-expenses/:id/installments")
  listExpenseInstallments(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.listExpenseInstallments(id, orgId);
  }

  @ApiOperation({ summary: "Generate (or regenerate) the monthly installment schedule of a property expense" })
  @Permissions("create-propertyManagement")
  @Post("property-expenses/:id/installments/generate")
  generateExpenseInstallments(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: GenerateExpenseInstallmentsDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.propertyManagementService.generateExpenseInstallments(id, body, orgId, userId);
  }

  @ApiOperation({ summary: "Add a free-form partial payment to a property expense" })
  @ApiCreatedResponse({ description: "Installment list after the partial payment" })
  @Permissions("create-propertyManagement")
  @Post("property-expenses/:id/installments")
  addExpensePartialPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AddExpensePartialPaymentDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.propertyManagementService.addExpensePartialPayment(id, body, orgId, userId);
  }

  @ApiOperation({ summary: "Pay a scheduled installment of a property expense" })
  @Permissions("update-propertyManagement")
  @Patch("property-expenses/installments/:installmentId/pay")
  payExpenseInstallment(
    @Param("installmentId", ParseIntPipe) installmentId: number,
    @Body() body: PayExpenseInstallmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.payExpenseInstallment(installmentId, body, orgId);
  }

  @ApiOperation({ summary: "Update a pending (unpaid) expense installment" })
  @Permissions("update-propertyManagement")
  @Patch("property-expenses/installments/:installmentId")
  updateExpenseInstallment(
    @Param("installmentId", ParseIntPipe) installmentId: number,
    @Body() body: UpdateExpenseInstallmentDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.updateExpenseInstallment(installmentId, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete an expense installment (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("property-expenses/installments/:installmentId")
  @HttpCode(200)
  deleteExpenseInstallment(@Param("installmentId", ParseIntPipe) installmentId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteExpenseInstallment(installmentId, orgId);
  }

  @ApiOperation({ summary: "Upload/replace the receipt (justificatif) for an expense installment" })
  @Permissions("update-propertyManagement")
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
  @Post("property-expenses/installments/:installmentId/receipt")
  uploadExpenseInstallmentReceipt(
    @Param("installmentId", ParseIntPipe) installmentId: number,
    @UploadedFile() receipt: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadExpenseInstallmentReceipt(installmentId, orgId, receipt, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Stream the receipt file of one expense installment (verified against the current org, no public URL)" })
  @ApiParam({ name: "installmentId", type: Number })
  @Permissions("readAll-propertyManagement")
  @Get("property-expenses/installments/:installmentId/receipt-file")
  async expenseInstallmentReceiptFile(
    @Param("installmentId", ParseIntPipe) installmentId: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.expenseInstallmentReceiptFile(installmentId, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Mortgage Payments (SCRUM-311) ───────────────────────────────────────────

  @ApiOperation({ summary: "List mortgage payments (principal / interest split)" })
  @Permissions("readAll-propertyManagement")
  @Get("mortgage-payments")
  listMortgagePayments(
    @CurrentOrg() orgId: number,
    @Query("propertyId") propertyId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.propertyManagementService.listMortgagePayments(orgId, {
      propertyId: propertyId ? Number(propertyId) : undefined,
      dateFrom,
      dateTo,
    });
  }

  @ApiOperation({ summary: "Get one mortgage payment" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("mortgage-payments/:id")
  getMortgagePayment(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.getMortgagePayment(id, orgId);
  }

  @ApiOperation({ summary: "Create a mortgage payment (total = principal + interest + escrow)" })
  @ApiCreatedResponse({ description: "Created mortgage payment" })
  @Permissions("create-propertyManagement")
  @Post("mortgage-payments")
  createMortgagePayment(@Body() body: CreateMortgagePaymentDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.propertyManagementService.createMortgagePayment(body, orgId, userId);
  }

  @ApiOperation({ summary: "Update a mortgage payment" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Patch("mortgage-payments/:id")
  updateMortgagePayment(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMortgagePaymentDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateMortgagePayment(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a mortgage payment (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("mortgage-payments/:id")
  @HttpCode(200)
  deleteMortgagePayment(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteMortgagePayment(id, orgId);
  }

  @ApiOperation({ summary: "Upload/replace the receipt (justificatif) for a mortgage payment" })
  @Permissions("update-propertyManagement")
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
  @Post("mortgage-payments/:id/receipt")
  uploadMortgagePaymentReceipt(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() receipt: any,
    @Req() req: Request,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadMortgagePaymentReceipt(id, orgId, receipt, this.publicApiBase(req));
  }

  @ApiOperation({ summary: "Stream the receipt file of one mortgage payment (verified against the current org, no public URL)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("mortgage-payments/:id/receipt-file")
  async mortgagePaymentReceiptFile(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.mortgagePaymentReceiptFile(id, orgId);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName.replace(/["\\\r\n]/g, "")}"`,
      "Cache-Control": "private, no-store",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
  }

  // ── Prets hypothecaires (SCRUM-311 phase 2) ─────────────────────────────────

  @ApiOperation({ summary: "List mortgage loans (reference), avec solde restant du calcule" })
  @Permissions("readAll-propertyManagement")
  @Get("mortgage-loans")
  listMortgageLoans(
    @CurrentOrg() orgId: number,
    @Query("propertyId") propertyId?: string,
    @Query("status") status?: string,
  ) {
    return this.propertyManagementService.listMortgageLoans(orgId, {
      propertyId: propertyId ? Number(propertyId) : undefined,
      status,
    });
  }

  @ApiOperation({ summary: "Get one mortgage loan, avec solde restant du calcule" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readSingle-propertyManagement", "readAll-propertyManagement")
  @Get("mortgage-loans/:id")
  getMortgageLoan(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.getMortgageLoan(id, orgId);
  }

  @ApiOperation({ summary: "Create a mortgage loan (reference du pret, pas une ecriture comptable)" })
  @ApiCreatedResponse({ description: "Created mortgage loan" })
  @Permissions("create-propertyManagement")
  @Post("mortgage-loans")
  createMortgageLoan(@Body() body: CreateMortgageLoanDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.propertyManagementService.createMortgageLoan(body, orgId, userId);
  }

  @ApiOperation({ summary: "Update a mortgage loan" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Patch("mortgage-loans/:id")
  updateMortgageLoan(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMortgageLoanDto, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.updateMortgageLoan(id, body, orgId);
  }

  @ApiOperation({ summary: "Soft-delete a mortgage loan (sets is_active=false)" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Permissions("delete-propertyManagement")
  @Delete("mortgage-loans/:id")
  @HttpCode(200)
  deleteMortgageLoan(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteMortgageLoan(id, orgId);
  }

  // ── P&L par propriete (SCRUM-312) ───────────────────────────────────────────

  @ApiOperation({ summary: "Property P&L: revenus (loyers) / depenses / hypotheque, par devise" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-propertyManagement")
  @Get("properties/:id/pnl")
  getPropertyPnl(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.propertyManagementService.getPropertyPnl(id, orgId, scope, { dateFrom, dateTo });
  }

  // ── Maintenance Photos ──────────────────────────────────────────────────────

  @ApiOperation({ summary: "List photos for one maintenance ticket" })
  @Permissions("readAll-maintenance")
  @Get("maintenance/:ticketId/photos")
  maintenancePhotos(@Param("ticketId", ParseIntPipe) ticketId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.maintenancePhotos(ticketId, orgId);
  }

  @ApiOperation({ summary: "Upload a maintenance ticket photo to object storage" })
  @Permissions("update-maintenance")
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
  @Post("maintenance/:ticketId/photos")
  uploadMaintenancePhoto(
    @Param("ticketId", ParseIntPipe) ticketId: number,
    @Body() body: { photoType?: string },
    @UploadedFile() photo: any,
    @CurrentOrg() orgId: number,
  ) {
    return this.propertyManagementService.uploadMaintenancePhoto(ticketId, photo, orgId, body?.photoType);
  }

  @ApiOperation({ summary: "Delete a maintenance ticket photo" })
  @Permissions("update-maintenance")
  @Delete("maintenance/photos/:photoId")
  @HttpCode(200)
  deleteMaintenancePhoto(@Param("photoId", ParseIntPipe) photoId: number, @CurrentOrg() orgId: number) {
    return this.propertyManagementService.deleteMaintenancePhoto(photoId, orgId);
  }

  @ApiOperation({ summary: "Stream a maintenance ticket photo from object storage" })
  @Permissions("readAll-maintenance")
  @Get("maintenance/photos/:photoId/file")
  async maintenancePhotoFile(
    @Param("photoId", ParseIntPipe) photoId: number,
    @CurrentOrg() orgId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.propertyManagementService.maintenancePhotoFile(photoId, orgId);
    res.set({
      "Content-Type": file.mimeType || file.contentType,
      "Cache-Control": "private, max-age=300",
      ...(file.contentLength ? { "Content-Length": String(file.contentLength) } : {}),
    });
    return new StreamableFile(file.body);
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

  @ApiOperation({ summary: "Send the post-signature welcome message (email + SMS) to the tenant, if never sent" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-propertyManagement")
  @Post("contracts/:id/send-welcome")
  @HttpCode(200)
  sendContractWelcome(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.contractsService.sendWelcomeMessage(id, orgId);
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
