import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  awardHistories,
  awards,
  designationHistories,
  designations,
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
  CreateSalaryHistoryDto,
  CreateShiftDto,
  UpdateAwardDto,
  UpdateAwardHistoryDto,
  UpdateDesignationDto,
  UpdateDesignationHistoryDto,
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
    const [result] = await this.db.insert(salaryHistories).values({
      userId: input.userId,
      salary: input.salary,
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
    await this.db.update(salaryHistories).set({
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
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

  async deleteRow(table: any, id: number) {
    await this.db.delete(table).where(eq(table.id, id));
    return { message: "Deleted successfully." };
  }

  private async listSimple(q: Record<string, string>, table: any, rowsKey: string, totalKey: string) {
    const status = q["status"];
    const where = q["query"] === "search"
      ? like(table.name, `%${q["key"] ?? ""}%`)
      : status ? eq(table.status, status) : undefined;
    if (q["query"] === "all") {
      return this.db.select().from(table).where(eq(table.status, "true")).orderBy(desc(table.id));
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

  private async findOne(table: any, id: number, message: string) {
    const rows = await this.db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException(message);
    return rows[0];
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
