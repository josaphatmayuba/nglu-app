import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  AccountQueryDto,
  CreateSubAccountDto,
  UpdateSubAccountDto,
  UpdateSubAccountStatusDto,
} from "./dto/account.dto";
import { AccountsService } from "./accounts.service";

@ApiTags("account")
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @ApiOperation({ summary: "Create a sub account, compatible with Laravel /account" })
  @ApiCreatedResponse({ description: "Created sub account" })
  @Post("account")
  createSubAccount(@Body() body: CreateSubAccountDto, @CurrentOrg() org: number) {
    return this.accountsService.createSubAccount(body, org);
  }

  @ApiOperation({ summary: "Account reports, accounts, or sub account list" })
  @ApiOkResponse({ description: "Account result" })
  @Get("account")
  findAll(@Query() query: AccountQueryDto, @CurrentOrg() org: number) {
    return this.accountsService.findAll(query, org);
  }

  @ApiOperation({ summary: "Sub account picker alias" })
  @Get("sub-accounts")
  subAccounts(@CurrentOrg() org: number) {
    return this.accountsService.subAccountsForPicker(org);
  }

  @ApiOperation({ summary: "Get one sub account with balance" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get("account/:id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() org: number) {
    return this.accountsService.findOneSubAccount(id, org);
  }

  @ApiOperation({ summary: "Update a sub account" })
  @ApiParam({ name: "id", example: 16, type: Number })
  @Put("account/:id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSubAccountDto, @CurrentOrg() org: number) {
    return this.accountsService.updateSubAccount(id, body, org);
  }

  @ApiOperation({ summary: "Update sub account status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 16, type: Number })
  @Patch("account/:id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSubAccountStatusDto, @CurrentOrg() org: number) {
    return this.accountsService.updateSubAccountStatus(id, body.status, org);
  }
}
