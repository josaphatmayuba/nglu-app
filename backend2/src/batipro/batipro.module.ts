import { Module } from "@nestjs/common";
import { BatiproProjectGuard } from "../auth/guards/batipro-project.guard";
import { CompatModule } from "../compat/compat.module";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ProjectsModule } from "../projects/projects.module";
import { ObjectStorageService } from "../property-management/object-storage.service";
import { BatiproController } from "./batipro.controller";
import { BatiproPublicController, BatiproPublicDocumentsController, BatiproPublicTrackingController } from "./batipro-public.controller";
import { BatiproOwnerNotifier } from "./batipro-owner-notifier.service";
import { BatiproShareService } from "./batipro-share.service";
import { BatiproService } from "./batipro.service";
import { OcrService } from "./ocr.service";

@Module({
  imports: [DatabaseModule, LedgerModule, ProjectsModule, CompatModule],
  controllers: [BatiproController, BatiproPublicController, BatiproPublicDocumentsController, BatiproPublicTrackingController],
  providers: [BatiproService, BatiproProjectGuard, ObjectStorageService, OcrService, BatiproOwnerNotifier, BatiproShareService],
  exports: [BatiproService],
})
export class BatiproModule {}
