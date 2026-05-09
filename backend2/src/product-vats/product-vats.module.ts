import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ProductVatsController } from "./product-vats.controller";
import { ProductVatsService } from "./product-vats.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductVatsController],
  providers: [ProductVatsService],
})
export class ProductVatsModule {}
