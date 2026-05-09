import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { transactionTypes } from "../schema";

// Sub-account IDs: 1=Cash 2=Bank 3=Inventory 4=AR 5=AP 8=Sales 9=COS 15=Tax
const TRANSACTION_TYPES = [
  { name: "Rent Payment", debitAccountId: 1, creditAccountId: 2, description: "Rent payment received from tenant" },
  { name: "Security Deposit", debitAccountId: 1, creditAccountId: 3, description: "Security deposit collected from tenant" },
  { name: "Sale Invoice", debitAccountId: 4, creditAccountId: 8, description: "Credit sale to customer" },
  { name: "Sale Payment", debitAccountId: 1, creditAccountId: 4, description: "Payment received from customer" },
  { name: "Purchase Invoice", debitAccountId: 3, creditAccountId: 5, description: "Purchase from supplier on credit" },
  { name: "Purchase Payment", debitAccountId: 5, creditAccountId: 1, description: "Payment made to supplier" },
];

export async function seedTransactionTypes() {
  const existing = await db.select({ id: transactionTypes.id }).from(transactionTypes).limit(1);
  if (existing.length) {
    console.log("  [transaction-types] already seeded, skipping.");
    return;
  }

  await db.insert(transactionTypes).values(
    TRANSACTION_TYPES.map((t) => ({
      ...t,
      isActive: true,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })),
  );
  console.log(`  [transaction-types] ✔ ${TRANSACTION_TYPES.length} records inserted.`);
}
