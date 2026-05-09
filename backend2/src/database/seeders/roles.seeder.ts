import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { roles } from "../schema";

const ROLES = ["super-admin", "admin", "customer", "manager", "salesman", "delivery-boy"];

export async function seedRoles() {
  const existing = await db.select({ id: roles.id }).from(roles).limit(1);
  if (existing.length) {
    console.log("  [roles] already seeded, skipping.");
    return;
  }

  await db.insert(roles).values(
    ROLES.map((name) => ({
      name,
      status: "active",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [roles] ✔ ${ROLES.length} records inserted.`);
}
