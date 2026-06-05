export const fallback = {
  transactions: [
    { id: 1, date: "2026-06-01", particulars: "Subvention operationnelle", amount: 12500, type: "Revenue", debit: { name: "Bank" }, credit: { name: "Donation Revenue" } },
    { id: 2, date: "2026-06-02", particulars: "Achat fournitures", amount: 1850, type: "Expense", debit: { name: "Office Expense" }, credit: { name: "Bank" } },
    { id: 3, date: "2026-06-03", particulars: "Paie equipe terrain", amount: 4200, type: "Payroll", debit: { name: "Salary" }, credit: { name: "Bank" } }
  ],
  accounts: [
    { id: 1, name: "Cash", account: { name: "Asset", type: "Asset" } },
    { id: 2, name: "Bank", account: { name: "Asset", type: "Asset" } },
    { id: 10, name: "Salary", account: { name: "Expense", type: "Expense" } },
    { id: 11, name: "Donation Revenue", account: { name: "Revenue", type: "Revenue" } }
  ],
  mainAccounts: [
    { id: 1, name: "Asset", type: "Asset" },
    { id: 2, name: "Liability", type: "Liability" },
    { id: 3, name: "Equity", type: "Equity" },
    { id: 4, name: "Revenue", type: "Revenue" },
    { id: 5, name: "Expense", type: "Expense" }
  ],
  trialBalance: { match: true, totalDebit: 18550, totalCredit: -18550, debits: [], credits: [] },
  balanceSheet: { match: true, totalAsset: 12500, totalLiability: 0, totalEquity: 12500, assets: [], liabilities: [], equity: [] },
  incomeStatement: { totalRevenue: 12500, totalExpense: -6050, profit: 6450, revenue: [], expense: [] }
};
