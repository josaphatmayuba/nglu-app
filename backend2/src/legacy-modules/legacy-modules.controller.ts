import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LegacyDto } from "./dto/legacy.dto";
import { LegacyModulesService } from "./legacy-modules.service";

const PUBLIC_LEGACY_RESOURCES = new Set(["slider-images"]);

function PublicListGuard(path: string): MethodDecorator {
  return PUBLIC_LEGACY_RESOURCES.has(path) ? () => undefined : UseGuards(JwtAuthGuard);
}

function controllerFor(path: string, tag = path) {
  @ApiTags(tag)
  @ApiBearerAuth()
  @Controller(path)
  class GenericLegacyController {
    constructor(public readonly service: LegacyModulesService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    list(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
      return this.service.list(path, query, orgId);
    }

    @Get("public")
    @PublicListGuard(path)
    publicList(@Query() query: Record<string, string>) {
      // Route publique reservee aux referentiels non org-scoped (slider-images).
      return this.service.list(path, { ...query, query: query.query ?? "all" }, 0);
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    findOne(@Param("id") id: string, @CurrentOrg() orgId: number) {
      return this.service.findOne(path, id, orgId);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: LegacyDto, @CurrentOrg() orgId: number) {
      return this.service.create(path, body, orgId);
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard)
    update(@Param("id") id: string, @Body() body: LegacyDto, @CurrentOrg() orgId: number) {
      return this.service.update(path, id, body, orgId);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    patch(@Param("id") id: string, @Body() body: LegacyDto, @CurrentOrg() orgId: number) {
      return this.service.patch(path, id, body, orgId);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    delete(@Param("id") id: string, @CurrentOrg() orgId: number) {
      return this.service.delete(path, id, orgId);
    }
  }

  return GenericLegacyController;
}

export const AnnouncementController = controllerFor("announcement");
export const EmailConfigController = controllerFor("email-config");
export const EmailController = controllerFor("email");
export const PaymentSaleInvoiceController = controllerFor("payment-sale-invoice");
export const PaymentPurchaseInvoiceController = controllerFor("payment-purchase-invoice");
export const AdjustInventoryController = controllerFor("adjust-inventory");
export const QuoteController = controllerFor("quote");
export const PurchaseReorderInvoiceController = controllerFor("purchase-reorder-invoice");
export const ReorderQuantityController = controllerFor("reorder-quantity");
export const ReturnPurchaseInvoiceController = controllerFor("return-purchase-invoice");
export const ReturnSaleInvoiceController = controllerFor("return-sale-invoice");
export const ProductProductAttributeValueController = controllerFor("product-product-attribute-value");
export const DimensionUnitController = controllerFor("dimension-unit");
export const WeightUnitController = controllerFor("weight-unit");
export const FilesController = controllerFor("files");
export const SliderImagesController = controllerFor("slider-images");
export const ProductImageController = controllerFor("product-image");
export const CustomerProfileImageController = controllerFor("customer-profile-image");
export const ProductReportsController = controllerFor("product-reports");

@ApiTags("manual-payment")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("manual-payment")
export class ManualPaymentController {
  constructor(public readonly service: LegacyModulesService) {}

  @Get()
  list(@Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.service.list("manual-payment", query, orgId);
  }

  @Get("payment-method/:id")
  byPaymentMethod(@Param("id") id: string, @Query() query: Record<string, string>, @CurrentOrg() orgId: number) {
    return this.service.list("manual-payment", { ...query, paymentMethodId: id }, orgId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentOrg() orgId: number) {
    return this.service.findOne("manual-payment", id, orgId);
  }

  @Post()
  create(@Body() body: LegacyDto, @CurrentOrg() orgId: number) {
    return this.service.create("manual-payment", body, orgId);
  }

  @Patch()
  patchRoot(@Body() body: LegacyDto, @CurrentOrg() orgId: number) {
    return this.service.patch("manual-payment", null, body, orgId);
  }

  @Patch(":id")
  patch(@Param("id") id: string, @Body() body: LegacyDto, @CurrentOrg() orgId: number) {
    return this.service.patch("manual-payment", id, body, orgId);
  }

  @Put("verify/:id")
  verify(@Param("id") id: string, @Body() body: LegacyDto, @CurrentOrg() orgId: number) {
    return this.service.verifyManualPayment(id, body, orgId);
  }
}
