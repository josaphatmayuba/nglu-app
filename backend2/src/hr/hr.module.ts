import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { LedgerModule } from "../ledger/ledger.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { SystemEmailModule } from "../system-email/system-email.module";
import {
  AwardController,
  AwardHistoryController,
  DesignationController,
  DesignationHistoryController,
  HrContractController,
  HrAttendanceController,
  HrController,
  HrDocumentController,
  HrEmployeeRequestController,
  HrExpenseRequestController,
  HrLeaveRequestController,
  HrPayrollController,
  HrPerformanceReviewController,
  HrProjectAssignmentController,
  HrProjectController,
  HrCandidateController,
  HrAiController,
  HrEmployeesController,
  HrRecruitmentOfferController,
  HrTimesheetController,
  SalaryHistoryController,
  ShiftController,
  HrSocialDeclarationController,
  HrTrainingSessionController,
} from "./hr.controller";
import { HrService } from "./hr.service";

@Module({
  imports: [DatabaseModule, SystemEmailModule, LedgerModule, WorkflowModule],
  controllers: [
    HrController,
    DesignationController,
    ShiftController,
    AwardController,
    DesignationHistoryController,
    SalaryHistoryController,
    HrAttendanceController,
    AwardHistoryController,
    HrLeaveRequestController,
    HrPayrollController,
    HrProjectController,
    HrProjectAssignmentController,
    HrContractController,
    HrDocumentController,
    HrEmployeeRequestController,
    HrExpenseRequestController,
    HrSocialDeclarationController,
    HrPerformanceReviewController,
    HrTrainingSessionController,
    HrTimesheetController,
    HrRecruitmentOfferController,
    HrCandidateController,
    HrAiController,
    HrEmployeesController,
  ],
  providers: [HrService],
})
export class HrModule {}
