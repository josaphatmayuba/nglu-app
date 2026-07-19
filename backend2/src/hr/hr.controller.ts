import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentOrg } from "../auth/decorators/current-org.decorator";
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
  CreateCandidateEvaluationDto,
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
  CreateHrPublicHolidayDto,
  UpdateHrPublicHolidayDto,
  CreateHrLeaveEntitlementDto,
  UpdateHrLeaveEntitlementDto,
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
  staffOverview(@CurrentOrg() orgId: number) {
    return this.service.staffOverview(orgId);
  }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("designation")
@Controller("designation")
export class DesignationController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listDesignations(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findDesignation(id, orgId); }
  @Post() create(@Body() body: CreateDesignationDto, @Query() q: Record<string, string>, @CurrentOrg() orgId: number) {
    if (q["query"] === "createmany") return Promise.all([body].map((item) => this.service.createDesignation(item, orgId)));
    return this.service.createDesignation(body, orgId);
  }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationDto, @CurrentOrg() orgId: number) { return this.service.updateDesignation(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationDto, @CurrentOrg() orgId: number) { return this.service.updateDesignation(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(designations, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("shift")
@Controller("shift")
export class ShiftController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listShifts(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findShift(id, orgId); }
  @Post() create(@Body() body: CreateShiftDto, @CurrentOrg() orgId: number) { return this.service.createShift(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateShiftDto, @CurrentOrg() orgId: number) { return this.service.updateShift(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateShiftDto, @CurrentOrg() orgId: number) { return this.service.updateShift(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(shifts, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-attendances")
@Controller("hr/attendances")
export class HrAttendanceController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listAttendances(q, orgId); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.attendanceSummary(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findAttendance(id, orgId); }
  @Post() create(@Body() body: CreateHrAttendanceDto, @CurrentOrg() orgId: number) { return this.service.createAttendance(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrAttendanceDto, @CurrentOrg() orgId: number) { return this.service.updateAttendance(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrAttendanceDto, @CurrentOrg() orgId: number) { return this.service.updateAttendance(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrAttendances, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("award")
@Controller("award")
export class AwardController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listAwards(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findAward(id, orgId); }
  @Post() create(@Body() body: CreateAwardDto, @CurrentOrg() orgId: number) { return this.service.createAward(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardDto, @CurrentOrg() orgId: number) { return this.service.updateAward(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardDto, @CurrentOrg() orgId: number) { return this.service.updateAward(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(awards, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("designation-history")
@Controller("designation-history")
export class DesignationHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listDesignationHistory(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findDesignationHistory(id, orgId); }
  @Post() create(@Body() body: CreateDesignationHistoryDto, @CurrentOrg() orgId: number) { return this.service.createDesignationHistory(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateDesignationHistoryDto, @CurrentOrg() orgId: number) { return this.service.updateDesignationHistory(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(designationHistories, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("salary-history")
@Controller("salary-history")
export class SalaryHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listSalaryHistory(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findSalaryHistory(id, orgId); }
  @Post() create(@Body() body: CreateSalaryHistoryDto, @CurrentOrg() orgId: number) { return this.service.createSalaryHistory(body, orgId); }
  @Post(":id/approve") approve(@Param("id", ParseIntPipe) id: number, @Body() body: { comment?: string }) { return this.service.approveSalary(id, body?.comment); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateSalaryHistoryDto, @CurrentOrg() orgId: number) { return this.service.updateSalaryHistory(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(salaryHistories, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-payrolls")
@Controller("hr/payrolls")
export class HrPayrollController {
  constructor(private readonly service: HrService) {}

  // Id de l'utilisateur authentifié (JWT), source fiable pour les approbations.
  private actorId(req: Request): number | null {
    const sub = (req as unknown as { user?: { sub?: number } }).user?.sub;
    return typeof sub === "number" ? sub : null;
  }

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listPayrolls(q, orgId); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.payrollSummary(q); }
  @Get("generate") generate(@Query() q: Record<string, string>) { return this.service.generatePayroll(q); }
  @Post("generate-month") generateMonth(@Body() body: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.generateMonthPayrolls(body ?? {}, orgId); }
  @Get(":id/html") async html(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const html = await this.service.payrollPdfHtml(id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="fiche-paie-${id}.html"`);
    res.send(html);
  }
  @Get(":id/pdf") async pdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const pdfBuffer = await this.service.generatePayrollPdf(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="fiche-paie-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findPayroll(id, orgId); }
  @Post() create(@Body() body: CreateHrPayrollDto, @CurrentOrg() orgId: number) { return this.service.createPayroll(body, orgId); }
  @Post(":id/submit") submit(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.submitPayroll(id, body.approvedBy); }
  @Post(":id/approve") approve(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto, @Req() req: Request) { return this.service.approvePayroll(id, this.actorId(req) ?? body.approvedBy, body.comment); }
  @Post(":id/reject") reject(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto, @Req() req: Request) { return this.service.rejectPayroll(id, this.actorId(req) ?? body.approvedBy, body.comment); }
  @Post(":id/pay") pay(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto) { return this.service.markPayrollPaid(id, body.approvedBy); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPayrollDto, @CurrentOrg() orgId: number) { return this.service.updatePayroll(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPayrollDto, @CurrentOrg() orgId: number) { return this.service.updatePayroll(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrPayrolls, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-projects")
@Controller("hr/projects")
export class HrProjectController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listProjects(q, orgId); }
  @Get("report") report(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.projectAnalytics(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findProject(id, orgId); }
  @Post() create(@Body() body: CreateHrProjectDto, @CurrentOrg() orgId: number) { return this.service.createProject(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectDto, @CurrentOrg() orgId: number) { return this.service.updateProject(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectDto, @CurrentOrg() orgId: number) { return this.service.updateProject(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrProjects, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-project-assignments")
@Controller("hr/project-assignments")
export class HrProjectAssignmentController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listProjectAssignments(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findProjectAssignment(id, orgId); }
  @Post() create(@Body() body: CreateHrProjectAssignmentDto, @CurrentOrg() orgId: number) { return this.service.createProjectAssignment(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectAssignmentDto, @CurrentOrg() orgId: number) { return this.service.updateProjectAssignment(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrProjectAssignmentDto, @CurrentOrg() orgId: number) { return this.service.updateProjectAssignment(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrProjectAssignments, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("award-history")
@Controller("award-history")
export class AwardHistoryController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listAwardHistory(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findAwardHistory(id, orgId); }
  @Post() create(@Body() body: CreateAwardHistoryDto, @CurrentOrg() orgId: number) { return this.service.createAwardHistory(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateAwardHistoryDto, @CurrentOrg() orgId: number) { return this.service.updateAwardHistory(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(awardHistories, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-leave-requests")
@Controller("hr/leave-requests")
export class HrLeaveRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listLeaveRequests(q, orgId); }
  @Get("summary") summary(@Query() q: Record<string, string>) { return this.service.leaveSummary(q); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findLeaveRequest(id, orgId); }
  @Post() create(@Body() body: CreateHrLeaveRequestDto, @CurrentOrg() orgId: number) { return this.service.createLeaveRequest(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrLeaveRequestDto, @CurrentOrg() orgId: number) { return this.service.updateLeaveRequest(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrLeaveRequestDto, @CurrentOrg() orgId: number) { return this.service.updateLeaveRequest(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteLeaveRequest(id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-contracts")
@Controller("hr/contracts")
export class HrContractController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listContracts(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findContract(id, orgId); }
  @Post() create(@Body() body: CreateHrContractDto, @CurrentOrg() orgId: number) { return this.service.createContract(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrContractDto, @CurrentOrg() orgId: number) { return this.service.updateContract(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrContractDto, @CurrentOrg() orgId: number) { return this.service.updateContract(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrContracts, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-documents")
@Controller("hr/documents")
export class HrDocumentController {
  constructor(private readonly service: HrService) {}

  private actorId(req: Request): number | null {
    const sub = (req as unknown as { user?: { sub?: number } }).user?.sub;
    return typeof sub === "number" ? sub : null;
  }

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listDocuments(q, orgId); }
  @Get("summary") summary() { return this.service.documentSummary(); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findDocument(id, orgId); }
  @Post() create(@Body() body: CreateHrDocumentDto, @CurrentOrg() orgId: number) { return this.service.createDocument(body, orgId); }
  @Post("generate") generate(@Body() body: GenerateHrDocumentDto, @CurrentOrg() orgId: number) { return this.service.generateDocument(body, orgId); }
  @Get(":id/pdf") async pdf(@Param("id", ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, reference } = await this.service.documentPdf(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${reference}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  }
  @Post(":id/submit") submit(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto, @Req() req: Request) { return this.service.submitDocument(id, this.actorId(req) ?? body.approvedBy); }
  @Post(":id/approve") approve(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto, @Req() req: Request) { return this.service.approveDocument(id, this.actorId(req) ?? body.approvedBy, body.comment); }
  @Post(":id/reject") reject(@Param("id", ParseIntPipe) id: number, @Body() body: PayrollApprovalDto, @Req() req: Request) { return this.service.rejectDocument(id, this.actorId(req) ?? body.approvedBy, body.comment); }
  @Post(":id/sign") sign(@Param("id", ParseIntPipe) id: number, @Body() body: { signedBy: string }) { return this.service.signDocument(id, body.signedBy); }
  @Get(":id/verify") verify(@Param("id", ParseIntPipe) id: number) { return this.service.verifyDocumentSignature(id); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrDocumentDto, @CurrentOrg() orgId: number) { return this.service.updateDocument(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrDocumentDto, @CurrentOrg() orgId: number) { return this.service.updateDocument(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrDocuments, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-expense-requests")
@Controller("hr/expense-requests")
export class HrExpenseRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listExpenseRequests(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findExpenseRequest(id, orgId); }
  @Post() create(@Body() body: CreateHrExpenseRequestDto, @CurrentOrg() orgId: number) { return this.service.createExpenseRequest(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrExpenseRequestDto, @CurrentOrg() orgId: number) { return this.service.updateExpenseRequest(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrExpenseRequestDto, @CurrentOrg() orgId: number) { return this.service.updateExpenseRequest(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrExpenseRequests, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-social-declarations")
@Controller("hr/social-declarations")
export class HrSocialDeclarationController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listSocialDeclarations(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findSocialDeclaration(id, orgId); }
  @Post() create(@Body() body: CreateHrSocialDeclarationDto, @CurrentOrg() orgId: number) { return this.service.createSocialDeclaration(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrSocialDeclarationDto, @CurrentOrg() orgId: number) { return this.service.updateSocialDeclaration(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrSocialDeclarationDto, @CurrentOrg() orgId: number) { return this.service.updateSocialDeclaration(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrSocialDeclarations, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-performance-reviews")
@Controller("hr/performance-reviews")
export class HrPerformanceReviewController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listPerformanceReviews(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findPerformanceReview(id, orgId); }
  @Post() create(@Body() body: CreateHrPerformanceReviewDto, @CurrentOrg() orgId: number) { return this.service.createPerformanceReview(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPerformanceReviewDto, @CurrentOrg() orgId: number) { return this.service.updatePerformanceReview(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPerformanceReviewDto, @CurrentOrg() orgId: number) { return this.service.updatePerformanceReview(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrPerformanceReviews, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-training-sessions")
@Controller("hr/training-sessions")
export class HrTrainingSessionController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listTrainingSessions(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findTrainingSession(id, orgId); }
  @Post() create(@Body() body: CreateHrTrainingSessionDto, @CurrentOrg() orgId: number) { return this.service.createTrainingSession(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTrainingSessionDto, @CurrentOrg() orgId: number) { return this.service.updateTrainingSession(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTrainingSessionDto, @CurrentOrg() orgId: number) { return this.service.updateTrainingSession(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrTrainingSessions, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-timesheets")
@Controller("hr/timesheets")
export class HrTimesheetController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listTimesheets(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findTimesheet(id, orgId); }
  @Post() create(@Body() body: CreateHrTimesheetDto, @CurrentOrg() orgId: number) { return this.service.createTimesheet(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTimesheetDto, @CurrentOrg() orgId: number) { return this.service.updateTimesheet(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTimesheetDto, @CurrentOrg() orgId: number) { return this.service.updateTimesheet(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrTimesheets, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-employee-requests")
@Controller("hr/employee-requests")
export class HrEmployeeRequestController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listEmployeeRequests(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findEmployeeRequest(id, orgId); }
  @Post() create(@Body() body: CreateHrEmployeeRequestDto, @CurrentOrg() orgId: number) { return this.service.createEmployeeRequest(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrEmployeeRequestDto, @CurrentOrg() orgId: number) { return this.service.updateEmployeeRequest(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrEmployeeRequestDto, @CurrentOrg() orgId: number) { return this.service.updateEmployeeRequest(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrEmployeeRequests, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-recruitment-offers")
@Controller("hr/recruitment-offers")
export class HrRecruitmentOfferController {
  constructor(private readonly service: HrService) {}

  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listRecruitmentOffers(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findRecruitmentOffer(id, orgId); }
  @Post() create(@Body() body: CreateHrRecruitmentOfferDto, @CurrentOrg() orgId: number) { return this.service.createRecruitmentOffer(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrRecruitmentOfferDto, @CurrentOrg() orgId: number) { return this.service.updateRecruitmentOffer(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrRecruitmentOfferDto, @CurrentOrg() orgId: number) { return this.service.updateRecruitmentOffer(id, body, orgId); }
  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrRecruitmentOffers, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 30 } })
@ApiTags("hr-candidates")
@Controller("hr/candidates")
export class HrCandidateController {
  constructor(private readonly service: HrService) {}

  @Get("summary") summary() { return this.service.candidateSummary(); }
  @Get() list(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listCandidates(q, orgId); }
  @Get(":id") one(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findCandidate(id, orgId); }
  @Post() create(@Body() body: CreateHrCandidateDto, @CurrentOrg() orgId: number) { return this.service.createCandidate(body, orgId); }
  @Put(":id") update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrCandidateDto, @CurrentOrg() orgId: number) { return this.service.updateCandidate(id, body, orgId); }
  @Patch(":id") patch(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrCandidateDto, @CurrentOrg() orgId: number) { return this.service.updateCandidate(id, body, orgId); }
  @Post(":id/convert") convert(@Param("id", ParseIntPipe) id: number, @Body() body: ConvertCandidateDto) { return this.service.convertCandidateToEmployee(id, body); }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf", "image/gif"];
      allowed.includes(file.mimetype) ? cb(null, true) : cb(new BadRequestException("Format non autorisé. Formats acceptés : JPEG, PNG, WebP, PDF, GIF."), false);
    },
  }))
  upload(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: any, @Body("kind") kind: string) {
    if (!file) throw new BadRequestException("Aucun fichier reçu.");
    return this.service.uploadCandidateFile(id, file, kind || "cv");
  }

  @Get(":id/evaluations") listEvaluations(@Param("id", ParseIntPipe) id: number) { return this.service.listCandidateEvaluations(id); }
  @Post(":id/evaluations") createEvaluation(@Param("id", ParseIntPipe) id: number, @Body() body: CreateCandidateEvaluationDto) { return this.service.createCandidateEvaluation(id, body); }
  @Delete(":id/evaluations/:evalId") deleteEvaluation(@Param("id", ParseIntPipe) id: number, @Param("evalId", ParseIntPipe) evalId: number) { return this.service.deleteCandidateEvaluation(id, evalId); }

  @Delete(":id") delete(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteRow(hrCandidates, id, orgId); }
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 20 } })
@ApiTags("hr-ai")
@Controller("hr/ai")
export class HrAiController {
  constructor(private readonly service: HrService) {}

  @Get("context") context() { return this.service.aiContext(); }
  @Post("chat") chat(@Body() body: HrAiChatDto, @Req() req: Request, @CurrentOrg() orgId: number) {
    const sub = (req as unknown as { user?: { sub?: number } }).user?.sub;
    return this.service.aiChat(body.message, body.context, typeof sub === "number" ? sub : null, orgId);
  }
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
  listDocs(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) {
    return this.service.listPersonalDocuments(id, orgId);
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
    @CurrentOrg() orgId: number,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier reçu.");
    return this.service.createPersonalDocument(file, { ...body, userId: id }, orgId);
  }

  @Delete("personal-documents/:docId")
  deleteDoc(@Param("docId", ParseIntPipe) docId: number, @CurrentOrg() orgId: number) {
    return this.service.deletePersonalDocument(docId, orgId);
  }

  @Get("tax-rules")
  listTaxRules(@CurrentOrg() orgId: number) { return this.service.listTaxRules(orgId); }

  @Get("tax-rules/:id")
  findTaxRule(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findTaxRule(id, orgId); }

  @Post("tax-rules")
  createTaxRule(@Body() body: CreateHrTaxRuleDto, @CurrentOrg() orgId: number) { return this.service.createTaxRule(body, orgId); }

  @Patch("tax-rules/:id")
  updateTaxRule(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrTaxRuleDto, @CurrentOrg() orgId: number) { return this.service.updateTaxRule(id, body, orgId); }

  @Delete("tax-rules/:id")
  deleteTaxRule(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteTaxRule(id, orgId); }

  @Get("public-holidays")
  listPublicHolidays(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listPublicHolidays(q, orgId); }

  @Get("public-holidays/:id")
  findPublicHoliday(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findPublicHoliday(id, orgId); }

  @Post("public-holidays")
  createPublicHoliday(@Body() body: CreateHrPublicHolidayDto, @CurrentOrg() orgId: number) { return this.service.createPublicHoliday(body, orgId); }

  @Patch("public-holidays/:id")
  updatePublicHoliday(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrPublicHolidayDto, @CurrentOrg() orgId: number) { return this.service.updatePublicHoliday(id, body, orgId); }

  @Delete("public-holidays/:id")
  deletePublicHoliday(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deletePublicHoliday(id, orgId); }

  @Get("leave-entitlements")
  listLeaveEntitlements(@Query() q: Record<string, string>, @CurrentOrg() orgId: number) { return this.service.listLeaveEntitlements(q, orgId); }

  @Get("leave-entitlements/:id")
  findLeaveEntitlement(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.findLeaveEntitlement(id, orgId); }

  @Post("leave-entitlements")
  createLeaveEntitlement(@Body() body: CreateHrLeaveEntitlementDto, @CurrentOrg() orgId: number) { return this.service.createLeaveEntitlement(body, orgId); }

  @Patch("leave-entitlements/:id")
  updateLeaveEntitlement(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateHrLeaveEntitlementDto, @CurrentOrg() orgId: number) { return this.service.updateLeaveEntitlement(id, body, orgId); }

  @Delete("leave-entitlements/:id")
  deleteLeaveEntitlement(@Param("id", ParseIntPipe) id: number, @CurrentOrg() orgId: number) { return this.service.deleteLeaveEntitlement(id, orgId); }

  @Get("payroll-lock-stage")
  getPayrollLockStage() { return this.service.getPayrollLockStage(); }

  @Post("payroll-lock-stage")
  setPayrollLockStage(@Body("stage") stage: string) { return this.service.setPayrollLockStage(stage); }
}
