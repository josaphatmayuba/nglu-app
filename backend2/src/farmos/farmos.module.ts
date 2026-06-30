import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { UsersModule } from "../users/users.module";
import { FarmosSpeciesGuard } from "../auth/guards/farmos-species.guard";
import { FarmosController } from "./farmos.controller";
import { FarmosService } from "./farmos.service";

@Module({
  imports: [DatabaseModule, UsersModule, LedgerModule, WorkflowModule],
  controllers: [FarmosController],
  providers: [FarmosService, FarmosSpeciesGuard],
  exports: [FarmosService],
})
export class FarmosModule {}
