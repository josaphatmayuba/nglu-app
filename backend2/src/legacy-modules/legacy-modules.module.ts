import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import {
  AdjustInventoryController,
  AnnouncementController,
  CustomerProfileImageController,
  DimensionUnitController,
  EmailConfigController,
  EmailController,
  FilesController,
  ManualPaymentController,
  PaymentPurchaseInvoiceController,
  PaymentSaleInvoiceController,
  ProductImageController,
  ProductProductAttributeValueController,
  ProductReportsController,
  PurchaseReorderInvoiceController,
  QuoteController,
  ReorderQuantityController,
  ReturnPurchaseInvoiceController,
  ReturnSaleInvoiceController,
  SliderImagesController,
  WeightUnitController,
} from "./legacy-modules.controller";
import { LegacyModulesService } from "./legacy-modules.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AnnouncementController,
    EmailConfigController,
    EmailController,
    ManualPaymentController,
    PaymentSaleInvoiceController,
    PaymentPurchaseInvoiceController,
    AdjustInventoryController,
    QuoteController,
    PurchaseReorderInvoiceController,
    ReorderQuantityController,
    ReturnPurchaseInvoiceController,
    ReturnSaleInvoiceController,
    ProductProductAttributeValueController,
    DimensionUnitController,
    WeightUnitController,
    FilesController,
    SliderImagesController,
    ProductImageController,
    CustomerProfileImageController,
    ProductReportsController,
  ],
  providers: [LegacyModulesService],
})
export class LegacyModulesModule {}
