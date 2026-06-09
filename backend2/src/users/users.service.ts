import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { DRIZZLE } from "../database/database.constants";
import {
  awardHistories,
  awards,
  departments,
  designationHistories,
  designations,
  educations,
  employmentStatuses,
  roles,
  salaryHistories,
  shifts,
  users,
} from "../database/schema";
import type { Database } from "../database/types";
import { MailAccountsService } from "../mail-accounts/mail-accounts.service";
import { RealtimePermissionsPublisher } from "../realtime/realtime-permissions-publisher.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtimePermissions: RealtimePermissionsPublisher,
    private readonly audit: AuditService,
    private readonly mailAccounts: MailAccountsService,
  ) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
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
        .where(eq(users.status, "true"))
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

      return {
        getAllUser: rows.map((r) => ({
          ...this.safeUser(r.user),
          role: r.role,
          designation: r.designation,
          department: r.department,
          currentSalary: salaryMap[r.user.id] ?? null,
          currentSalaryCurrencyId: salaryCurrencyMap[r.user.id] ?? null,
        })),
        totalUser: rows.length,
      };
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);

      const rows = await this.db
        .select()
        .from(users)
        .where(
          and(
            eq(users.status, "true"),
            or(like(users.username, key), like(users.firstName, key), like(users.lastName, key)),
          ),
        )
        .orderBy(desc(users.id))
        .limit(limit)
        .offset(skip);

      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          and(
            eq(users.status, "true"),
            or(like(users.username, key), like(users.firstName, key), like(users.lastName, key)),
          ),
        );

      return { getAllUser: rows.map(this.safeUser), totalUser: Number(count) };
    }

    const { skip, limit } = this.pagination(query);

    const rows = await this.db
      .select({ user: users, role: { id: roles.id, name: roles.name } })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(query["status"] ? eq(users.status, query["status"]) : undefined)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(skip);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(query["status"] ? eq(users.status, query["status"]) : undefined);

    return {
      getAllUser: rows.map((r) => ({ ...this.safeUser(r.user), role: r.role })),
      totalUser: Number(count),
    };
  }

  async findOne(id: number) {
    const rows = await this.db
      .select({ user: users, role: { id: roles.id, name: roles.name } })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.id, id))
      .limit(1);

    if (!rows.length) throw new NotFoundException("User not found!");

    const { user, role } = rows[0];
    const [designationHistory, salaryHistory, awardHistory, shiftRows, departmentRows, employmentRows, education] = await Promise.all([
      this.userDesignationHistory(id),
      this.userSalaryHistory(id),
      this.userAwardHistory(id),
      user.shiftId
        ? this.db.select().from(shifts).where(eq(shifts.id, user.shiftId)).limit(1)
        : Promise.resolve([]),
      user.departmentId
        ? this.db.select().from(departments).where(eq(departments.id, user.departmentId)).limit(1)
        : Promise.resolve([]),
      user.employmentStatusId
        ? this.db.select().from(employmentStatuses).where(eq(employmentStatuses.id, user.employmentStatusId)).limit(1)
        : Promise.resolve([]),
      this.userEducation(id),
    ]);

    return {
      ...this.safeUser(user),
      role,
      shift: shiftRows[0] ?? null,
      department: departmentRows[0] ?? null,
      employmentStatus: employmentRows[0] ?? null,
      education,
      designationHistory,
      salaryHistory,
      awardHistory,
    };
  }

  async create(dto: CreateUserDto, ctx: AuditContext = {}) {
    const existing = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (existing.length) throw new ConflictException("Username already exists");

    const reservedEmailRows = await this.db
      .select({ email: users.email })
      .from(users)
      .where(like(users.email, `%@ongdngolu.org`));

    const mailbox = await this.mailAccounts.createEmployeeMailbox({
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      reservedEmails: reservedEmailRows.map((row) => row.email).filter((email): email is string => Boolean(email)),
    });

    const hash = await bcrypt.hash(dto.password, 10);

    const employeeId = dto.employeeId || (await this.nextEmployeeId(dto.joinDate));
    let result: { insertId?: number | bigint };
    try {
      [result] = await this.db.insert(users).values({
        ...dto,
        employeeId,
        email: mailbox?.email ?? dto.email,
        password: hash,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
        leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : null,
        birthDate: dto.birthDate || null,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      });
    } catch (error) {
      if (mailbox?.accountId) {
        await this.mailAccounts.deleteMailbox(mailbox.accountId);
      }
      throw error;
    }

    const newId = Number(result.insertId);
    await this.audit.log("admin.user.created", `user:${newId}`, ctx, {
      username: dto.username,
      roleId: dto.roleId,
      generatedEmail: mailbox?.email,
    });

    return this.findOne(newId);
  }

  async update(id: number, dto: UpdateUserDto, ctx: AuditContext = {}) {
    const [user] = await this.db
      .select({ id: users.id, roleId: users.roleId })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("User not found!");

    const updateData: Record<string, unknown> = { ...dto };

    if (dto.password) {
      updateData["password"] = await bcrypt.hash(dto.password, 10);
    } else {
      delete updateData["password"];
    }

    if (dto.joinDate) updateData["joinDate"] = new Date(dto.joinDate);
    if (dto.leaveDate) updateData["leaveDate"] = new Date(dto.leaveDate);
    if (dto.birthDate) updateData["birthDate"] = dto.birthDate;
    updateData["updatedAt"] = sql`CURRENT_TIMESTAMP`;

    await this.db.update(users).set(updateData).where(eq(users.id, id));

    const roleChanged = Boolean(dto.roleId && dto.roleId !== user.roleId);
    if (roleChanged) {
      await this.realtimePermissions.publishPermissionsUpdated({
        roleId: dto.roleId!,
        userIds: [id],
        reason: "user-role-updated",
      });
    }

    await this.audit.log("admin.user.updated", `user:${id}`, ctx, {
      fields: Object.keys(dto).filter((k) => k !== "password"),
      passwordChanged: Boolean(dto.password),
      roleChanged,
      newRoleId: dto.roleId,
    });

    return this.findOne(id);
  }

  async remove(id: number, status: string, ctx: AuditContext = {}) {
    if (!status) throw new BadRequestException("status is required");

    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) throw new NotFoundException("User not found!");

    await this.db
      .update(users)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, id));

    await this.audit.log("admin.user.status_changed", `user:${id}`, ctx, { status });

    return { message: "User deleted successfully" };
  }

  private safeUser(u: typeof users.$inferSelect) {
    const { password: _, refreshToken: __, isLogin: ___, ...safe } = u;
    return safe;
  }

  private async nextEmployeeId(joinDate?: string | null) {
    const year = String(joinDate || "").slice(0, 4) || String(new Date().getFullYear());
    const pattern = `EMP-${year}-%`;
    const [{ lastEmployeeId }] = await this.db
      .select({ lastEmployeeId: sql<string | null>`max(${users.employeeId})` })
      .from(users)
      .where(like(users.employeeId, pattern));
    const lastNumber = Number(String(lastEmployeeId || "").split("-").pop() || 0);
    return `EMP-${year}-${String(lastNumber + 1).padStart(4, "0")}`;
  }

  private userDesignationHistory(userId: number) {
    return this.db
      .select({
        id: designationHistories.id,
        userId: designationHistories.userId,
        designationId: designationHistories.designationId,
        startDate: designationHistories.startDate,
        endDate: designationHistories.endDate,
        comment: designationHistories.comment,
        createdAt: designationHistories.createdAt,
        updatedAt: designationHistories.updatedAt,
        designation: {
          id: designations.id,
          name: designations.name,
        },
      })
      .from(designationHistories)
      .leftJoin(designations, eq(designations.id, designationHistories.designationId))
      .where(eq(designationHistories.userId, userId))
      .orderBy(desc(designationHistories.id));
  }

  private userSalaryHistory(userId: number) {
    return this.db
      .select()
      .from(salaryHistories)
      .where(eq(salaryHistories.userId, userId))
      .orderBy(desc(salaryHistories.id));
  }

  private userAwardHistory(userId: number) {
    return this.db
      .select({
        id: awardHistories.id,
        userId: awardHistories.userId,
        awardId: awardHistories.awardId,
        awardedDate: awardHistories.awardedDate,
        comment: awardHistories.comment,
        createdAt: awardHistories.createdAt,
        updatedAt: awardHistories.updatedAt,
        award: {
          id: awards.id,
          name: awards.name,
          description: awards.description,
        },
      })
      .from(awardHistories)
      .leftJoin(awards, eq(awards.id, awardHistories.awardId))
      .where(eq(awardHistories.userId, userId))
      .orderBy(desc(awardHistories.id));
  }

  private userEducation(userId: number) {
    return this.db
      .select()
      .from(educations)
      .where(eq(educations.userId, userId))
      .orderBy(desc(educations.id));
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const count = Number(q["count"] ?? 10);
    return { skip: (page - 1) * count, limit: count };
  }
}
