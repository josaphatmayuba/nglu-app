import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import {
  AwardController,
  AwardHistoryController,
  DesignationController,
  DesignationHistoryController,
  HrController,
  SalaryHistoryController,
  ShiftController,
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
  ],
  providers: [HrService],
})
export class HrModule {}
