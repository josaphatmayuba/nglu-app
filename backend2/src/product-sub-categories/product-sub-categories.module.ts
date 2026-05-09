import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ProductSubCategoriesController } from "./product-sub-categories.controller";
import { ProductSubCategoriesService } from "./product-sub-categories.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductSubCategoriesController],
  providers: [ProductSubCategoriesService],
})
export class ProductSubCategoriesModule {}
