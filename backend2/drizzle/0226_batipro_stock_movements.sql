-- BatiPro : suivi de stock de materiaux PAR CHANTIER via un grand livre de
-- mouvements (inspire de journal_entry_lines). Le stock d'un materiau sur un
-- chantier = SUM(reception) - SUM(consumption) +/- SUM(adjustment) filtre sur
-- project_id + material_id. batipro_materials reste le catalogue global (non
-- modifie ici). movement_type : reception (auto a l'emission d'un BC) /
-- consumption (declaree a la main, rattachee a une phase) / adjustment.
-- quantity toujours positive : le signe est porte par movement_type.
-- Pas de contrainte FK stricte (meme pattern que les autres tables batipro),
-- seulement des index. material_id sur batipro_document_lines relie une ligne
-- de BC a un materiau suivi (nullable : main d'oeuvre/prestations restent en
-- designation texte libre). Idempotent (INFORMATION_SCHEMA + PREPARE/EXECUTE,
-- MySQL 8 sans IF NOT EXISTS sur colonnes/index).
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_lines' AND COLUMN_NAME = 'material_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_document_lines` ADD COLUMN `material_id` BIGINT DEFAULT NULL', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_lines' AND INDEX_NAME = 'idx_batipro_document_lines_org_material');
--> statement-breakpoint
SET @sql := IF(@idx = 0, 'CREATE INDEX `idx_batipro_document_lines_org_material` ON `batipro_document_lines` (`organization_id`, `material_id`)', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_stock_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `material_id` BIGINT NOT NULL,
  `document_id` BIGINT,
  `phase_id` BIGINT,
  `movement_type` VARCHAR(20) NOT NULL DEFAULT 'reception',
  `quantity` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `note` TEXT,
  `created_by` BIGINT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_stock_movements_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_stock_movements_project_material` (`project_id`, `material_id`),
  KEY `idx_batipro_stock_movements_org_material` (`organization_id`, `material_id`),
  KEY `idx_batipro_stock_movements_document` (`document_id`),
  KEY `idx_batipro_stock_movements_phase` (`phase_id`),
  KEY `idx_batipro_stock_movements_org_active` (`organization_id`, `is_active`)
);
