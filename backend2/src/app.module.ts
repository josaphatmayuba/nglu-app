import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { AppSettingsModule } from "./app-settings/app-settings.module";
import { AuthModule } from "./auth/auth.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { CustomersModule } from "./customers/customers.module";
import { DatabaseModule } from "./database/database.module";
import { DiscountsModule } from "./discounts/discounts.module";
import { FrontModulesModule } from "./front-modules/front-modules.module";
import { HealthModule } from "./health/health.module";
import { HrModule } from "./hr/hr.module";
import { ManufacturersModule } from "./manufacturers/manufacturers.module";
import { PaymentMethodsModule } from "./payment-methods/payment-methods.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { ProductBrandsModule } from "./product-brands/product-brands.module";
import { ProductCategoriesModule } from "./product-categories/product-categories.module";
import { ProductSubCategoriesModule } from "./product-sub-categories/product-sub-categories.module";
import { ProductVatsModule } from "./product-vats/product-vats.module";
import { ProductsModule } from "./products/products.module";
import { PropertyManagementModule } from "./property-management/property-management.module";
import { PurchaseInvoicesModule } from "./purchase-invoices/purchase-invoices.module";
import { RolePermissionsModule } from "./role-permissions/role-permissions.module";
import { RolesModule } from "./roles/roles.module";
import { SaleInvoicesModule } from "./sale-invoices/sale-invoices.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { TransactionTypesModule } from "./transaction-types/transaction-types.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { UomModule } from "./uom/uom.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AccountsModule,
    AppSettingsModule,
    DashboardModule,
    CurrenciesModule,
    CustomersModule,
    DiscountsModule,
    FrontModulesModule,
    HealthModule,
    HrModule,
    ManufacturersModule,
    PaymentMethodsModule,
    PermissionsModule,
    ProductBrandsModule,
    ProductCategoriesModule,
    ProductSubCategoriesModule,
    ProductVatsModule,
    ProductsModule,
    PropertyManagementModule,
    PurchaseInvoicesModule,
    RolePermissionsModule,
    RolesModule,
    SaleInvoicesModule,
    SuppliersModule,
    TransactionsModule,
    TransactionTypesModule,
    UomModule,
    UsersModule,
  ],
})
export class AppModule {}
