import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from "./dto/customer.dto";
import { CustomersService } from "./customers.service";

@ApiTags("customer")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: "Create a customer or tenant" })
  @ApiCreatedResponse({ description: "Created customer" })
  @Post()
  create(@Body() body: CreateCustomerDto, @CurrentOrg() orgId: number) {
    return this.customersService.create(body, orgId);
  }

  @ApiOperation({ summary: "List, search, info, or report customers" })
  @ApiOkResponse({ description: "Customer result" })
  @Get()
  findAll(@Query() query: CustomerQueryDto, @CurrentOrg() orgId: number) {
    return this.customersService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Get one customer" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.customersService.findOne(id, orgId);
  }

  @ApiOperation({ summary: "Update one customer" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCustomerDto, @CurrentOrg() orgId: number) {
    return this.customersService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Update customer status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCustomerStatusDto, @CurrentOrg() orgId: number) {
    return this.customersService.updateStatus(id, body.status, orgId);
  }
}
