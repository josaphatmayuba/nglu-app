import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  awardHistories,
  awards,
  designationHistories,
  designations,
  hrCandidates,
  hrContracts,
  hrAttendances,
  hrDocuments,
  hrEmployeeRequests,
  hrExpenseRequests,
  hrLeaveRequests,
  hrPayrolls,
  hrPerformanceReviews,
  hrProjectAssignments,
  hrProjects,
  hrRecruitmentOffers,
  hrSocialDeclarations,
  hrTrainingSessions,
  hrTimesheets,
  salaryHistories,
  shifts,
} from "../database/schema";
import {
  CreateAwardDto,
  CreateAwardHistoryDto,
  CreateDesignationDto,
  CreateDesignationHistoryDto,
  CreateHrContractDto,
  CreateHrAttendanceDto,
  CreateHrDocumentDto,
  GenerateHrDocumentDto,
  CreateHrEmployeeRequestDto,
  CreateHrExpenseRequestDto,
  CreateHrLeaveRequestDto,
  CreateHrPayrollDto,
  CreateHrPerformanceReviewDto,
  CreateHrProjectAssignmentDto,
  CreateHrProjectDto,
  CreateHrCandidateDto,
  UpdateHrCandidateDto,
  ConvertCandidateDto,
  CreateHrRecruitmentOfferDto,
  CreateHrSocialDeclarationDto,
  CreateHrTrainingSessionDto,
  CreateHrTimesheetDto,
  CreateSalaryHistoryDto,
  CreateShiftDto,
  UpdateAwardDto,
  UpdateAwardHistoryDto,
  UpdateDesignationDto,
  UpdateDesignationHistoryDto,
  UpdateHrContractDto,
  UpdateHrAttendanceDto,
  UpdateHrDocumentDto,
  UpdateHrEmployeeRequestDto,
  UpdateHrExpenseRequestDto,
  UpdateHrLeaveRequestDto,
  UpdateHrPayrollDto,
  UpdateHrPerformanceReviewDto,
  UpdateHrProjectAssignmentDto,
  UpdateHrProjectDto,
  UpdateHrRecruitmentOfferDto,
  UpdateHrSocialDeclarationDto,
  UpdateHrTrainingSessionDto,
  UpdateHrTimesheetDto,
  UpdateSalaryHistoryDto,
  UpdateShiftDto,
  HrAiChatDto,
  PayrollApprovalDto,
  CreateHrPersonalDocumentDto,
  CreateHrTaxRuleDto,
  UpdateHrTaxRuleDto,
} from "./dto/hr.dto";
import { HrService } from "./hr.service";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 60 } })
@ApiTags("hr")
@Controller("hr")
export class HrController {
  constructor(private readonly service: HrService) {}

  @Get("staff-overview")
  staffOverview() {
    return this.service.staffOverview();
  }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("designation")
@Controller("designation")
export class DesignationController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listDesignations(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findDesignation(id); }
  @Post() create(@Body() body: CreateDesignationDto, @Query() q: Record<string, string>) {
    if (q["query"] === "createmany") return Promise.all([body].map((item) => this.service.createDesignation(item)));
    return this.service.createDesignation(body);
  }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationDto) { return this.service.updateDesignation(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationDto) { return this.service.updateDesignation(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(designations, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("shift")
@Controller("shift")
export class ShiftController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listShifts(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findShift(id); }
  @Post() create(@Body() body: CreateShiftDto) { return this.service.createShift(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateShiftDto) { return this.service.updateShift(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateShiftDto) { return this.service.updateShift(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(shifts, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-attendances")
@Controller("hr/attendances")
export class HrAttendanceController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listAttendances(q); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.attendanceSummary(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findAttendance(id); }
  @Post() create(@Body() body: CreateHrAttendanceDto) { return this.service.createAttendance(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrAttendanceDto) { return this.service.updateAttendance(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrAttendanceDto) { return this.service.updateAttendance(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrAttendances, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("award")
@Controller("award")
export class AwardController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listAwards(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findAward(id); }
  @Post() create(@Body() body: CreateAwardDto) { return this.service.createAward(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardDto) { return this.service.updateAward(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardDto) { return this.service.updateAward(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(awards, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("designation-history")
@Controller("designation-history")
export class DesignationHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listDesignationHistory(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findDesignationHistory(id); }
  @Post() create(@Body() body: CreateDesignationHistoryDto) { return this.service.createDesignationHistory(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationHistoryDto) { return this.service.updateDesignationHistory(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(designationHistories, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("salary-history")
@Controller("salary-history")
export class SalaryHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listSalaryHistory(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findSalaryHistory(id); }
  @Post() create(@Body() body: CreateSalaryHistoryDto) { return this.service.createSalaryHistory(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSalaryHistoryDto) { return this.service.updateSalaryHistory(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(salaryHistories, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-payrolls")
@Controller("hr/payrolls")
export class HrPayrollController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listPayrolls(q); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.payrollSummary(q); }
  @Get("generate") generate(@Query() q: Record<string, string>) { return this.service.generatePayroll(q); }
  @Get(":id/pdf") async pdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.service.payrollPdfHtml(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="fiche-paie-${id}.html"`);
    res.send(html);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findPayroll(id); }
  @Post() create(@Body() body: CreateHrPayrollDto) { return this.service.createPayroll(body); }
  @Post(":id/submit") submit(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.submitPayroll(id, body.approvedBy); }
  @Post(":id/approve") approve(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.approvePayroll(id, body.approvedBy, body.comment); }
  @Post(":id/reject") reject(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.rejectPayroll(id, body.approvedBy, body.comment); }
  @Post(":id/pay") pay(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.markPayrollPaid(id, body.approvedBy); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPayrollDto) { return this.service.updatePayroll(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPayrollDto) { return this.service.updatePayroll(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrPayrolls, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-projects")
@Controller("hr/projects")
export class HrProjectController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listProjects(q); }
  @Get("report") report(@Query() q: Record<string, string>) { return this.service.projectAnalytics(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findProject(id); }
  @Post() create(@Body() body: CreateHrProjectDto) { return this.service.createProject(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectDto) { return this.service.updateProject(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectDto) { return this.service.updateProject(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrProjects, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-project-assignments")
@Controller("hr/project-assignments")
export class HrProjectAssignmentController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listProjectAssignments(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findProjectAssignment(id); }
  @Post() create(@Body() body: CreateHrProjectAssignmentDto) { return this.service.createProjectAssignment(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectAssignmentDto) { return this.service.updateProjectAssignment(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectAssignmentDto) { return this.service.updateProjectAssignment(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrProjectAssignments, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("award-history")
@Controller("award-history")
export class AwardHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listAwardHistory(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findAwardHistory(id); }
  @Post() create(@Body() body: CreateAwardHistoryDto) { return this.service.createAwardHistory(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardHistoryDto) { return this.service.updateAwardHistory(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(awardHistories, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-leave-requests")
@Controller("hr/leave-requests")
export class HrLeaveRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listLeaveRequests(q); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.leaveSummary(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findLeaveRequest(id); }
  @Post() create(@Body() body: CreateHrLeaveRequestDto) { return this.service.createLeaveRequest(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrLeaveRequestDto) { return this.service.updateLeaveRequest(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrLeaveRequestDto) { return this.service.updateLeaveRequest(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrLeaveRequests, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-contracts")
@Controller("hr/contracts")
export class HrContractController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listContracts(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findContract(id); }
  @Post() create(@Body() body: CreateHrContractDto) { return this.service.createContract(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrContractDto) { return this.service.updateContract(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrContractDto) { return this.service.updateContract(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrContracts, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-documents")
@Controller("hr/documents")
export class HrDocumentController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listDocuments(q); }
  @Get("summary") summary() { return this.service.documentSummary(); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findDocument(id); }
  @Post() create(@Body() body: CreateHrDocumentDto) { return this.service.createDocument(body); }
  @Post("generate") generate(@Body() body: GenerateHrDocumentDto) { return this.service.generateDocument(body); }
  @Post(":id/sign") sign(@Param("id", ParseIntPipe) id: number, @Body() body: { signedBy: string }) { return this.service.signDocument(id, body.signedBy); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrDocumentDto) { return this.service.updateDocument(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrDocumentDto) { return this.service.updateDocument(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrDocuments, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-expense-requests")
@Controller("hr/expense-requests")
export class HrExpenseRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listExpenseRequests(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findExpenseRequest(id); }
  @Post() create(@Body() body: CreateHrExpenseRequestDto) { return this.service.createExpenseRequest(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrExpenseRequestDto) { return this.service.updateExpenseRequest(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrExpenseRequestDto) { return this.service.updateExpenseRequest(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrExpenseRequests, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-social-declarations")
@Controller("hr/social-declarations")
export class HrSocialDeclarationController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listSocialDeclarations(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findSocialDeclaration(id); }
  @Post() create(@Body() body: CreateHrSocialDeclarationDto) { return this.service.createSocialDeclaration(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrSocialDeclarationDto) { return this.service.updateSocialDeclaration(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrSocialDeclarationDto) { return this.service.updateSocialDeclaration(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrSocialDeclarations, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-performance-reviews")
@Controller("hr/performance-reviews")
export class HrPerformanceReviewController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listPerformanceReviews(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findPerformanceReview(id); }
  @Post() create(@Body() body: CreateHrPerformanceReviewDto) { return this.service.createPerformanceReview(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPerformanceReviewDto) { return this.service.updatePerformanceReview(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPerformanceReviewDto) { return this.service.updatePerformanceReview(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrPerformanceReviews, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-training-sessions")
@Controller("hr/training-sessions")
export class HrTrainingSessionController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listTrainingSessions(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findTrainingSession(id); }
  @Post() create(@Body() body: CreateHrTrainingSessionDto) { return this.service.createTrainingSession(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTrainingSessionDto) { return this.service.updateTrainingSession(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTrainingSessionDto) { return this.service.updateTrainingSession(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrTrainingSessions, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-timesheets")
@Controller("hr/timesheets")
export class HrTimesheetController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listTimesheets(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findTimesheet(id); }
  @Post() create(@Body() body: CreateHrTimesheetDto) { return this.service.createTimesheet(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTimesheetDto) { return this.service.updateTimesheet(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTimesheetDto) { return this.service.updateTimesheet(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrTimesheets, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-employee-requests")
@Controller("hr/employee-requests")
export class HrEmployeeRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listEmployeeRequests(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findEmployeeRequest(id); }
  @Post() create(@Body() body: CreateHrEmployeeRequestDto) { return this.service.createEmployeeRequest(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrEmployeeRequestDto) { return this.service.updateEmployeeRequest(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrEmployeeRequestDto) { return this.service.updateEmployeeRequest(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrEmployeeRequests, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-recruitment-offers")
@Controller("hr/recruitment-offers")
export class HrRecruitmentOfferController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>) { return this.service.listRecruitmentOffers(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findRecruitmentOffer(id); }
  @Post() create(@Body() body: CreateHrRecruitmentOfferDto) { return this.service.createRecruitmentOffer(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrRecruitmentOfferDto) { return this.service.updateRecruitmentOffer(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrRecruitmentOfferDto) { return this.service.updateRecruitmentOffer(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrRecruitmentOffers, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-candidates")
@Controller("hr/candidates")
export class HrCandidateController {
  constructor(private readonly service: HrService) {}

  @Get("summary") summary() { return this.service.candidateSummary(); }
  @Get() list(@Query() q: Record<string, string>) { return this.service.listCandidates(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findCandidate(id); }
  @Post() create(@Body() body: CreateHrCandidateDto) { return this.service.createCandidate(body); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrCandidateDto) { return this.service.updateCandidate(id, body); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrCandidateDto) { return this.service.updateCandidate(id, body); }
  @Post(":id/convert") convert(@Param("id", ParseIntPipe) id: number, @Body() body: ConvertCandidateDto) { return this.service.convertCandidateToEmployee(id, body); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number) { return this.service.deleteRow(hrCandidates, id); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 20 } })
@ApiTags("hr-ai")
@Controller("hr/ai")
export class HrAiController {
  constructor(private readonly service: HrService) {}

  @Get("context") context() { return this.service.aiContext(); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 20 } })
@ApiTags("hr-employees")
@Controller("hr/employees")
export class HrEmployeesController {
  constructor(private readonly service: HrService) {}

  @Post(":id/photo")
  @UseInterceptors(FileInterceptor("photo", {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      allowed.includes(file.mimetype) ? cb(null, true) : cb(new BadRequestException("Format non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF."), false);
    },
  }))
  uploadPhoto(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException("Aucun fichier reçu.");
    return this.service.uploadEmployeePhoto(id, file);
  }

  @Get(":id/personal-documents")
  listDocs(@Param("id", ParseIntPipe) id: number) {
    return this.service.listPersonalDocuments(id);
  }

  @Post(":id/personal-documents")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "image/gif"];
      allowed.includes(file.mimetype) ? cb(null, true) : cb(new BadRequestException("Format non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF, GIF."), false);
    },
  }))
  uploadDoc(
    @Param("id", ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Body() body: CreateHrPersonalDocumentDto,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier reçu.");
    return this.service.createPersonalDocument(file, { ...body, userId: id });
  }

  @Delete("personal-documents/:docId")
  deleteDoc(@Param("docId", ParseIntPipe) docId: number) {
    return this.service.deletePersonalDocument(docId);
  }

  @Get("tax-rules")
  listTaxRules() { return this.service.listTaxRules(); }

  @Get("tax-rules/:id")
  findTaxRule(@Param("id", ParseIntPipe) id: number) { return this.service.findTaxRule(id); }

  @Post("tax-rules")
  createTaxRule(@Body() body: CreateHrTaxRuleDto) { return this.service.createTaxRule(body); }

  @Patch("tax-rules/:id")
  updateTaxRule(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTaxRuleDto) { return this.service.updateTaxRule(id, body); }

  @Delete("tax-rules/:id")
  deleteTaxRule(@Param("id", ParseIntPipe) id: number) { return this.service.deleteTaxRule(id); }
}
