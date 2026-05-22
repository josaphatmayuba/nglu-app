import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
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
import { RealtimePermissionsPublisher } from "../realtime/realtime-permissions-publisher.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly realtimePermissions: RealtimePermissionsPublisher,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      const rows = await this.db
        .select()
        .from(users)
        .where(eq(users.status, "true"))
        .orderBy(desc(users.id));

      return {
        getAllUser: rows.map(this.safeUser),
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

    const hash = await bcrypt.hash(dto.password, 10);

    const [result] = await this.db.insert(users).values({
      ...dto,
      password: hash,
      joinDate: dto.joinDate ? new Date(dto.joinDate) : null,
      leaveDate: dto.leaveDate ? new Date(dto.leaveDate) : null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const newId = Number(result.insertId);
    await this.audit.log("admin.user.created", `user:${newId}`, ctx, {
      username: dto.username,
      roleId: dto.roleId,
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
