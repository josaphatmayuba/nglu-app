import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { VaccineRegistryController } from "./vaccine-registry.controller";
import { VaccineRegistryService } from "./vaccine-registry.service";

@Module({
  imports: [DatabaseModule],
  controllers: [VaccineRegistryController],
  providers: [VaccineRegistryService],
  exports: [VaccineRegistryService],
})
export class VaccineRegistryModule {}
