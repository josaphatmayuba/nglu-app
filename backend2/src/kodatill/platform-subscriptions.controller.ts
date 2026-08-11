import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SuperOwnerGuard } from "../auth/guards/super-owner.guard";
import {
  UpdatePlatformSubscriptionDto,
  UpsertPlatformSubscriptionDto,
} from "./dto/platform-subscriptions.dto";
import { PlatformSubscriptionsService } from "./platform-subscriptions.service";

@ApiTags("kodatill-platform-subscriptions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("kodatill")
export class PlatformSubscriptionsController {
  constructor(private readonly platformSubscriptions: PlatformSubscriptionsService) {}

  @ApiOperation({ summary: "Abonnement de l'organisation courante" })
  @ApiOkResponse({ description: "Abonnement, 404 si aucun n'existe encore" })
  @Get("my-subscription")
  getMySubscription(@CurrentOrg() orgId: number) {
    return this.platformSubscriptions.getMySubscription(orgId);
  }

  @ApiOperation({ summary: "Cree/replace l'abonnement d'une organisation (super_owner)" })
  @ApiCreatedResponse({ description: "Abonnement (une seule ligne active par organisation)" })
  @UseGuards(SuperOwnerGuard)
  @Post("platform/subscriptions")
  upsert(@Body() body: UpsertPlatformSubscriptionDto) {
    return this.platformSubscriptions.upsert(body);
  }

  @ApiOperation({ summary: "Modifie l'abonnement d'une organisation (super_owner)" })
  @ApiParam({ name: "organizationId", type: Number })
  @UseGuards(SuperOwnerGuard)
  @Patch("platform/subscriptions/:organizationId")
  update(
    @Param("organizationId", ParseIntPipe) organizationId: number,
    @Body() body: UpdatePlatformSubscriptionDto,
  ) {
    return this.platformSubscriptions.update(organizationId, body);
  }
}
