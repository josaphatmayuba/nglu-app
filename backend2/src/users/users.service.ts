import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { roles, users } from "../database/schema";
import type { Database } from "../database/types";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

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
    return { ...this.safeUser(user), role };
  }

  async create(dto: CreateUserDto) {
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

    return this.findOne(Number(result.insertId));
  }

  async update(id: number, dto: UpdateUserDto) {
    const [user] = await this.db
      .select({ id: users.id })
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

    return this.findOne(id);
  }

  async remove(id: number, status: string) {
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

    return { message: "User deleted successfully" };
  }

  private safeUser(u: typeof users.$inferSelect) {
    const { password: _, refreshToken: __, isLogin: ___, ...safe } = u;
    return safe;
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const count = Number(q["count"] ?? 10);
    return { skip: (page - 1) * count, limit: count };
  }
}
