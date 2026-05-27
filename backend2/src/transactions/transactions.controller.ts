import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
  UpdateTransactionStatusDto,
} from "./dto/transaction.dto";
import { TransactionsService } from "./transactions.service";

@ApiTags("transaction")
@Controller("transaction")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: "Create an accounting transaction" })
  @ApiCreatedResponse({ description: "Created transaction" })
  @Permissions("create-transaction")
  @Post()
  create(@Body() body: CreateTransactionDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.create(body, orgId);
  }

  @ApiOperation({ summary: "List, search, or aggregate transactions" })
  @ApiOkResponse({ description: "Transaction result" })
  @Permissions("readAll-transaction")
  @Get()
  findAll(@Query() query: TransactionQueryDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Get one transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("readSingle-transaction", "readAll-transaction")
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.transactionsService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Update a transaction" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("update-transaction")
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTransactionDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Update transaction status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Permissions("delete-transaction")
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateTransactionStatusDto, @CurrentOrg() orgId: number) {
    return this.transactionsService.updateStatus(id, body.status, orgId);
  }
}
