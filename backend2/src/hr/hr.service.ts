import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  appSettings,
  awardHistories,
  awards,
  currencies,
  departments,
  designationHistories,
  designations,
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
  roles,
  salaryHistories,
  shifts,
  transactions,
  users,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateAwardDto,
  CreateAwardHistoryDto,
  CreateDesignationDto,
  CreateDesignationHistoryDto,
  CreateHrContractDto,
  CreateHrAttendanceDto,
  CreateHrDocumentDto,
  CreateHrEmployeeRequestDto,
  CreateHrExpenseRequestDto,
  CreateHrLeaveRequestDto,
  CreateHrPayrollDto,
  CreateHrPerformanceReviewDto,
  CreateHrProjectAssignmentDto,
  CreateHrProjectDto,
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
} from "./dto/hr.dto";

@Injectable()
export class HrService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  listDesignations(q: Record<string, string>) {
    return this.listSimple(q, designations, "getAllDesignation", "totalDesignation");
  }

  findDesignation(id: number) {
    return this.findOne(designations, id, "Designation not found.");
  }

  async createDesignation(input: CreateDesignationDto) {
    const [result] = await this.db.insert(designations).values({
      name: input.name,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findDesignation(Number(result.insertId));
  }

  async updateDesignation(id: number, input: UpdateDesignationDto) {
    await this.findDesignation(id);
    await this.db
      .update(designations)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(designations.id, id));
    return this.findDesignation(id);
  }

  listShifts(q: Record<string, string>) {
    return this.listSimple(q, shifts, "getAllShift", "totalShift");
  }

  findShift(id: number) {
    return this.findOne(shifts, id, "Shift not found.");
  }

  async createShift(input: CreateShiftDto) {
    const [result] = await this.db.insert(shifts).values({
      name: input.name,
      startTime: this.normalizeTime(input.startTime),
      endTime: this.normalizeTime(input.endTime),
      workHour: this.workHours(input.startTime, input.endTime),
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findShift(Number(result.insertId));
  }

  async updateShift(id: number, input: UpdateShiftDto) {
    const current = await this.findShift(id);
    const startTime = input.startTime ?? current.startTime;
    const endTime = input.endTime ?? current.endTime;
    await this.db
      .update(shifts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.startTime !== undefined ? { startTime: this.normalizeTime(input.startTime) } : {}),
        ...(input.endTime !== undefined ? { endTime: this.normalizeTime(input.endTime) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        workHour: this.workHours(startTime, endTime),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(shifts.id, id));
    return this.findShift(id);
  }

  listAttendances(q: Record<string, string>) {
    return this.listHrRecords(q, hrAttendances, "getAllHrAttendance", "totalHrAttendance");
  }

  findAttendance(id: number) {
    return this.findOne(hrAttendances, id, "Attendance not found.");
  }

  async createAttendance(input: CreateHrAttendanceDto) {
    await this.validateAttendanceRefs(input);
    const payload = await this.attendancePayload(input);
    return this.createRecord(hrAttendances, payload, (id) => this.findAttendance(id));
  }

  async updateAttendance(id: number, input: UpdateHrAttendanceDto) {
    const current = await this.findAttendance(id);
    await this.validateAttendanceRefs(input);
    const payload = await this.attendancePayload({ ...current, ...input });
    return this.updateRecord(hrAttendances, id, payload, () => this.findAttendance(id));
  }

  async attendanceSummary(q: Record<string, string>) {
    const month = q["month"] || "";
    const startDate = q["startDate"] || "";
    const endDate = q["endDate"] || "";
    const rows = await this.db
      .select()
      .from(hrAttendances)
      .where(ne(hrAttendances.status, "false"))
      .orderBy(desc(hrAttendances.workDate));

    const filtered = rows.filter((row) => {
      const workDate = String(row.workDate || "");
      if (month && workDate.slice(0, 7) !== month) return false;
      if (startDate && workDate < startDate) return false;
      if (endDate && workDate > endDate) return false;
      return true;
    });

    const emptyAttendanceStats = () => ({
      records: filtered.length,
      present: 0,
      late: 0,
      absent: 0,
      partial: 0,
      workedHours: 0,
      lateMinutes: 0,
      overtimeHours: 0,
      absenceHours: 0,
    });
    const totals = emptyAttendanceStats();
    const byEmployee = new Map<number, ReturnType<typeof emptyAttendanceStats> & { userId: number }>();

    for (const row of filtered) {
      const userId = Number(row.userId);
      const status = String(row.status || "").toLowerCase();
      const employee = byEmployee.get(userId) || { ...emptyAttendanceStats(), userId, records: 0 };
      for (const target of [totals, employee]) {
        target.records += target === totals ? 0 : 1;
        if (status === "late") target.late += 1;
        else if (status === "absent") target.absent += 1;
        else if (status === "partial") target.partial += 1;
        else target.present += 1;
        target.workedHours += Number(row.workedHours || 0);
        target.lateMinutes += Number(row.lateMinutes || 0);
        target.overtimeHours += Number(row.overtimeHours || 0);
        target.absenceHours += Number(row.absenceHours || 0);
      }
      byEmployee.set(userId, employee);
    }

    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      filters: { month: month || null, startDate: startDate || null, endDate: endDate || null },
      totals: {
        ...totals,
        workedHours: round(totals.workedHours),
        overtimeHours: round(totals.overtimeHours),
        absenceHours: round(totals.absenceHours),
      },
      byEmployee: Array.from(byEmployee.values()).map((row) => ({
        ...row,
        workedHours: round(row.workedHours),
        overtimeHours: round(row.overtimeHours),
        absenceHours: round(row.absenceHours),
      })),
    };
  }

  listAwards(q: Record<string, string>) {
    return this.listSimple(q, awards, "getAllAward", "totalAward");
  }

  findAward(id: number) {
    return this.findOne(awards, id, "Award not found.");
  }

  async createAward(input: CreateAwardDto) {
    const [result] = await this.db.insert(awards).values({
      name: input.name,
      description: input.description ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findAward(Number(result.insertId));
  }

  async updateAward(id: number, input: UpdateAwardDto) {
    await this.findAward(id);
    await this.db
      .update(awards)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(awards.id, id));
    return this.findAward(id);
  }

  listDesignationHistory(q: Record<string, string>) {
    return this.listHistory(q, designationHistories, "getAllDesignationHistory", "totalDesignationHistory");
  }

  async createDesignationHistory(input: CreateDesignationHistoryDto) {
    const [result] = await this.db.insert(designationHistories).values({
      userId: input.userId,
      designationId: input.designationId,
      startDate: input.designationStartDate ?? null,
      endDate: input.designationEndDate ?? null,
      comment: input.designationComment ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findDesignationHistory(Number(result.insertId));
  }

  findDesignationHistory(id: number) {
    return this.findOne(designationHistories, id, "Designation history not found.");
  }

  async updateDesignationHistory(id: number, input: UpdateDesignationHistoryDto) {
    await this.findDesignationHistory(id);
    await this.db.update(designationHistories).set({
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.designationId !== undefined ? { designationId: input.designationId } : {}),
      ...(input.designationStartDate !== undefined ? { startDate: input.designationStartDate } : {}),
      ...(input.designationEndDate !== undefined ? { endDate: input.designationEndDate } : {}),
      ...(input.designationComment !== undefined ? { comment: input.designationComment } : {}),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(designationHistories.id, id));
    return this.findDesignationHistory(id);
  }

  listSalaryHistory(q: Record<string, string>) {
    return this.listHistory(q, salaryHistories, "getAllSalaryHistory", "totalSalaryHistory");
  }

  async createSalaryHistory(input: CreateSalaryHistoryDto) {
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
    if (currencyId) {
      await this.ensureExists(currencies, currencyId, "Currency not found.");
    }

    const [result] = await this.db.insert(salaryHistories).values({
      userId: input.userId,
      salary: input.salary,
      currencyId: currencyId ?? null,
      startDate: input.salaryStartDate ?? null,
      endDate: input.salaryEndDate ?? null,
      comment: input.salaryComment ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const salaryHistoryId = Number((result as any).insertId);

    // Create accounting transaction: debit Salary expense, credit Cash or Bank
    const creditAccountId = input.paymentAccountId ?? 2; // 2=Bank default, 1=Cash
    const txType = creditAccountId === 1 ? "SAL - Payroll Cash" : "SAL - Payroll Journal";

    await this.db.insert(transactions).values({
      date: input.salaryStartDate ? new Date(input.salaryStartDate) : sql`CURRENT_TIMESTAMP` as any,
      debitId: 10, // Salary expense sub-account
      creditId: creditAccountId,
      particulars: input.salaryComment || `Salary payment${input.salaryStartDate ? ` — ${input.salaryStartDate}` : ""}`,
      amount: input.salary,
      type: txType,
      relatedId: String(salaryHistoryId),
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findSalaryHistory(salaryHistoryId);
  }

  findSalaryHistory(id: number) {
    return this.findOne(salaryHistories, id, "Salary history not found.");
  }

  async updateSalaryHistory(id: number, input: UpdateSalaryHistoryDto) {
    await this.findSalaryHistory(id);

    if (input.currencyId !== undefined && input.currencyId !== null) {
      await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    }

    await this.db.update(salaryHistories).set({
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      ...(input.currencyId !== undefined ? { currencyId: input.currencyId } : {}),
      ...(input.salaryStartDate !== undefined ? { startDate: input.salaryStartDate } : {}),
      ...(input.salaryEndDate !== undefined ? { endDate: input.salaryEndDate } : {}),
      ...(input.salaryComment !== undefined ? { comment: input.salaryComment } : {}),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(salaryHistories.id, id));
    return this.findSalaryHistory(id);
  }

  listPayrolls(q: Record<string, string>) {
    return this.listHrRecords(q, hrPayrolls, "getAllHrPayroll", "totalHrPayroll");
  }

  findPayroll(id: number) {
    return this.findOne(hrPayrolls, id, "Payroll not found.");
  }

  async createPayroll(input: CreateHrPayrollDto) {
    await this.validatePayrollRefs(input);
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
    if (currencyId) await this.ensureExists(currencies, currencyId, "Currency not found.");
    const payload = this.payrollPayload({ ...input, currencyId });
    return this.createRecord(hrPayrolls, payload, (id) => this.findPayroll(id));
  }

  async updatePayroll(id: number, input: UpdateHrPayrollDto) {
    const current = await this.findPayroll(id);
    const currentStatus = String(current.status || "draft");
    if (currentStatus === "paid") throw new BadRequestException("Cannot modify a paid payroll.");
    await this.validatePayrollRefs(input);
    if (input.currencyId !== undefined && input.currencyId !== null) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    const payload = this.payrollPayload({ ...current, ...input });
    return this.updateRecord(hrPayrolls, id, payload, () => this.findPayroll(id));
  }

  async generatePayroll(q: Record<string, string>) {
    const userId = q["userId"] ? Number(q["userId"]) : null;
    const period = q["period"] || this.currentPayrollPeriod();
    if (!userId) throw new BadRequestException("userId is required.");
    await this.ensureExists(users, userId, "User not found.");

    const [yearStr, monthStr] = period.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const contracts = await this.db.select().from(hrContracts)
      .where(and(eq(hrContracts.userId, userId), ne(hrContracts.status, "terminated")))
      .orderBy(desc(hrContracts.id))
      .limit(1);
    const contract = contracts[0] ?? null;

    const attendances = await this.db.select().from(hrAttendances)
      .where(and(
        eq(hrAttendances.userId, userId),
        ne(hrAttendances.status, "false"),
        sql`${hrAttendances.workDate} >= ${periodStart}`,
        sql`${hrAttendances.workDate} <= ${periodEnd}`,
      ));

    const leaves = await this.db.select().from(hrLeaveRequests)
      .where(and(
        eq(hrLeaveRequests.userId, userId),
        ne(hrLeaveRequests.status, "false"),
        sql`${hrLeaveRequests.startDate} <= ${periodEnd}`,
        sql`${hrLeaveRequests.endDate} >= ${periodStart}`,
      ));

    const workedDays = attendances.filter((a) => !["paid_leave", "unpaid_leave"].includes(String(a.status || ""))).length;
    const paidLeaveDays = attendances.filter((a) => String(a.status || "") === "paid_leave").length;
    const unpaidLeaveDays = attendances.filter((a) => String(a.status || "") === "unpaid_leave").length;
    const absenceDays = Math.max(0, leaves.filter((l) => !this.isFinalLeaveApproval(l.status)).length);
    const overtimeHours = attendances.reduce((sum, a) => sum + Number(a.overtimeHours || 0), 0);

    const baseSalary = Number(contract?.baseSalary || 0);
    const transportAllowance = Number(contract?.transportAllowance || 0);
    const housingAllowance = Number(contract?.housingAllowance || 0);
    const overtimeRate = baseSalary > 0 ? (baseSalary / 22 / 8) * 1.5 : 0;
    const overtimeAmount = this.roundNumber(overtimeHours * overtimeRate);
    const dailyRate = baseSalary > 0 ? baseSalary / 22 : 0;
    const unpaidAbsenceDeduction = this.roundNumber(unpaidLeaveDays * dailyRate);

    const currencyId = contract?.currencyId ?? (await this.resolveDefaultCurrency());

    return {
      userId,
      contractId: contract?.id ?? null,
      period,
      currencyId,
      baseSalary,
      transportAllowance,
      housingAllowance,
      riskAllowance: 0,
      otherAllowances: 0,
      overtimeHours: this.roundNumber(overtimeHours),
      overtimeAmount,
      unpaidAbsenceDeduction,
      advanceDeduction: 0,
      taxAmount: 0,
      cnssAmount: 0,
      otherDeductions: 0,
      workedDays: this.roundNumber(workedDays),
      absenceDays: this.roundNumber(absenceDays),
      paidLeaveDays: this.roundNumber(paidLeaveDays),
      status: "draft",
      notes: `Genere automatiquement depuis contrat + presence pour ${period}`,
    };
  }

  async payrollSummary(q: Record<string, string>) {
    const period = q["period"] || null;
    const rows = await this.db.select().from(hrPayrolls).where(ne(hrPayrolls.status, "false")).orderBy(desc(hrPayrolls.id));
    const filtered = period ? rows.filter((r) => r.period === period) : rows;
    const n = (v: any) => Number(v || 0);
    const grossTotal = filtered.reduce((sum, r) => sum + n(r.grossSalary), 0);
    const netTotal = filtered.reduce((sum, r) => sum + n(r.netSalary), 0);
    const taxTotal = filtered.reduce((sum, r) => sum + n(r.taxAmount), 0);
    const cnssTotal = filtered.reduce((sum, r) => sum + n(r.cnssAmount), 0);
    const employeeCount = new Set(filtered.map((r) => r.userId)).size;
    const periods = [...new Set(rows.map((r) => r.period).filter(Boolean))].sort().reverse().slice(0, 24);
    return {
      period: period || "all",
      bulletins: filtered.length,
      employees: employeeCount,
      grossTotal: this.roundNumber(grossTotal),
      netTotal: this.roundNumber(netTotal),
      taxTotal: this.roundNumber(taxTotal),
      cnssTotal: this.roundNumber(cnssTotal),
      workflow: {
        draft: filtered.filter((r) => String(r.status || "draft") === "draft").length,
        validated: filtered.filter((r) => String(r.status || "") === "validated").length,
        paid: filtered.filter((r) => String(r.status || "") === "paid").length,
      },
      periods,
    };
  }

  listProjects(q: Record<string, string>) {
    return this.listHrRecords(q, hrProjects, "getAllHrProject", "totalHrProject");
  }

  findProject(id: number) {
    return this.findOne(hrProjects, id, "HR project not found.");
  }

  async createProject(input: CreateHrProjectDto) {
    await this.validateProjectRefs(input);
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
    if (currencyId) await this.ensureExists(currencies, currencyId, "Currency not found.");
    const code = input.code || (await this.nextProjectCode(input.startDate));
    return this.createRecord(hrProjects, {
      ...input,
      code,
      currencyId: currencyId ?? null,
      hrBudget: Number(input.hrBudget || 0),
      status: input.status || "active",
    }, (id) => this.findProject(id));
  }

  async updateProject(id: number, input: UpdateHrProjectDto) {
    await this.findProject(id);
    await this.validateProjectRefs(input);
    if (input.currencyId !== undefined && input.currencyId !== null) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    return this.updateRecord(hrProjects, id, {
      ...input,
      ...(input.hrBudget !== undefined ? { hrBudget: Number(input.hrBudget || 0) } : {}),
    }, () => this.findProject(id));
  }

  listProjectAssignments(q: Record<string, string>) {
    return this.listHrRecords(q, hrProjectAssignments, "getAllHrProjectAssignment", "totalHrProjectAssignment");
  }

  findProjectAssignment(id: number) {
    return this.findOne(hrProjectAssignments, id, "HR project assignment not found.");
  }

  async createProjectAssignment(input: CreateHrProjectAssignmentDto) {
    await this.validateProjectAssignmentRefs(input);
    const currencyId = input.currencyId ?? (await this.resolveDefaultCurrency());
    if (currencyId) await this.ensureExists(currencies, currencyId, "Currency not found.");
    return this.createRecord(hrProjectAssignments, {
      ...input,
      currencyId: currencyId ?? null,
      timePercent: Number(input.timePercent ?? 100),
      monthlyCost: Number(input.monthlyCost || 0),
      status: input.status || "active",
    }, (id) => this.findProjectAssignment(id));
  }

  async updateProjectAssignment(id: number, input: UpdateHrProjectAssignmentDto) {
    await this.findProjectAssignment(id);
    await this.validateProjectAssignmentRefs(input);
    if (input.currencyId !== undefined && input.currencyId !== null) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
    return this.updateRecord(hrProjectAssignments, id, {
      ...input,
      ...(input.timePercent !== undefined ? { timePercent: Number(input.timePercent ?? 100) } : {}),
      ...(input.monthlyCost !== undefined ? { monthlyCost: Number(input.monthlyCost || 0) } : {}),
    }, () => this.findProjectAssignment(id));
  }

  async projectAnalytics(q: Record<string, string>) {
    const monthFilter = q["month"] || "";
    const startFilter = q["startDate"] || "";
    const endFilter = q["endDate"] || "";

    const [projectRows, assignmentRows, timesheetRows, staffRows, salaryRows, departmentRows] = await Promise.all([
      this.db.select().from(hrProjects).where(ne(hrProjects.status, "false")).orderBy(desc(hrProjects.id)),
      this.db.select().from(hrProjectAssignments).where(ne(hrProjectAssignments.status, "false")).orderBy(desc(hrProjectAssignments.id)),
      this.db.select().from(hrTimesheets).where(ne(hrTimesheets.status, "false")).orderBy(desc(hrTimesheets.id)),
      this.db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        departmentId: users.departmentId,
      }).from(users),
      this.db.select({
        userId: salaryHistories.userId,
        salary: salaryHistories.salary,
        currencyId: salaryHistories.currencyId,
        id: salaryHistories.id,
      }).from(salaryHistories).orderBy(desc(salaryHistories.id)),
      this.db.select({ id: departments.id, name: departments.name }).from(departments),
    ]);

    const projectsById = new Map(projectRows.map((project) => [Number(project.id), project]));
    const usersById = new Map(staffRows.map((user) => [Number(user.id), user]));
    const departmentsById = new Map(departmentRows.map((department) => [Number(department.id), department]));
    const currentSalaryByUser = new Map<number, { salary: number; currencyId: number | null }>();
    for (const row of salaryRows) {
      if (!currentSalaryByUser.has(Number(row.userId))) {
        currentSalaryByUser.set(Number(row.userId), {
          salary: Number(row.salary || 0),
          currencyId: row.currencyId ?? null,
        });
      }
    }

    const assignmentsByProject = new Map<number, typeof assignmentRows>();
    const assignmentsByProjectUser = new Map<string, typeof assignmentRows[number][]>();
    for (const assignment of assignmentRows) {
      const projectId = Number(assignment.projectId);
      assignmentsByProject.set(projectId, [...(assignmentsByProject.get(projectId) || []), assignment]);
      const key = `${projectId}:${assignment.userId}`;
      assignmentsByProjectUser.set(key, [...(assignmentsByProjectUser.get(key) || []), assignment]);
    }

    const projectMap = new Map<number, any>();
    const monthMap = new Map<string, any>();
    const donorMap = new Map<string, any>();
    const departmentMap = new Map<string, any>();
    const totalsMap = new Map<string, any>();
    const linkedTimesheets = timesheetRows.filter((row) => row.projectId && projectsById.has(Number(row.projectId)));

    for (const project of projectRows) {
      const projectId = Number(project.id);
      const plannedAssignments = assignmentsByProject.get(projectId) || [];
      const plannedByCurrency = this.moneyTotals(plannedAssignments, (assignment) => this.weightedAssignmentCost(assignment), (assignment) => assignment.currencyId ?? project.currencyId ?? null);
      projectMap.set(projectId, {
        projectId,
        code: project.code,
        name: project.name,
        donor: project.donor || "Sans bailleur",
        currencyId: project.currencyId ?? null,
        budget: Number(project.hrBudget || 0),
        plannedMonthlyCost: plannedByCurrency,
        actualCost: [],
        actualHours: 0,
        budgetVariance: Number(project.hrBudget || 0),
        budgetBurnRatePct: 0,
      });
    }

    for (const row of linkedTimesheets) {
      const periodDate = String(row.periodStartDate || row.workDate || "");
      if (monthFilter && periodDate.slice(0, 7) !== monthFilter) continue;
      if (startFilter && periodDate < startFilter) continue;
      if (endFilter && periodDate > endFilter) continue;

      const projectId = Number(row.projectId);
      const project = projectsById.get(projectId);
      if (!project) continue;

      const userId = Number(row.userId);
      const hours = Number(row.hours || 0);
      const assignment = this.assignmentForDate(assignmentsByProjectUser.get(`${projectId}:${userId}`) || [], periodDate);
      const salary = currentSalaryByUser.get(userId);
      const monthlyCost = assignment ? this.weightedAssignmentCost(assignment) : Number(salary?.salary || 0);
      const actualCost = (monthlyCost / 173.33) * hours;
      const currencyId = assignment?.currencyId ?? salary?.currencyId ?? project.currencyId ?? null;
      const month = periodDate.slice(0, 7) || "Sans mois";
      const donor = project.donor || row.donor || "Sans bailleur";
      const departmentId = usersById.get(userId)?.departmentId ?? null;
      const departmentName = departmentId ? departmentsById.get(Number(departmentId))?.name : null;

      this.addActualCost(projectMap.get(projectId), actualCost, hours, currencyId);
      this.addGroupedCost(monthMap, month, { month }, actualCost, hours, currencyId);
      this.addGroupedCost(donorMap, donor, { donor }, actualCost, hours, currencyId);
      this.addGroupedCost(
        departmentMap,
        String(departmentId ?? "none"),
        { departmentId, department: departmentName || "Sans departement" },
        actualCost,
        hours,
        currencyId,
      );
      this.addGroupedCost(totalsMap, String(currencyId ?? "default"), { currencyId }, actualCost, hours, currencyId);
    }

    const projects = Array.from(projectMap.values()).map((project) => {
      const actual = this.sumMoneyForCurrency(project.actualCost, project.currencyId);
      const budget = Number(project.budget || 0);
      return {
        ...project,
        budgetVariance: budget - actual,
        budgetBurnRatePct: budget > 0 ? Math.round((actual / budget) * 10000) / 100 : 0,
      };
    });

    return {
      filters: { month: monthFilter || null, startDate: startFilter || null, endDate: endFilter || null },
      projects,
      byMonth: Array.from(monthMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month))),
      byDonor: Array.from(donorMap.values()).sort((a, b) => String(a.donor).localeCompare(String(b.donor))),
      byDepartment: Array.from(departmentMap.values()).sort((a, b) => String(a.department).localeCompare(String(b.department))),
      totals: Array.from(totalsMap.values()).flatMap((row) => row.actualCost),
      linkedTimesheets: linkedTimesheets.length,
      unlinkedTimesheets: timesheetRows.length - linkedTimesheets.length,
    };
  }

  listAwardHistory(q: Record<string, string>) {
    return this.listHistory(q, awardHistories, "getAllAwardHistory", "totalAwardHistory");
  }

  async createAwardHistory(input: CreateAwardHistoryDto) {
    const [result] = await this.db.insert(awardHistories).values({
      userId: input.userId,
      awardId: input.awardId,
      awardedDate: input.awardedDate,
      comment: input.comment ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return this.findAwardHistory(Number(result.insertId));
  }

  findAwardHistory(id: number) {
    return this.findOne(awardHistories, id, "Award history not found.");
  }

  async updateAwardHistory(id: number, input: UpdateAwardHistoryDto) {
    await this.findAwardHistory(id);
    await this.db.update(awardHistories).set({
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.awardId !== undefined ? { awardId: input.awardId } : {}),
      ...(input.awardedDate !== undefined ? { awardedDate: input.awardedDate } : {}),
      ...(input.comment !== undefined ? { comment: input.comment } : {}),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(awardHistories.id, id));
    return this.findAwardHistory(id);
  }

  listLeaveRequests(q: Record<string, string>) {
    return this.listHrRecords(q, hrLeaveRequests, "getAllHrLeaveRequest", "totalHrLeaveRequest");
  }

  findLeaveRequest(id: number) {
    return this.findOne(hrLeaveRequests, id, "Leave request not found.");
  }

  async createLeaveRequest(input: CreateHrLeaveRequestDto) {
    await this.validateLeaveRefs(input);
    const payload = await this.leavePayload(input);
    const saved = await this.createRecord(hrLeaveRequests, payload, (id) => this.findLeaveRequest(id));
    if (this.isFinalLeaveApproval(saved.status)) await this.applyLeaveToAttendance(saved);
    return saved;
  }

  async updateLeaveRequest(id: number, input: UpdateHrLeaveRequestDto) {
    const current = await this.findLeaveRequest(id);
    await this.validateLeaveRefs(input);
    const payload = await this.leavePayload({ ...current, ...input }, id);
    await this.updateRecord(hrLeaveRequests, id, payload, () => this.findLeaveRequest(id));
    const saved = await this.findLeaveRequest(id);
    if (this.isFinalLeaveApproval(saved.status)) await this.applyLeaveToAttendance(saved);
    if (["rejected", "cancelled"].includes(String(saved.status || "").toLowerCase())) await this.clearLeaveAttendance(saved.id);
    return saved;
  }

  async leaveSummary(q: Record<string, string>) {
    const year = Number(q["year"] || new Date().getFullYear());
    const rows = await this.db.select().from(hrLeaveRequests).where(ne(hrLeaveRequests.status, "false")).orderBy(desc(hrLeaveRequests.id));
    const staffRows = await this.db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      status: users.status,
    }).from(users).where(ne(users.status, "false"));
    const byEmployee = staffRows.map((user) => {
      const userLeaves = rows.filter((row) => Number(row.userId) === Number(user.id) && Number(row.leaveYear || this.leaveYear(row.startDate)) === year);
      const approved = userLeaves.filter((row) => this.isFinalLeaveApproval(row.status));
      const pending = userLeaves.filter((row) => this.isOpenLeaveStatus(row.status));
      const entitlementDays = this.leaveEntitlementDays();
      const usedDays = approved.reduce((sum, row) => sum + Number(row.requestedDays || this.leaveDays(row.startDate, row.endDate)), 0);
      const pendingDays = pending.reduce((sum, row) => sum + Number(row.requestedDays || this.leaveDays(row.startDate, row.endDate)), 0);
      return {
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        year,
        entitlementDays,
        usedDays,
        pendingDays,
        balanceDays: Math.max(0, this.roundNumber(entitlementDays - usedDays)),
      };
    });
    const totals = byEmployee.reduce((acc, row) => ({
      employees: acc.employees + 1,
      entitlementDays: acc.entitlementDays + row.entitlementDays,
      usedDays: acc.usedDays + row.usedDays,
      pendingDays: acc.pendingDays + row.pendingDays,
      balanceDays: acc.balanceDays + row.balanceDays,
    }), { employees: 0, entitlementDays: 0, usedDays: 0, pendingDays: 0, balanceDays: 0 });
    return {
      year,
      totals: {
        ...totals,
        usedDays: this.roundNumber(totals.usedDays),
        pendingDays: this.roundNumber(totals.pendingDays),
        balanceDays: this.roundNumber(totals.balanceDays),
      },
      byEmployee,
      workflow: {
        pending: rows.filter((row) => this.isOpenLeaveStatus(row.status)).length,
        managerApproved: rows.filter((row) => String(row.status || "").toLowerCase() === "manager_approved").length,
        approved: rows.filter((row) => this.isFinalLeaveApproval(row.status)).length,
        rejected: rows.filter((row) => String(row.status || "").toLowerCase() === "rejected").length,
      },
    };
  }

  listContracts(q: Record<string, string>) {
    return this.listHrRecords(q, hrContracts, "getAllHrContract", "totalHrContract");
  }

  findContract(id: number) {
    return this.findOne(hrContracts, id, "HR contract not found.");
  }

  async createContract(input: CreateHrContractDto) {
    await this.validateContractRefs(input);
    const reference = input.reference || (await this.nextContractReference(input.startDate));
    return this.createRecord(hrContracts, { ...input, reference, status: input.status || "draft" }, (id) => this.findContract(id));
  }

  async updateContract(id: number, input: UpdateHrContractDto) {
    await this.findContract(id);
    await this.validateContractRefs(input);
    return this.updateRecord(hrContracts, id, input, () => this.findContract(id));
  }

  listDocuments(q: Record<string, string>) {
    return this.listHrRecords(q, hrDocuments, "getAllHrDocument", "totalHrDocument");
  }

  findDocument(id: number) {
    return this.findOne(hrDocuments, id, "HR document not found.");
  }

  async createDocument(input: CreateHrDocumentDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    return this.createRecord(hrDocuments, input, (id) => this.findDocument(id));
  }

  async updateDocument(id: number, input: UpdateHrDocumentDto) {
    await this.findDocument(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    return this.updateRecord(hrDocuments, id, input, () => this.findDocument(id));
  }

  listExpenseRequests(q: Record<string, string>) {
    return this.listHrRecords(q, hrExpenseRequests, "getAllHrExpenseRequest", "totalHrExpenseRequest");
  }

  findExpenseRequest(id: number) {
    return this.findOne(hrExpenseRequests, id, "Expense request not found.");
  }

  async createExpenseRequest(input: CreateHrExpenseRequestDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    return this.createRecord(hrExpenseRequests, input, (id) => this.findExpenseRequest(id));
  }

  async updateExpenseRequest(id: number, input: UpdateHrExpenseRequestDto) {
    await this.findExpenseRequest(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    return this.updateRecord(hrExpenseRequests, id, input, () => this.findExpenseRequest(id));
  }

  listSocialDeclarations(q: Record<string, string>) {
    return this.listHrRecords(q, hrSocialDeclarations, "getAllHrSocialDeclaration", "totalHrSocialDeclaration");
  }

  findSocialDeclaration(id: number) {
    return this.findOne(hrSocialDeclarations, id, "Social declaration not found.");
  }

  async createSocialDeclaration(input: CreateHrSocialDeclarationDto) {
    return this.createRecord(hrSocialDeclarations, input, (id) => this.findSocialDeclaration(id));
  }

  async updateSocialDeclaration(id: number, input: UpdateHrSocialDeclarationDto) {
    await this.findSocialDeclaration(id);
    return this.updateRecord(hrSocialDeclarations, id, input, () => this.findSocialDeclaration(id));
  }

  listPerformanceReviews(q: Record<string, string>) {
    return this.listHrRecords(q, hrPerformanceReviews, "getAllHrPerformanceReview", "totalHrPerformanceReview");
  }

  findPerformanceReview(id: number) {
    return this.findOne(hrPerformanceReviews, id, "Performance review not found.");
  }

  async createPerformanceReview(input: CreateHrPerformanceReviewDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    if (input.managerId) await this.ensureExists(users, input.managerId, "Manager not found.");
    return this.createRecord(hrPerformanceReviews, input, (id) => this.findPerformanceReview(id));
  }

  async updatePerformanceReview(id: number, input: UpdateHrPerformanceReviewDto) {
    await this.findPerformanceReview(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.managerId) await this.ensureExists(users, input.managerId, "Manager not found.");
    return this.updateRecord(hrPerformanceReviews, id, input, () => this.findPerformanceReview(id));
  }

  listTrainingSessions(q: Record<string, string>) {
    return this.listHrRecords(q, hrTrainingSessions, "getAllHrTrainingSession", "totalHrTrainingSession");
  }

  findTrainingSession(id: number) {
    return this.findOne(hrTrainingSessions, id, "Training session not found.");
  }

  async createTrainingSession(input: CreateHrTrainingSessionDto) {
    return this.createRecord(hrTrainingSessions, input, (id) => this.findTrainingSession(id));
  }

  async updateTrainingSession(id: number, input: UpdateHrTrainingSessionDto) {
    await this.findTrainingSession(id);
    return this.updateRecord(hrTrainingSessions, id, input, () => this.findTrainingSession(id));
  }

  listTimesheets(q: Record<string, string>) {
    return this.listHrRecords(q, hrTimesheets, "getAllHrTimesheet", "totalHrTimesheet");
  }

  findTimesheet(id: number) {
    return this.findOne(hrTimesheets, id, "Timesheet not found.");
  }

  async createTimesheet(input: CreateHrTimesheetDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    const payload = await this.timesheetPayload(input);
    return this.createRecord(hrTimesheets, payload, (id) => this.findTimesheet(id));
  }

  async updateTimesheet(id: number, input: UpdateHrTimesheetDto) {
    const current = await this.findTimesheet(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    const payload = await this.timesheetPayload({ ...current, ...input });
    return this.updateRecord(hrTimesheets, id, payload, () => this.findTimesheet(id));
  }

  listEmployeeRequests(q: Record<string, string>) {
    return this.listHrRecords(q, hrEmployeeRequests, "getAllHrEmployeeRequest", "totalHrEmployeeRequest");
  }

  findEmployeeRequest(id: number) {
    return this.findOne(hrEmployeeRequests, id, "Employee request not found.");
  }

  async createEmployeeRequest(input: CreateHrEmployeeRequestDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    return this.createRecord(hrEmployeeRequests, input, (id) => this.findEmployeeRequest(id));
  }

  async updateEmployeeRequest(id: number, input: UpdateHrEmployeeRequestDto) {
    await this.findEmployeeRequest(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    const decision = input.status && input.status !== "pending" ? { decidedAt: sql`CURRENT_TIMESTAMP` } : {};
    return this.updateRecord(hrEmployeeRequests, id, { ...input, ...decision }, () => this.findEmployeeRequest(id));
  }

  listRecruitmentOffers(q: Record<string, string>) {
    return this.listHrRecords(q, hrRecruitmentOffers, "getAllHrRecruitmentOffer", "totalHrRecruitmentOffer");
  }

  findRecruitmentOffer(id: number) {
    return this.findOne(hrRecruitmentOffers, id, "Recruitment offer not found.");
  }

  async createRecruitmentOffer(input: CreateHrRecruitmentOfferDto) {
    if (input.departmentId) await this.ensureExists(departments, input.departmentId, "Department not found.");
    return this.createRecord(hrRecruitmentOffers, input, (id) => this.findRecruitmentOffer(id));
  }

  async updateRecruitmentOffer(id: number, input: UpdateHrRecruitmentOfferDto) {
    await this.findRecruitmentOffer(id);
    if (input.departmentId) await this.ensureExists(departments, input.departmentId, "Department not found.");
    return this.updateRecord(hrRecruitmentOffers, id, input, () => this.findRecruitmentOffer(id));
  }

  async staffOverview() {
    const rows = await this.db
      .select({
        user: users,
        role: { id: roles.id, name: roles.name },
        designation: { id: designations.id, name: designations.name },
        department: { id: departments.id, name: departments.name },
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .leftJoin(designations, eq(designations.id, users.designationId))
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .orderBy(desc(users.id));

    const userIds = rows.map((r) => r.user.id);
    const salaryMap: Record<number, number | null> = {};
    const salaryCurrencyMap: Record<number, number | null> = {};
    if (userIds.length) {
      const allSalaries = await this.db
        .select({
          userId: salaryHistories.userId,
          salary: salaryHistories.salary,
          currencyId: salaryHistories.currencyId,
        })
        .from(salaryHistories)
        .where(inArray(salaryHistories.userId, userIds))
        .orderBy(desc(salaryHistories.id));
      for (const s of allSalaries) {
        if (!(s.userId in salaryMap)) {
          salaryMap[s.userId] = s.salary;
          salaryCurrencyMap[s.userId] = s.currencyId ?? null;
        }
      }
    }

    const [allDesignations, allDepartments] = await Promise.all([
      this.db.select({ id: designations.id, name: designations.name })
        .from(designations).where(eq(designations.status, "true")).orderBy(designations.name),
      this.db.select({ id: departments.id, name: departments.name })
        .from(departments).where(eq(departments.status, "true")).orderBy(departments.name),
    ]);

    return {
      staff: rows.map((r) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, isLogin, ...safe } = r.user;
        return {
          ...safe,
          role: r.role,
          designation: r.designation,
          department: r.department,
          currentSalary: salaryMap[r.user.id] ?? null,
          currentSalaryCurrencyId: salaryCurrencyMap[r.user.id] ?? null,
        };
      }),
      total: rows.length,
      designations: allDesignations,
      departments: allDepartments,
    };
  }

  async deleteRow(table: any, id: number) {
    if (!table.status) {
      throw new BadRequestException("Soft delete is not available for this HR record type yet.");
    }
    await this.findOne(table, id, "Record not found.");
    await this.db
      .update(table)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(table.id, id));
    return { message: "Deleted successfully." };
  }

  private async listSimple(q: Record<string, string>, table: any, rowsKey: string, totalKey: string) {
    const status = q["status"];
    const where = and(
      q["query"] === "search" ? like(table.name, `%${q["key"] ?? ""}%`) : undefined,
      eq(table.status, status ?? "true"),
    );
    if (q["query"] === "all") {
      return this.db.select().from(table).where(where).orderBy(desc(table.id));
    }
    const { skip, limit } = this.pagination(q);
    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ total }] = await this.db.select({ total: count(table.id) }).from(table).where(where);
    return { [rowsKey]: rows, [totalKey]: Number(total ?? 0) };
  }

  private async listHistory(q: Record<string, string>, table: any, rowsKey: string, totalKey: string) {
    const { skip, limit } = this.pagination(q);
    const userId = q["userId"] ? Number(q["userId"]) : undefined;
    const where = userId ? eq(table.userId, userId) : undefined;
    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ total }] = await this.db.select({ total: count(table.id) }).from(table).where(where);
    return { [rowsKey]: rows, [totalKey]: Number(total ?? 0) };
  }

  private async listHrRecords(q: Record<string, string>, table: any, rowsKey: string, totalKey: string) {
    const userId = q["userId"] ? Number(q["userId"]) : undefined;
    const projectId = q["projectId"] && table.projectId ? Number(q["projectId"]) : undefined;
    const status = q["status"];
    const where = and(
      userId ? eq(table.userId, userId) : undefined,
      projectId ? eq(table.projectId, projectId) : undefined,
      status ? eq(table.status, status) : ne(table.status, "false"),
    );
    if (q["query"] === "all") {
      return this.db.select().from(table).where(where).orderBy(desc(table.id));
    }
    const { skip, limit } = this.pagination(q);
    const rows = await this.db.select().from(table).where(where).orderBy(desc(table.id)).limit(limit).offset(skip);
    const [{ total }] = await this.db.select({ total: count(table.id) }).from(table).where(where);
    return { [rowsKey]: rows, [totalKey]: Number(total ?? 0) };
  }

  private async createRecord(table: any, input: Record<string, any>, find: (id: number) => Promise<any>) {
    const [result] = await this.db.insert(table).values({
      ...this.compact(input),
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });
    return find(Number(result.insertId));
  }

  private async updateRecord(table: any, id: number, input: Record<string, any>, find: () => Promise<any>) {
    await this.db.update(table).set({
      ...this.compact(input),
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(table.id, id));
    return find();
  }

  private compact(input: Record<string, any>) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  }

  private async findOne(table: any, id: number, message: string) {
    const rows = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException(message);
    return rows[0];
  }

  private async resolveDefaultCurrency(): Promise<number | null> {
    const [row] = await this.db
      .select({ currencyId: appSettings.currencyId })
      .from(appSettings)
      .limit(1);
    return row?.currencyId ?? null;
  }

  private async ensureExists(table: any, id: number, message: string) {
    const rows = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException(message);
  }

  private async validateContractRefs(input: Partial<CreateHrContractDto>) {
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.designationId) await this.ensureExists(designations, input.designationId, "Designation not found.");
    if (input.departmentId) await this.ensureExists(departments, input.departmentId, "Department not found.");
    if (input.managerId) await this.ensureExists(users, input.managerId, "Manager not found.");
    if (input.hrResponsibleId) await this.ensureExists(users, input.hrResponsibleId, "HR responsible not found.");
    if (input.currencyId) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
  }

  private async validatePayrollRefs(input: Partial<CreateHrPayrollDto>) {
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.contractId) await this.ensureExists(hrContracts, input.contractId, "Contract not found.");
    if (input.currencyId) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
  }

  private async validateProjectRefs(input: Partial<CreateHrProjectDto>) {
    if (input.managerId) await this.ensureExists(users, input.managerId, "Project manager not found.");
    if (input.currencyId) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
  }

  private async validateProjectAssignmentRefs(input: Partial<CreateHrProjectAssignmentDto>) {
    if (input.projectId !== undefined) await this.ensureExists(hrProjects, input.projectId, "HR project not found.");
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.currencyId) await this.ensureExists(currencies, input.currencyId, "Currency not found.");
  }

  private async validateLeaveRefs(input: Partial<CreateHrLeaveRequestDto>) {
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.managerId) await this.ensureExists(users, input.managerId, "Manager not found.");
    if (input.decidedBy) await this.ensureExists(users, input.decidedBy, "Decision user not found.");
  }

  private async leavePayload(input: Partial<CreateHrLeaveRequestDto> & Record<string, any>, currentId?: number) {
    if (!input.userId) throw new BadRequestException("User is required for leave request.");
    if (!input.type) throw new BadRequestException("Leave type is required.");
    if (!input.startDate || !input.endDate) throw new BadRequestException("Leave dates are required.");
    if (String(input.endDate) < String(input.startDate)) throw new BadRequestException("Leave end date must be after start date.");

    const status = String(input.status || "pending").toLowerCase();
    const requestedDays = this.leaveDays(input.startDate, input.endDate);
    const leaveYear = this.leaveYear(input.startDate);
    const entitlementDays = this.leaveEntitlementDays(input.type);
    const balanceBefore = await this.leaveBalanceBefore(Number(input.userId), leaveYear, currentId);
    const balanceAfter = this.roundNumber(balanceBefore - (this.isFinalLeaveApproval(status) ? requestedDays : 0));
    const decisionFields: Record<string, any> = {};

    if (status === "manager_approved") {
      decisionFields.managerDecisionAt = sql`CURRENT_TIMESTAMP`;
      decisionFields.managerComment = input.managerComment ?? input.decisionComment ?? null;
    }
    if (this.isFinalLeaveApproval(status)) {
      decisionFields.hrDecisionAt = sql`CURRENT_TIMESTAMP`;
      decisionFields.decidedAt = sql`CURRENT_TIMESTAMP`;
      decisionFields.hrComment = input.hrComment ?? input.decisionComment ?? null;
    }
    if (status === "rejected") {
      decisionFields.decidedAt = sql`CURRENT_TIMESTAMP`;
    }

    return {
      userId: Number(input.userId),
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      requestedDays,
      leaveYear,
      entitlementDays,
      balanceBefore,
      balanceAfter,
      isPaid: input.isPaid === 0 ? 0 : 1,
      reason: input.reason ?? null,
      status,
      managerId: input.managerId ?? null,
      managerComment: input.managerComment ?? null,
      hrComment: input.hrComment ?? null,
      decisionComment: input.decisionComment ?? null,
      decidedBy: input.decidedBy ?? null,
      ...decisionFields,
    };
  }

  private leaveEntitlementDays(type?: string | null) {
    const value = String(type || "").toLowerCase();
    if (value.includes("maladie")) return 10;
    if (value.includes("matern")) return 98;
    if (value.includes("patern")) return 3;
    if (value.includes("mission")) return 0;
    return 24;
  }

  private leaveYear(dateValue?: string | null) {
    return Number(String(dateValue || new Date().toISOString()).slice(0, 4));
  }

  private leaveDays(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    let days = 0;
    for (let cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) days += 1;
    }
    return days || 1;
  }

  private async leaveBalanceBefore(userId: number, year: number, currentId?: number) {
    const rows = await this.db
      .select()
      .from(hrLeaveRequests)
      .where(and(eq(hrLeaveRequests.userId, userId), ne(hrLeaveRequests.status, "false")));
    const used = rows
      .filter((row) => Number(row.id) !== Number(currentId || 0))
      .filter((row) => Number(row.leaveYear || this.leaveYear(row.startDate)) === year)
      .filter((row) => this.isFinalLeaveApproval(row.status))
      .reduce((sum, row) => sum + Number(row.requestedDays || this.leaveDays(row.startDate, row.endDate)), 0);
    return this.roundNumber(this.leaveEntitlementDays() - used);
  }

  private isOpenLeaveStatus(status?: string | null) {
    return ["pending", "submitted", "manager_approved", "hr_review"].includes(String(status || "").toLowerCase());
  }

  private isFinalLeaveApproval(status?: string | null) {
    return ["approved", "hr_approved"].includes(String(status || "").toLowerCase());
  }

  private leaveDates(startDate: string, endDate: string) {
    const dates: string[] = [];
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    for (let cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
      const day = cur.getUTCDay();
      if (day !== 0 && day !== 6) dates.push(cur.toISOString().slice(0, 10));
    }
    return dates;
  }

  private async applyLeaveToAttendance(leave: any) {
    const existing = await this.db
      .select({ workDate: hrAttendances.workDate })
      .from(hrAttendances)
      .where(and(eq(hrAttendances.leaveRequestId, Number(leave.id)), ne(hrAttendances.status, "false")));
    const existingDates = new Set(existing.map((row) => String(row.workDate)));
    const dates = this.leaveDates(leave.startDate, leave.endDate).filter((date) => !existingDates.has(date));
    if (!dates.length) return;

    await this.db.insert(hrAttendances).values(dates.map((workDate) => ({
      userId: Number(leave.userId),
      workDate,
      leaveRequestId: Number(leave.id),
      workedHours: 0,
      lateMinutes: 0,
      overtimeHours: 0,
      absenceHours: 8,
      source: "leave",
      status: leave.isPaid === 0 ? "unpaid_leave" : "paid_leave",
      note: [leave.type, leave.reason].filter(Boolean).join(" - ") || "Conge approuve",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })));
  }

  private async clearLeaveAttendance(leaveRequestId: number) {
    await this.db
      .update(hrAttendances)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(hrAttendances.leaveRequestId, Number(leaveRequestId)));
  }

  private async validateAttendanceRefs(input: Partial<CreateHrAttendanceDto>) {
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    if (input.shiftId) await this.ensureExists(shifts, input.shiftId, "Shift not found.");
  }

  private async attendancePayload(input: Partial<CreateHrAttendanceDto> & Record<string, any>) {
    const userId = Number(input.userId);
    if (!userId) throw new BadRequestException("User is required for attendance.");
    if (!input.workDate) throw new BadRequestException("Work date is required for attendance.");

    const [user] = await this.db
      .select({ id: users.id, shiftId: users.shiftId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found.");

    const shiftId = input.shiftId ?? user.shiftId ?? null;
    const shift = shiftId ? await this.findShift(Number(shiftId)) : null;
    const statusInput = String(input.status || "").trim().toLowerCase();
    const normalizedStatus = statusInput && statusInput !== "auto" ? statusInput : "";
    const clockIn = this.cleanTime(input.clockIn);
    const pauseOut = this.cleanTime(input.pauseOut);
    const pauseIn = this.cleanTime(input.pauseIn);
    const clockOut = this.cleanTime(input.clockOut);
    const expectedHours = shift ? Number(shift.workHour || this.workHours(shift.startTime, shift.endTime) || 0) : 0;
    const workedHours = normalizedStatus === "absent" ? 0 : this.attendanceWorkedHours(clockIn, clockOut, pauseOut, pauseIn);
    const lateMinutes = shift && clockIn && normalizedStatus !== "absent"
      ? this.lateMinutes(clockIn, shift.startTime)
      : 0;
    const overtimeHours = this.roundNumber(Math.max(0, workedHours - expectedHours));
    const absenceHours = normalizedStatus === "absent"
      ? this.roundNumber(expectedHours)
      : this.roundNumber(Math.max(0, expectedHours - workedHours));
    const status = normalizedStatus || this.inferAttendanceStatus({ clockIn, clockOut, workedHours, lateMinutes });

    return {
      userId,
      workDate: input.workDate,
      shiftId,
      clockIn,
      pauseOut,
      pauseIn,
      clockOut,
      workedHours,
      lateMinutes,
      overtimeHours,
      absenceHours,
      source: input.source || "manual",
      status,
      note: input.note ?? null,
    };
  }

  private async timesheetPayload(input: Partial<CreateHrTimesheetDto> & Record<string, any>) {
    let projectLabel = input.project;
    let donor = input.donor ?? null;

    if (input.projectId !== undefined && input.projectId !== null) {
      const project = await this.findProject(Number(input.projectId));
      projectLabel = projectLabel || [project.code, project.name].filter(Boolean).join(" - ");
      donor = donor || project.donor || null;
    }

    if (!projectLabel || !String(projectLabel).trim()) {
      throw new BadRequestException("Project is required for timesheet entries.");
    }

    return {
      ...input,
      projectId: input.projectId ?? null,
      project: String(projectLabel).slice(0, 180),
      donor,
      hours: Number(input.hours || 0),
    };
  }

  private weightedAssignmentCost(assignment: { monthlyCost?: number | null; timePercent?: number | null }) {
    return Number(assignment.monthlyCost || 0) * Number(assignment.timePercent ?? 100) / 100;
  }

  private assignmentForDate<T extends { startDate?: string | null; endDate?: string | null; status?: string | null }>(
    assignments: T[],
    dateValue: string,
  ) {
    return assignments.find((assignment) => {
      const status = String(assignment.status || "active").toLowerCase();
      if (status === "false" || status === "ended" || status === "suspended") return false;
      if (assignment.startDate && dateValue < assignment.startDate) return false;
      if (assignment.endDate && dateValue > assignment.endDate) return false;
      return true;
    }) ?? assignments[0];
  }

  private moneyTotals<T>(rows: T[], amountOf: (row: T) => number, currencyOf: (row: T) => number | null) {
    const totals = new Map<string, { currencyId: number | null; amount: number }>();
    for (const row of rows) {
      const currencyId = currencyOf(row);
      const key = String(currencyId ?? "default");
      const current = totals.get(key) || { currencyId, amount: 0 };
      current.amount += Number(amountOf(row) || 0);
      totals.set(key, current);
    }
    return Array.from(totals.values()).filter((line) => Number(line.amount || 0) !== 0);
  }

  private addActualCost(target: any, amount: number, hours: number, currencyId: number | null) {
    if (!target) return;
    target.actualHours += hours;
    const key = String(currencyId ?? "default");
    const current = target.actualCost.find((line: any) => String(line.currencyId ?? "default") === key);
    if (current) current.amount += amount;
    else target.actualCost.push({ currencyId, amount });
  }

  private addGroupedCost(
    map: Map<string, any>,
    key: string,
    base: Record<string, any>,
    amount: number,
    hours: number,
    currencyId: number | null,
  ) {
    const row = map.get(key) || { ...base, actualCost: [], actualHours: 0 };
    this.addActualCost(row, amount, hours, currencyId);
    map.set(key, row);
  }

  private sumMoneyForCurrency(lines: Array<{ currencyId: number | null; amount: number }>, currencyId: number | null) {
    return lines
      .filter((line) => String(line.currencyId ?? "default") === String(currencyId ?? "default"))
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);
  }

  private payrollPayload(input: Partial<CreateHrPayrollDto> & Record<string, any>) {
    const n = (value: any) => Number(value || 0);
    const grossSalary = n(input.baseSalary) + n(input.transportAllowance) + n(input.housingAllowance)
      + n(input.riskAllowance) + n(input.otherAllowances) + n(input.overtimeAmount);
    const netSalary = Math.max(0, grossSalary - n(input.unpaidAbsenceDeduction) - n(input.advanceDeduction)
      - n(input.taxAmount) - n(input.cnssAmount) - n(input.otherDeductions));
    return {
      userId: input.userId,
      contractId: input.contractId ?? null,
      period: input.period,
      currencyId: input.currencyId ?? null,
      baseSalary: n(input.baseSalary),
      transportAllowance: n(input.transportAllowance),
      housingAllowance: n(input.housingAllowance),
      riskAllowance: n(input.riskAllowance),
      otherAllowances: n(input.otherAllowances),
      overtimeHours: n(input.overtimeHours),
      overtimeAmount: n(input.overtimeAmount),
      unpaidAbsenceDeduction: n(input.unpaidAbsenceDeduction),
      advanceDeduction: n(input.advanceDeduction),
      taxAmount: n(input.taxAmount),
      cnssAmount: n(input.cnssAmount),
      otherDeductions: n(input.otherDeductions),
      grossSalary,
      netSalary,
      workedDays: n(input.workedDays),
      absenceDays: n(input.absenceDays),
      paidLeaveDays: n(input.paidLeaveDays),
      status: input.status || "draft",
      notes: input.notes ?? null,
    };
  }

  private currentPayrollPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private async nextContractReference(startDate?: string | null) {
    const year = String(startDate || "").slice(0, 4) || String(new Date().getFullYear());
    const pattern = `CTR-${year}-%`;
    const [{ total }] = await this.db
      .select({ total: count(hrContracts.id) })
      .from(hrContracts)
      .where(like(hrContracts.reference, pattern));
    return `CTR-${year}-${String(Number(total || 0) + 1).padStart(4, "0")}`;
  }

  private async nextProjectCode(startDate?: string | null) {
    const year = String(startDate || "").slice(0, 4) || String(new Date().getFullYear());
    const pattern = `ONG-${year}-%`;
    const [{ total }] = await this.db
      .select({ total: count(hrProjects.id) })
      .from(hrProjects)
      .where(like(hrProjects.code, pattern));
    return `ONG-${year}-${String(Number(total || 0) + 1).padStart(4, "0")}`;
  }

  private cleanTime(value?: string | null) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    return this.normalizeTime(raw);
  }

  private minutesFromTime(value?: string | null) {
    if (!value) return null;
    const parts = this.normalizeTime(value).split(":").map(Number);
    if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) return null;
    return parts[0] * 60 + parts[1];
  }

  private minutesBetween(start?: string | null, end?: string | null) {
    const startMinutes = this.minutesFromTime(start);
    const endMinutes = this.minutesFromTime(end);
    if (startMinutes == null || endMinutes == null) return 0;
    let minutes = endMinutes - startMinutes;
    if (minutes < 0) minutes += 24 * 60;
    return minutes;
  }

  private attendanceWorkedHours(clockIn?: string | null, clockOut?: string | null, pauseOut?: string | null, pauseIn?: string | null) {
    const gross = this.minutesBetween(clockIn, clockOut);
    const pause = pauseOut && pauseIn ? this.minutesBetween(pauseOut, pauseIn) : 0;
    return this.roundHours(Math.max(0, gross - pause));
  }

  private lateMinutes(clockIn: string, shiftStart: string) {
    const inMinutes = this.minutesFromTime(clockIn);
    const startMinutes = this.minutesFromTime(shiftStart);
    if (inMinutes == null || startMinutes == null) return 0;
    let diff = inMinutes - startMinutes;
    if (diff < -720) diff += 24 * 60;
    return Math.max(0, diff);
  }

  private inferAttendanceStatus(input: { clockIn?: string | null; clockOut?: string | null; workedHours: number; lateMinutes: number }) {
    if (!input.clockIn && !input.clockOut) return "absent";
    if (!input.clockIn || !input.clockOut || input.workedHours <= 0) return "partial";
    if (input.lateMinutes > 0) return "late";
    return "present";
  }

  private roundHours(minutesOrHours: number) {
    return Math.round((minutesOrHours / 60) * 100) / 100;
  }

  private roundNumber(value: number) {
    return Math.round(value * 100) / 100;
  }

  private normalizeTime(value: string) {
    return value.length === 5 ? `${value}:00` : value;
  }

  private workHours(start: string, end: string) {
    const [sh, sm] = this.normalizeTime(start).split(":").map(Number);
    const [eh, em] = this.normalizeTime(end).split(":").map(Number);
    let minutes = eh * 60 + em - (sh * 60 + sm);
    if (minutes < 0) minutes += 24 * 60;
    return Math.round((minutes / 60) * 100) / 100;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}
