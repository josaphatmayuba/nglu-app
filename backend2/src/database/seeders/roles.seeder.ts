import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../seed.db";
import { permissions, roles, rolePermissions } from "../schema";

// "super_owner" = role systeme du proprietaire de la plateforme (multi-tenant P1).
// Au-dessus des organisations : bascule d org via X-Active-Org (cf. jwt-auth.guard).
const ROLES = ["super_owner", "super-admin", "admin", "customer", "manager", "salesman", "delivery-boy", "Locataire"];

export async function seedRoles() {
  const existing = await db.select({ name: roles.name }).from(roles).where(inArray(roles.name, ROLES));
  const existingNames = new Set(existing.map((role) => role.name));
  const missingRoles = ROLES.filter((name) => !existingNames.has(name));

  if (missingRoles.length) {
    await db.insert(roles).values(
      missingRoles.map((name) => ({
        // Phase 0 multi-tenant : roles de base rattaches a l org 1 (historique).
        organizationId: 1,
        name,
        // "true" pour matcher la convention attendue par roles.service.ts
        // (qui filtre `where(eq(roles.status, "true"))`). Cohérent avec
        // users.seeder.ts. Avant ce fix le seeder posait "active" et les
        // rôles seedés étaient invisibles dans le UI.
        status: "true",
        // super_owner = rôle systeme (proprietaire plateforme, P1 multi-tenant).
        isSystem: name === "super_owner" ? 1 : 0,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })),
    );
    console.log(`  [roles] inserted ${missingRoles.length} missing role(s).`);
  } else {
    console.log("  [roles] already seeded, all required roles present.");
  }

  await seedSuperOwnerPermissions();
}

// super_owner garde acces complet au CRM (SuperOwnerGuard verifie isSuperOwner,
// independant du RBAC) : sans ce seed le role reste sans permission et le menu
// CRM se vide pour tout compte bascule sur super_owner (cf. incident 2026-08-12).
async function seedSuperOwnerPermissions() {
  const [superOwnerRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, "super_owner")).limit(1);
  if (!superOwnerRole) return;

  const allPermissions = await db.select({ id: permissions.id }).from(permissions);
  if (!allPermissions.length) return;

  const grantedRows = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, superOwnerRole.id));
  const grantedIds = new Set(grantedRows.map((row) => row.permissionId));

  const missingPermissions = allPermissions.filter((permission) => !grantedIds.has(permission.id));
  if (!missingPermissions.length) {
    console.log("  [roles] super_owner already has all permissions.");
    return;
  }

  await db.insert(rolePermissions).values(
    missingPermissions.map((permission) => ({
      organizationId: 1,
      roleId: superOwnerRole.id,
      permissionId: permission.id,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [roles] granted ${missingPermissions.length} permission(s) to super_owner.`);
}
