-- Domus : rappels de loyer en retard / fin de bail pilotes depuis Reglages (par organisation)
-- au lieu des variables serveur. NULL = valeur par defaut du code. Forme idempotente.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'rent_reminder_enabled');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `rent_reminder_enabled` tinyint(1) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'rent_reminder_overdue_days');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `rent_reminder_overdue_days` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'lease_expiry_notice_days');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `lease_expiry_notice_days` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'rent_reminder_hour');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `rent_reminder_hour` int NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
