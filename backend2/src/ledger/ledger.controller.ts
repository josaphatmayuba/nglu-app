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
  ApprovalRequirementDto,
  CreateJournalEntryDto,
  CreatePeriodDto,
  PostByRulesDto,
  ReverseEntryDto,
} from "./dto/ledger.dto";
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

  @ApiOperation({ summary: "Comptabilise via regles parametrables (transaction_type_rules)" })
  @ApiCreatedResponse({ description: "Ecriture creee" })
  @Permissions("create-transaction")
  @Post("by-rules")
  createByRules(
    @Body() body: PostByRulesDto,
    @CurrentOrg() orgId: number,
    @CurrentUserId() userId: number,
  ) {
    return this.ledger.postByRules(body, orgId, userId);
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

  @ApiOperation({ summary: "Soldes par sous-compte (grand livre moderne)" })
  @ApiOkResponse({ description: "Soldes" })
  @Permissions("readAll-transaction")
  @Get("balances")
  balances(@CurrentOrg() orgId: number) {
    return this.ledger.subAccountBalances(orgId);
  }

  @ApiOperation({ summary: "Balance generale (trial balance) moderne" })
  @ApiOkResponse({ description: "Trial balance" })
  @Permissions("readAll-transaction")
  @Get("trial-balance")
  trialBalance(@CurrentOrg() orgId: number) {
    return this.ledger.trialBalance(orgId);
  }

  @ApiOperation({ summary: "Compte de resultat moderne (produits - charges)" })
  @ApiOkResponse({ description: "Income statement" })
  @Permissions("readAll-transaction")
  @Get("income-statement")
  incomeStatement(@CurrentOrg() orgId: number) {
    return this.ledger.incomeStatement(orgId);
  }

  @ApiOperation({ summary: "Bilan moderne (actif = passif + capitaux propres)" })
  @ApiOkResponse({ description: "Balance sheet" })
  @Permissions("readAll-transaction")
  @Get("balance-sheet")
  balanceSheet(@CurrentOrg() orgId: number) {
    return this.ledger.balanceSheet(orgId);
  }

  @ApiOperation({ summary: "Liste des modules exigeant une approbation avant comptabilisation" })
  @ApiOkResponse({ description: "Exigences d'approbation" })
  @Permissions("readAll-transaction")
  @Get("approval-requirements")
  listApprovalRequirements(@CurrentOrg() orgId: number) {
    return this.ledger.listApprovalRequirements(orgId);
  }

  @ApiOperation({ summary: "Active/configure l'exigence d'approbation d'un module" })
  @ApiCreatedResponse({ description: "Exigence configuree" })
  @Permissions("update-transaction")
  @Post("approval-requirements")
  setApprovalRequirement(@Body() body: ApprovalRequirementDto, @CurrentOrg() orgId: number) {
    return this.ledger.setApprovalRequirement(body, orgId);
  }

  @ApiOperation({ summary: "Liste des periodes comptables" })
  @ApiOkResponse({ description: "Periodes" })
  @Permissions("readAll-transaction")
  @Get("periods")
  listPeriods(@CurrentOrg() orgId: number) {
    return this.ledger.listPeriods(orgId);
  }

  @ApiOperation({ summary: "Cree une periode comptable" })
  @ApiCreatedResponse({ description: "Periode creee" })
  @Permissions("create-transaction")
  @Post("periods")
  createPeriod(@Body() body: CreatePeriodDto, @CurrentOrg() orgId: number) {
    return this.ledger.createPeriod(body, orgId);
  }

  @ApiOperation({ summary: "Cloture une periode comptable" })
  @ApiCreatedResponse({ description: "Periode cloturee" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("periods/:id/close")
  closePeriod(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.ledger.closePeriod(id, orgId);
  }

  @ApiOperation({ summary: "Rouvre une periode comptable" })
  @ApiCreatedResponse({ description: "Periode rouverte" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("update-transaction")
  @Post("periods/:id/reopen")
  reopenPeriod(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.ledger.reopenPeriod(id, orgId);
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
