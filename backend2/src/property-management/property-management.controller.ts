import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { MessageResponseDto } from "../shared/dto/message-response.dto";
import {
  CreateLeaseDto,
  CreateMaintenanceDto,
  CreatePropertyDto,
  CreateRentPaymentDto,
  CreateUnitDto,
  UpdateLeaseDto,
  UpdateMaintenanceDto,
  UpdatePropertyDto,
  UpdateUnitDto,
} from "./dto/property-management.dto";
import { PropertyManagementService } from "./property-management.service";

@ApiTags("property-management")
@Controller("property-management")
export class PropertyManagementController {
  constructor(private readonly propertyManagementService: PropertyManagementService) {}

  @ApiOperation({ summary: "Property management dashboard totals" })
  @ApiOkResponse({ description: "Dashboard metrics" })
  @Get("dashboard")
  dashboard() {
    return this.propertyManagementService.dashboard();
  }

  @ApiOperation({ summary: "List active tenants from customers" })
  @ApiOkResponse({ description: "Tenant list" })
  @Get("tenants")
  tenants() {
    return this.propertyManagementService.tenants();
  }

  @ApiOperation({ summary: "List properties with unit counts" })
  @ApiOkResponse({ description: "Property list" })
  @Get("properties")
  properties() {
    return this.propertyManagementService.properties();
  }

  @ApiOperation({ summary: "Create a property" })
  @ApiCreatedResponse({ description: "Created property" })
  @Post("properties")
  createProperty(@Body() body: CreatePropertyDto) {
    return this.propertyManagementService.createProperty(body);
  }

  @ApiOperation({ summary: "Update a property" })
  @ApiParam({ name: "id", example: 1, type: Number })
  @Patch("properties/:id")
  @Put("properties/:id")
  updateProperty(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePropertyDto) {
    return this.propertyManagementService.updateProperty(id, body);
  }

  @ApiOperation({ summary: "Delete a property" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("properties/:id")
  @HttpCode(200)
  deleteProperty(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteProperty(id);
  }

  @ApiOperation({ summary: "List rental units" })
  @Get("units")
  units() {
    return this.propertyManagementService.units();
  }

  @ApiOperation({ summary: "Create a rental unit" })
  @Post("units")
  createUnit(@Body() body: CreateUnitDto) {
    return this.propertyManagementService.createUnit(body);
  }

  @ApiOperation({ summary: "Update a rental unit" })
  @Patch("units/:id")
  @Put("units/:id")
  updateUnit(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateUnitDto) {
    return this.propertyManagementService.updateUnit(id, body);
  }

  @ApiOperation({ summary: "Delete a rental unit" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("units/:id")
  @HttpCode(200)
  deleteUnit(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteUnit(id);
  }

  @ApiOperation({ summary: "List leases" })
  @Get("leases")
  leases() {
    return this.propertyManagementService.leases();
  }

  @ApiOperation({ summary: "Create a lease" })
  @Post("leases")
  createLease(@Body() body: CreateLeaseDto) {
    return this.propertyManagementService.createLease(body);
  }

  @ApiOperation({ summary: "Update a lease" })
  @Patch("leases/:id")
  @Put("leases/:id")
  updateLease(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateLeaseDto) {
    return this.propertyManagementService.updateLease(id, body);
  }

  @ApiOperation({ summary: "Delete a lease" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("leases/:id")
  @HttpCode(200)
  deleteLease(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteLease(id);
  }

  @ApiOperation({ summary: "List rent payments" })
  @Get("payments")
  payments() {
    return this.propertyManagementService.payments();
  }

  @ApiOperation({ summary: "Create rent payment and linked accounting transaction" })
  @Post("payments")
  createPayment(@Body() body: CreateRentPaymentDto) {
    return this.propertyManagementService.createPayment(body);
  }

  @ApiOperation({ summary: "List maintenance requests" })
  @Get("maintenance")
  maintenance() {
    return this.propertyManagementService.maintenance();
  }

  @ApiOperation({ summary: "Create a maintenance request" })
  @Post("maintenance")
  createMaintenance(@Body() body: CreateMaintenanceDto) {
    return this.propertyManagementService.createMaintenance(body);
  }

  @ApiOperation({ summary: "Update a maintenance request" })
  @Patch("maintenance/:id")
  @Put("maintenance/:id")
  updateMaintenance(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateMaintenanceDto) {
    return this.propertyManagementService.updateMaintenance(id, body);
  }

  @ApiOperation({ summary: "Delete a maintenance request" })
  @ApiOkResponse({ type: MessageResponseDto })
  @Delete("maintenance/:id")
  @HttpCode(200)
  deleteMaintenance(@Param("id", ParseIntPipe) id: number) {
    return this.propertyManagementService.deleteMaintenance(id);
  }
}
