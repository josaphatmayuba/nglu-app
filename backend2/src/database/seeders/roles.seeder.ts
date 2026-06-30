import { inArray, sql } from "drizzle-orm";
import { db } from "../seed.db";
import { roles } from "../schema";

// "super_owner" = role systeme du proprietaire de la plateforme (multi-tenant P1).
// Au-dessus des organisations : bascule d org via X-Active-Org (cf. jwt-auth.guard).
const ROLES = ["super_owner", "super-admin", "admin", "customer", "manager", "salesman", "delivery-boy", "Locataire"];

export async function seedRoles() {
  const existing = await db.select({ name: roles.name }).from(roles).where(inArray(roles.name, ROLES));
  const existingNames = new Set(existing.map((role) => role.name));
  const missingRoles = ROLES.filter((name) => !existingNames.has(name));

  if (!missingRoles.length) {
    console.log("  [roles] already seeded, all required roles present.");
    return;
  }

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
}
