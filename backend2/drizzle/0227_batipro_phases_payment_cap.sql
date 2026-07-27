-- BatiPro SCRUM-267 : plafond de paiement par phase. Colonnes additives nullable
-- sur batipro_phases. planned_budget et planned_duration_days servent au mode
-- planning; cap_mode pilote le plafond (planning, manual, off). Aucune regression.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_phases' AND COLUMN_NAME = 'planned_budget');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_phases` ADD COLUMN `planned_budget` DECIMAL(14,2) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_phases' AND COLUMN_NAME = 'planned_duration_days');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_phases` ADD COLUMN `planned_duration_days` INT DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_phases' AND COLUMN_NAME = 'cap_mode');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_phases` ADD COLUMN `cap_mode` VARCHAR(20) NOT NULL DEFAULT ''planning''', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
