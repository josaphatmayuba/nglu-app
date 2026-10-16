-- BatiPro : SMS au proprietaire du chantier. Telephone du proprietaire, interrupteur d envoi, dernier palier d avancement notifie.
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree.
SET @col_owner_phone := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'owner_phone');
--> statement-breakpoint
SET @sql := IF(@col_owner_phone = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `owner_phone` varchar(32) NULL AFTER `client`', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_owner_sms_enabled := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'owner_sms_enabled');
--> statement-breakpoint
SET @sql := IF(@col_owner_sms_enabled = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `owner_sms_enabled` tinyint NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_owner_sms_step := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'owner_sms_last_progress_step');
--> statement-breakpoint
SET @sql := IF(@col_owner_sms_step = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `owner_sms_last_progress_step` int NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_owner_sms_quote_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'owner_sms_last_quote_at');
--> statement-breakpoint
SET @sql := IF(@col_owner_sms_quote_at = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `owner_sms_last_quote_at` datetime NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
