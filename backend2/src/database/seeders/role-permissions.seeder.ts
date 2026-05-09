import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { permissions, rolePermissions } from "../schema";

// Permission IDs granted to customer role (roleId=3) — same as Laravel RolePermissionSeeder
const CUSTOMER_PERMISSION_IDS = [17, 18, 37, 38, 63, 107, 108, 111, 113, 114, 132, 182, 183, 187, 201, 202, 203, 204, 205, 212, 256, 258, 259, 267, 64];

// Permission IDs granted to manager role (roleId=4)
const MANAGER_PERMISSION_IDS = [17, 18, 37, 38, 63, 107, 108, 111, 113, 114, 132, 182, 183, 187, 201, 202, 203, 204, 205, 212, 256, 258, 259, 267];

export async function seedRolePermissions() {
  const existing = await db.select({ id: rolePermissions.id }).from(rolePermissions).limit(1);
  if (existing.length) {
    console.log("  [role-permissions] already seeded, skipping.");
    return;
  }

  const allPermissions = await db.select({ id: permissions.id }).from(permissions);
  if (!allPermissions.length) {
    console.log("  [role-permissions] no permissions found — run permission seeder first.");
    return;
  }

  const rows: Array<{ roleId: number; permissionId: number; createdAt: ReturnType<typeof sql>; updatedAt: ReturnType<typeof sql> }> = [];

  // super-admin (roleId=1) gets all permissions
  for (const p of allPermissions) {
    rows.push({ roleId: 1, permissionId: p.id, createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` });
  }

  // customer (roleId=3)
  for (const id of CUSTOMER_PERMISSION_IDS) {
    rows.push({ roleId: 3, permissionId: id, createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` });
  }

  // manager (roleId=4)
  for (const id of MANAGER_PERMISSION_IDS) {
    rows.push({ roleId: 4, permissionId: id, createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` });
  }

  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db.insert(rolePermissions).values(rows.slice(i, i + CHUNK));
  }
  console.log(`  [role-permissions] ✔ ${rows.length} records inserted.`);
}
