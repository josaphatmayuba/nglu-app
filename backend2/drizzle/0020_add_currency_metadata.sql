-- 0020_add_currency_metadata.sql
-- Adds currencyCode (ISO 4217) and decimalPlaces to the currency table.
-- MySQL 8.0 compatible: PREPARE/EXECUTE for idempotent ADD COLUMN.

SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'currency' AND COLUMN_NAME = 'currencyCode');
SET @q1 := IF(@c1 = 0,
  'ALTER TABLE `currency` ADD COLUMN `currencyCode` VARCHAR(3) NULL AFTER `currencyName`',
  'SELECT 1');
PREPARE p1 FROM @q1; EXECUTE p1; DEALLOCATE PREPARE p1;
--> statement-breakpoint

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'currency' AND COLUMN_NAME = 'decimalPlaces');
SET @q2 := IF(@c2 = 0,
  'ALTER TABLE `currency` ADD COLUMN `decimalPlaces` INT NOT NULL DEFAULT 2 AFTER `currencyCode`',
  'SELECT 1');
PREPARE p2 FROM @q2; EXECUTE p2; DEALLOCATE PREPARE p2;
