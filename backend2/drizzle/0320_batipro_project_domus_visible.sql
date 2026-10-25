-- BatiPro : afficher un chantier dans Domus comme bien en construction. Case a cocher + lien vers le bien Domus cree.
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree.
SET @col_domus_visible := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'domus_visible');
--> statement-breakpoint
SET @sql := IF(@col_domus_visible = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `domus_visible` tinyint NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_domus_property := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'domus_property_id');
--> statement-breakpoint
SET @sql := IF(@col_domus_property = 0, 'ALTER TABLE `batipro_projects` ADD COLUMN `domus_property_id` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
