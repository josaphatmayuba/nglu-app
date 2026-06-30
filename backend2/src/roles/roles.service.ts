import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { DRIZZLE } from "../database/database.constants";
import { permissions, rolePermissions, roles } from "../database/schema";
import type { Database } from "../database/types";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  // orgId : Phase 0 multi-tenant — les roles sont isoles par organisation. Tant
  // qu il n y a qu une org (=1), le comportement est identique a avant.
  async findAll(query: Record<string, string>, orgId?: number) {
    const orgFilter = orgId !== undefined ? eq(roles.organizationId, orgId) : undefined;

    if (query["query"] === "all") {
      const where = and(eq(roles.status, "true"), orgFilter);
      const rows = await this.db
        .select()
        .from(roles)
        .where(where)
        .orderBy(desc(roles.id));

      const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .where(where);

      return { getAllRole: withPerms, totalRole: Number(count) };
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = and(like(roles.name, key), orgFilter);

      const rows = await this.db
        .select()
        .from(roles)
        .where(where)
        .orderBy(desc(roles.id))
        .limit(limit)
        .offset(skip);

      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .where(where);

      const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

      return { getAllRole: withPerms, totalRole: Number(count) };
    }

    if (!Object.keys(query).length) {
      throw new BadRequestException({ error: "Invalid query!" });
    }

    const { skip, limit } = this.pagination(query);

    const statusFilter = query["status"] ? inArray(roles.status, query["status"].split(",")) : undefined;
    const where = and(statusFilter, orgFilter);

    const rows = await this.db
      .select()
      .from(roles)
      .where(where)
      .orderBy(desc(roles.id))
      .limit(limit)
      .offset(skip);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(roles)
      .where(where);

    const withPerms = await Promise.all(rows.map((r) => this.attachPermissions(r)));

    return { getAllRole: withPerms, totalRole: Number(count) };
  }

  async findOne(id: number, orgId?: number) {
    const [role] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), orgId !== undefined ? eq(roles.organizationId, orgId) : undefined))
      .limit(1);

    if (!role) throw new NotFoundException("Role not found");

    return this.attachPermissions(role);
  }

  async create(dto: CreateRoleDto, orgId = 1, ctx: AuditContext = {}) {
    const [result] = await this.db.insert(roles).values({
      organizationId: orgId,
      name: dto.name,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const newId = Number(result.insertId);
    await this.audit.log("admin.role.created", `role:${newId}`, ctx, { name: dto.name });

    return this.findOne(newId, orgId);
  }

  async createMany(data: CreateRoleDto[], orgId = 1) {
    let created = 0;
    for (const item of data) {
      // Unicite par (organization_id, name) : on verifie dans la meme org.
      const existing = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.name, item.name), eq(roles.organizationId, orgId)))
        .limit(1);

      if (!existing.length) {
        await this.db.insert(roles).values({
          organizationId: orgId,
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

  async deleteMany(ids: number[], ctx: AuditContext = {}) {
    for (const id of ids) {
      await this.db.delete(roles).where(eq(roles.id, id));
    }
    await this.audit.log("admin.role.deleted", `roles:[${ids.join(",")}]`, ctx, { count: ids.length, ids });
    return { count: ids.length };
  }

  async update(id: number, dto: UpdateRoleDto, ctx: AuditContext = {}) {
    const [role] = await this.db.select({ id: roles.id, isSystem: roles.isSystem }).from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) throw new NotFoundException("Role not found");
    if (role.isSystem) throw new BadRequestException("System roles cannot be modified.");

    // Strip isSystem from dto — never allow API callers to set it
    const { name } = dto as { name?: string };
    await this.db
      .update(roles)
      .set({ ...(name ? { name } : {}), updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(roles.id, id));

    await this.audit.log("admin.role.updated", `role:${id}`, ctx, { name });

    return { message: "Role Updated Successfully" };
  }

  async remove(id: number, status: string, ctx: AuditContext = {}) {
    const [role] = await this.db.select({ isSystem: roles.isSystem, name: roles.name }).from(roles).where(eq(roles.id, id)).limit(1);
    if (role?.isSystem) throw new BadRequestException("System roles cannot be deleted.");

    await this.db
      .update(roles)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(roles.id, id));

    await this.audit.log("admin.role.status_changed", `role:${id}`, ctx, { status, name: role?.name });

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
