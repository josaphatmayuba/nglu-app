import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { UsersModule } from "../users/users.module";
import { FarmosController } from "./farmos.controller";
import { FarmosService } from "./farmos.service";

@Module({
  imports: [DatabaseModule, UsersModule, LedgerModule],
  controllers: [FarmosController],
  providers: [FarmosService],
  exports: [FarmosService],
})
export class FarmosModule {}
