import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";
import { BusinessProfileController } from "./business-profile.controller";
import { BusinessProfileService } from "./business-profile.service";
import { CashSessionsController } from "./cash-sessions.controller";
import { CashSessionsService } from "./cash-sessions.service";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { IngredientsController } from "./ingredients.controller";
import { IngredientsService } from "./ingredients.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PaymentMethodsController } from "./payment-methods.controller";
import { PaymentMethodsService } from "./payment-methods.service";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";
import { VariantsController } from "./variants.controller";
import { VariantsService } from "./variants.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    CatalogController,
    OrdersController,
    CashSessionsController,
    PaymentMethodsController,
    BranchesController,
    StockController,
    IngredientsController,
    RecipesController,
    ExpensesController,
    BusinessProfileController,
    VariantsController,
  ],
  providers: [
    CatalogService,
    OrdersService,
    CashSessionsService,
    PaymentMethodsService,
    BranchesService,
    StockService,
    IngredientsService,
    RecipesService,
    ExpensesService,
    BusinessProfileService,
    VariantsService,
  ],
  exports: [
    CatalogService,
    OrdersService,
    CashSessionsService,
    PaymentMethodsService,
    BranchesService,
    StockService,
    IngredientsService,
    RecipesService,
    ExpensesService,
    BusinessProfileService,
    VariantsService,
  ],
})
export class KodatillModule {}
