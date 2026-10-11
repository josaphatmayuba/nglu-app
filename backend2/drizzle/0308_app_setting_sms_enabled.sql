-- Domus : interrupteur d envoi des SMS par organisation. NULL = actif (comportement historique). 0 = desactive.
-- Forme idempotente. Valeur non posee ici : a regler depuis Reglages.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'appSetting' AND COLUMN_NAME = 'sms_enabled');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `appSetting` ADD COLUMN `sms_enabled` tinyint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
