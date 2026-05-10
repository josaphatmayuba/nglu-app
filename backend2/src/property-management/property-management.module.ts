import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ContractsPublicController } from "./contracts-public.controller";
import { ContractsService } from "./contracts.service";
import { PropertyManagementController } from "./property-management.controller";
import { PropertyManagementService } from "./property-management.service";
import { TenantOnboardingPublicController } from "./tenant-onboarding-public.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [ContractsPublicController, TenantOnboardingPublicController, PropertyManagementController],
  providers: [PropertyManagementService, ContractsService],
})
export class PropertyManagementModule {}
