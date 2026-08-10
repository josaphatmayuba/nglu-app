import { Body, Controller, Param, ParseIntPipe, Post, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { CurrentUserId } from "../auth/decorators/current-user-id.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CashSessionsService } from "./cash-sessions.service";
import { CloseCashSessionDto, CreateCashMovementDto, OpenCashSessionDto } from "./dto/cash-sessions.dto";

@ApiTags("kodatill-cash-sessions")
@ApiBearerAuth()
@Controller("kodatill/cash-sessions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashSessionsController {
  constructor(private readonly cashSessions: CashSessionsService) {}

  @ApiOperation({ summary: "Ouvre une session de caisse (refuse si deja ouverte pour ce register/utilisateur)" })
  @ApiCreatedResponse({ description: "Session ouverte" })
  @Permissions("kodatill_pos_operate")
  @Post("open")
  open(@Body() body: OpenCashSessionDto, @CurrentOrg() orgId: number, @CurrentUserId() userId: number) {
    return this.cashSessions.open(body, orgId, userId);
  }

  @ApiOperation({ summary: "Session de caisse ouverte de l'utilisateur/register courant" })
  @ApiOkResponse({ description: "Session ouverte" })
  @Permissions("kodatill_view", "kodatill_pos_operate")
  @Get("current")
  current(
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
    @Query("registerId") registerId?: string,
  ) {
    const parsed = registerId !== undefined ? Number(registerId) : undefined;
    return this.cashSessions.current(orgId, userId, Number.isInteger(parsed) ? parsed : undefined);
  }

  @ApiOperation({ summary: "Cloture une session (calcule expectedCash/variance cote serveur)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_cash_close")
  @Post(":id/close")
  close(@Param("id", ParseIntPipe) id: number, @Body() body: CloseCashSessionDto, @CurrentOrg() orgId: number) {
    return this.cashSessions.close(id, body, orgId);
  }

  @ApiOperation({ summary: "Liste les mouvements de caisse (in/out) d'une session, tries par date croissante" })
  @ApiParam({ name: "id", type: Number })
  @ApiOkResponse({ description: "Liste des mouvements" })
  @Permissions("kodatill_view")
  @Get(":id/movements")
  listMovements(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.cashSessions.listMovements(id, orgId);
  }

  @ApiOperation({ summary: "Ajoute un mouvement de caisse (in/out)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_pos_operate")
  @Post(":id/movements")
  addMovement(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CreateCashMovementDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.cashSessions.addMovement(id, body, orgId, userId);
  }
}
