import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { CustomersModule } from "./customers/customers.module";
import { CurrenciesModule } from "./currencies/currencies.module";
import { DatabaseModule } from "./database/database.module";
import { DiscountsModule } from "./discounts/discounts.module";
import { HealthModule } from "./health/health.module";
import { PaymentMethodsModule } from "./payment-methods/payment-methods.module";
import { PropertyManagementModule } from "./property-management/property-management.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { TransactionTypesModule } from "./transaction-types/transaction-types.module";

@Module({
  imports: [
    DatabaseModule,
    AccountsModule,
    CustomersModule,
    CurrenciesModule,
    HealthModule,
    DiscountsModule,
    PaymentMethodsModule,
    PropertyManagementModule,
    SuppliersModule,
    TransactionsModule,
    TransactionTypesModule,
  ],
})
export class AppModule {}
