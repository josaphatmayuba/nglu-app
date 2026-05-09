import { sql } from "drizzle-orm";
import { db } from "../seed.db";
import { paymentMethods } from "../schema";

export async function seedPaymentMethods() {
  const existing = await db.select({ id: paymentMethods.id }).from(paymentMethods).limit(1);
  if (existing.length) {
    console.log("  [payment-methods] already seeded, skipping.");
    return;
  }

  await db.insert(paymentMethods).values({
    subAccountId: 1, // Cash
    methodName: "Cash",
    ownerAccount: "Cash Account",
    instruction: "Pay in cash at the office",
    isActive: "true",
    status: "true",
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  });
  console.log("  [payment-methods] ✔ 1 record inserted.");
}
