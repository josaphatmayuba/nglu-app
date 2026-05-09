import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { UomController } from "./uom.controller";
import { UomService } from "./uom.service";

@Module({
  imports: [DatabaseModule],
  controllers: [UomController],
  providers: [UomService],
})
export class UomModule {}
