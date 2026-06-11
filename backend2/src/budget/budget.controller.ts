import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  ConsumeBudgetDto,
  CreateBudgetDto,
  CreateBudgetLineDto,
} from "./dto/budget.dto";
import { BudgetService } from "./budget.service";

@ApiTags("budget")
@Controller("budget")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BudgetController {
  constructor(private readonly budget: BudgetService) {}

  @ApiOperation({ summary: "Liste des budgets" })
  @ApiOkResponse({ description: "Budgets" })
  @Permissions("readAll-transaction")
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.budget.list(orgId);
  }

  @ApiOperation({ summary: "Cree un budget" })
  @ApiCreatedResponse({ description: "Budget cree" })
  @Permissions("create-transaction")
  @Post()
  create(@Body() body: CreateBudgetDto, @CurrentOrg() orgId: number) {
    return this.budget.create(body, orgId);
  }

  @ApiOperation({ summary: "Etat consolide d'un budget (planifie/consomme/restant)" })
  @ApiOkResponse({ description: "Etat budget" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("readAll-transaction")
  @Get(":id/status")
  status(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.budget.status(id, orgId);
  }

  @ApiOperation({ summary: "Ajoute une ligne budgetaire" })
  @ApiCreatedResponse({ description: "Ligne creee" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post(":id/lines")
  addLine(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateBudgetLineDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.budget.addLine(id, body, orgId);
  }

  @ApiOperation({ summary: "Enregistre une consommation sur une ligne budgetaire" })
  @ApiCreatedResponse({ description: "Consommation + etat de la ligne" })
  @ApiParam({ name: "lineId", type: Number })
  @Permissions("update-transaction")
  @Post("lines/:lineId/consume")
  consume(
    @Param("lineId", ParseIntPipe) lineId: number,
    @Body() body: ConsumeBudgetDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.budget.consume(lineId, body, orgId);
  }
}
