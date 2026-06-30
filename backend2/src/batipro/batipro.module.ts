import { Module } from "@nestjs/common";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { DatabaseModule } from "../database/database.module";
import { BatiproController } from "./batipro.controller";
import { BatiproService } from "./batipro.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BatiproController],
  providers: [BatiproService, BatiproProjectGuard],
  exports: [BatiproService],
})
export class BatiproModule {}
