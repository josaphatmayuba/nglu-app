-- BatiPro : plan architectural PAR ETAGE au lieu d'un seul fichier pour tout le
-- modele. batipro_building_models.imported_file_key reste en place (legacy
-- fallback, non supprime) mais chaque batipro_building_levels peut desormais
-- avoir son propre fichier importe (le PDF du RDC n'est pas celui du R+1).
-- Idempotent (INFORMATION_SCHEMA + PREPARE/EXECUTE, MySQL 8 sans IF NOT EXISTS
-- sur colonnes/index).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_building_levels' AND COLUMN_NAME = 'imported_file_key');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_building_levels` ADD COLUMN `imported_file_key` VARCHAR(512) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_building_levels' AND COLUMN_NAME = 'imported_file_format');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_building_levels` ADD COLUMN `imported_file_format` VARCHAR(10) DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_building_levels' AND COLUMN_NAME = 'imported_file_size');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_building_levels` ADD COLUMN `imported_file_size` BIGINT DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_site_photos' AND COLUMN_NAME = 'level_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_site_photos` ADD COLUMN `level_id` BIGINT DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_site_photos' AND INDEX_NAME = 'idx_batipro_site_photos_org_level');
--> statement-breakpoint
SET @sql := IF(@idx = 0, 'CREATE INDEX `idx_batipro_site_photos_org_level` ON `batipro_site_photos` (`organization_id`, `level_id`)', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
UPDATE `batipro_building_levels` AS lvl
INNER JOIN `batipro_building_models` AS mdl ON mdl.id = lvl.model_id
SET lvl.imported_file_key = mdl.imported_file_key,
    lvl.imported_file_format = mdl.imported_file_format,
    lvl.imported_file_size = mdl.imported_file_size
WHERE mdl.imported_file_key IS NOT NULL
  AND lvl.level_index = 0
  AND lvl.imported_file_key IS NULL;
