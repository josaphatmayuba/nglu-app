import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ProductCategoriesController } from "./product-categories.controller";
import { ProductCategoriesService } from "./product-categories.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
