-- BatiPro : code court des liens de partage (URL courte dans les SMS). Colonne NULL pour les anciens liens.
-- Forme idempotente (MySQL 8). Aucune donnee inseree.
SET @col_short := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_share_links' AND COLUMN_NAME = 'short_code');
--> statement-breakpoint
SET @sql := IF(@col_short = 0, 'ALTER TABLE `batipro_share_links` ADD COLUMN `short_code` varchar(16) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_short := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_share_links' AND INDEX_NAME = 'batipro_share_links_short_code_unique');
--> statement-breakpoint
SET @sql := IF(@idx_short = 0, 'CREATE UNIQUE INDEX `batipro_share_links_short_code_unique` ON `batipro_share_links` (`short_code`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
