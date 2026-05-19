-- 0022_add_property_accounting_setup.sql
--
-- Adds sub-accounts and transaction types for property management accounting.
-- All inserts are idempotent (WHERE NOT EXISTS).
--
-- Account IDs: 1=Asset  2=Liability  3=Equity  4=Withdrawal  5=Revenue  6=Expense
-- Sub-account IDs: 1=Cash 2=Bank 3=Inventory 4=AR 5=AP 8=Sales 10=Salary 12=Utilities

-- ─── 1. Sub-accounts ──────────────────────────────────────────────────────────

INSERT INTO `subAccount` (name, accountId, status, created_at, updated_at)
SELECT 'Rental Revenue', 5, 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `subAccount` WHERE name = 'Rental Revenue');

INSERT INTO `subAccount` (name, accountId, status, created_at, updated_at)
SELECT 'Tenant Deposits', 2, 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `subAccount` WHERE name = 'Tenant Deposits');

INSERT INTO `subAccount` (name, accountId, status, created_at, updated_at)
SELECT 'Maintenance', 6, 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `subAccount` WHERE name = 'Maintenance');

-- ─── 2. Transaction types ──────────────────────────────────────────────────────
-- Dynamic IDs: fetch newly inserted sub-account IDs via sub-selects.

-- LOC - Journal des Loyers : AR → Rental Revenue
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'LOC - Rental Journal',
  (SELECT id FROM subAccount WHERE name = 'Accounts Receivable' LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Rental Revenue'      LIMIT 1),
  'Monthly rent due — records the rent receivable from the tenant',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'LOC - Rental Journal');

-- CAI - Paiement fournisseur cash : AP → Cash
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'CAI - Supplier Cash Payment',
  (SELECT id FROM subAccount WHERE name = 'Accounts Payable' LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Cash'             LIMIT 1),
  'Supplier invoice paid in cash',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'CAI - Supplier Cash Payment');

-- CAI - Dépôt caution cash : Cash → Tenant Deposits
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'CAI - Security Deposit Receipt',
  (SELECT id FROM subAccount WHERE name = 'Cash'            LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Tenant Deposits' LIMIT 1),
  'Security deposit received from tenant in cash',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'CAI - Security Deposit Receipt');

-- BNQ - Dépôt caution banque : Bank → Tenant Deposits
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'BNQ - Security Deposit Receipt',
  (SELECT id FROM subAccount WHERE name = 'Bank'            LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Tenant Deposits' LIMIT 1),
  'Security deposit received from tenant by bank transfer',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'BNQ - Security Deposit Receipt');

-- BNQM - Maintenance : Maintenance → Bank
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'BNQM - Maintenance Journal',
  (SELECT id FROM subAccount WHERE name = 'Maintenance' LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Bank'        LIMIT 1),
  'Property maintenance and repair costs paid by bank transfer',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'BNQM - Maintenance Journal');

-- SAL - Salaires cash : Salary → Cash
INSERT INTO `transaction_types` (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT
  'SAL - Payroll Cash',
  (SELECT id FROM subAccount WHERE name = 'Salary' LIMIT 1),
  (SELECT id FROM subAccount WHERE name = 'Cash'   LIMIT 1),
  'Salaries and payroll charges paid in cash',
  1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'SAL - Payroll Cash');
