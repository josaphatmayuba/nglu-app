import { Module } from "@nestjs/common";
import { CompatModule } from "../compat/compat.module";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { ProjectsModule } from "../projects/projects.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { SystemEmailModule } from "../system-email/system-email.module";
import { ContractTemplatesController } from "./contract-templates.controller";
import { ContractTemplatesService } from "./contract-templates.service";
import { ContractsPublicController } from "./contracts-public.controller";
import { ContractsService } from "./contracts.service";
import { PropertyManagementController } from "./property-management.controller";
import { PropertyManagementService } from "./property-management.service";
import { RentReminderService } from "./rent-reminder.service";
import { TenantOnboardingPublicController } from "./tenant-onboarding-public.controller";

@Module({
  imports: [DatabaseModule, SystemEmailModule, CompatModule, LedgerModule, WorkflowModule, ProjectsModule],
  controllers: [
    ContractsPublicController,
    TenantOnboardingPublicController,
    PropertyManagementController,
    ContractTemplatesController,
  ],
  providers: [PropertyManagementService, ContractsService, ContractTemplatesService, RentReminderService],
})
export class PropertyManagementModule {}
