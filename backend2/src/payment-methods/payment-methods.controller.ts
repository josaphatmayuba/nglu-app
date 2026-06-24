import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  CreatePaymentMethodDto,
  PaymentMethodQueryDto,
  UpdatePaymentMethodDto,
  UpdatePaymentMethodStatusDto,
} from "./dto/payment-method.dto";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { PaymentMethodsService } from "./payment-methods.service";

@ApiTags("payment-method")
@Controller("payment-method")
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @ApiOperation({ summary: "Create a payment method" })
  @ApiCreatedResponse({ description: "Created payment method" })
  @Post()
  create(@Body() body: CreatePaymentMethodDto, @CurrentOrg() orgId: number) {
    return this.paymentMethodsService.create(body, orgId);
  }

  @ApiOperation({ summary: "List or search payment methods" })
  @ApiOkResponse({ description: "Payment method result" })
  @Get()
  findAll(@Query() query: PaymentMethodQueryDto, @CurrentOrg() orgId: number) {
    return this.paymentMethodsService.findAll(query, orgId);
  }

  @ApiOperation({ summary: "Update a payment method" })
  @ApiParam({ name: "id", example: 2, type: Number })
  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdatePaymentMethodDto, @CurrentOrg() orgId: number) {
    return this.paymentMethodsService.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Update payment method status, compatible with Laravel delete route" })
  @ApiParam({ name: "id", example: 2, type: Number })
  @Patch(":id")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePaymentMethodStatusDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.paymentMethodsService.updateStatus(id, body.status, orgId);
  }
}
