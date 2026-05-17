-- 0014_add_currency_id_to_property_units.sql
-- Store the currency used by unit monthly rent and security deposit.

SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);
--> statement-breakpoint
SET @addUnitCurrencySql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'real_estate_units'
      AND COLUMN_NAME = 'currency_id'
  ) = 0,
  'ALTER TABLE `real_estate_units` ADD COLUMN `currency_id` BIGINT NULL AFTER `monthly_rent`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addUnitCurrencyStmt FROM @addUnitCurrencySql;
--> statement-breakpoint
EXECUTE addUnitCurrencyStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addUnitCurrencyStmt;
--> statement-breakpoint

UPDATE `real_estate_units`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;
