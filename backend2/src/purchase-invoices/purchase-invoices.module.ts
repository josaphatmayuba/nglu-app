import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";
import { PurchaseInvoicesService } from "./purchase-invoices.service";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
