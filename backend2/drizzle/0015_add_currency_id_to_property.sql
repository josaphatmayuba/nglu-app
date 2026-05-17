-- 0015_add_currency_id_to_property.sql
-- Store the currency used by the property's marketValue and defaultRent.
-- Inherited by newly-created units when no per-unit currency is provided.

SET @defaultCurrencyId := (SELECT currencyId FROM appSetting ORDER BY id LIMIT 1);
--> statement-breakpoint
SET @addPropCurrencySql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'real_estate_properties'
      AND COLUMN_NAME = 'currency_id'
  ) = 0,
  'ALTER TABLE `real_estate_properties` ADD COLUMN `currency_id` BIGINT NULL AFTER `default_rent`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addPropCurrencyStmt FROM @addPropCurrencySql;
--> statement-breakpoint
EXECUTE addPropCurrencyStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addPropCurrencyStmt;
--> statement-breakpoint

UPDATE `real_estate_properties`
SET    `currency_id` = @defaultCurrencyId
WHERE  `currency_id` IS NULL;
