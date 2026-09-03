import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
