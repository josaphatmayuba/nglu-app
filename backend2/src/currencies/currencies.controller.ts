import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import {
  BulkUpdateCurrencyStatusDto,
  CreateCurrencyDto,
  CurrencyQueryDto,
  UpdateCurrencyDto,
  UpdateCurrencyStatusDto,
} from "./dto/currency.dto";
import { CurrenciesService } from "./currencies.service";

@ApiTags("currency")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("currency")
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @ApiOperation({ summary: "Create a currency" })
  @ApiCreatedResponse({ description: "Created currency" })
  @Post()
  @Permissions("create-currency")
  create(@Body() body: CreateCurrencyDto) {
    return this.currenciesService.create(body);
  }

  @ApiOperation({ summary: "List or search currencies" })
  @ApiOkResponse({ description: "Currency result" })
  @Get()
  findAll(@Query() query: CurrencyQueryDto) {
    return this.currenciesService.findAll(query);
  }

  @ApiOperation({ summary: "Get one currency" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.currenciesService.findOne(id);
  }

  @ApiOperation({ summary: "Update one currency" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  @Permissions("update-currency")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCurrencyDto) {
    return this.currenciesService.update(id, body);
  }

  @ApiOperation({ summary: "Bulk activate/deactivate currencies" })
  @Patch("bulk-status")
  @Permissions("delete-currency")
  bulkStatus(@Body() body: BulkUpdateCurrencyStatusDto) {
    return this.currenciesService.bulkUpdateStatus(body.ids, body.status);
  }

  @ApiOperation({ summary: "Update currency status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  @Permissions("delete-currency")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCurrencyStatusDto) {
    return this.currenciesService.updateStatus(id, body.status);
  }
}
