-- FarmOS alimentation : enrichit le referentiel farmos_medicines (kind=feed)
-- avec le type daliment, le prix unitaire de reference, la devise et le flag
-- dalerte de stock.
-- feed_type : categorie libre (demarrage / croissance / finition / ponte ...).
-- alert_enabled : 1 = surveiller le seuil min_quantity et lever une alerte.
-- Idempotent : ADD COLUMN via INFORMATION_SCHEMA + PREPARE/EXECUTE
-- (MySQL 8 ne supporte pas ADD COLUMN IF NOT EXISTS).
-- Un seul statement par breakpoint.
SET @col_feed_type = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_medicines'
    AND COLUMN_NAME = 'feed_type'
);
--> statement-breakpoint
SET @sql = IF(@col_feed_type = 0,
  'ALTER TABLE `farmos_medicines` ADD COLUMN `feed_type` VARCHAR(50) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_unit_price = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_medicines'
    AND COLUMN_NAME = 'unit_price'
);
--> statement-breakpoint
SET @sql2 = IF(@col_unit_price = 0,
  'ALTER TABLE `farmos_medicines` ADD COLUMN `unit_price` DECIMAL(15,2) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
SET @col_currency_id = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_medicines'
    AND COLUMN_NAME = 'currency_id'
);
--> statement-breakpoint
SET @sql3 = IF(@col_currency_id = 0,
  'ALTER TABLE `farmos_medicines` ADD COLUMN `currency_id` BIGINT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
--> statement-breakpoint
SET @col_alert_enabled = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_medicines'
    AND COLUMN_NAME = 'alert_enabled'
);
--> statement-breakpoint
SET @sql4 = IF(@col_alert_enabled = 0,
  'ALTER TABLE `farmos_medicines` ADD COLUMN `alert_enabled` TINYINT NOT NULL DEFAULT 1',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt4 FROM @sql4;
--> statement-breakpoint
EXECUTE stmt4;
--> statement-breakpoint
DEALLOCATE PREPARE stmt4;
