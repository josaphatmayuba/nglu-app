import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { AdjustStockDto, RestockDto } from "./dto/stock.dto";
import { StockService } from "./stock.service";

@ApiTags("kodatill-stock")
@ApiBearerAuth()
@Controller("kodatill/stock")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stock: StockService) {}

  // Route fixe /stock/alerts placee AVANT /stock/:id sinon elle serait
  // interceptee par le param generique (meme convention que catalog.controller).

  @ApiOperation({ summary: "Items sous le seuil de reappro, pour bandeau d'alerte dashboard" })
  @ApiOkResponse({ description: "Items en alerte" })
  @Permissions("kodatill_view")
  @Get("alerts")
  alerts(@CurrentOrg() orgId: number) {
    return this.stock.alerts(orgId);
  }

  @ApiOperation({ summary: "Liste les articles de stock (filtre branchId/state)" })
  @ApiOkResponse({ description: "Articles de stock" })
  @Permissions("kodatill_view")
  @Get()
  list(
    @CurrentOrg() orgId: number,
    @Query("branchId") branchId?: string,
    @Query("state") state?: "ok" | "low" | "out",
  ) {
    return this.stock.list(orgId, { branchId, state });
  }

  @ApiOperation({ summary: "Historique des mouvements d'un article de stock" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id/movements")
  movements(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.stock.movements(id, orgId);
  }

  @ApiOperation({ summary: "Reapprovisionne un article de stock (transaction)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_stock_manage")
  @Post(":id/restock")
  restock(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RestockDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.stock.restock(id, body, orgId, userId);
  }

  @ApiOperation({ summary: "Ajuste manuellement la quantite d'un article de stock (transaction)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_stock_manage")
  @Post(":id/adjust")
  adjust(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: AdjustStockDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.stock.adjust(id, body, orgId, userId);
  }
}
