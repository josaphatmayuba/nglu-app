import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { VaccineRegistryController } from "./vaccine-registry.controller";
import { VaccineRegistryService } from "./vaccine-registry.service";
import { VaccineSyncService } from "./vaccine-sync.service";

@Module({
  imports: [DatabaseModule],
  controllers: [VaccineRegistryController],
  providers: [VaccineRegistryService, VaccineSyncService],
  exports: [VaccineRegistryService, VaccineSyncService],
})
export class VaccineRegistryModule {}
