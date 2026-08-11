import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { UpdateKitchenLineStatusDto } from "./dto/orders.dto";
import { KitchenService } from "./kitchen.service";

@ApiTags("kodatill-kitchen")
@ApiBearerAuth()
@Controller("kodatill/kitchen")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @ApiOperation({ summary: "Ecran cuisine : lignes actives groupees par commande (pending/preparing/ready)" })
  @ApiOkResponse({ description: "Commandes avec lignes cuisine actives" })
  @Permissions("kodatill_pos_operate")
  @Get("board")
  getBoard(@CurrentOrg() orgId: number, @Query("branchId") branchId?: string) {
    return this.kitchen.getBoard(orgId, branchId);
  }

  @ApiOperation({ summary: "Change le statut cuisine d'une ligne (pending/preparing/ready/served)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Post("lines/:id/status")
  updateLineStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateKitchenLineStatusDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.kitchen.updateLineStatus(id, body.status, orgId);
  }
}
