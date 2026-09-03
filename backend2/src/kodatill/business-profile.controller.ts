import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { BusinessProfileService } from "./business-profile.service";
import { UpdateBusinessProfileDto } from "./dto/business-profile.dto";

@ApiTags("kodatill-business-profile")
@ApiBearerAuth()
@Controller("kodatill/business-profile")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BusinessProfileController {
  constructor(private readonly businessProfile: BusinessProfileService) {}

  @ApiOperation({
    summary: "Recupere le profil d'activite de l'organisation",
    description:
      "Si aucun profil n'existe encore, retourne un defaut raisonnable (isDefault=true) NON persiste en base.",
  })
  @ApiOkResponse({ description: "Profil d'activite" })
  @Permissions("kodatill_view")
  @Get()
  get(@CurrentOrg() orgId: number) {
    return this.businessProfile.get(orgId);
  }

  @ApiOperation({ summary: "Cree ou met a jour le profil d'activite de l'organisation" })
  @ApiOkResponse({ description: "Profil d'activite mis a jour" })
  @Permissions("kodatill_settings_manage")
  @Put()
  update(@Body() body: UpdateBusinessProfileDto, @CurrentOrg() orgId: number) {
    return this.businessProfile.update(body, orgId);
  }
}
