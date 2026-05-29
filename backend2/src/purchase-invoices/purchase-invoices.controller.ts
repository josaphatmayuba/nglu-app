import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import {
  CreatePaymentPurchaseInvoiceDto,
  CreatePurchaseInvoiceDto,
} from "./dto/purchase-invoice.dto";
import { PurchaseInvoicesService } from "./purchase-invoices.service";

@ApiTags("purchase-invoice")
@Controller("purchase-invoice")
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create purchase invoice" })
  @Post()
  create(@Body() body: CreatePurchaseInvoiceDto, @CurrentOrg() orgId: number) {
    return this.purchaseInvoicesService.create(body, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List purchase invoices (query=info for aggregates)" })
  @Get()
  findAll(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.purchaseInvoicesService.findAll(query, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create payment for purchase invoice" })
  @Post("payment-purchase-invoice")
  createPayment(@Body() body: CreatePaymentPurchaseInvoiceDto) {
    return this.purchaseInvoicesService.createPayment(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get all purchase invoice payments" })
  @Get("payment-purchase-invoice")
  findAllPayments(@Query() query: Record<string, string>) {
    return this.purchaseInvoicesService.findAllPayments(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get one purchase invoice" })
  @Get(":id")
  findOne(@Param("id") id: string, @CurrentOrg() orgId: number) {
    return this.purchaseInvoicesService.findOne(id, orgId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Soft delete purchase invoice" })
  @Patch(":id")
  updateStatus(@Param("id") id: string, @Body() body: { status?: string }, @CurrentOrg() orgId: number) {
    return this.purchaseInvoicesService.updateStatus(id, body.status ?? "false", orgId);
  }
}
