import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateOrderDto,
  CreateOrderPaymentDto,
  SyncOrdersDto,
  UpdateOrderLinesDto,
  UpdateOrderStatusDto,
} from "./dto/orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("kodatill-orders")
@ApiBearerAuth()
@Controller("kodatill/orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @ApiOperation({ summary: "Cree une commande (idempotent via clientUuid)" })
  @ApiCreatedResponse({ description: "Commande creee ou existante (idempotence)" })
  @Permissions("kodatill_pos_operate")
  @Post()
  create(@Body() body: CreateOrderDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.orders.create(body, orgId, userId);
  }

  @ApiOperation({ summary: "Resynchronise un batch de commandes creees hors-ligne (SCRUM-304)" })
  @ApiCreatedResponse({ description: "Resultat par commande : {clientUuid, orderId?, orderNumber?, publicRef?, error?}" })
  @Permissions("kodatill_pos_operate")
  @Post("sync")
  sync(@Body() body: SyncOrdersDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.orders.sync(body, orgId, userId);
  }

  @ApiOperation({ summary: "Liste les commandes (filtre status/branchId/from/to/channel)" })
  @ApiOkResponse({ description: "Commandes" })
  @Permissions("kodatill_view")
  @Get()
  findAll(
    @CurrentOrg() orgId: number,
    @Query("status") status?: string,
    @Query("branchId") branchId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("channel") channel?: string,
  ) {
    return this.orders.findAll(orgId, { status, branchId, from, to, channel });
  }

  @ApiOperation({ summary: "Detail d'une commande (avec lignes)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.orders.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Donnees structurees pour l'impression du ticket client (SCRUM-306)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_view")
  @Get(":id/receipt")
  getReceipt(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.orders.getReceipt(id, orgId);
  }

  @ApiOperation({ summary: "Ajoute/modifie/supprime des lignes (autorise seulement en draft/received)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Patch(":id/lines")
  updateLines(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateOrderLinesDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.orders.updateLines(id, body, orgId);
  }

  @ApiOperation({ summary: "Transition d'etat (machine a etats explicite, historisee)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Post(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.orders.updateStatus(id, body.status, orgId, userId);
  }

  @ApiOperation({ summary: "Ajoute un paiement (incremente paidTotal/dueTotal en transaction)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Post(":id/payments")
  addPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateOrderPaymentDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.orders.addPayment(id, body, orgId, userId);
  }
}
