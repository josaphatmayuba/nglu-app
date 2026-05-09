import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  CreatePaymentMethodDto,
  PaymentMethodQueryDto,
  UpdatePaymentMethodDto,
  UpdatePaymentMethodStatusDto,
} from "./dto/payment-method.dto";
import { PaymentMethodsService } from "./payment-methods.service";

@ApiTags("payment-method")
@Controller("payment-method")
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @ApiOperation({ summary: "Create a payment method" })
  @ApiCreatedResponse({ description: "Created payment method" })
  @Post()
  create(@Body() body: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(body);
  }

  @ApiOperation({ summary: "List or search payment methods" })
  @ApiOkResponse({ description: "Payment method result" })
  @Get()
  findAll(@Query() query: PaymentMethodQueryDto) {
    return this.paymentMethodsService.findAll(query);
  }

  @ApiOperation({ summary: "Update a payment method" })
  @ApiParam({ name: "id", example: 2, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePaymentMethodDto) {
    return this.paymentMethodsService.update(id, body);
  }

  @ApiOperation({ summary: "Update payment method status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 2, type: Number })
  @Patch(":id")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePaymentMethodStatusDto) {
    return this.paymentMethodsService.updateStatus(id, body.status);
  }
}
