import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  awardHistories,
  awards,
  designationHistories,
  designations,
  hrContracts,
  hrDocuments,
  hrExpenseRequests,
  hrLeaveRequests,
  hrPerformanceReviews,
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
  CreateHrDocumentDto,
  CreateHrExpenseRequestDto,
  CreateHrLeaveRequestDto,
  CreateHrPerformanceReviewDto,
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
  UpdateHrDocumentDto,
  UpdateHrExpenseRequestDto,
  UpdateHrLeaveRequestDto,
  UpdateHrPerformanceReviewDto,
  UpdateHrRecruitmentOfferDto,
  UpdateHrSocialDeclarationDto,
  UpdateHrTrainingSessionDto,
  UpdateHrTimesheetDto,
  UpdateSalaryHistoryDto,
  UpdateShiftDto,
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
  @Get(":id") one(@Param("id", ParseIntPipe) id: number) { return this.service.findDocument(id); }
  @Post() create(@Body() body: CreateHrDocumentDto) { return this.service.createDocument(body); }
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
