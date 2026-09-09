import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { UsersModule } from "../users/users.module";
import { FarmosSpeciesGuard } from "../auth/guards/farmos-species.guard";
import { FarmosController } from "./farmos.controller";
import { FarmosService } from "./farmos.service";
import { FarmosFeedService } from "./farmos-feed.service";
import { FarmosOperationsService } from "./farmos-operations.service";
import { FarmosProfitabilityService } from "./farmos-profitability.service";
import { FarmosReproService } from "./farmos-repro.service";
import { FarmosReproAlertService } from "./farmos-repro-alert.service";
import { WhatsappClientService } from "../whatsapp-client/whatsapp-client.service";

@Module({
  imports: [DatabaseModule, UsersModule, LedgerModule, WorkflowModule],
  controllers: [FarmosController],
  providers: [
    FarmosService,
    FarmosSpeciesGuard,
    FarmosFeedService,
    FarmosOperationsService,
    FarmosProfitabilityService,
    FarmosReproService,
    FarmosReproAlertService,
    WhatsappClientService,
  ],
  exports: [FarmosService, FarmosFeedService, FarmosOperationsService, FarmosProfitabilityService, FarmosReproService],
})
export class FarmosModule {}
