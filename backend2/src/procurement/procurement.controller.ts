import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  CreateMovementDto,
  CreatePurchaseOrderDto,
  CreateWarehouseDto,
  ReceiveOrderDto,
  SetOrderStatusDto,
} from "./dto/procurement.dto";
import { ProcurementService } from "./procurement.service";

@ApiTags("procurement")
@Controller("procurement")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  // Entrepots
  @ApiOperation({ summary: "Liste des entrepots" })
  @ApiOkResponse({ description: "Entrepots" })
  @Permissions("readAll-transaction")
  @Get("warehouses")
  listWarehouses(@CurrentOrg() orgId: number) {
    return this.procurement.listWarehouses(orgId);
  }

  @ApiOperation({ summary: "Cree un entrepot" })
  @ApiCreatedResponse({ description: "Entrepot cree" })
  @Permissions("create-transaction")
  @Post("warehouses")
  createWarehouse(@Body() body: CreateWarehouseDto, @CurrentOrg() orgId: number) {
    return this.procurement.createWarehouse(body, orgId);
  }

  // Stock
  @ApiOperation({ summary: "Niveaux de stock d'un entrepot" })
  @ApiOkResponse({ description: "Niveaux de stock" })
  @ApiParam({ name: "warehouseId", type: Number })
  @Permissions("readAll-transaction")
  @Get("warehouses/:warehouseId/stock")
  stockLevels(@Param("warehouseId", ParseIntPipe) warehouseId: number, @CurrentOrg() orgId: number) {
    return this.procurement.stockLevels(warehouseId, orgId);
  }

  @ApiOperation({ summary: "Mouvements de stock d'un entrepot" })
  @ApiOkResponse({ description: "Mouvements" })
  @ApiParam({ name: "warehouseId", type: Number })
  @Permissions("readAll-transaction")
  @Get("warehouses/:warehouseId/movements")
  listMovements(@Param("warehouseId", ParseIntPipe) warehouseId: number, @CurrentOrg() orgId: number) {
    return this.procurement.listMovements(warehouseId, orgId);
  }

  @ApiOperation({ summary: "Mouvement de stock manuel (IN/OUT/ADJUST)" })
  @ApiCreatedResponse({ description: "Mouvement cree" })
  @Permissions("update-transaction")
  @Post("movements")
  createMovement(
    @Body() body: CreateMovementDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.procurement.createMovement(body, orgId, userId);
  }

  // Bons de commande
  @ApiOperation({ summary: "Liste des bons de commande (filtrable par statut)" })
  @ApiOkResponse({ description: "Bons de commande" })
  @Permissions("readAll-transaction")
  @Get("orders")
  listOrders(@CurrentOrg() orgId: number, @Query("status") status?: string) {
    return this.procurement.listOrders(orgId, status);
  }

  @ApiOperation({ summary: "Cree un bon de commande" })
  @ApiCreatedResponse({ description: "Bon de commande cree" })
  @Permissions("create-transaction")
  @Post("orders")
  createOrder(
    @Body() body: CreatePurchaseOrderDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.procurement.createOrder(body, orgId, userId);
  }

  @ApiOperation({ summary: "Detail d'un bon de commande" })
  @ApiOkResponse({ description: "Bon de commande" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-transaction")
  @Get("orders/:id")
  getOrder(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.procurement.getOrder(id, orgId);
  }

  @ApiOperation({ summary: "Change le statut d'un bon de commande" })
  @ApiCreatedResponse({ description: "Statut mis a jour" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("orders/:id/status")
  setStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: SetOrderStatusDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.procurement.setOrderStatus(id, body.status, orgId);
  }

  @ApiOperation({ summary: "Receptionne un bon de commande (entree en stock)" })
  @ApiCreatedResponse({ description: "Reception creee" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("orders/:id/receive")
  receive(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ReceiveOrderDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.procurement.receiveOrder(id, body, orgId, userId);
  }
}
