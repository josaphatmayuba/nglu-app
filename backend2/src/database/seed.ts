import "dotenv/config";
import { connection } from "./seed.db";
import { seedAccounts } from "./seeders/accounts.seeder";
import { seedAppSettings } from "./seeders/app-settings.seeder";
import { seedCurrencies } from "./seeders/currencies.seeder";
import { seedPaymentMethods } from "./seeders/payment-methods.seeder";
import { seedPermissions } from "./seeders/permissions.seeder";
import { seedRolePermissions } from "./seeders/role-permissions.seeder";
import { seedRoles } from "./seeders/roles.seeder";
import { seedSubAccounts } from "./seeders/sub-accounts.seeder";
import { seedTransactionTypes } from "./seeders/transaction-types.seeder";
import { seedUsers } from "./seeders/users.seeder";

async function main() {
  console.log("🌱 NgluERP — Database Seeding\n");

  // 1. Accounting structure (must be first — sub-accounts depend on accounts)
  console.log("── Accounting ──────────────────");
  await seedAccounts();
  await seedSubAccounts();
  await seedTransactionTypes();
  await seedPaymentMethods();

  // 2. Configuration
  console.log("\n── Configuration ───────────────");
  await seedCurrencies();
  await seedAppSettings();

  // 3. RBAC (roles → permissions → role-permissions → users)
  console.log("\n── RBAC ────────────────────────");
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedUsers();

  console.log("\n✅ Seeding complete!\n");
  await connection.end();
}

main().catch((err) => {
  console.error("\n❌ Seeding failed:", err);
  process.exit(1);
});
