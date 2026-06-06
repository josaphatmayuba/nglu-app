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
  HrExpenseRequestController,
  HrLeaveRequestController,
  HrPerformanceReviewController,
  HrRecruitmentOfferController,
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
    HrContractController,
    HrDocumentController,
    HrExpenseRequestController,
    HrSocialDeclarationController,
    HrPerformanceReviewController,
    HrTrainingSessionController,
    HrRecruitmentOfferController,
  ],
  providers: [HrService],
})
export class HrModule {}
