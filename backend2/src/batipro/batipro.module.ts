import { Module } from "@nestjs/common";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ProjectsModule } from "../projects/projects.module";
import { ObjectStorageService } from "../property-management/object-storage.service";
import { BatiproController } from "./batipro.controller";
import { BatiproPublicController, BatiproPublicDocumentsController } from "./batipro-public.controller";
import { BatiproService } from "./batipro.service";
import { OcrService } from "./ocr.service";

@Module({
  imports: [DatabaseModule, LedgerModule, ProjectsModule],
  controllers: [BatiproController, BatiproPublicController, BatiproPublicDocumentsController],
  providers: [BatiproService, BatiproProjectGuard, ObjectStorageService, OcrService],
  exports: [BatiproService],
})
export class BatiproModule {}
