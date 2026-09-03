import { db } from "../seed.db";
import { provisionOrgChartOfAccounts } from "../provisioning/chart-of-accounts";

// Bootstrap du plan comptable pour l org #1 (base historique). Toute la logique
// (idempotente, par org, resolution des IDs par NOM) vit dans
// provisionOrgChartOfAccounts, partagee avec l inscription P3 d un nouveau tenant.
// Cette fonction seede d un coup comptes + sous-comptes + types pour l org #1.
export async function seedAccounts() {
  await provisionOrgChartOfAccounts(db as any, 1);
  console.log("  [accounts] ✔ plan comptable garanti pour l org #1 (comptes + sous-comptes + types).");
}
