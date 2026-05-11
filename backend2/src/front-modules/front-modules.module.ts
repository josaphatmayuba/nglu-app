import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import {
  DepartmentController,
  EducationController,
  EmploymentStatusController,
  PageSizeController,
  ProductAttributeController,
  ProductAttributeValueController,
  ProductColorController,
  TermsAndConditionController,
} from "./front-modules.controller";
import { FrontModulesService } from "./front-modules.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    DepartmentController,
    EmploymentStatusController,
    EducationController,
    ProductColorController,
    ProductAttributeController,
    ProductAttributeValueController,
    TermsAndConditionController,
    PageSizeController,
  ],
  providers: [FrontModulesService],
})
export class FrontModulesModule {}
