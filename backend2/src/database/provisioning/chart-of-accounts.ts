import { and, eq, sql } from "drizzle-orm";
import { accounts, paymentMethods, subAccounts, transactionTypeRules, transactionTypes } from "../schema";
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
  // Avance fournisseur BatiPro (migration 0231) : acompte verse avant reception
  // physique du BC = creance sur le fournisseur, donc ACTIF (pas une charge).
  { name: "Supplier Advance", accountName: "Asset" },
  // Ecart de caisse KodaTill (migration 0247, SCRUM-307) : excedent ou manquant
  // constate au comptage a la cloture d une session de caisse. Compte UNIQUE
  // recevant les deux sens (CREDIT si excedent, DEBIT si manquant), donc rattache
  // a Revenue (sens naturel positif). Nom SANS accent : il doit correspondre au
  // caractere pres a ACCOUNT_CASH_VARIANCE de kodatill/accounting.service.ts,
  // qui resout ce compte par nom et ne le cree jamais.
  { name: "Ecart de caisse", accountName: "Revenue" },
  // Remboursement hypothecaire Domus (SCRUM-311) : le capital rembourse solde une
  // DETTE (Liability), seuls les interets sont une charge. Noms SANS accent, ils
  // doivent correspondre au caractere pres aux constantes MORTGAGE_* de
  // property-management.service.ts, qui resout ces comptes par nom.
  { name: "Emprunts hypothecaires", accountName: "Liability" },
  { name: "Interets demprunt", accountName: "Expense" },
];

// Regles transaction_type_rules (postByRules) liees a l avance fournisseur BatiPro
// (migration 0231, memes noms de role/type que la migration SQL). accountName =
// nom du SOUS-COMPTE (resolu par nom, pas par id fige) pour cette org.
const TRANSACTION_TYPE_RULES: Array<{ type: string; role: string; accountName: string; side: "DEBIT" | "CREDIT"; sortOrder: number }> = [
  // Acompte verse avant reception : DEBIT avance fournisseur / CREDIT tresorerie.
  { type: "batipro_supplier_advance", role: "supplier_advance", accountName: "Supplier Advance", side: "DEBIT", sortOrder: 1 },
  { type: "batipro_supplier_advance", role: "cash", accountName: "Cash", side: "CREDIT", sortOrder: 2 },
  // Solde de l avance a la reception : DEBIT dette fournisseur / CREDIT avance fournisseur.
  { type: "batipro_advance_offset", role: "payable", accountName: "Accounts Payable", side: "DEBIT", sortOrder: 1 },
  { type: "batipro_advance_offset", role: "supplier_advance", accountName: "Supplier Advance", side: "CREDIT", sortOrder: 2 },
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

  // 4) Moyen de paiement « Cash » par defaut (lie au sous-compte Cash de l org).
  //    Sinon la liste des moyens de paiement d une org neuve est vide.
  const cashSubId = subIdByName.get("Cash");
  if (cashSubId) {
    const existingCash = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(and(eq(paymentMethods.organizationId, orgId), eq(paymentMethods.methodName, "Cash")))
      .limit(1);
    if (!existingCash.length) {
      await db.insert(paymentMethods).values({
        organizationId: orgId,
        subAccountId: cashSubId,
        methodName: "Cash",
        ownerAccount: "Cash Account",
        instruction: "Pay in cash at the office",
        isActive: "true",
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);
    }
  }

  // 5) Regles comptables par role (transaction_type_rules) pour l avance
  //    fournisseur BatiPro. Idempotent : verifie (org, type, role) avant insert.
  const existingRules = await db
    .select({ type: transactionTypeRules.type, role: transactionTypeRules.role })
    .from(transactionTypeRules)
    .where(eq(transactionTypeRules.organizationId, orgId));
  const existingRuleKeys = new Set(existingRules.map((r) => `${r.type}:${r.role}`));

  for (const r of TRANSACTION_TYPE_RULES) {
    const key = `${r.type}:${r.role}`;
    if (existingRuleKeys.has(key)) continue;
    const accountId = subIdByName.get(r.accountName);
    if (!accountId) throw new Error(`provisionOrgChartOfAccounts: sous-compte "${r.accountName}" introuvable pour la regle "${key}".`);
    await db.insert(transactionTypeRules).values({
      organizationId: orgId,
      type: r.type,
      role: r.role,
      accountId,
      side: r.side,
      sortOrder: r.sortOrder,
      isActive: 1,
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
