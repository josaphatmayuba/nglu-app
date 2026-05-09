import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ManufacturersController } from "./manufacturers.controller";
import { ManufacturersService } from "./manufacturers.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ManufacturersController],
  providers: [ManufacturersService],
})
export class ManufacturersModule {}
