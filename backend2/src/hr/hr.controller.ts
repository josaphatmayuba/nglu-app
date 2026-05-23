import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { awardHistories, awards, designationHistories, designations, salaryHistories, shifts } from "../database/schema";
import {
  CreateAwardDto,
  CreateAwardHistoryDto,
  CreateDesignationDto,
  CreateDesignationHistoryDto,
  CreateSalaryHistoryDto,
  CreateShiftDto,
  UpdateAwardDto,
  UpdateAwardHistoryDto,
  UpdateDesignationDto,
  UpdateDesignationHistoryDto,
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
