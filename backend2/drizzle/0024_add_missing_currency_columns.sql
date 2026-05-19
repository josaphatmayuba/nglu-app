-- 0024_add_missing_currency_columns.sql
--
-- Adds currencyId to saleInvoice and purchaseInvoice tables.
-- Migration 0013 (which was supposed to do this) was never registered
-- in the journal and was skipped. This migration is fully idempotent
-- using IF NOT EXISTS (MySQL 8.0+).

SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

-- ─── saleInvoice ──────────────────────────────────────────────────────────────
ALTER TABLE `saleInvoice`
  ADD COLUMN IF NOT EXISTS `currencyId` BIGINT NULL AFTER `customerId`;

UPDATE `saleInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;

-- ─── purchaseInvoice ──────────────────────────────────────────────────────────
ALTER TABLE `purchaseInvoice`
  ADD COLUMN IF NOT EXISTS `currencyId` BIGINT NULL AFTER `supplierId`;

UPDATE `purchaseInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;

-- ─── real_estate_rent_payments (currency_id) ──────────────────────────────────
ALTER TABLE `real_estate_rent_payments`
  ADD COLUMN IF NOT EXISTS `currency_id` BIGINT NULL AFTER `lease_id`;

UPDATE `real_estate_rent_payments`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL AND @defaultCurrencyId IS NOT NULL;

-- ─── real_estate_leases (currency_id) ─────────────────────────────────────────
ALTER TABLE `real_estate_leases`
  ADD COLUMN IF NOT EXISTS `currency_id` BIGINT NULL AFTER `rent_amount`;

UPDATE `real_estate_leases`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL AND @defaultCurrencyId IS NOT NULL;
