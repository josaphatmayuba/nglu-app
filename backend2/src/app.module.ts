import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { AccountsModule } from "./accounts/accounts.module";
import { AppSettingsModule } from "./app-settings/app-settings.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CompatModule } from "./compat/compat.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { CustomersModule } from "./customers/customers.module";
import { DatabaseModule } from "./database/database.module";
import { DiscountsModule } from "./discounts/discounts.module";
import { FrontModulesModule } from "./front-modules/front-modules.module";
import { HealthModule } from "./health/health.module";
import { HrModule } from "./hr/hr.module";
import { EmailTemplatesModule } from "./email-templates/email-templates.module";
import { InvoiceTemplatesModule } from "./invoice-templates/invoice-templates.module";
import { LegacyModulesModule } from "./legacy-modules/legacy-modules.module";
import { MailAccountsModule } from "./mail-accounts/mail-accounts.module";
import { ManufacturersModule } from "./manufacturers/manufacturers.module";
import { MessagesModule } from "./messages/messages.module";
import { NotificationPreferencesModule } from "./notification-preferences/notification-preferences.module";
import { PaymentMethodsModule } from "./payment-methods/payment-methods.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { ProductBrandsModule } from "./product-brands/product-brands.module";
import { ProductCategoriesModule } from "./product-categories/product-categories.module";
import { ProductSubCategoriesModule } from "./product-sub-categories/product-sub-categories.module";
import { ProductVatsModule } from "./product-vats/product-vats.module";
import { ProductsModule } from "./products/products.module";
import { PropertyManagementModule } from "./property-management/property-management.module";
import { PurchaseInvoicesModule } from "./purchase-invoices/purchase-invoices.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { RolePermissionsModule } from "./role-permissions/role-permissions.module";
import { RolesModule } from "./roles/roles.module";
import { SaleInvoicesModule } from "./sale-invoices/sale-invoices.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { SystemEmailModule } from "./system-email/system-email.module";
import { TransactionTypesModule } from "./transaction-types/transaction-types.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { UomModule } from "./uom/uom.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuditModule,
    AuthModule,
    AccountsModule,
    AppSettingsModule,
    DashboardModule,
    CompatModule,
    CurrenciesModule,
    CustomersModule,
    DiscountsModule,
    FrontModulesModule,
    HealthModule,
    HrModule,
    EmailTemplatesModule,
    InvoiceTemplatesModule,
    LegacyModulesModule,
    MailAccountsModule,
    ManufacturersModule,
    MessagesModule,
    NotificationPreferencesModule,
    PaymentMethodsModule,
    PermissionsModule,
    ProductBrandsModule,
    ProductCategoriesModule,
    ProductSubCategoriesModule,
    ProductVatsModule,
    ProductsModule,
    PropertyManagementModule,
    PurchaseInvoicesModule,
    RealtimeModule,
    RolePermissionsModule,
    RolesModule,
    SaleInvoicesModule,
    SuppliersModule,
    SystemEmailModule,
    TransactionsModule,
    TransactionTypesModule,
    UomModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
