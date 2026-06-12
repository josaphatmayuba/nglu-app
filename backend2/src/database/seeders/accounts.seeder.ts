import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { accounts } from "../schema";

const ACCOUNTS = [
  { name: "Asset", type: "Asset" },
  { name: "Liability", type: "Liability" },
  { name: "Equity", type: "Equity" },
  { name: "Withdrawal", type: "Equity" },
  { name: "Revenue", type: "Revenue" },
  { name: "Expense", type: "Expense" },
];

export async function seedAccounts() {
  const existing = await db.select({ id: accounts.id }).from(accounts).limit(1);
  if (existing.length) {
    console.log("  [accounts] already seeded, skipping.");
    return;
  }

  await db.insert(accounts).values(
    ACCOUNTS.map((a) => ({ ...a, createdAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })),
  );
  console.log(`  [accounts] ✔ ${ACCOUNTS.length} records inserted.`);
}
