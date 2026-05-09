import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, inArray, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { permissions, rolePermissions } from "../database/schema";
import type { Database } from "../database/types";
import { CreateRolePermissionDto } from "./dto/role-permission.dto";

@Injectable()
export class RolePermissionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async upsert(dto: CreateRolePermissionDto) {
    const { roleId, permissionId: incoming } = dto;

    // Add missing
    for (const permId of incoming) {
      const existing = await this.db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId))
        .limit(1);

      const found = await this.db
        .select({ id: rolePermissions.id })
        .from(rolePermissions)
        .where(eq(rolePermissions.permissionId, permId))
        .limit(1);

      if (!found.length) {
        await this.db.insert(rolePermissions).values({
          roleId,
          permissionId: permId,
          createdAt: sql`CURRENT_TIMESTAMP`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
      }
      void existing;
    }

    // Remove permissions no longer in the list
    const current = await this.db
      .select({ id: rolePermissions.id, permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    for (const row of current) {
      if (!incoming.includes(row.permissionId)) {
        await this.db.delete(rolePermissions).where(eq(rolePermissions.id, row.id));
      }
    }

    return { count: incoming.length };
  }

  async findByRoleId(roleId: number) {
    const rows = await this.db
      .select({ rolePermission: rolePermissions, permission: permissions })
      .from(rolePermissions)
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));

    const permissionNames = rows.map((r) => r.permission?.name).filter(Boolean);

    return { permissions: permissionNames, totalPermissions: rows.length };
  }

  async deleteMany(ids: number[]) {
    if (ids.length) {
      await this.db.delete(rolePermissions).where(inArray(rolePermissions.id, ids));
    }
    return { count: ids.length };
  }

  async removeOne(id: number) {
    const [row] = await this.db
      .select({ id: rolePermissions.id })
      .from(rolePermissions)
      .where(eq(rolePermissions.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("RolePermission not found");

    await this.db.delete(rolePermissions).where(eq(rolePermissions.id, id));

    return { message: "RolePermission Deleted Successfully" };
  }
}
