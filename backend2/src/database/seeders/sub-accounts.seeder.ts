// Les sous-comptes sont desormais crees par provisionOrgChartOfAccounts (appele
// depuis seedAccounts) pour garantir la resolution des IDs par NOM et l isolation
// par org. Ce seeder devient un no-op conserve pour ne pas casser l ordre du
// runner (seed.ts). Voir provisioning/chart-of-accounts.ts.
export async function seedSubAccounts() {
  console.log("  [sub-accounts] gere par provisionOrgChartOfAccounts (no-op).");
}
