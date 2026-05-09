import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { TransactionTypesController } from "./transaction-types.controller";
import { TransactionTypesService } from "./transaction-types.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TransactionTypesController],
  providers: [TransactionTypesService],
})
export class TransactionTypesModule {}
