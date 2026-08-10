import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";
import { CashSessionsController } from "./cash-sessions.controller";
import { CashSessionsService } from "./cash-sessions.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PaymentMethodsController } from "./payment-methods.controller";
import { PaymentMethodsService } from "./payment-methods.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    CatalogController,
    OrdersController,
    CashSessionsController,
    PaymentMethodsController,
    BranchesController,
  ],
  providers: [CatalogService, OrdersService, CashSessionsService, PaymentMethodsService, BranchesService],
  exports: [CatalogService, OrdersService, CashSessionsService, PaymentMethodsService, BranchesService],
})
export class KodatillModule {}
