import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { subAccounts } from "../schema";

// accountId matches the order from AccountSeeder: 1=Asset 2=Liability 3=Equity 4=Withdrawal 5=Revenue 6=Expense
const SUB_ACCOUNTS = [
  { name: "Cash", accountId: 1 },
  { name: "Bank", accountId: 1 },
  { name: "Inventory", accountId: 1 },
  { name: "Accounts Receivable", accountId: 1 },
  { name: "Accounts Payable", accountId: 2 },
  { name: "Shareholder 1 Equity", accountId: 3 },
  { name: "Shareholder 1 Withdrawal", accountId: 4 },
  { name: "Sales", accountId: 5 },
  { name: "Cost of Sales", accountId: 6 },
  { name: "Salary", accountId: 6 },
  { name: "Rent", accountId: 6 },
  { name: "Utilities", accountId: 6 },
  { name: "Discount Earned", accountId: 5 },
  { name: "Discount Given", accountId: 6 },
  { name: "Tax", accountId: 2 },
  // Echange de devise : compte de virement interne (pont entre devises) + charge frais.
  { name: "Currency Exchange Clearing", accountId: 1 },
  { name: "Exchange Fees", accountId: 6 },
];

export async function seedSubAccounts() {
  const existing = await db.select({ id: subAccounts.id }).from(subAccounts).limit(1);
  if (existing.length) {
    console.log("  [sub-accounts] already seeded, skipping.");
    return;
  }

  await db.insert(subAccounts).values(
    SUB_ACCOUNTS.map((s) => ({
      ...s,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [sub-accounts] ✔ ${SUB_ACCOUNTS.length} records inserted.`);
}
