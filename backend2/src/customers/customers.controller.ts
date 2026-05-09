import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from "./dto/customer.dto";
import { CustomersService } from "./customers.service";

@ApiTags("customer")
@Controller("customer")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({ summary: "Create a customer or tenant" })
  @ApiCreatedResponse({ description: "Created customer" })
  @Post()
  create(@Body() body: CreateCustomerDto) {
    return this.customersService.create(body);
  }

  @ApiOperation({ summary: "List, search, info, or report customers" })
  @ApiOkResponse({ description: "Customer result" })
  @Get()
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @ApiOperation({ summary: "Get one customer" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @ApiOperation({ summary: "Update one customer" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCustomerDto) {
    return this.customersService.update(id, body);
  }

  @ApiOperation({ summary: "Update customer status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCustomerStatusDto) {
    return this.customersService.updateStatus(id, body.status);
  }
}
