import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { ObjectStorageService } from "../property-management/object-storage.service";

@Module({
  imports: [DatabaseModule, LedgerModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, ObjectStorageService],
})
export class TransactionsModule {}
