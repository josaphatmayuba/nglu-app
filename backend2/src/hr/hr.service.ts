import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, count, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { createHash, randomBytes } from "crypto";

type HrUploadedFile = { originalname: string; buffer: Buffer; size: number; mimetype: string };
import { DRIZZLE } from "../database/database.constants";
import { SystemEmailService } from "../system-email/system-email.service";
import { env } from "../config/env";
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
  hrCandidates,
  hrCandidateEvaluations,
  hrDocuments,
  hrPersonalDocuments,
  hrTaxRules,
  hrPublicHolidays,
  hrLeaveEntitlements,
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
  CreateHrPersonalDocumentDto,
  CreateHrTaxRuleDto,
  UpdateHrTaxRuleDto,
  CreateHrPublicHolidayDto,
  UpdateHrPublicHolidayDto,
  CreateHrLeaveEntitlementDto,
  UpdateHrLeaveEntitlementDto,
} from "./dto/hr.dto";

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly emails: SystemEmailService,
  ) {}

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

  async payrollPdfHtml(id: number): Promise<string> {
    const payroll = await this.findPayroll(id) as Record<string, any>;
    const [userRow] = await this.db.select({ firstName: users.firstName, lastName: users.lastName, employeeId: users.employeeId })
      .from(users).where(eq(users.id, Number(payroll.userId))).limit(1);
    const [currencyRow] = payroll.currencyId
      ? await this.db.select({ currencyCode: currencies.currencyCode }).from(currencies).where(eq(currencies.id, Number(payroll.currencyId))).limit(1)
      : [null];

    const [settingRow] = await this.db.select({ companyName: appSettings.companyName }).from(appSettings).limit(1);
    const orgName = settingRow?.companyName || "Mon Organisation";
    const employeeName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(" ") || `Employé #${payroll.userId}`;
    const matricule = userRow?.employeeId || `EMP-${String(payroll.userId).padStart(6, "0")}`;
    const curr = currencyRow?.currencyCode || "USD";
    const fmt = (v: any) => Number(v || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const statusLabels: Record<string, string> = { draft: "Brouillon", validated: "Validé", paid: "Payé" };
    const statusColors: Record<string, string> = { draft: "#f59e0b", validated: "#3b82f6", paid: "#10b981" };
    const status = String(payroll.status || "draft");
    const periodLabel = (() => {
      const [y, m] = String(payroll.period || "").split("-");
      if (!y || !m) return payroll.period || "";
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    })();
    const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Fiche de paie — ${employeeName} — ${periodLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111;background:#fff;padding:40px 48px;max-width:800px;margin:0 auto}
@media print{body{padding:20px 24px}@page{margin:1cm}}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #14b8a6;padding-bottom:16px;margin-bottom:24px}
.org-name{font-size:18px;font-weight:700;color:#14b8a6;letter-spacing:1px}
.org-sub{font-size:11px;color:#666;margin-top:2px}
.doc-title{text-align:right}
.doc-title h1{font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.doc-title .period{font-size:13px;color:#444;margin-top:2px}
.status-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#fff;background:${statusColors[status] || "#999"};margin-top:4px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 16px}
.info-box label{font-size:10px;text-transform:uppercase;color:#666;letter-spacing:.5px;display:block;margin-bottom:2px}
.info-box value{font-size:13px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.4px;padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px}
tr:last-child td{border-bottom:none}
.amount{text-align:right;font-variant-numeric:tabular-nums}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;color:#14b8a6;letter-spacing:.5px;margin:20px 0 8px}
.total-row td{font-weight:700;background:#f8fafc;border-top:2px solid #e2e8f0;border-bottom:2px solid #e2e8f0}
.net-row td{font-weight:700;font-size:15px;background:#14b8a6;color:#fff}
.net-row .amount{color:#fff}
.days-row{display:flex;gap:16px;margin-bottom:20px}
.day-box{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;text-align:center}
.day-box .val{font-size:20px;font-weight:700;color:#14b8a6}
.day-box .lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
.footer{display:flex;justify-content:space-between;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#999}
.sig-block{text-align:right}
.sig-line{margin-top:40px;border-top:1px solid #999;min-width:160px;padding-top:4px;font-size:11px;color:#666}
.notes{font-size:11px;color:#666;font-style:italic;margin-top:8px}
</style></head><body>
<div class="header">
  <div><div class="org-name">${orgName}</div><div class="org-sub">Document RH officiel — Confidentiel</div></div>
  <div class="doc-title">
    <h1>Bulletin de paie</h1>
    <div class="period">${periodLabel}</div>
    <span class="status-badge">${statusLabels[status] || status}</span>
  </div>
</div>

<div class="info-grid">
  <div class="info-box"><label>Employé</label><value>${employeeName}</value></div>
  <div class="info-box"><label>Matricule</label><value>${matricule}</value></div>
  <div class="info-box"><label>Période</label><value>${periodLabel}</value></div>
  <div class="info-box"><label>Devise</label><value>${curr}</value></div>
</div>

<div class="days-row">
  <div class="day-box"><div class="val">${fmt(payroll.workedDays)}</div><div class="lbl">Jours travaillés</div></div>
  <div class="day-box"><div class="val">${fmt(payroll.paidLeaveDays)}</div><div class="lbl">Congés payés</div></div>
  <div class="day-box"><div class="val">${fmt(payroll.absenceDays)}</div><div class="lbl">Absences</div></div>
  <div class="day-box"><div class="val">${fmt(payroll.overtimeHours)}</div><div class="lbl">H. supp.</div></div>
</div>

<div class="section-title">Éléments de rémunération</div>
<table>
  <thead><tr><th>Libellé</th><th class="amount">Montant (${curr})</th></tr></thead>
  <tbody>
    <tr><td>Salaire de base</td><td class="amount">${fmt(payroll.baseSalary)}</td></tr>
    ${Number(payroll.transportAllowance) > 0 ? `<tr><td>Indemnité de transport</td><td class="amount">${fmt(payroll.transportAllowance)}</td></tr>` : ""}
    ${Number(payroll.housingAllowance) > 0 ? `<tr><td>Indemnité de logement</td><td class="amount">${fmt(payroll.housingAllowance)}</td></tr>` : ""}
    ${Number(payroll.riskAllowance) > 0 ? `<tr><td>Prime de risque</td><td class="amount">${fmt(payroll.riskAllowance)}</td></tr>` : ""}
    ${Number(payroll.otherAllowances) > 0 ? `<tr><td>Autres primes</td><td class="amount">${fmt(payroll.otherAllowances)}</td></tr>` : ""}
    ${Number(payroll.overtimeAmount) > 0 ? `<tr><td>Heures supplémentaires (${fmt(payroll.overtimeHours)} h)</td><td class="amount">${fmt(payroll.overtimeAmount)}</td></tr>` : ""}
    <tr class="total-row"><td>Salaire brut</td><td class="amount">${fmt(payroll.grossSalary)}</td></tr>
  </tbody>
</table>

<div class="section-title">Retenues</div>
<table>
  <thead><tr><th>Libellé</th><th class="amount">Montant (${curr})</th></tr></thead>
  <tbody>
    ${Number(payroll.unpaidAbsenceDeduction) > 0 ? `<tr><td>Absences non payées</td><td class="amount">- ${fmt(payroll.unpaidAbsenceDeduction)}</td></tr>` : ""}
    ${Number(payroll.advanceDeduction) > 0 ? `<tr><td>Avance sur salaire</td><td class="amount">- ${fmt(payroll.advanceDeduction)}</td></tr>` : ""}
    ${Number(payroll.taxAmount) > 0 ? `<tr><td>Impôts (IPR)</td><td class="amount">- ${fmt(payroll.taxAmount)}</td></tr>` : ""}
    ${Number(payroll.cnssAmount) > 0 ? `<tr><td>CNSS</td><td class="amount">- ${fmt(payroll.cnssAmount)}</td></tr>` : ""}
    ${Number(payroll.otherDeductions) > 0 ? `<tr><td>Autres retenues</td><td class="amount">- ${fmt(payroll.otherDeductions)}</td></tr>` : ""}
    ${[payroll.unpaidAbsenceDeduction, payroll.advanceDeduction, payroll.taxAmount, payroll.cnssAmount, payroll.otherDeductions].every((v) => !Number(v))
      ? `<tr><td colspan="2" style="color:#999;font-style:italic;text-align:center">Aucune retenue ce mois</td></tr>` : ""}
  </tbody>
</table>

<table>
  <tbody>
    <tr class="net-row"><td>NET À PAYER</td><td class="amount">${fmt(payroll.netSalary)} ${curr}</td></tr>
  </tbody>
</table>

${payroll.notes ? `<div class="notes">Note : ${payroll.notes}</div>` : ""}

<div class="footer">
  <div>Émis le ${today} · Réf bulletin #${payroll.id}</div>
  <div class="sig-block">
    <div>Signature autorisée</div>
    <div class="sig-line">Date et signature</div>
  </div>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`;
  }

  // Rendu HTML -> PDF via Puppeteer (mutualisé entre fiches de paie et documents RH).
  private async htmlToPdf(html: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require("puppeteer");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // Alpine: le binaire chromium peut etre /usr/bin/chromium OU /usr/bin/chromium-browser.
    // On resout le 1er chemin existant (la var d'env peut pointer un chemin absent -> 500).
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ].filter(Boolean) as string[];
    const executablePath = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      // Retire le script d'auto-impression éventuel avant la génération PDF.
      const cleanHtml = html.replace(/<script>window\.onload.*?<\/script>/s, "");
      await page.setContent(cleanHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" } });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async generatePayrollPdf(id: number): Promise<Buffer> {
    const html = await this.payrollPdfHtml(id);
    return this.htmlToPdf(html);
  }

  // PDF d'un document RH déjà généré (réutilise le HTML stocké dans `content`).
  async documentPdf(id: number): Promise<{ buffer: Buffer; reference: string }> {
    const doc = await this.findDocument(id) as Record<string, any>;
    const html = String(doc.content || "");
    if (!html.trim()) throw new BadRequestException("This document has no content to render.");
    const buffer = await this.htmlToPdf(html);
    return { buffer, reference: String(doc.reference || `document-${id}`) };
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

  async submitPayroll(id: number, submittedBy?: number | null) {
    const current = await this.findPayroll(id) as Record<string, any>;
    const status = String(current.status || "draft");
    if (!["draft", "rejected"].includes(status)) throw new BadRequestException(`Cannot submit a payroll with status "${status}".`);
    await this.db.update(hrPayrolls).set({
      status: "pending_approval",
      submittedBy: submittedBy ?? null,
      submittedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrPayrolls.id, id));
    return this.findPayroll(id);
  }

  // L'approbation/rejet d'un bulletin est réservé au supérieur hiérarchique
  // de l'employé (managerId du contrat actif). Si aucun manager n'est défini
  // sur le contrat, on n'impose pas la contrainte pour ne pas bloquer les
  // données existantes. actorUserId vient du JWT (non du body, non falsifiable).
  private async assertSupervisor(payrollUserId: number, actorUserId?: number | null) {
    const [contract] = await this.db.select({ managerId: hrContracts.managerId })
      .from(hrContracts)
      .where(and(eq(hrContracts.userId, payrollUserId), ne(hrContracts.status, "terminated")))
      .orderBy(desc(hrContracts.id))
      .limit(1);
    const managerId = contract?.managerId ?? null;
    if (managerId && managerId !== actorUserId) {
      throw new ForbiddenException("Only the employee's supervisor can approve or reject this payroll.");
    }
  }

  async approvePayroll(id: number, approvedBy?: number | null, comment?: string | null) {
    const current = await this.findPayroll(id) as Record<string, any>;
    if (String(current.status) !== "pending_approval") throw new BadRequestException(`Cannot approve a payroll with status "${current.status}".`);
    await this.assertSupervisor(Number(current.userId), approvedBy);
    await this.db.update(hrPayrolls).set({
      status: "validated",
      approvedBy: approvedBy ?? null,
      approvedAt: sql`CURRENT_TIMESTAMP`,
      approvalComment: comment ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrPayrolls.id, id));
    return this.findPayroll(id);
  }

  async rejectPayroll(id: number, rejectedBy?: number | null, comment?: string | null) {
    const current = await this.findPayroll(id) as Record<string, any>;
    if (String(current.status) !== "pending_approval") throw new BadRequestException(`Cannot reject a payroll with status "${current.status}".`);
    await this.assertSupervisor(Number(current.userId), rejectedBy);
    await this.db.update(hrPayrolls).set({
      status: "rejected",
      rejectedBy: rejectedBy ?? null,
      rejectedAt: sql`CURRENT_TIMESTAMP`,
      rejectionComment: comment ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrPayrolls.id, id));
    return this.findPayroll(id);
  }

  async markPayrollPaid(id: number, paidBy?: number | null) {
    const current = await this.findPayroll(id) as Record<string, any>;
    if (String(current.status) !== "validated") throw new BadRequestException(`Cannot mark as paid a payroll with status "${current.status}". Validate it first.`);
    await this.db.update(hrPayrolls).set({
      status: "paid",
      paidBy: paidBy ?? null,
      paidAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrPayrolls.id, id));
    return this.findPayroll(id);
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

    // Resolve tax rule: use employee country, fallback to org default
    const [userRow] = await this.db.select({ country: users.country }).from(users).where(eq(users.id, userId)).limit(1);
    const countryCode = (userRow?.country || "").trim().toUpperCase().slice(0, 10);
    let taxRule: typeof hrTaxRules.$inferSelect | null = null;
    if (countryCode) {
      const rules = await this.db.select().from(hrTaxRules)
        .where(and(eq(hrTaxRules.countryCode, countryCode), eq(hrTaxRules.isActive, 1)))
        .limit(1);
      taxRule = rules[0] ?? null;
    }

    const grossBeforeCnss = baseSalary + transportAllowance + housingAllowance + overtimeAmount;
    const cnssAmount = taxRule ? this.roundNumber(grossBeforeCnss * Number(taxRule.cnssEmployeeRate || 0)) : 0;
    const taxableBase = Math.max(0, grossBeforeCnss - cnssAmount - unpaidAbsenceDeduction);
    const taxAmount = taxRule ? this.computeIpr(taxableBase, taxRule) : 0;

    return {
      userId,
      contractId: contract?.id ?? null,
      period,
      periodStart,
      periodEnd,
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
      taxAmount,
      cnssAmount,
      otherDeductions: 0,
      workedDays: this.roundNumber(workedDays),
      absenceDays: this.roundNumber(absenceDays),
      paidLeaveDays: this.roundNumber(paidLeaveDays),
      status: "draft",
      notes: `Genere automatiquement depuis contrat + presence pour ${period}${taxRule ? ` (${taxRule.countryCode})` : ""}`,
    };
  }

  private computeIpr(taxableBase: number, taxRule: typeof hrTaxRules.$inferSelect): number {
    const brackets = taxRule.iprBrackets as Array<{ upTo: number | null; rate: number }> | null;
    if (brackets && brackets.length > 0) {
      let tax = 0;
      let prev = 0;
      for (const bracket of brackets) {
        const ceil = bracket.upTo ?? Infinity;
        const slice = Math.min(taxableBase, ceil) - prev;
        if (slice <= 0) break;
        tax += slice * bracket.rate;
        prev = ceil;
        if (taxableBase <= ceil) break;
      }
      return this.roundNumber(tax);
    }
    return this.roundNumber(taxableBase * Number(taxRule.iprRate || 0));
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
        donor: project.donor || "Sans financeur",
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
      const donor = project.donor || row.donor || "Sans financeur";
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
    await this.assertNoLockedPayroll(Number(input.userId), String(input.startDate), String(input.endDate));
    const payload = await this.leavePayload(input);
    const saved = await this.createRecord(hrLeaveRequests, payload, (id) => this.findLeaveRequest(id));
    if (this.isFinalLeaveApproval(saved.status)) await this.applyLeaveToAttendance(saved);
    return saved;
  }

  async updateLeaveRequest(id: number, input: UpdateHrLeaveRequestDto) {
    const current = await this.findLeaveRequest(id);
    await this.validateLeaveRefs(input);
    const userId = Number(input.userId ?? current.userId);
    // Verrou sur l'ancienne ET la nouvelle plage (déplacer hors/dans une période verrouillée).
    await this.assertNoLockedPayroll(userId, String(current.startDate), String(current.endDate));
    await this.assertNoLockedPayroll(userId, String(input.startDate ?? current.startDate), String(input.endDate ?? current.endDate));
    const payload = await this.leavePayload({ ...current, ...input }, id);
    await this.updateRecord(hrLeaveRequests, id, payload, () => this.findLeaveRequest(id));
    const saved = await this.findLeaveRequest(id);
    if (this.isFinalLeaveApproval(saved.status)) await this.applyLeaveToAttendance(saved);
    if (["rejected", "cancelled"].includes(String(saved.status || "").toLowerCase())) await this.clearLeaveAttendance(saved.id);
    return saved;
  }

  async deleteLeaveRequest(id: number) {
    const current = await this.findLeaveRequest(id);
    await this.assertNoLockedPayroll(Number(current.userId), String(current.startDate), String(current.endDate));
    return this.deleteRow(hrLeaveRequests, id);
  }

  async leaveSummary(q: Record<string, string>) {
    const year = Number(q["year"] || new Date().getFullYear());
    const rows = await this.db.select().from(hrLeaveRequests).where(ne(hrLeaveRequests.status, "false")).orderBy(desc(hrLeaveRequests.id));
    const staffRows = await this.db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      status: users.status,
      country: users.country,
    }).from(users).where(ne(users.status, "false"));
    const byEmployee = await Promise.all(staffRows.map(async (user) => {
      const userLeaves = rows.filter((row) => Number(row.userId) === Number(user.id) && Number(row.leaveYear || this.leaveYear(row.startDate)) === year);
      const approved = userLeaves.filter((row) => this.isFinalLeaveApproval(row.status));
      const pending = userLeaves.filter((row) => this.isOpenLeaveStatus(row.status));
      const country = (user.country || "").trim().toUpperCase().slice(0, 10);
      const entitlementDays = await this.resolveEntitlementDays(country, "conge_annuel");
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
    }));
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

  // Workflow document RH : draft/rejected -> pending_validation -> approved -> signed.
  async submitDocument(id: number, submittedBy?: number | null) {
    const current = await this.findDocument(id) as Record<string, any>;
    const status = String(current.status || "draft");
    if (!["draft", "received", "rejected"].includes(status)) {
      throw new BadRequestException(`Cannot submit a document with status "${status}".`);
    }
    await this.db.update(hrDocuments).set({
      status: "pending_validation",
      submittedBy: submittedBy ?? null,
      submittedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrDocuments.id, id));
    return this.findDocument(id);
  }

  async approveDocument(id: number, approvedBy?: number | null, comment?: string | null) {
    const current = await this.findDocument(id) as Record<string, any>;
    if (String(current.status) !== "pending_validation") {
      throw new BadRequestException(`Cannot approve a document with status "${current.status}".`);
    }
    await this.db.update(hrDocuments).set({
      status: "approved",
      approvedBy: approvedBy ?? null,
      approvedAt: sql`CURRENT_TIMESTAMP`,
      approvalComment: comment ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrDocuments.id, id));
    return this.findDocument(id);
  }

  async rejectDocument(id: number, rejectedBy?: number | null, comment?: string | null) {
    const current = await this.findDocument(id) as Record<string, any>;
    if (String(current.status) !== "pending_validation") {
      throw new BadRequestException(`Cannot reject a document with status "${current.status}".`);
    }
    await this.db.update(hrDocuments).set({
      status: "rejected",
      rejectedBy: rejectedBy ?? null,
      rejectedAt: sql`CURRENT_TIMESTAMP`,
      rejectionComment: comment ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrDocuments.id, id));
    return this.findDocument(id);
  }

  // Empreinte d'intégrité du contenu signé (signature électronique niveau 1).
  private hashDocumentContent(content: string): string {
    return createHash("sha256").update(content ?? "", "utf8").digest("hex");
  }

  async signDocument(id: number, signedBy: string) {
    const current = await this.findDocument(id) as Record<string, any>;
    if (!signedBy?.trim()) throw new BadRequestException("Signed-by name is required.");
    if (String(current.status) !== "approved") {
      throw new BadRequestException(`A document must be approved before signing (current status "${current.status}").`);
    }
    const contentHash = this.hashDocumentContent(String(current.content || ""));
    const signatureToken = randomBytes(16).toString("hex");
    await this.db.update(hrDocuments).set({
      status: "signed",
      signedBy: signedBy.trim(),
      signedAt: sql`CURRENT_TIMESTAMP`,
      contentHash,
      signatureToken,
      signatureAlgorithm: "SHA-256",
      updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(hrDocuments.id, id));
    return this.findDocument(id);
  }

  // Vérifie qu'un document signé n'a pas été altéré depuis sa signature.
  async verifyDocumentSignature(id: number) {
    const doc = await this.findDocument(id) as Record<string, any>;
    if (String(doc.status) !== "signed" || !doc.contentHash) {
      return { valid: false, signed: false, reason: "Document is not signed." };
    }
    const currentHash = this.hashDocumentContent(String(doc.content || ""));
    const valid = currentHash === String(doc.contentHash);
    return {
      valid,
      signed: true,
      reason: valid ? "Content matches the signed hash." : "Content has been altered since signing.",
      signedBy: doc.signedBy ?? null,
      signedAt: doc.signedAt ?? null,
      signatureToken: doc.signatureToken ?? null,
      algorithm: doc.signatureAlgorithm ?? null,
      expectedHash: doc.contentHash,
      currentHash,
    };
  }

  async documentSummary() {
    const rows = await this.db.select().from(hrDocuments).where(ne(hrDocuments.status, "false"));
    const byType = rows.reduce((acc: Record<string, number>, r) => {
      const t = r.documentType || "Autre";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    return {
      total: rows.length,
      generated: rows.filter((r) => r.templateType != null).length,
      signed: rows.filter((r) => String(r.status || "") === "signed").length,
      pending: rows.filter((r) => ["draft", "pending", "received"].includes(String(r.status || ""))).length,
      employees: new Set(rows.map((r) => r.userId)).size,
      byType,
    };
  }

  async generateDocument(input: GenerateHrDocumentDto) {
    await this.ensureExists(users, input.userId, "User not found.");
    const [userRow] = await this.db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    const contracts = await this.db.select().from(hrContracts)
      .where(and(eq(hrContracts.userId, input.userId), ne(hrContracts.status, "terminated")))
      .orderBy(desc(hrContracts.id)).limit(1);
    const contract = contracts[0] ?? null;

    const [settingRow] = await this.db.select({ companyName: appSettings.companyName }).from(appSettings).limit(1);
    const orgName = settingRow?.companyName || "Mon Organisation";
    const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    const employeeName = [userRow.firstName, userRow.lastName].filter(Boolean).join(" ");
    const poste = contract?.designationId ? `Poste #${contract.designationId}` : "Non defini";
    const dateDebut = contract?.startDate ? new Date(contract.startDate).toLocaleDateString("fr-FR") : "Non defini";
    const salaire = contract?.baseSalary ? `${contract.baseSalary}` : "0";
    const typeContrat = contract?.contractType || "Non defini";
    const reference = contract?.reference || `REF-${input.userId}-${new Date().getFullYear()}`;

    const content = this.renderDocumentTemplate(input.templateType, {
      orgName, today, employeeName, poste, dateDebut, salaire, typeContrat, reference,
      userId: input.userId,
    });

    const docType = this.templateTypeLabel(input.templateType);
    const version = await this.nextDocumentVersion(input.userId, input.templateType);
    const docRef = `${input.templateType.toUpperCase().slice(0, 4)}-${String(input.userId).padStart(4, "0")}-${new Date().getFullYear()}-v${version}`;

    return this.createRecord(hrDocuments, {
      userId: input.userId,
      documentType: docType,
      reference: docRef,
      templateType: input.templateType,
      version,
      content,
      status: "draft",
      generatedBy: input.generatedBy ?? null,
      generatedAt: sql`CURRENT_TIMESTAMP`,
      note: `Genere automatiquement le ${today}`,
    }, (id) => this.findDocument(id));
  }

  private async nextDocumentVersion(userId: number, templateType: string) {
    const rows = await this.db.select({ id: hrDocuments.id })
      .from(hrDocuments)
      .where(and(eq(hrDocuments.userId, userId), eq(hrDocuments.templateType, templateType)));
    return rows.length + 1;
  }

  private templateTypeLabel(templateType: string) {
    const labels: Record<string, string> = {
      contrat: "Contrat de travail",
      avenant: "Avenant au contrat",
      attestation: "Attestation de travail",
      certificat: "Certificat de travail",
      disciplinaire: "Lettre disciplinaire",
      conge: "Autorisation de conge",
    };
    return labels[templateType] || templateType;
  }

  private renderDocumentTemplate(templateType: string, ctx: Record<string, any>) {
    const header = `<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:40px 48px;color:#1a1a1a">
<div style="text-align:center;margin-bottom:32px">
  <div style="font-size:20px;font-weight:700;letter-spacing:1px">${ctx.orgName}</div>
  <div style="font-size:12px;color:#666;margin-top:4px">Document RH officiel</div>
</div>`;
    const footer = `<div style="margin-top:48px;border-top:1px solid #ddd;padding-top:20px;display:flex;justify-content:space-between">
  <div><div style="font-size:11px;color:#999">Emis le ${ctx.today}</div></div>
  <div style="text-align:right"><div style="font-size:12px;font-weight:600">Signature autorisee</div>
  <div style="margin-top:40px;border-top:1px solid #999;padding-top:4px;min-width:160px;font-size:11px;color:#999">Date et signature</div></div>
</div></div>`;

    if (templateType === "contrat") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">CONTRAT DE TRAVAIL - ${ctx.typeContrat.toUpperCase()}</h2>
<p>Ref: <strong>${ctx.reference}</strong></p>
<p>Entre <strong>${ctx.orgName}</strong> (l'Employeur) et <strong>${ctx.employeeName}</strong> (l'Employe),</p>
<p>il est convenu et arrete ce qui suit :</p>
<h3 style="font-size:13px;margin-top:20px">Article 1 — Engagement</h3>
<p>L'Employeur engage l'Employe a compter du <strong>${ctx.dateDebut}</strong> au poste de <strong>${ctx.poste}</strong>.</p>
<h3 style="font-size:13px;margin-top:16px">Article 2 — Nature du contrat</h3>
<p>Le present contrat est un contrat de type <strong>${ctx.typeContrat}</strong>.</p>
<h3 style="font-size:13px;margin-top:16px">Article 3 — Remuneration</h3>
<p>L'Employe percevra un salaire de base mensuel brut de <strong>${ctx.salaire}</strong>.</p>
<h3 style="font-size:13px;margin-top:16px">Article 4 — Obligations</h3>
<p>L'Employe s'engage a respecter le reglement interieur, la politique de protection et sauvegarde, et le code de conduite de l'organisation.</p>
${footer}`;

    if (templateType === "attestation") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">ATTESTATION DE TRAVAIL</h2>
<p>Je soussigne(e), representant(e) de <strong>${ctx.orgName}</strong>, atteste par la presente que :</p>
<p><strong>${ctx.employeeName}</strong> est employe(e) au sein de notre organisation depuis le <strong>${ctx.dateDebut}</strong>,
au poste de <strong>${ctx.poste}</strong>.</p>
<p>Cette attestation est delivree a l'interesse(e) pour faire valoir ce que de droit.</p>
<p>Fait a _______________, le ${ctx.today}</p>
${footer}`;

    if (templateType === "certificat") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">CERTIFICAT DE TRAVAIL</h2>
<p>Nous certifions que <strong>${ctx.employeeName}</strong> a ete employe(e) au sein de <strong>${ctx.orgName}</strong>
a compter du <strong>${ctx.dateDebut}</strong>, en qualite de <strong>${ctx.poste}</strong>.</p>
<p>Durant cette periode, cet(te) employe(e) a accompli ses fonctions avec serieux et professionnalisme.</p>
<p>Le present certificat est etabli a la demande de l'interesse(e) et lui est remis pour servir et valoir ce que de droit.</p>
<p>Fait a _______________, le ${ctx.today}</p>
${footer}`;

    if (templateType === "avenant") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">AVENANT AU CONTRAT DE TRAVAIL</h2>
<p>Ref: <strong>${ctx.reference}-AV</strong></p>
<p>Entre <strong>${ctx.orgName}</strong> et <strong>${ctx.employeeName}</strong>,</p>
<p>il est convenu de modifier les conditions du contrat initial comme suit :</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
  <tr style="background:#f5f5f5"><th style="padding:8px;text-align:left;border:1px solid #ddd">Element</th><th style="padding:8px;text-align:left;border:1px solid #ddd">Ancienne valeur</th><th style="padding:8px;text-align:left;border:1px solid #ddd">Nouvelle valeur</th></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Poste</td><td style="padding:8px;border:1px solid #ddd">${ctx.poste}</td><td style="padding:8px;border:1px solid #ddd">________________</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">Salaire brut</td><td style="padding:8px;border:1px solid #ddd">${ctx.salaire}</td><td style="padding:8px;border:1px solid #ddd">________________</td></tr>
</table>
<p>Toutes les autres clauses du contrat restent inchangees.</p>
<p>Fait a _______________, le ${ctx.today}</p>
${footer}`;

    if (templateType === "disciplinaire") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">LETTRE DISCIPLINAIRE</h2>
<p>A l'attention de : <strong>${ctx.employeeName}</strong><br>Poste : <strong>${ctx.poste}</strong></p>
<p>Monsieur / Madame,</p>
<p>Nous avons constate un manquement aux obligations professionnelles et/ou au reglement interieur de l'organisation.</p>
<p><strong>Faits reproches :</strong></p>
<p style="min-height:60px;border:1px dashed #ccc;padding:12px;border-radius:4px;color:#666">[ A completer ]</p>
<p>En consequence, nous vous notifions la sanction suivante : ________________</p>
<p>Nous vous invitons a prendre connaissance de ce courrier et a nous retourner le present document signe pour accuse de reception.</p>
<p>Fait a _______________, le ${ctx.today}</p>
${footer}`;

    if (templateType === "conge") return `${header}
<h2 style="text-align:center;font-size:16px;font-weight:700;margin-bottom:24px">AUTORISATION DE CONGE</h2>
<p>Il est autorise a <strong>${ctx.employeeName}</strong> (${ctx.poste}) de s'absenter du :</p>
<p style="margin:16px 0"><strong>Du :</strong> ______________ <strong>Au :</strong> ______________ (inclus)</p>
<p><strong>Nature du conge :</strong> ________________</p>
<p><strong>Nombre de jours :</strong> ________________</p>
<p>La reprise du travail est prevue le : ______________</p>
<p>Fait a _______________, le ${ctx.today}</p>
${footer}`;

    return `${header}<p>Template <strong>${templateType}</strong> non reconnu.</p>${footer}`;
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

  // ─── Stade 9: Recrutement / Candidats ────────────────────────────────────────

  listCandidates(q: Record<string, string>) {
    return this.listHrRecords(q, hrCandidates, "getAllHrCandidate", "totalHrCandidate");
  }

  findCandidate(id: number) {
    return this.findOne(hrCandidates, id, "Candidate not found.");
  }

  async createCandidate(input: CreateHrCandidateDto) {
    if (input.offerId) await this.ensureExists(hrRecruitmentOffers, input.offerId, "Recruitment offer not found.");
    return this.createRecord(hrCandidates, input, (id) => this.findCandidate(id));
  }

  async updateCandidate(id: number, input: UpdateHrCandidateDto) {
    const previous = await this.findCandidate(id) as Record<string, any>;
    if (input.offerId) await this.ensureExists(hrRecruitmentOffers, input.offerId, "Recruitment offer not found.");
    const updated = await this.updateRecord(hrCandidates, id, input, () => this.findCandidate(id)) as Record<string, any>;
    const oldStage = String(previous.stage || "").toLowerCase();
    const newStage = String(updated.stage || "").toLowerCase();
    if (newStage && newStage !== oldStage) {
      await this.notifyCandidateStageChange(updated, newStage);
    }
    return updated;
  }

  async listCandidateEvaluations(candidateId: number) {
    await this.ensureExists(hrCandidates, candidateId, "Candidate not found.");
    return this.db.select().from(hrCandidateEvaluations)
      .where(eq(hrCandidateEvaluations.candidateId, candidateId))
      .orderBy(desc(hrCandidateEvaluations.id));
  }

  async createCandidateEvaluation(candidateId: number, input: CreateCandidateEvaluationDto) {
    await this.ensureExists(hrCandidates, candidateId, "Candidate not found.");
    if (!input.criteria?.length) throw new BadRequestException("At least one criterion is required.");
    // Score pondéré normalisé sur 100 (comparable entre grilles différentes).
    let weightedScore = 0;
    let weightedMax = 0;
    for (const c of input.criteria) {
      const max = Number(c.maxScore ?? 10);
      const weight = Number(c.weight ?? 1);
      if (max <= 0 || weight <= 0) continue;
      weightedScore += (Number(c.score) / max) * weight;
      weightedMax += weight;
    }
    const totalScore = weightedMax > 0 ? this.roundNumber((weightedScore / weightedMax) * 100) : 0;
    const [result] = await this.db.insert(hrCandidateEvaluations).values({
      candidateId,
      evaluatorId: input.evaluatorId ?? null,
      criteria: input.criteria,
      totalScore,
      maxScore: 100,
      comment: input.comment ?? null,
    });
    await this.refreshCandidateRating(candidateId);
    const [row] = await this.db.select().from(hrCandidateEvaluations)
      .where(eq(hrCandidateEvaluations.id, Number((result as any).insertId))).limit(1);
    return row;
  }

  async deleteCandidateEvaluation(candidateId: number, evaluationId: number) {
    await this.ensureExists(hrCandidates, candidateId, "Candidate not found.");
    await this.db.delete(hrCandidateEvaluations).where(and(
      eq(hrCandidateEvaluations.id, evaluationId),
      eq(hrCandidateEvaluations.candidateId, candidateId),
    ));
    await this.refreshCandidateRating(candidateId);
    return { deleted: true };
  }

  // Le `rating` du candidat = moyenne des scores de ses évaluations (ou null si aucune).
  private async refreshCandidateRating(candidateId: number) {
    const rows = await this.db.select({ score: hrCandidateEvaluations.totalScore })
      .from(hrCandidateEvaluations)
      .where(eq(hrCandidateEvaluations.candidateId, candidateId));
    const rating = rows.length
      ? this.roundNumber(rows.reduce((sum, r) => sum + Number(r.score || 0), 0) / rows.length)
      : null;
    await this.db.update(hrCandidates).set({ rating, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(hrCandidates.id, candidateId));
  }

  // Email automatique au candidat à chaque changement d'étape de pipeline.
  // Non bloquant : le service email skip si SMTP non configuré et catch ses erreurs.
  private async notifyCandidateStageChange(candidate: Record<string, any>, stage: string) {
    const to = String(candidate.email || "").trim();
    if (!to) return;
    const labels: Record<string, string> = {
      nouveau: "Votre candidature a bien été reçue",
      entrevue: "Vous êtes convoqué(e) à un entretien",
      test: "Vous êtes invité(e) à passer un test",
      offre: "Une offre vous a été proposée",
      accepte: "Votre candidature a été acceptée",
      embauche: "Bienvenue : vous êtes recruté(e) !",
      rejete: "Suite donnée à votre candidature",
    };
    const title = labels[stage] || "Mise à jour de votre candidature";
    const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Candidat";
    await this.emails.sendTemplate({
      to,
      type: "notification",
      variables: { title, recipientName: name, message: `${title}. Nouvelle étape de votre candidature : ${stage}.` },
      relatedType: "hr_candidate",
      relatedId: candidate.id,
    });
  }

  async candidateSummary() {
    const rows = await this.db.select().from(hrCandidates).where(eq(hrCandidates.status, "active"));
    const pipeline: Record<string, number> = {
      nouveau: 0, entrevue: 0, test: 0, offre: 0, accepte: 0, embauche: 0, rejete: 0,
    };
    for (const row of rows) {
      const stage = String(row.stage || "nouveau").toLowerCase();
      pipeline[stage] = (pipeline[stage] ?? 0) + 1;
    }
    const converted = rows.filter((r) => r.convertedUserId != null).length;
    const withInterview = rows.filter((r) => r.interviewDate != null).length;
    const pending = rows.filter((r) => !["embauche", "rejete"].includes(String(r.stage || "").toLowerCase())).length;
    return {
      total: rows.length,
      pipeline,
      converted,
      withInterview,
      pending,
    };
  }

  async convertCandidateToEmployee(id: number, input: ConvertCandidateDto) {
    const candidate = await this.findCandidate(id);
    if (candidate.convertedUserId) {
      throw new BadRequestException("Candidate already converted to employee.");
    }

    const year = String(new Date().getFullYear());
    const pattern = `EMP-${year}-%`;
    const [{ total }] = await this.db
      .select({ total: count(users.id) })
      .from(users)
      .where(like(users.employeeId, pattern));
    const employeeId = `EMP-${year}-${String(Number(total || 0) + 1).padStart(4, "0")}`;

    const username = input.username || `${String(candidate.firstName).toLowerCase()}.${String(candidate.lastName).toLowerCase()}`.replace(/\s+/g, ".");
    const rawPassword = input.password || `${String(candidate.lastName).toLowerCase()}${year}`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const [result] = await this.db.insert(users).values({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email ?? null,
      phone: candidate.phone ?? null,
      gender: candidate.gender ?? null,
      birthDate: candidate.birthDate ?? null,
      nationality: candidate.nationality ?? null,
      username,
      password: hashedPassword,
      roleId: input.roleId ?? 2,
      departmentId: input.departmentId ?? null,
      joinDate: input.joinDate ? new Date(input.joinDate) : new Date(),
      employeeId,
      status: "true",
      isLogin: "false",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const newUserId = Number(result.insertId);

    await this.db
      .update(hrCandidates)
      .set({
        convertedUserId: newUserId,
        convertedAt: sql`CURRENT_TIMESTAMP`,
        stage: "embauche",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(hrCandidates.id, id));

    return { candidateId: id, userId: newUserId, employeeId, username };
  }

  // ─── Stade 10: IA RH ─────────────────────────────────────────────────────────

  async aiContext() {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    const [
      allContracts,
      allAttendances,
      allTimesheets,
      allPayrolls,
      allCandidates,
      allUsers,
      allProjects,
      allAssignments,
    ] = await Promise.all([
      this.db.select({
        id: hrContracts.id, userId: hrContracts.userId, contractType: hrContracts.contractType,
        endDate: hrContracts.endDate, status: hrContracts.status,
      }).from(hrContracts).where(ne(hrContracts.status, "false")),

      this.db.select({
        id: hrAttendances.id, userId: hrAttendances.userId,
        workDate: hrAttendances.workDate, status: hrAttendances.status,
      }).from(hrAttendances).where(ne(hrAttendances.status, "false")),

      this.db.select({
        id: hrTimesheets.id, userId: hrTimesheets.userId,
        periodStartDate: hrTimesheets.periodStartDate, workDate: hrTimesheets.workDate, status: hrTimesheets.status,
      }).from(hrTimesheets).where(ne(hrTimesheets.status, "false")),

      this.db.select({
        id: hrPayrolls.id, userId: hrPayrolls.userId, period: hrPayrolls.period,
        status: hrPayrolls.status, netSalary: hrPayrolls.netSalary, currencyId: hrPayrolls.currencyId,
      }).from(hrPayrolls).where(ne(hrPayrolls.status, "false")),

      this.db.select({
        id: hrCandidates.id, stage: hrCandidates.stage,
        firstName: hrCandidates.firstName, lastName: hrCandidates.lastName,
        offerId: hrCandidates.offerId, status: hrCandidates.status,
      }).from(hrCandidates).where(eq(hrCandidates.status, "active")),

      this.db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, status: users.status })
        .from(users).where(eq(users.status, "true")),

      this.db.select({
        id: hrProjects.id, name: hrProjects.name, code: hrProjects.code,
        donor: hrProjects.donor, hrBudget: hrProjects.hrBudget, status: hrProjects.status,
      }).from(hrProjects).where(ne(hrProjects.status, "false")),

      this.db.select({
        projectId: hrProjectAssignments.projectId, userId: hrProjectAssignments.userId,
        monthlyCost: hrProjectAssignments.monthlyCost, timePercent: hrProjectAssignments.timePercent,
        status: hrProjectAssignments.status,
      }).from(hrProjectAssignments).where(ne(hrProjectAssignments.status, "false")),
    ]);

    const activeEmployeeIds = new Set(allUsers.map((u) => Number(u.id)));
    const totalEmployees = activeEmployeeIds.size;

    // Contrats expirant dans 30 jours
    const expiringContracts = allContracts.filter((c) => {
      if (!c.endDate) return false;
      const end = String(c.endDate).slice(0, 10);
      return end >= today && end <= in30 && !["terminated", "expired"].includes(String(c.status || ""));
    });

    // Absents aujourd'hui (présences du jour avec statut absence)
    const todayAttendances = allAttendances.filter((a) => String(a.workDate || "").slice(0, 10) === today);
    const todayPresentIds = new Set(
      todayAttendances.filter((a) => !["absent", "false"].includes(String(a.status || ""))).map((a) => Number(a.userId))
    );
    const absentToday = [...activeEmployeeIds].filter((id) => !todayPresentIds.has(id)).length;

    // Timesheets manquants (semaine courante — du lundi au dimanche ISO)
    const weekStart = (() => {
      const d = new Date(today);
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - day + 1);
      return d.toISOString().slice(0, 10);
    })();
    const weekEnd = (() => {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + 6);
      return d.toISOString().slice(0, 10);
    })();
    const submittedThisWeek = new Set(
      allTimesheets
        .filter((t) => {
          const d = String(t.periodStartDate || t.workDate || "").slice(0, 10);
          return d >= weekStart && d <= weekEnd;
        })
        .map((t) => Number(t.userId))
    );
    const missingTimesheets = [...activeEmployeeIds].filter((id) => !submittedThisWeek.has(id)).length;

    // Bulletins de paie en brouillon ce mois-ci
    const draftPayrolls = allPayrolls.filter(
      (p) => String(p.status || "").toLowerCase() === "draft" && String(p.period || "").slice(0, 7) === currentMonth
    );

    // Candidats en attente (pipeline actif, pas encore embauché/rejeté)
    const pendingCandidates = allCandidates.filter(
      (c) => !["embauche", "rejete"].includes(String(c.stage || "").toLowerCase())
    );

    const alerts: Array<{ category: string; severity: "high" | "medium" | "low"; title: string; detail: string; count: number }> = [];

    if (expiringContracts.length > 0) {
      alerts.push({
        category: "contrats",
        severity: expiringContracts.length >= 3 ? "high" : "medium",
        title: `${expiringContracts.length} contrat${expiringContracts.length > 1 ? "s" : ""} expirant sous 30 j`,
        detail: `${expiringContracts.length} contrat${expiringContracts.length > 1 ? "s" : ""} arriveront à échéance avant le ${in30}. Décide : renouvellement (avenant) ou clôture (solde de tout compte).`,
        count: expiringContracts.length,
      });
    }

    if (absentToday > 0) {
      alerts.push({
        category: "presences",
        severity: absentToday >= Math.ceil(totalEmployees * 0.2) ? "high" : "low",
        title: `${absentToday} employé${absentToday > 1 ? "s" : ""} absent${absentToday > 1 ? "s" : ""} aujourd'hui`,
        detail: `${absentToday} sur ${totalEmployees} employés actifs n'ont pas encore de pointage pour le ${today}.`,
        count: absentToday,
      });
    }

    if (missingTimesheets > 0) {
      alerts.push({
        category: "timesheet",
        severity: missingTimesheets >= 3 ? "high" : "medium",
        title: `${missingTimesheets} timesheet${missingTimesheets > 1 ? "s" : ""} manquant${missingTimesheets > 1 ? "s" : ""} (semaine)`,
        detail: `${missingTimesheets} employé${missingTimesheets > 1 ? "s" : ""} n'ont pas soumis leur feuille de temps pour la semaine du ${weekStart}. Les timesheets conditionnent la facturation aux clients et financeurs.`,
        count: missingTimesheets,
      });
    }

    if (draftPayrolls.length > 0) {
      alerts.push({
        category: "paie",
        severity: "medium",
        title: `${draftPayrolls.length} bulletin${draftPayrolls.length > 1 ? "s" : ""} en brouillon (${currentMonth})`,
        detail: `${draftPayrolls.length} bulletin${draftPayrolls.length > 1 ? "s" : ""} de paie restent en brouillon pour ${currentMonth}. Valide-les avant clôture.`,
        count: draftPayrolls.length,
      });
    }

    if (pendingCandidates.length > 0) {
      alerts.push({
        category: "recrutement",
        severity: "low",
        title: `${pendingCandidates.length} candidat${pendingCandidates.length > 1 ? "s" : ""} en attente de décision`,
        detail: `${pendingCandidates.length} candidat${pendingCandidates.length > 1 ? "s" : ""} dans le pipeline de recrutement n'ont pas encore été embauchés ou rejetés.`,
        count: pendingCandidates.length,
      });
    }

    // Coûts RH par projet : coût mensuel assigné (Σ monthlyCost des assignations
    // actives) vs budget RH du projet, + effectif. Sert aux questions de coûts.
    const assignmentsByProject = new Map<number, { monthlyCost: number; people: Set<number> }>();
    for (const a of allAssignments) {
      const pid = Number(a.projectId);
      if (!assignmentsByProject.has(pid)) assignmentsByProject.set(pid, { monthlyCost: 0, people: new Set() });
      const agg = assignmentsByProject.get(pid)!;
      agg.monthlyCost += Number(a.monthlyCost || 0);
      agg.people.add(Number(a.userId));
    }
    const projectCosts = allProjects.map((p) => {
      const agg = assignmentsByProject.get(Number(p.id));
      const monthlyCost = this.roundNumber(agg?.monthlyCost ?? 0);
      const hrBudget = this.roundNumber(Number(p.hrBudget || 0));
      return {
        projectId: Number(p.id),
        name: p.name,
        code: p.code ?? null,
        donor: p.donor ?? null,
        hrBudget,
        assignedMonthlyCost: monthlyCost,
        assignedEmployees: agg?.people.size ?? 0,
        budgetUsagePercent: hrBudget > 0 ? this.roundNumber((monthlyCost / hrBudget) * 100) : null,
      };
    });

    return {
      date: today,
      totalEmployees,
      alerts,
      summary: {
        expiringContracts: expiringContracts.length,
        absentToday,
        missingTimesheets,
        draftPayrolls: draftPayrolls.length,
        pendingCandidates: pendingCandidates.length,
      },
      projectCosts,
    };
  }

  // Types de documents générables (doivent matcher templateTypeLabel/renderDocumentTemplate).
  private readonly documentTemplateTypes = ["contrat", "avenant", "attestation", "certificat", "disciplinaire", "conge"];

  // Un appel HTTP à l'API Anthropic (avec timeout). Retourne le corps JSON.
  private async callAnthropic(payload: Record<string, any>): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.anthropic.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        this.logger.error(`Anthropic API error ${res.status}: ${detail.slice(0, 500)}`);
        throw new BadRequestException("L'assistant IA est momentanément indisponible.");
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // Chat RH en langage naturel : proxy backend vers l'API Claude, avec tool-use.
  // Le contexte RH agrégé (aiContext) est injecté dans le prompt système, et le
  // LLM peut déclencher la génération d'un document RH via un tool contrôlé.
  // La clé API reste côté serveur (jamais exposée au client).
  async aiChat(message: string, extraContext?: string | null, actorId?: number | null) {
    const trimmed = String(message || "").trim();
    if (!trimmed) throw new BadRequestException("Message is required.");
    if (!env.anthropic.apiKey) {
      throw new BadRequestException("L'assistant IA n'est pas configuré (ANTHROPIC_API_KEY manquante).");
    }

    const context = await this.aiContext();
    const systemPrompt = [
      "Tu es l'assistant RH de NgoluApp. Réponds en français, de façon concise et actionnable.",
      "Tu t'appuies UNIQUEMENT sur les données RH agrégées fournies ci-dessous ; si une information manque, dis-le clairement au lieu d'inventer.",
      "Tu peux générer un document RH pour un employé via l'outil generate_hr_document, UNIQUEMENT si l'utilisateur le demande explicitement et fournit l'employé (userId) et le type.",
      "Données RH agrégées (JSON) :",
      JSON.stringify(context),
      extraContext ? `Contexte additionnel fourni par l'utilisateur : ${extraContext}` : "",
    ].filter(Boolean).join("\n");

    const tools = [{
      name: "generate_hr_document",
      description: "Génère un document RH officiel (brouillon) pour un employé donné. À utiliser seulement sur demande explicite de l'utilisateur.",
      input_schema: {
        type: "object",
        properties: {
          userId: { type: "number", description: "Identifiant de l'employé concerné" },
          templateType: { type: "string", enum: this.documentTemplateTypes, description: "Type de document à générer" },
        },
        required: ["userId", "templateType"],
      },
    }];

    const messages: any[] = [{ role: "user", content: trimmed }];
    const basePayload = { model: env.anthropic.model, max_tokens: env.anthropic.maxTokens, system: systemPrompt, tools };
    const generatedDocuments: Array<{ id: number; reference: string; documentType: string; userId: number }> = [];

    try {
      // 1er tour
      let data = await this.callAnthropic({ ...basePayload, messages });

      // Un seul tour de tool-use autorisé (anti-boucle).
      if (data.stop_reason === "tool_use") {
        const toolUses = (data.content || []).filter((b: any) => b.type === "tool_use");
        messages.push({ role: "assistant", content: data.content });
        const toolResults: any[] = [];
        for (const tu of toolUses) {
          const result = await this.runAiDocumentTool(tu.input, actorId);
          if (result.document) generatedDocuments.push(result.document);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result.message, is_error: result.isError });
        }
        messages.push({ role: "user", content: toolResults });
        data = await this.callAnthropic({ ...basePayload, messages });
      }

      const reply = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text || "").join("\n").trim();
      return { reply: reply || "(réponse vide)", model: env.anthropic.model, generatedDocuments };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const msg = error instanceof Error && error.name === "AbortError" ? "Délai d'attente dépassé." : "Échec de l'appel à l'assistant IA.";
      this.logger.error(`aiChat failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException(msg);
    }
  }

  // Exécute le tool generate_hr_document demandé par le LLM, avec garde-fous.
  // Renvoie un message texte pour le LLM (jamais d'exception : on rapporte l'erreur au modèle).
  private async runAiDocumentTool(input: any, actorId?: number | null): Promise<{ message: string; isError: boolean; document?: { id: number; reference: string; documentType: string; userId: number } }> {
    const userId = Number(input?.userId);
    const templateType = String(input?.templateType || "");
    if (!Number.isInteger(userId) || userId <= 0) return { message: "userId invalide.", isError: true };
    if (!this.documentTemplateTypes.includes(templateType)) {
      return { message: `templateType invalide. Valeurs autorisées : ${this.documentTemplateTypes.join(", ")}.`, isError: true };
    }
    try {
      const doc = await this.generateDocument({ userId, templateType, generatedBy: actorId ?? null }) as Record<string, any>;
      const document = { id: Number(doc.id), reference: String(doc.reference), documentType: String(doc.documentType), userId };
      return { message: `Document généré (brouillon) : ${document.documentType}, référence ${document.reference}, id ${document.id}.`, isError: false, document };
    } catch (error) {
      return { message: `Échec de la génération : ${error instanceof Error ? error.message : String(error)}`, isError: true };
    }
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
    const halfDay = input.halfDay ? 1 : 0;
    if (halfDay && String(input.startDate) !== String(input.endDate)) {
      throw new BadRequestException("A half-day leave must span a single day.");
    }
    const holidays = await this.leaveHolidaySet(input.startDate, input.endDate);
    const requestedDays = halfDay ? 0.5 : this.leaveDays(input.startDate, input.endDate, holidays);
    const leaveYear = this.leaveYear(input.startDate);
    const country = await this.resolveEmployeeCountry(Number(input.userId));
    const entitlementDays = await this.resolveEntitlementDays(country, input.type);
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
      halfDay,
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

  // Clé canonique du type de congé (le champ `type` est du texte libre).
  private leaveTypeKey(type?: string | null) {
    const value = String(type || "").toLowerCase();
    if (value.includes("maladie")) return "maladie";
    if (value.includes("matern")) return "maternite";
    if (value.includes("patern")) return "paternite";
    if (value.includes("mission")) return "mission";
    return "conge_annuel";
  }

  // Barème par défaut codé en dur (filet de sécurité si la table est vide /
  // aucune règle pays ni '*' trouvée).
  private defaultEntitlementDays(type?: string | null) {
    switch (this.leaveTypeKey(type)) {
      case "maladie": return 10;
      case "maternite": return 98;
      case "paternite": return 3;
      case "mission": return 0;
      default: return 24;
    }
  }

  // Droit de congé pour un pays + type : règle pays exacte, sinon règle '*',
  // sinon barème codé en dur. countryCode déjà normalisé (upper, max 10).
  private async resolveEntitlementDays(countryCode: string, type?: string | null) {
    const key = this.leaveTypeKey(type);
    const rows = await this.db.select({ countryCode: hrLeaveEntitlements.countryCode, days: hrLeaveEntitlements.entitlementDays })
      .from(hrLeaveEntitlements)
      .where(and(eq(hrLeaveEntitlements.leaveType, key), eq(hrLeaveEntitlements.isActive, 1)));
    const exact = rows.find((r) => String(r.countryCode).toUpperCase() === countryCode && countryCode);
    if (exact) return Number(exact.days);
    const fallback = rows.find((r) => String(r.countryCode) === "*");
    if (fallback) return Number(fallback.days);
    return this.defaultEntitlementDays(type);
  }

  // Pays de l'employé (depuis users.country), normalisé comme pour les règles fiscales.
  private async resolveEmployeeCountry(userId: number): Promise<string> {
    const [row] = await this.db.select({ country: users.country }).from(users).where(eq(users.id, userId)).limit(1);
    return (row?.country || "").trim().toUpperCase().slice(0, 10);
  }

  private leaveYear(dateValue?: string | null) {
    return Number(String(dateValue || new Date().toISOString()).slice(0, 4));
  }

  // Jours ouvrés entre deux dates, week-ends et jours fériés exclus.
  private leaveDays(startDate: string, endDate: string, holidays?: Set<string>) {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    let days = 0;
    for (let cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
      const day = cur.getUTCDay();
      const iso = cur.toISOString().slice(0, 10);
      if (day !== 0 && day !== 6 && !(holidays && holidays.has(iso))) days += 1;
    }
    return days || 1;
  }

  // Dates des jours fériés actifs dans l'intervalle (toutes organisations confondues
  // pour l'instant ; le filtrage par pays viendra avec le paramétrage des droits).
  private async leaveHolidaySet(startDate: string, endDate: string): Promise<Set<string>> {
    const rows = await this.db.select({ date: hrPublicHolidays.date })
      .from(hrPublicHolidays)
      .where(and(
        eq(hrPublicHolidays.isActive, 1),
        sql`${hrPublicHolidays.date} >= ${startDate}`,
        sql`${hrPublicHolidays.date} <= ${endDate}`,
      ));
    return new Set(rows.map((r) => String(r.date).slice(0, 10)));
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
    const country = await this.resolveEmployeeCountry(userId);
    const entitlement = await this.resolveEntitlementDays(country, "conge_annuel");
    return this.roundNumber(entitlement - used);
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
    const derived = this.periodToRange(input.period);
    return {
      userId: input.userId,
      contractId: input.contractId ?? null,
      period: input.period,
      periodStart: input.periodStart ?? derived?.start ?? null,
      periodEnd: input.periodEnd ?? derived?.end ?? null,
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

  // Déduit un intervalle [début, fin] depuis un libellé de période mensuel
  // (YYYY-MM). Renvoie null si le format n'est pas mensuel (les bulletins non
  // mensuels doivent fournir periodStart/periodEnd explicitement).
  private periodToRange(period?: string | null): { start: string; end: string } | null {
    const m = /^(\d{4})-(\d{2})$/.exec(String(period || "").trim());
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${m[1]}-${m[2]}-01`,
      end: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  // Statut à partir duquel un bulletin verrouille sa période (réglage RH).
  private async payrollLockStage(): Promise<"validated" | "paid"> {
    const [row] = await this.db.select({ stage: appSettings.payrollLockStage }).from(appSettings).limit(1);
    return String(row?.stage || "paid") === "validated" ? "validated" : "paid";
  }

  // Refuse l'opération si un bulletin verrouillant (statut >= seuil réglé) de
  // l'employé couvre une période qui chevauche [start, end]. S'adapte à toute
  // fréquence de paie via l'intervalle réel du bulletin.
  private async assertNoLockedPayroll(userId: number, start: string, end: string) {
    const stage = await this.payrollLockStage();
    const lockingStatuses = stage === "validated" ? ["validated", "paid"] : ["paid"];
    const rows = await this.db.select({
      id: hrPayrolls.id, status: hrPayrolls.status,
      periodStart: hrPayrolls.periodStart, periodEnd: hrPayrolls.periodEnd,
    }).from(hrPayrolls).where(and(
      eq(hrPayrolls.userId, userId),
      inArray(hrPayrolls.status, lockingStatuses),
    ));
    const clash = rows.find((r) => r.periodStart && r.periodEnd
      && String(r.periodStart) <= end && String(r.periodEnd) >= start);
    if (clash) {
      throw new ForbiddenException(
        `This leave overlaps a locked payroll period (#${clash.id}, status "${clash.status}"). Unlock or adjust the payroll first.`,
      );
    }
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
    const pattern = `PRJ-${year}-%`;
    const [{ total }] = await this.db
      .select({ total: count(hrProjects.id) })
      .from(hrProjects)
      .where(like(hrProjects.code, pattern));
    return `PRJ-${year}-${String(Number(total || 0) + 1).padStart(4, "0")}`;
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

  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  private validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
    const s = buffer.subarray(0, 12);
    switch (mimetype) {
      case "image/jpeg":  return s[0] === 0xff && s[1] === 0xd8 && s[2] === 0xff;
      case "image/png":   return s.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case "image/webp":  return s.slice(0, 4).toString("ascii") === "RIFF" && s.slice(8, 12).toString("ascii") === "WEBP";
      case "image/gif":   return s.slice(0, 6).toString("ascii").startsWith("GIF8");
      case "application/pdf": return s.slice(0, 4).toString("ascii") === "%PDF";
      default:            return false;
    }
  }

  private saveFile(file: HrUploadedFile): { name: string; path: string } {
    if (!this.validateMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException("Le contenu du fichier ne correspond pas au type déclaré.");
    }
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "image/gif": "gif", "application/pdf": "pdf",
    };
    const ext = mimeToExt[file.mimetype] || "bin";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    writeFileSync(join(this.uploadDir, name), file.buffer);
    return { name, path: `/files/${name}` };
  }

  async uploadEmployeePhoto(userId: number, file: HrUploadedFile) {
    await this.ensureExists(users, userId, "Employee not found.");
    const { path } = this.saveFile(file);
    await this.db.update(users).set({ image: path, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(users.id, userId));
    return { image: path };
  }

  // Upload d'une pièce candidat (CV, lettre de motivation, portfolio).
  // Réutilise saveFile (magic bytes + nom sécurisé) et écrit l'URL dans le champ dédié.
  async uploadCandidateFile(candidateId: number, file: HrUploadedFile, kind: string) {
    await this.ensureExists(hrCandidates, candidateId, "Candidate not found.");
    const fieldByKind: Record<string, "cvUrl" | "coverLetterUrl" | "portfolioUrl"> = {
      cv: "cvUrl",
      coverLetter: "coverLetterUrl",
      portfolio: "portfolioUrl",
    };
    const field = fieldByKind[kind];
    if (!field) throw new BadRequestException('Invalid file kind. Use "cv", "coverLetter" or "portfolio".');
    const { path } = this.saveFile(file);
    await this.db.update(hrCandidates).set({ [field]: path, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(hrCandidates.id, candidateId));
    return { [field]: path };
  }

  async listPersonalDocuments(userId: number) {
    return this.db.select().from(hrPersonalDocuments)
      .where(eq(hrPersonalDocuments.userId, userId))
      .orderBy(desc(hrPersonalDocuments.createdAt));
  }

  async createPersonalDocument(file: HrUploadedFile, dto: CreateHrPersonalDocumentDto) {
    await this.ensureExists(users, dto.userId, "Employee not found.");
    const { name, path } = this.saveFile(file);
    const [existing] = await this.db.select({ version: hrPersonalDocuments.version })
      .from(hrPersonalDocuments)
      .where(and(eq(hrPersonalDocuments.userId, dto.userId), eq(hrPersonalDocuments.documentType, dto.documentType)))
      .orderBy(desc(hrPersonalDocuments.version))
      .limit(1);
    const version = (existing?.version ?? 0) + 1;
    const [result] = await this.db.insert(hrPersonalDocuments).values({
      userId: dto.userId,
      documentType: dto.documentType,
      fileName: file.originalname,
      filePath: path,
      fileSize: file.size,
      mimeType: file.mimetype,
      version,
      notes: dto.notes ?? null,
      uploadedBy: dto.uploadedBy ?? null,
    });
    return this.db.select().from(hrPersonalDocuments)
      .where(eq(hrPersonalDocuments.id, Number((result as any).insertId)))
      .limit(1).then((r) => r[0]);
  }

  async deletePersonalDocument(id: number) {
    const [doc] = await this.db.select().from(hrPersonalDocuments).where(eq(hrPersonalDocuments.id, id)).limit(1);
    if (!doc) throw new NotFoundException("Document not found.");
    const localFile = join(this.uploadDir, doc.filePath.replace(/^\/files\//, ""));
    if (existsSync(localFile)) unlinkSync(localFile);
    await this.db.delete(hrPersonalDocuments).where(eq(hrPersonalDocuments.id, id));
    return { deleted: true };
  }

  listTaxRules() {
    return this.db.select().from(hrTaxRules).orderBy(hrTaxRules.countryName);
  }

  async findTaxRule(id: number) {
    const [row] = await this.db.select().from(hrTaxRules).where(eq(hrTaxRules.id, id)).limit(1);
    if (!row) throw new NotFoundException("Tax rule not found.");
    return row;
  }

  async createTaxRule(input: CreateHrTaxRuleDto) {
    const [result] = await this.db.insert(hrTaxRules).values({
      countryCode: input.countryCode.toUpperCase(),
      countryName: input.countryName,
      cnssEmployeeRate: Number(input.cnssEmployeeRate ?? 0),
      cnssEmployerRate: Number(input.cnssEmployerRate ?? 0),
      iprRate: Number(input.iprRate ?? 0),
      iprThreshold: Number(input.iprThreshold ?? 0),
      iprBrackets: input.iprBrackets ?? null,
      notes: input.notes ?? null,
      isActive: 1,
    });
    return this.findTaxRule((result as any).insertId);
  }

  async updateTaxRule(id: number, input: UpdateHrTaxRuleDto) {
    await this.findTaxRule(id);
    const patch: Record<string, any> = {};
    if (input.countryCode !== undefined) patch["countryCode"] = input.countryCode.toUpperCase();
    if (input.countryName !== undefined) patch["countryName"] = input.countryName;
    if (input.cnssEmployeeRate !== undefined) patch["cnssEmployeeRate"] = Number(input.cnssEmployeeRate);
    if (input.cnssEmployerRate !== undefined) patch["cnssEmployerRate"] = Number(input.cnssEmployerRate);
    if (input.iprRate !== undefined) patch["iprRate"] = Number(input.iprRate);
    if (input.iprThreshold !== undefined) patch["iprThreshold"] = Number(input.iprThreshold);
    if (input.iprBrackets !== undefined) patch["iprBrackets"] = input.iprBrackets ?? null;
    if (input.notes !== undefined) patch["notes"] = input.notes ?? null;
    if (input.isActive !== undefined) patch["isActive"] = Number(input.isActive);
    if (Object.keys(patch).length > 0) {
      await this.db.update(hrTaxRules).set(patch).where(eq(hrTaxRules.id, id));
    }
    return this.findTaxRule(id);
  }

  async deleteTaxRule(id: number) {
    await this.findTaxRule(id);
    await this.db.delete(hrTaxRules).where(eq(hrTaxRules.id, id));
    return { deleted: true };
  }

  listPublicHolidays(q: Record<string, string> = {}) {
    const where = q["country"]
      ? eq(hrPublicHolidays.countryCode, String(q["country"]).toUpperCase())
      : undefined;
    return this.db.select().from(hrPublicHolidays).where(where).orderBy(hrPublicHolidays.date);
  }

  async findPublicHoliday(id: number) {
    const [row] = await this.db.select().from(hrPublicHolidays).where(eq(hrPublicHolidays.id, id)).limit(1);
    if (!row) throw new NotFoundException("Public holiday not found.");
    return row;
  }

  async createPublicHoliday(input: CreateHrPublicHolidayDto) {
    const [result] = await this.db.insert(hrPublicHolidays).values({
      countryCode: input.countryCode.toUpperCase(),
      date: input.date,
      name: input.name,
      isActive: input.isActive === 0 ? 0 : 1,
    });
    return this.findPublicHoliday((result as any).insertId);
  }

  async updatePublicHoliday(id: number, input: UpdateHrPublicHolidayDto) {
    await this.findPublicHoliday(id);
    const patch: Record<string, any> = {};
    if (input.countryCode !== undefined) patch["countryCode"] = input.countryCode.toUpperCase();
    if (input.date !== undefined) patch["date"] = input.date;
    if (input.name !== undefined) patch["name"] = input.name;
    if (input.isActive !== undefined) patch["isActive"] = Number(input.isActive);
    if (Object.keys(patch).length > 0) {
      await this.db.update(hrPublicHolidays).set(patch).where(eq(hrPublicHolidays.id, id));
    }
    return this.findPublicHoliday(id);
  }

  async deletePublicHoliday(id: number) {
    await this.findPublicHoliday(id);
    await this.db.delete(hrPublicHolidays).where(eq(hrPublicHolidays.id, id));
    return { deleted: true };
  }

  listLeaveEntitlements(q: Record<string, string> = {}) {
    const where = q["country"]
      ? eq(hrLeaveEntitlements.countryCode, String(q["country"]).toUpperCase())
      : undefined;
    return this.db.select().from(hrLeaveEntitlements).where(where)
      .orderBy(hrLeaveEntitlements.countryCode, hrLeaveEntitlements.leaveType);
  }

  async findLeaveEntitlement(id: number) {
    const [row] = await this.db.select().from(hrLeaveEntitlements).where(eq(hrLeaveEntitlements.id, id)).limit(1);
    if (!row) throw new NotFoundException("Leave entitlement not found.");
    return row;
  }

  async createLeaveEntitlement(input: CreateHrLeaveEntitlementDto) {
    const [result] = await this.db.insert(hrLeaveEntitlements).values({
      countryCode: (input.countryCode || "*").toUpperCase(),
      leaveType: input.leaveType,
      contractType: input.contractType ?? null,
      entitlementDays: Number(input.entitlementDays ?? 0),
      isActive: input.isActive === 0 ? 0 : 1,
    });
    return this.findLeaveEntitlement((result as any).insertId);
  }

  async updateLeaveEntitlement(id: number, input: UpdateHrLeaveEntitlementDto) {
    await this.findLeaveEntitlement(id);
    const patch: Record<string, any> = {};
    if (input.countryCode !== undefined) patch["countryCode"] = (input.countryCode || "*").toUpperCase();
    if (input.leaveType !== undefined) patch["leaveType"] = input.leaveType;
    if (input.contractType !== undefined) patch["contractType"] = input.contractType ?? null;
    if (input.entitlementDays !== undefined) patch["entitlementDays"] = Number(input.entitlementDays);
    if (input.isActive !== undefined) patch["isActive"] = Number(input.isActive);
    if (Object.keys(patch).length > 0) {
      await this.db.update(hrLeaveEntitlements).set(patch).where(eq(hrLeaveEntitlements.id, id));
    }
    return this.findLeaveEntitlement(id);
  }

  async deleteLeaveEntitlement(id: number) {
    await this.findLeaveEntitlement(id);
    await this.db.delete(hrLeaveEntitlements).where(eq(hrLeaveEntitlements.id, id));
    return { deleted: true };
  }

  async getPayrollLockStage() {
    return { stage: await this.payrollLockStage() };
  }

  async setPayrollLockStage(stage: string) {
    const value = String(stage) === "validated" ? "validated" : "paid";
    const [row] = await this.db.select({ id: appSettings.id }).from(appSettings).limit(1);
    if (row) {
      await this.db.update(appSettings).set({ payrollLockStage: value }).where(eq(appSettings.id, row.id));
    } else {
      await this.db.insert(appSettings).values({ payrollLockStage: value });
    }
    return { stage: value };
  }
}
