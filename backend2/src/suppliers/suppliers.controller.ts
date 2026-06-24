import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  CreateSupplierDto,
  SupplierQueryDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
} from "./dto/supplier.dto";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { SuppliersService } from "./suppliers.service";

@ApiTags("supplier")
@Controller("supplier")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @ApiOperation({ summary: "Create a supplier" })
  @ApiCreatedResponse({ description: "Created supplier" })
  @Post()
  create(@Body() body: CreateSupplierDto, @CurrentOrg() orgId: number) {
    return this.suppliersService.create(body, orgId);
  }

  @ApiOperation({ summary: "List, search, info, or report suppliers" })
  @ApiOkResponse({ description: "Supplier result" })
  @Get()
  findAll(@Query() query: SupplierQueryDto, @CurrentOrg() orgId: number) {
    return this.suppliersService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Get one supplier" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.suppliersService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Update one supplier" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSupplierDto, @CurrentOrg() orgId: number) {
    return this.suppliersService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Update supplier status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateSupplierStatusDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.suppliersService.updateStatus(id, body.status, orgId);
  }
}
