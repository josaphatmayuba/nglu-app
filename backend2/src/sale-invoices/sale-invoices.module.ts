import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { SaleInvoicesController } from "./sale-invoices.controller";
import { SaleInvoicesService } from "./sale-invoices.service";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [SaleInvoicesController],
  providers: [SaleInvoicesService],
})
export class SaleInvoicesModule {}
