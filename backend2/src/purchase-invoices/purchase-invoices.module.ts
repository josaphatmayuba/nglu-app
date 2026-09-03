import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { PurchaseInvoicesController } from "./purchase-invoices.controller";
import { PurchaseInvoicesService } from "./purchase-invoices.service";

@Module({
  imports: [DatabaseModule, LedgerModule, WorkflowModule],
  controllers: [PurchaseInvoicesController],
  providers: [PurchaseInvoicesService],
})
export class PurchaseInvoicesModule {}
