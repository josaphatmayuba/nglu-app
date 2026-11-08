-- BatiPro : suivi des SMS envoyes pour un lien de partage (sms_sent_at, sms_sent_count).
-- Forme idempotente (MySQL 8). Aucune donnee modifiee ni inseree.
SET @col_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_share_links' AND COLUMN_NAME = 'sms_sent_at');
--> statement-breakpoint
SET @sql := IF(@col_at = 0, 'ALTER TABLE `batipro_share_links` ADD COLUMN `sms_sent_at` datetime NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_cnt := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_share_links' AND COLUMN_NAME = 'sms_sent_count');
--> statement-breakpoint
SET @sql := IF(@col_cnt = 0, 'ALTER TABLE `batipro_share_links` ADD COLUMN `sms_sent_count` int NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
