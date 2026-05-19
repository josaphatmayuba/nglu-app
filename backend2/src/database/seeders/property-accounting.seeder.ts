/**
 * property-accounting.seeder.ts
 *
 * Idempotent seeder — safe to run multiple times.
 * Creates sub-accounts and transaction types specific to property management
 * that are not part of the generic bootstrap seeder (sub-accounts.seeder.ts).
 *
 * Run standalone:
 *   npx ts-node -r tsconfig-paths/register src/database/seeders/property-accounting.seeder.ts
 *
 * Or call seedPropertyAccounting() from seed.ts / seed-demo.ts.
 */

import { eq, sql } from "drizzle-orm";
import { db, connection } from "../seed.db";
import { subAccounts, transactionTypes } from "../schema";

// ─── Account IDs (from accounts.seeder.ts) ────────────────────────────────────
// 1=Asset  2=Liability  3=Equity  4=Withdrawal  5=Revenue  6=Expense
const ACCOUNT = { Asset: 1, Liability: 2, Equity: 3, Withdrawal: 4, Revenue: 5, Expense: 6 };

// ─── Known sub-account IDs (from sub-accounts.seeder.ts) ─────────────────────
// 1=Cash  2=Bank  3=Inventory  4=AR  5=AP  6=Equity  7=Withdrawal
// 8=Sales  9=COS  10=Salary  11=Rent  12=Utilities  13=DiscEarned  14=DiscGiven  15=Tax

async function getOrCreate(name: string, accountId: number): Promise<number> {
  const existing = await db
    .select({ id: subAccounts.id })
    .from(subAccounts)
    .where(eq(subAccounts.name, name))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [result] = await db.insert(subAccounts).values({
    name,
    accountId,
    status: "true",
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  });
  const id = Number((result as any).insertId);
  console.log(`  [property-accounting] ✔ Sub-account "${name}" created (id=${id})`);
  return id;
}

async function ensureTransactionType(
  name: string,
  debitAccountId: number,
  creditAccountId: number,
  description: string,
) {
  const existing = await db
    .select({ id: transactionTypes.id })
    .from(transactionTypes)
    .where(eq(transactionTypes.name, name))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  [property-accounting] ↷  "${name}" already exists, skipping`);
    return;
  }

  await db.insert(transactionTypes).values({
    name,
    debitAccountId,
    creditAccountId,
    description,
    isActive: true,
    createdAt: sql`CURRENT_TIMESTAMP`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  });
  console.log(`  [property-accounting] ✔ Transaction type "${name}" created`);
}

export async function seedPropertyAccounting() {
  console.log("\n── Property Accounting ──────────────────");

  // ─── 1. Sub-accounts ────────────────────────────────────────────────────────
  const rentalRevenueId  = await getOrCreate("Rental Revenue",  ACCOUNT.Revenue);    // Revenus locatifs
  const tenantDepositsId = await getOrCreate("Tenant Deposits", ACCOUNT.Liability);  // Dépôts des locataires
  const maintenanceId    = await getOrCreate("Maintenance",     ACCOUNT.Expense);    // Maintenance (distinct from Utilities)

  // Known IDs from bootstrap seeder
  const CASH = 1, BANK = 2, INVENTORY = 3, AR = 4, AP = 5;
  const SALES = 8, SALARY = 10, UTILITIES = 12;

  // ─── 2. Transaction types ────────────────────────────────────────────────────

  // Already created by sub-accounts.seeder or earlier migrations (listed for reference):
  // "Rent Payment"           debit=Cash(1),   credit=Bank(2)        — tenant pays rent (cash → bank)
  // "Security Deposit"       debit=Cash(1),   credit=Inventory(3)   — bootstrap default (kept as-is)
  // "Sale Invoice"           debit=AR(4),     credit=Sales(8)
  // "Sale Payment"           debit=Cash(1),   credit=AR(4)
  // "Purchase Invoice"       debit=Inv(3),    credit=AP(5)
  // "Purchase Payment"       debit=AP(5),     credit=Cash(1)
  // "Maintenance Expense"    debit=Util(12),  credit=Bank(2)
  // "Security Deposit Return"debit=AP(5),     credit=Bank(2)
  // "Late Payment Fee"       debit=AR(4),     credit=Sales(8)
  // "VTE - Sales Journal"    debit=AR(4),     credit=Sales(8)
  // "ACH - Purchase Journal" debit=Inv(3),    credit=AP(5)
  // "BNQ - Bank Journal"     debit=Bank(2),   credit=AR(4)
  // "CAI - Cash Journal"     debit=Cash(1),   credit=AR(4)
  // "SAL - Payroll Journal"  debit=Salary(10),credit=Bank(2)
  // "OD - General Journal"   debit=Cash(1),   credit=Bank(2)

  // New types from property management accounting design:
  await ensureTransactionType(
    "LOC - Rental Journal",
    AR,                // Debit: Accounts Receivable (loyer dû par le locataire)
    rentalRevenueId,   // Credit: Rental Revenue (revenu locatif reconnu)
    "Monthly rent due — records the rent receivable from the tenant",
  );

  await ensureTransactionType(
    "CAI - Supplier Cash Payment",
    AP,    // Debit: Accounts Payable (réduction de la dette fournisseur)
    CASH,  // Credit: Cash (paiement en espèces)
    "Supplier invoice paid in cash",
  );

  await ensureTransactionType(
    "CAI - Security Deposit Receipt",
    CASH,            // Debit: Cash (argent reçu)
    tenantDepositsId,// Credit: Tenant Deposits / liability (somme à restituer)
    "Security deposit received from tenant in cash",
  );

  await ensureTransactionType(
    "BNQ - Security Deposit Receipt",
    BANK,            // Debit: Bank (versement bancaire)
    tenantDepositsId,// Credit: Tenant Deposits / liability
    "Security deposit received from tenant by bank transfer",
  );

  await ensureTransactionType(
    "BNQM - Maintenance Journal",
    maintenanceId, // Debit: Maintenance expense
    BANK,          // Credit: Bank (paid from bank)
    "Property maintenance and repair costs paid by bank transfer",
  );

  await ensureTransactionType(
    "SAL - Payroll Cash",
    SALARY, // Debit: Salary expense
    CASH,   // Credit: Cash (paid in cash)
    "Salaries and payroll charges paid in cash",
  );

  console.log("── Property Accounting done ─────────────");
}

// ─── Standalone execution ─────────────────────────────────────────────────────
if (require.main === module) {
  seedPropertyAccounting()
    .then(() => connection.end())
    .catch((err) => {
      console.error("❌ Property accounting seeding failed:", err);
      process.exit(1);
    });
}
