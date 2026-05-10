import { inArray, sql } from "drizzle-orm";
import { db } from "../seed.db";
import { roles } from "../schema";

const ROLES = ["super-admin", "admin", "customer", "manager", "salesman", "delivery-boy", "Locataire"];

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
      name,
      status: "active",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [roles] inserted ${missingRoles.length} missing role(s).`);
}
