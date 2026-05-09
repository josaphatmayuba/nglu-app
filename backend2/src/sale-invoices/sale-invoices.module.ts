import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { SaleInvoicesController } from "./sale-invoices.controller";
import { SaleInvoicesService } from "./sale-invoices.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SaleInvoicesController],
  providers: [SaleInvoicesService],
})
export class SaleInvoicesModule {}
