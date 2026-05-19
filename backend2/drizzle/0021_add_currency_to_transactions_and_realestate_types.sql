-- 0021_add_currency_to_transactions_and_realestate_types.sql
--
-- Fully idempotent — safe to run on fresh or already-migrated databases.
-- Uses IF NOT EXISTS (MySQL 8.0+) and WHERE NOT EXISTS guards.

-- ─── 1. Add currencyId to transactions (idempotent) ──────────────────────────
ALTER TABLE `transaction`
  ADD COLUMN IF NOT EXISTS `currencyId` BIGINT NULL AFTER `amount`;

-- ─── 2. Add is_active to maintenance requests (missed in 0019) ───────────────
ALTER TABLE `real_estate_maintenance_requests`
  ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `description`;

-- ─── 3. Backfill currencyId from rent payments ───────────────────────────────
UPDATE `transaction` t
JOIN   `real_estate_rent_payments` rp ON rp.transaction_id = t.id
SET    t.currencyId = rp.currency_id
WHERE  t.currencyId IS NULL
  AND  rp.currency_id IS NOT NULL;

-- ─── 4. Backfill remaining rows with app default currency ────────────────────
SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

UPDATE `transaction`
SET    currencyId = @defaultCurrencyId
WHERE  currencyId IS NULL
  AND  @defaultCurrencyId IS NOT NULL;

-- ─── 5. Real-estate transaction types (idempotent) ───────────────────────────

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'Maintenance Expense', 12, 2, 'Property maintenance and repair costs', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'Maintenance Expense');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'Security Deposit Return', 5, 2, 'Security deposit returned to tenant from bank', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'Security Deposit Return');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'Late Payment Fee', 4, 8, 'Late fee charged to tenant for overdue rent', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'Late Payment Fee');

-- ─── 6. Standard journal types ───────────────────────────────────────────────

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'VTE - Sales Journal', 4, 8, 'Customer invoices and revenue', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'VTE - Sales Journal');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'ACH - Purchase Journal', 3, 5, 'Supplier invoices and purchases', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'ACH - Purchase Journal');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'BNQ - Bank Journal', 2, 4, 'Bank receipts and payments', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'BNQ - Bank Journal');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'CAI - Cash Journal', 1, 4, 'Cash receipts and disbursements', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'CAI - Cash Journal');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'SAL - Payroll Journal', 10, 2, 'Salaries and payroll charges', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'SAL - Payroll Journal');

INSERT INTO `transaction_types`
  (name, debit_account_id, credit_account_id, description, is_active, created_at, updated_at)
SELECT 'OD - General Journal', 1, 2, 'Miscellaneous adjustments and provisions', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `transaction_types` WHERE name = 'OD - General Journal');
