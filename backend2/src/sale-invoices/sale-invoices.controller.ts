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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  CreatePaymentSaleInvoiceDto,
  CreateSaleInvoiceDto,
  UpdateHoldDto,
  UpdateOrderStatusDto,
  UpdateSaleInvoiceDto,
} from "./dto/sale-invoice.dto";
import { SaleInvoicesService } from "./sale-invoices.service";

@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("sale-invoice")
@Controller("sale-invoice")
export class SaleInvoicesController {
  constructor(private readonly saleInvoicesService: SaleInvoicesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create sale invoice" })
  @Post()
  create(@Body() body: CreateSaleInvoiceDto, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.create(body, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List sale invoices (query=info for aggregates)" })
  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.findAll(query, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get hold invoices" })
  @Get("hold")
  findHold() {
    return this.saleInvoicesService.findHold();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get invoices by customerId query param" })
  @Get("customer")
  findByCustomerQuery(@Query("customerId", ParseIntPipe) customerId: number) {
    return this.saleInvoicesService.findByCustomer(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get invoices for a specific customer" })
  @Get("customer/:id")
  findByCustomer(@Param("id", ParseIntPipe) customerId: number) {
    return this.saleInvoicesService.findByCustomer(customerId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create payment for sale invoice" })
  @Post("payment-sale-invoice")
  createPayment(@Body() body: CreatePaymentSaleInvoiceDto, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.createPayment(body, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get all sale invoice payments" })
  @Get("payment-sale-invoice")
  findAllPayments(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.findAllPayments(query, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one sale invoice" })
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.findOne(id, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update sale invoice" })
  @Put(":id")
  update(@Param("id") id: string, @Body() body: UpdateSaleInvoiceDto) {
    return this.saleInvoicesService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update hold status" })
  @Put("hold/:id")
  updateHold(@Param("id") id: string, @Body() body: UpdateHoldDto) {
    return this.saleInvoicesService.updateHold(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update order status" })
  @Patch("order")
  updateOrderStatus(@Body() body: UpdateOrderStatusDto) {
    return this.saleInvoicesService.updateOrderStatus(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete sale invoice" })
  @Patch(":id")
  updateStatus(@Param("id") id: string, @Body() body: { status?: string }, @CurrentOrg() orgId: number) {
    return this.saleInvoicesService.updateStatus(id, body.status ?? "false", orgId);
  }
}
