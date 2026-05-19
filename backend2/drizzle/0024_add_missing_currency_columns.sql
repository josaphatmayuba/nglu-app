-- 0024_add_missing_currency_columns.sql
--
-- Adds currencyId to saleInvoice and purchaseInvoice tables.
-- Idempotent via PREPARE/EXECUTE (MySQL 8.0 compatible).

SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);

-- ─── saleInvoice ──────────────────────────────────────────────────────────────
SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'saleInvoice' AND COLUMN_NAME = 'currencyId');
SET @q1 := IF(@c1 = 0, 'ALTER TABLE `saleInvoice` ADD COLUMN `currencyId` BIGINT NULL AFTER `customerId`', 'SELECT 1');
PREPARE p1 FROM @q1; EXECUTE p1; DEALLOCATE PREPARE p1;
--> statement-breakpoint

UPDATE `saleInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint

-- ─── purchaseInvoice ──────────────────────────────────────────────────────────
SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseInvoice' AND COLUMN_NAME = 'currencyId');
SET @q2 := IF(@c2 = 0, 'ALTER TABLE `purchaseInvoice` ADD COLUMN `currencyId` BIGINT NULL AFTER `supplierId`', 'SELECT 1');
PREPARE p2 FROM @q2; EXECUTE p2; DEALLOCATE PREPARE p2;
--> statement-breakpoint

UPDATE `purchaseInvoice`
SET    `currencyId` = @defaultCurrencyId
WHERE  `currencyId` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint

-- ─── real_estate_rent_payments (currency_id) ──────────────────────────────────
SET @c3 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'currency_id');
SET @q3 := IF(@c3 = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `currency_id` BIGINT NULL AFTER `lease_id`', 'SELECT 1');
PREPARE p3 FROM @q3; EXECUTE p3; DEALLOCATE PREPARE p3;
--> statement-breakpoint

UPDATE `real_estate_rent_payments`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL AND @defaultCurrencyId IS NOT NULL;
--> statement-breakpoint

-- ─── real_estate_leases (currency_id) ─────────────────────────────────────────
SET @c4 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'currency_id');
SET @q4 := IF(@c4 = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `currency_id` BIGINT NULL AFTER `rent_amount`', 'SELECT 1');
PREPARE p4 FROM @q4; EXECUTE p4; DEALLOCATE PREPARE p4;
--> statement-breakpoint

UPDATE `real_estate_leases`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL AND @defaultCurrencyId IS NOT NULL;
