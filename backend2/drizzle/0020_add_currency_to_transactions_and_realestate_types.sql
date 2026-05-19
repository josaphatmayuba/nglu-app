-- 0020_add_currency_to_transactions_and_realestate_types.sql
--
-- 1. Add currencyId to the transactions table (nullable — backwards compatible)
-- 2. Backfill from real_estate_rent_payments (linked via transactionId)
-- 3. Backfill remaining rows with the app-default currency
-- 4. Add missing real-estate transaction types (idempotent WHERE NOT EXISTS)

-- ─── 1. Add column ────────────────────────────────────────────────────────────
ALTER TABLE `transaction`
  ADD COLUMN `currencyId` BIGINT NULL AFTER `amount`;

-- ─── 2. Backfill rent-payment transactions from the rent-payments table ───────
UPDATE `transaction` t
JOIN   `real_estate_rent_payments` rp ON rp.transactionId = t.id
SET    t.currencyId = rp.currency_id
WHERE  t.currencyId IS NULL
  AND  rp.currency_id IS NOT NULL;

-- ─── 3. Backfill everything else with the app default ─────────────────────────
SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

UPDATE `transaction`
SET    currencyId = @defaultCurrencyId
WHERE  currencyId IS NULL
  AND  @defaultCurrencyId IS NOT NULL;

-- ─── 4. Real-estate transaction types ─────────────────────────────────────────
-- "Rent Payment" and "Security Deposit" are already in the seeder.
-- Only insert what is genuinely missing.

INSERT INTO `transaction_types`
  (name, debitAccountId, creditAccountId, description, isActive, created_at, updated_at)
SELECT 'Maintenance Expense', 12, 2,
       'Property maintenance and repair costs paid from bank', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `transaction_types` WHERE name = 'Maintenance Expense'
);

INSERT INTO `transaction_types`
  (name, debitAccountId, creditAccountId, description, isActive, created_at, updated_at)
SELECT 'Security Deposit Return', 5, 2,
       'Security deposit returned to tenant from bank', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `transaction_types` WHERE name = 'Security Deposit Return'
);

INSERT INTO `transaction_types`
  (name, debitAccountId, creditAccountId, description, isActive, created_at, updated_at)
SELECT 'Late Payment Fee', 4, 8,
       'Late fee charged to tenant for overdue rent', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `transaction_types` WHERE name = 'Late Payment Fee'
);
