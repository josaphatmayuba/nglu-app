-- 0013_add_currency_id_to_transactions.sql
-- Add currencyId to per-transaction tables so each invoice / payment
-- can store its own currency, independent of the company default.
-- Backfill uses the appSetting's currencyId for existing rows.

-- Helper: pick the default currencyId from app settings (NULL if unset)
SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

-- ─── 1. Sale invoices ─────────────────────────────────────
ALTER TABLE `saleInvoice`
  ADD COLUMN `currencyId` BIGINT NULL AFTER `customerId`;

UPDATE `saleInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL;

-- ─── 2. Purchase invoices ─────────────────────────────────
ALTER TABLE `purchaseInvoice`
  ADD COLUMN `currencyId` BIGINT NULL AFTER `supplierId`;

UPDATE `purchaseInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL;

-- ─── 3. Property management rent payments ─────────────────
ALTER TABLE `real_estate_rent_payments`
  ADD COLUMN `currency_id` BIGINT NULL AFTER `lease_id`;

UPDATE `real_estate_rent_payments`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;

-- ─── 4. Property leases (so rent is in a known currency) ──
ALTER TABLE `real_estate_leases`
  ADD COLUMN `currency_id` BIGINT NULL AFTER `rent_amount`;

UPDATE `real_estate_leases`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;
