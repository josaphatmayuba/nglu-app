import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import {
  AwardController,
  AwardHistoryController,
  DesignationController,
  DesignationHistoryController,
  HrContractController,
  HrController,
  HrDocumentController,
  HrEmployeeRequestController,
  HrExpenseRequestController,
  HrLeaveRequestController,
  HrPayrollController,
  HrPerformanceReviewController,
  HrProjectAssignmentController,
  HrProjectController,
  HrRecruitmentOfferController,
  HrTimesheetController,
  SalaryHistoryController,
  ShiftController,
  HrSocialDeclarationController,
  HrTrainingSessionController,
} from "./hr.controller";
import { HrService } from "./hr.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    HrController,
    DesignationController,
    ShiftController,
    AwardController,
    DesignationHistoryController,
    SalaryHistoryController,
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
  ],
  providers: [HrService],
})
export class HrModule {}
