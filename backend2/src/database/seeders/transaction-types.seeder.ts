// Les types de transaction sont desormais crees par provisionOrgChartOfAccounts
// (appele depuis seedAccounts), avec resolution des sous-comptes debit/credit par
// NOM et isolation par org. Ce seeder devient un no-op conserve pour ne pas casser
// l ordre du runner (seed.ts). Voir provisioning/chart-of-accounts.ts.
export async function seedTransactionTypes() {
  console.log("  [transaction-types] gere par provisionOrgChartOfAccounts (no-op).");
}
