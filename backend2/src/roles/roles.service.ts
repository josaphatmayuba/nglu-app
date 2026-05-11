import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { desc, eq, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { permissions, rolePermissions, roles } from "../database/schema";
import type { Database } from "../database/types";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      const rows = await this.db
        .select()
        .from(roles)
        .where(eq(roles.status, "true"))
        .orderBy(desc(roles.id));

      const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

      return { getAllRole: withPerms, totalRole: withPerms.length };
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);

      const rows = await this.db
        .select()
        .from(roles)
        .where(like(roles.name, key))
        .orderBy(desc(roles.id))
        .limit(limit)
        .offset(skip);

      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .where(like(roles.name, key));

      const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

      return { getAllRole: withPerms, totalRole: Number(count) };
    }

    const { skip, limit } = this.pagination(query);

    const statusFilter = query["status"] ? eq(roles.status, query["status"]) : undefined;

    const rows = await this.db
      .select()
      .from(roles)
      .where(statusFilter)
      .orderBy(desc(roles.id))
      .limit(limit)
      .offset(skip);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(roles)
      .where(statusFilter);

    const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

    return { getAllRole: withPerms, totalRole: Number(count) };
  }

  async findOne(id: number) {
    const [role] = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);

    if (!role) throw new NotFoundException("Role not found");

    return this.attachPermissions(role);
  }

  async create(dto: CreateRoleDto) {
    const [result] = await this.db.insert(roles).values({
      name: dto.name,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async createMany(data: CreateRoleDto[]) {
    let created = 0;
    for (const item of data) {
      const existing = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, item.name))
        .limit(1);

      if (!existing.length) {
        await this.db.insert(roles).values({
          name: item.name,
          status: "true",
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
        created++;
      }
    }
    return { count: created };
  }

  async deleteMany(ids: number[]) {
    for (const id of ids) {
      await this.db.delete(roles).where(eq(roles.id, id));
    }
    return { count: ids.length };
  }

  async update(id: number, dto: UpdateRoleDto) {
    const [role] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundException("Role not found");

    await this.db
      .update(roles)
      .set({ ...dto, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(roles.id, id));

    return { message: "Role Updated Successfully" };
  }

  async remove(id: number, status: string) {
    await this.db
      .update(roles)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(roles.id, id));

    return { message: "Role Deleted Successfully" };
  }

  private async attachPermissions(role: typeof roles.$inferSelect) {
    const perms = await this.db
      .select({ rolePermission: rolePermissions, permission: permissions })
      .from(rolePermissions)
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, role.id));

    return {
      ...role,
      rolePermission: perms.map((p) => ({ ...p.rolePermission, permission: p.permission })),
    };
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const count = Number(q["count"] ?? 10);
    return { skip: (page - 1) * count, limit: count };
  }
}
