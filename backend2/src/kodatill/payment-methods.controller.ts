import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from "./dto/payment-methods.dto";
import { PaymentMethodsService } from "./payment-methods.service";

@ApiTags("kodatill-payment-methods")
@ApiBearerAuth()
@Controller("kodatill/payment-methods")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  @ApiOperation({ summary: "Liste les methodes de paiement actives de l'organisation" })
  @ApiOkResponse({ description: "Methodes de paiement" })
  @Permissions("kodatill_view")
  @Get()
  list(@CurrentOrg() orgId: number) {
    return this.paymentMethods.list(orgId);
  }

  @ApiOperation({ summary: "Cree une methode de paiement" })
  @ApiCreatedResponse({ description: "Methode de paiement creee" })
  @Permissions("kodatill_settings_manage")
  @Post()
  create(@Body() body: CreatePaymentMethodDto, @CurrentOrg() orgId: number) {
    return this.paymentMethods.create(body, orgId);
  }

  @ApiOperation({ summary: "Modifie une methode de paiement" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdatePaymentMethodDto,
    @CurrentOrg() orgId: number,
  ) {
    return this.paymentMethods.update(id, body, orgId);
  }

  @ApiOperation({ summary: "Desactive une methode de paiement (soft delete)" })
  @ApiParam({ name: "id", type: Number })
  @Permissions("kodatill_settings_manage")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.paymentMethods.remove(id, orgId);
  }
}
