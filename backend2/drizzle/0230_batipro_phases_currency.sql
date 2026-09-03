-- Devise propre a une phase de planning (batipro_phases.currency_id).
-- Nullable : si absente, la phase herite implicitement de la devise du chantier.
-- Meme type que batipro_projects.currency_id / batipro_documents.currency_id (bigint nullable).
-- Idempotent (INFORMATION_SCHEMA + PREPARE) : rejouable au boot sans crash.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_phases' AND COLUMN_NAME = 'currency_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_phases` ADD COLUMN `currency_id` bigint DEFAULT NULL AFTER `planned_budget`', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
