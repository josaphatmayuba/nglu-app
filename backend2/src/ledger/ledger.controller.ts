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
import { CreateJournalEntryDto, ReverseEntryDto } from "./dto/ledger.dto";
import { LedgerService } from "./ledger.service";

@ApiTags("ledger")
@Controller("ledger")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @ApiOperation({ summary: "Comptabilise une ecriture en partie double" })
  @ApiCreatedResponse({ description: "Ecriture creee" })
  @Permissions("create-transaction")
  @Post()
  create(
    @Body() body: CreateJournalEntryDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.ledger.post(body, orgId, userId);
  }

  @ApiOperation({ summary: "Liste des ecritures" })
  @ApiOkResponse({ description: "Ecritures" })
  @Permissions("readAll-transaction")
  @Get()
  findAll(
    @CurrentOrg() orgId: number,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.ledger.findAll(orgId, limit ? Number(limit) : 50, offset ? Number(offset) : 0);
  }

  @ApiOperation({ summary: "Grand livre d'un compte (lignes + solde)" })
  @ApiOkResponse({ description: "Grand livre" })
  @ApiParam({ name: "accountId", type: Number })
  @Permissions("readAll-transaction")
  @Get("account/:accountId")
  ledgerForAccount(
    @Param("accountId", ParseIntPipe) accountId: number,
    @CurrentOrg() orgId: number,
  ) {
    return this.ledger.ledgerForAccount(accountId, orgId);
  }

  @ApiOperation({ summary: "Detail d'une ecriture (header + lignes)" })
  @ApiOkResponse({ description: "Ecriture" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("read-transaction")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.ledger.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Contre-passe une ecriture (extourne)" })
  @ApiCreatedResponse({ description: "Contre-passation creee" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post(":id/reverse")
  reverse(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ReverseEntryDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.ledger.reverse(id, body.reason, orgId, userId);
  }
}
