import { eq, sql } from "drizzle-orm";
import { accounts, subAccounts, transactionTypes } from "../schema";
import type { Database } from "../types";

// Plan comptable canonique (multi-tenant P2/P3) : rejoue pour UNE organisation
// donnee, en resolvant les IDs reels par NOM (les auto-increment ne valent pas
// 1..6 pour la 2e org). Idempotent : ne cree que ce qui manque pour cette org.
// Utilise par le seeder bootstrap (org #1) ET par l inscription P3 (nouvel org).
// Le handle `db` peut etre une transaction (meme API) pour une creation atomique.

const ACCOUNTS: Array<{ name: string; type: string }> = [
  { name: "Asset", type: "Asset" },
  { name: "Liability", type: "Liability" },
  { name: "Equity", type: "Equity" },
  { name: "Withdrawal", type: "Equity" },
  { name: "Revenue", type: "Revenue" },
  { name: "Expense", type: "Expense" },
];

// accountName = le compte racine parent (resolu par nom, pas par id fige).
const SUB_ACCOUNTS: Array<{ name: string; accountName: string }> = [
  { name: "Cash", accountName: "Asset" },
  { name: "Bank", accountName: "Asset" },
  { name: "Inventory", accountName: "Asset" },
  { name: "Accounts Receivable", accountName: "Asset" },
  { name: "Accounts Payable", accountName: "Liability" },
  { name: "Shareholder 1 Equity", accountName: "Equity" },
  { name: "Shareholder 1 Withdrawal", accountName: "Withdrawal" },
  { name: "Sales", accountName: "Revenue" },
  { name: "Cost of Sales", accountName: "Expense" },
  { name: "Salary", accountName: "Expense" },
  { name: "Rent", accountName: "Expense" },
  { name: "Utilities", accountName: "Expense" },
  { name: "Discount Earned", accountName: "Revenue" },
  { name: "Discount Given", accountName: "Expense" },
  { name: "Tax", accountName: "Liability" },
  { name: "Currency Exchange Clearing", accountName: "Asset" },
  { name: "Exchange Fees", accountName: "Expense" },
];

// debit/credit = noms de sous-comptes (resolus par nom pour cette org).
const TRANSACTION_TYPES: Array<{ name: string; debit: string; credit: string; description: string }> = [
  { name: "Rent Payment", debit: "Cash", credit: "Bank", description: "Rent payment received from tenant" },
  { name: "Security Deposit", debit: "Cash", credit: "Inventory", description: "Security deposit collected from tenant" },
  { name: "Sale Invoice", debit: "Accounts Receivable", credit: "Sales", description: "Credit sale to customer" },
  { name: "Sale Payment", debit: "Cash", credit: "Accounts Receivable", description: "Payment received from customer" },
  { name: "Purchase Invoice", debit: "Inventory", credit: "Accounts Payable", description: "Purchase from supplier on credit" },
  { name: "Purchase Payment", debit: "Accounts Payable", credit: "Cash", description: "Payment made to supplier" },
];

/**
 * Cree (si absents) les comptes / sous-comptes / types de transaction canoniques
 * pour `orgId`. Renvoie les tables de correspondance nom -> id.
 */
export async function provisionOrgChartOfAccounts(db: Database, orgId: number) {
  // 1) Comptes racine
  const accountIdByName = new Map<string, number>();
  const existingAccounts = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.organizationId, orgId));
  for (const a of existingAccounts) accountIdByName.set(a.name, a.id);

  for (const a of ACCOUNTS) {
    if (accountIdByName.has(a.name)) continue;
    const [res] = await db.insert(accounts).values({
      organizationId: orgId,
      name: a.name,
      type: a.type,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any);
    accountIdByName.set(a.name, Number((res as any).insertId));
  }

  // 2) Sous-comptes (accountId resolu par nom)
  const subIdByName = new Map<string, number>();
  const existingSubs = await db
    .select({ id: subAccounts.id, name: subAccounts.name })
    .from(subAccounts)
    .where(eq(subAccounts.organizationId, orgId));
  for (const s of existingSubs) subIdByName.set(s.name, s.id);

  for (const s of SUB_ACCOUNTS) {
    if (subIdByName.has(s.name)) continue;
    const accountId = accountIdByName.get(s.accountName);
    if (!accountId) throw new Error(`provisionOrgChartOfAccounts: compte parent "${s.accountName}" introuvable.`);
    const [res] = await db.insert(subAccounts).values({
      organizationId: orgId,
      name: s.name,
      accountId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any);
    subIdByName.set(s.name, Number((res as any).insertId));
  }

  // 3) Types de transaction (debit/credit resolus par nom de sous-compte)
  const existingTypes = await db
    .select({ name: transactionTypes.name })
    .from(transactionTypes)
    .where(eq(transactionTypes.organizationId, orgId));
  const existingTypeNames = new Set(existingTypes.map((t) => t.name));

  for (const t of TRANSACTION_TYPES) {
    if (existingTypeNames.has(t.name)) continue;
    const debitAccountId = subIdByName.get(t.debit);
    const creditAccountId = subIdByName.get(t.credit);
    if (!debitAccountId || !creditAccountId) {
      throw new Error(`provisionOrgChartOfAccounts: sous-compte debit/credit introuvable pour "${t.name}".`);
    }
    await db.insert(transactionTypes).values({
      organizationId: orgId,
      name: t.name,
      debitAccountId,
      creditAccountId,
      description: t.description,
      isActive: true,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    } as any);
  }

  return { accountIdByName, subIdByName };
}

/** Variante de confort : recharge les correspondances sans rien creer. */
export async function loadOrgAccountMaps(db: Database, orgId: number) {
  const accs = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.organizationId, orgId));
  const subs = await db
    .select({ id: subAccounts.id, name: subAccounts.name })
    .from(subAccounts)
    .where(eq(subAccounts.organizationId, orgId));
  return {
    accountIdByName: new Map(accs.map((a) => [a.name, a.id])),
    subIdByName: new Map(subs.map((s) => [s.name, s.id])),
  };
}
