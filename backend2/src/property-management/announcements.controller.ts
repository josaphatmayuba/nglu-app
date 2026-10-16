import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentDomusProperty, type DomusPropertyScope } from "../auth/decorators/domus-property-scope.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { DomusPropertyGuard } from "../auth/guards/domus-property.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { AnnouncementsService } from "./announcements.service";

class AnnouncementTargetDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) propertyId?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(300) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) tenantIds?: number[];
}

class CreateAnnouncementDto extends AnnouncementTargetDto {
  @IsString() @MaxLength(480) message!: string;
}

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("property-management")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, DomusPropertyGuard)
@Controller("property-management/announcements")
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @ApiOperation({ summary: "Preview recipients of an SMS announcement" })
  @Permissions("readAll-propertyManagement")
  @Post("preview")
  @HttpCode(200)
  preview(@Body() body: AnnouncementTargetDto, @CurrentOrg() orgId: number, @CurrentDomusProperty() scope: DomusPropertyScope) {
    return this.announcements.preview(body, orgId, scope);
  }

  @ApiOperation({ summary: "Send an SMS announcement to tenants (async)" })
  @Permissions("create-propertyManagement")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post()
  create(
    @Body() body: CreateAnnouncementDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
  ) {
    return this.announcements.create(body, orgId, userId, scope);
  }

  @ApiOperation({ summary: "List SMS announcements" })
  @Permissions("readAll-propertyManagement")
  @Get()
  list(
    @Query("propertyId") propertyId: string | undefined,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
    @CurrentUserId() userId: number,
  ) {
    const pid = propertyId ? Number(propertyId) : undefined;
    return this.announcements.list(orgId, scope, pid && Number.isFinite(pid) ? pid : undefined, userId);
  }

  @ApiOperation({ summary: "SMS announcement detail with delivery logs" })
  @Permissions("readAll-propertyManagement")
  @Get(":id")
  detail(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
    @CurrentUserId() userId: number,
  ) {
    return this.announcements.detail(id, orgId, scope, userId);
  }

  @ApiOperation({ summary: "Resend failed SMS of an announcement" })
  @Permissions("update-propertyManagement")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post(":id/resend-failed")
  @HttpCode(200)
  resendFailed(
    @Param("id", ParseIntPipe) id: number,
    @CurrentOrg() orgId: number,
    @CurrentDomusProperty() scope: DomusPropertyScope,
    @CurrentUserId() userId: number,
  ) {
    return this.announcements.resendFailed(id, orgId, scope, userId);
  }
}
