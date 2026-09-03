import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ExchangeService } from "./exchange.service";
import { LedgerController } from "./ledger.controller";
import { LedgerService } from "./ledger.service";

@Module({
  imports: [DatabaseModule],
  controllers: [LedgerController],
  providers: [LedgerService, ExchangeService],
  exports: [LedgerService, ExchangeService],
})
export class LedgerModule {}
