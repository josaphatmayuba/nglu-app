import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { CurrentOrg } from "../../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../../auth/decorators/current-user-id.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { TenantPrescreeningService } from "./tenant-prescreening.service";
import {
  AddPrescreeningReferenceDto,
  CreatePrescreeningInviteDto,
  DecidePrescreeningDto,
  UpdateReferenceContactDto,
} from "./dto/tenant-prescreening.dto";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("property-management-prescreening")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("property-management/prescreenings")
export class TenantPrescreeningController {
  constructor(private readonly service: TenantPrescreeningService) {}

  @ApiOperation({ summary: "Send a prescreening invite link by SMS/email" })
  @Permissions("create-propertyManagement")
  @Post("invite")
  createInvite(@Body() body: CreatePrescreeningInviteDto, @CurrentOrg() orgId: number) {
    return this.service.createInvite(orgId, body);
  }

  @ApiOperation({ summary: "List prescreening dossiers" })
  @Permissions("readAll-propertyManagement")
  @Get()
  list(@CurrentOrg() orgId: number, @Query("status") status?: string, @Query("propertyId") propertyId?: string) {
    return this.service.list(orgId, {
      status,
      propertyId: propertyId ? Number(propertyId) : undefined,
    });
  }

  @ApiOperation({ summary: "List available consent legal texts" })
  @Permissions("readAll-propertyManagement")
  @Get("consent-texts")
  listConsentTexts(@CurrentOrg() orgId: number) {
    return this.service.listConsentTexts(orgId);
  }

  @ApiOperation({ summary: "Get prescreening dossier detail" })
  @Permissions("readAll-propertyManagement")
  @Get(":id")
  getById(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.service.getById(orgId, id);
  }

  @ApiOperation({ summary: "Add a landlord reference to a prescreening dossier" })
  @Permissions("update-propertyManagement")
  @Post(":id/references")
  addReference(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AddPrescreeningReferenceDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.service.addReference(orgId, id, body);
  }

  @ApiOperation({ summary: "Update landlord reference contact status/feedback" })
  @Permissions("update-propertyManagement")
  @Post(":id/references/:refId/contact")
  updateReferenceContact(
    @Param("id", ParseIntPipe) id: number,
    @Param("refId", ParseIntPipe) refId: number,
    @Body() body: UpdateReferenceContactDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.updateReferenceContact(orgId, id, refId, body, userId);
  }

  @ApiOperation({ summary: "Accept or reject a prescreening dossier" })
  @Permissions("update-propertyManagement")
  @Post(":id/decision")
  decide(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: DecidePrescreeningDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.service.decide(orgId, id, body, userId);
  }

  @ApiOperation({ summary: "Mark credit check as authorized (requires consent)" })
  @Permissions("update-propertyManagement")
  @Post(":id/credit-check/mark")
  markCreditCheck(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.service.markCreditCheck(orgId, id);
  }

  @ApiOperation({ summary: "Convert an accepted prescreening dossier into a tenant onboarding" })
  @Permissions("create-propertyManagement", "update-propertyManagement")
  @Post(":id/convert-to-onboarding")
  convertToOnboarding(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.service.convertToOnboarding(orgId, id);
  }

  @ApiOperation({ summary: "Purge (soft) sensitive data of a prescreening dossier" })
  @Permissions("delete-propertyManagement")
  @Post(":id/purge")
  purge(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.service.purge(orgId, id);
  }
}
