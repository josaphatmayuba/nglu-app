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
    list(@Query() query: Record<string, string>) {
      return this.service.list(path, query);
    }

    @Get("public")
    @PublicListGuard(path)
    publicList(@Query() query: Record<string, string>) {
      return this.service.list(path, { ...query, query: query.query ?? "all" });
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    findOne(@Param("id") id: string) {
      return this.service.findOne(path, id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() body: LegacyDto) {
      return this.service.create(path, body);
    }

    @Put(":id")
    @UseGuards(JwtAuthGuard)
    update(@Param("id") id: string, @Body() body: LegacyDto) {
      return this.service.update(path, id, body);
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    patch(@Param("id") id: string, @Body() body: LegacyDto) {
      return this.service.patch(path, id, body);
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    delete(@Param("id") id: string) {
      return this.service.delete(path, id);
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
  list(@Query() query: Record<string, string>) {
    return this.service.list("manual-payment", query);
  }

  @Get("payment-method/:id")
  byPaymentMethod(@Param("id") id: string, @Query() query: Record<string, string>) {
    return this.service.list("manual-payment", { ...query, paymentMethodId: id });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne("manual-payment", id);
  }

  @Post()
  create(@Body() body: LegacyDto) {
    return this.service.create("manual-payment", body);
  }

  @Patch()
  patchRoot(@Body() body: LegacyDto) {
    return this.service.patch("manual-payment", null, body);
  }

  @Patch(":id")
  patch(@Param("id") id: string, @Body() body: LegacyDto) {
    return this.service.patch("manual-payment", id, body);
  }

  @Put("verify/:id")
  verify(@Param("id") id: string, @Body() body: LegacyDto) {
    return this.service.verifyManualPayment(id, body);
  }
}
