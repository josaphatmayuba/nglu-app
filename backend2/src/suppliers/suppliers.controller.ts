import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  CreateSupplierDto,
  SupplierQueryDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from "./dto/supplier.dto";
import { SuppliersService } from "./suppliers.service";

@ApiTags("supplier")
@Controller("supplier")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({ summary: "Create a supplier" })
  @ApiCreatedResponse({ description: "Created supplier" })
  @Post()
  create(@Body() body: CreateSupplierDto) {
    return this.suppliersService.create(body);
  }

  @ApiOperation({ summary: "List, search, info, or report suppliers" })
  @ApiOkResponse({ description: "Supplier result" })
  @Get()
  findAll(@Query() query: SupplierQueryDto) {
    return this.suppliersService.findAll(query);
  }

  @ApiOperation({ summary: "Get one supplier" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @ApiOperation({ summary: "Update one supplier" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSupplierDto) {
    return this.suppliersService.update(id, body);
  }

  @ApiOperation({ summary: "Update supplier status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSupplierStatusDto) {
    return this.suppliersService.updateStatus(id, body.status);
  }
}
