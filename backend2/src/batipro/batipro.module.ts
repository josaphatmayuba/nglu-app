import { Module } from "@nestjs/common";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { DatabaseModule } from "../database/database.module";
import { ObjectStorageService } from "../property-management/object-storage.service";
import { BatiproController } from "./batipro.controller";
import { BatiproService } from "./batipro.service";

@Module({
  imports: [DatabaseModule],
  controllers: [BatiproController],
  providers: [BatiproService, BatiproProjectGuard, ObjectStorageService],
  exports: [BatiproService],
})
export class BatiproModule {}
