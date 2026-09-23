import { Module } from "@nestjs/common";
import { DomusPropertyGuard } from "../auth/guards/domus-property.guard";
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
import { PropertyManagementPublicController } from "./property-management-public.controller";
import { PropertyManagementService } from "./property-management.service";
import { ObjectStorageService } from "./object-storage.service";
import { DelegatePortalPublicController } from "./delegate-portal-public.controller";
import { DelegatePortalService } from "./delegate-portal.service";
import { DelegatesService } from "./delegates.service";
import { OwnerNotificationsService } from "./owner-notifications.service";
import { OwnerPortalPublicController } from "./owner-portal-public.controller";
import { OwnerPortalService } from "./owner-portal.service";
import { GeocodingService } from "./geocoding.service";
import { RentReminderService } from "./rent-reminder.service";
import { TenantOnboardingPublicController } from "./tenant-onboarding-public.controller";
import { TenantPortalPublicController } from "./tenant-portal-public.controller";
import { TenantPortalService } from "./tenant-portal.service";
import { TenantPrescreeningController } from "./prescreening/tenant-prescreening.controller";
import { TenantPrescreeningPublicController } from "./prescreening/tenant-prescreening-public.controller";
import { TenantPrescreeningService } from "./prescreening/tenant-prescreening.service";
import { WhatsappClientService } from "../whatsapp-client/whatsapp-client.service";

@Module({
  imports: [DatabaseModule, SystemEmailModule, CompatModule, LedgerModule, WorkflowModule, ProjectsModule],
  controllers: [
    ContractsPublicController,
    TenantOnboardingPublicController,
    TenantPortalPublicController,
    OwnerPortalPublicController,
    DelegatePortalPublicController,
    TenantPrescreeningPublicController,
    PropertyManagementPublicController,
    PropertyManagementController,
    TenantPrescreeningController,
    ContractTemplatesController,
  ],
  providers: [
    PropertyManagementService,
    ObjectStorageService,
    ContractsService,
    ContractTemplatesService,
    RentReminderService,
    TenantPortalService,
    OwnerPortalService,
    DelegatePortalService,
    DelegatesService,
    OwnerNotificationsService,
    DomusPropertyGuard,
    TenantPrescreeningService,
    WhatsappClientService,
    GeocodingService,
  ],
})
export class PropertyManagementModule {}
