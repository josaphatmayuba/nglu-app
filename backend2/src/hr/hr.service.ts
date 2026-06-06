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
  hrDocuments,
  hrExpenseRequests,
  hrLeaveRequests,
  hrPerformanceReviews,
  hrRecruitmentOffers,
  hrSocialDeclarations,
  hrTrainingSessions,
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
  CreateHrDocumentDto,
  CreateHrExpenseRequestDto,
  CreateHrLeaveRequestDto,
  CreateHrPerformanceReviewDto,
  CreateHrRecruitmentOfferDto,
  CreateHrSocialDeclarationDto,
  CreateHrTrainingSessionDto,
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
    await this.ensureExists(users, input.userId, "User not found.");
    return this.createRecord(hrLeaveRequests, input, (id) => this.findLeaveRequest(id));
  }

  async updateLeaveRequest(id: number, input: UpdateHrLeaveRequestDto) {
    await this.findLeaveRequest(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
    const decision = input.status && input.status !== "pending" ? { decidedAt: sql`CURRENT_TIMESTAMP` } : {};
    return this.updateRecord(hrLeaveRequests, id, { ...input, ...decision }, () => this.findLeaveRequest(id));
  }

  listContracts(q: Record<string, string>) {
    return this.listHrRecords(q, hrContracts, "getAllHrContract", "totalHrContract");
  }

  findContract(id: number) {
    return this.findOne(hrContracts, id, "HR contract not found.");
  }

  async createContract(input: CreateHrContractDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    return this.createRecord(hrContracts, input, (id) => this.findContract(id));
  }

  async updateContract(id: number, input: UpdateHrContractDto) {
    await this.findContract(id);
    if (input.userId !== undefined) await this.ensureExists(users, input.userId, "User not found.");
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
    const status = q["status"];
    const where = and(
      userId ? eq(table.userId, userId) : undefined,
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
