import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { BatiproController } from "./batipro.controller";
import { BatiproService } from "./batipro.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BatiproController],
  providers: [BatiproService],
  exports: [BatiproService],
})
export class BatiproModule {}
