-- BatiPro multi-devise : taux par devise sur batipro_document_totals (devis/factures mixtes).
-- fx_rate = 1 unite devise chantier vaut X unites de la devise de la ligne de total.
-- Forme idempotente (MySQL 8). Aucune donnee inseree.
SET @col_fx_rate := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_totals' AND COLUMN_NAME = 'fx_rate');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate = 0, 'ALTER TABLE `batipro_document_totals` ADD COLUMN `fx_rate` decimal(18,6) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_fx_rate_date := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_totals' AND COLUMN_NAME = 'fx_rate_date');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate_date = 0, 'ALTER TABLE `batipro_document_totals` ADD COLUMN `fx_rate_date` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_fx_rate_source := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_totals' AND COLUMN_NAME = 'fx_rate_source');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate_source = 0, 'ALTER TABLE `batipro_document_totals` ADD COLUMN `fx_rate_source` varchar(16) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
