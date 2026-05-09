import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
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
  create(@Body() body: CreatePurchaseInvoiceDto) {
    return this.purchaseInvoicesService.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List purchase invoices (query=info for aggregates)" })
  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.purchaseInvoicesService.findAll(query);
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
  findOne(@Param("id") id: string) {
    return this.purchaseInvoicesService.findOne(id);
  }
}
