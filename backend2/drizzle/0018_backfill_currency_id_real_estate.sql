-- 0018_backfill_currency_id_real_estate.sql
-- Idempotent backfill of currency_id on real_estate_leases and
-- real_estate_rent_payments. Migration 0013 added these columns but
-- partially failed on prod (multi-statement SET/ALTER), leaving the
-- schema inconsistent with __drizzle_migrations. Endpoints
-- /property-management/leases and /payments were returning 500 because
-- the service selects currency_id.

SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);
--> statement-breakpoint
SET @addLeasesCurrencySql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'real_estate_leases'
      AND COLUMN_NAME = 'currency_id'
  ) = 0,
  'ALTER TABLE `real_estate_leases` ADD COLUMN `currency_id` BIGINT NULL AFTER `rent_amount`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addLeasesCurrencyStmt FROM @addLeasesCurrencySql;
--> statement-breakpoint
EXECUTE addLeasesCurrencyStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addLeasesCurrencyStmt;
--> statement-breakpoint
UPDATE `real_estate_leases`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;
--> statement-breakpoint
SET @addPaymentsCurrencySql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'real_estate_rent_payments'
      AND COLUMN_NAME = 'currency_id'
  ) = 0,
  'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `currency_id` BIGINT NULL AFTER `lease_id`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addPaymentsCurrencyStmt FROM @addPaymentsCurrencySql;
--> statement-breakpoint
EXECUTE addPaymentsCurrencyStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addPaymentsCurrencyStmt;
--> statement-breakpoint
UPDATE `real_estate_rent_payments`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;
