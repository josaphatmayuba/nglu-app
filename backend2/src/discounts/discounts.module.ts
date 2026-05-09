import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DiscountsController } from "./discounts.controller";
import { DiscountsService } from "./discounts.service";

@Module({
  imports: [DatabaseModule],
  controllers: [DiscountsController],
  providers: [DiscountsService],
})
export class DiscountsModule {}
