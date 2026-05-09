import * as bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { users } from "../schema";

const DEMO_USERS = [
  { firstName: "John", lastName: "Doe", username: "demo", password: "5555", roleId: 1 },
  { firstName: "Mr.", lastName: "Admin", username: "admin", password: "admin", roleId: 2 },
  { firstName: "Mr.", lastName: "Customer", username: "customer", password: "customer", roleId: 3 },
  { firstName: "Mrs.", lastName: "Manager", username: "manager", password: "manager", roleId: 4 },
  { firstName: "Mr.", lastName: "Salesman", username: "salesman", password: "salesman", roleId: 5 },
  { firstName: "Mrs.", lastName: "Delivery", username: "delivery", password: "delivery", roleId: 6 },
];

export async function seedUsers() {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  if (existing.length) {
    console.log("  [users] already seeded, skipping.");
    return;
  }

  const rows = await Promise.all(
    DEMO_USERS.map(async (u) => ({
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      password: await bcrypt.hash(u.password, 10),
      roleId: u.roleId,
      status: "true",
      isLogin: "false",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );

  await db.insert(users).values(rows);
  console.log(`  [users] ✔ ${rows.length} demo users inserted.`);
  console.log("  [users]   Credentials: demo/5555, admin/admin, customer/customer, manager/manager, salesman/salesman, delivery/delivery");
}
