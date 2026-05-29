import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  BulkUpdateCurrencyStatusDto,
  CreateCurrencyDto,
  CurrencyQueryDto,
  UpdateCurrencyDto,
  UpdateCurrencyStatusDto,
} from "./dto/currency.dto";
import { CurrenciesService } from "./currencies.service";

@ApiTags("currency")
@Controller("currency")
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @ApiOperation({ summary: "Create a currency" })
  @ApiCreatedResponse({ description: "Created currency" })
  @Post()
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
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCurrencyDto) {
    return this.currenciesService.update(id, body);
  }

  @ApiOperation({ summary: "Bulk activate/deactivate currencies" })
  @Patch("bulk-status")
  bulkStatus(@Body() body: BulkUpdateCurrencyStatusDto) {
    return this.currenciesService.bulkUpdateStatus(body.ids, body.status);
  }

  @ApiOperation({ summary: "Update currency status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCurrencyStatusDto) {
    return this.currenciesService.updateStatus(id, body.status);
  }
}
