import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CurrenciesController } from "./currencies.controller";
import { CurrenciesService } from "./currencies.service";

@Module({
  imports: [DatabaseModule],
  controllers: [CurrenciesController],
  providers: [CurrenciesService],
})
export class CurrenciesModule {}
