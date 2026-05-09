import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ProductBrandsController } from "./product-brands.controller";
import { ProductBrandsService } from "./product-brands.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductBrandsController],
  providers: [ProductBrandsService],
})
export class ProductBrandsModule {}
