-- BatiPro multi-devise P1 : taux fige par document (batipro_documents).
-- fx_rate = 1 unite devise chantier vaut X unites devise du document.
-- fx_rate_source = manual ou last_exchange. Contre-valeurs en devise du chantier.
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree.
SET @col_fx_rate := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'fx_rate');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `fx_rate` decimal(18,6) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_fx_rate_date := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'fx_rate_date');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate_date = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `fx_rate_date` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_fx_rate_source := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'fx_rate_source');
--> statement-breakpoint
SET @sql := IF(@col_fx_rate_source = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `fx_rate_source` varchar(16) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_total_ttc_project_ccy := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'total_ttc_project_ccy');
--> statement-breakpoint
SET @sql := IF(@col_total_ttc_project_ccy = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `total_ttc_project_ccy` decimal(14,2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_paid_amount_project_ccy := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_documents' AND COLUMN_NAME = 'paid_amount_project_ccy');
--> statement-breakpoint
SET @sql := IF(@col_paid_amount_project_ccy = 0, 'ALTER TABLE `batipro_documents` ADD COLUMN `paid_amount_project_ccy` decimal(14,2) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
