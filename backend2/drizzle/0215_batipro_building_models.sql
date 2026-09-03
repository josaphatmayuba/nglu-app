-- BatiPro : modele architectural 3D par chantier (Phase 1 parametrique + amorce Phase 2 import).
CREATE TABLE IF NOT EXISTS `batipro_building_models` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `source_type` VARCHAR(20) NOT NULL DEFAULT 'parametric',
  `name` VARCHAR(255),
  `unit` VARCHAR(10) NOT NULL DEFAULT 'm',
  `storey_height` DECIMAL(6,2) NOT NULL DEFAULT 2.80,
  `roof_type` VARCHAR(20) NOT NULL DEFAULT 'flat',
  `imported_file_key` VARCHAR(512),
  `imported_file_format` VARCHAR(10),
  `imported_file_size` BIGINT,
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_building_models_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_building_models_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_building_levels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `model_id` BIGINT NOT NULL,
  `project_id` BIGINT NOT NULL,
  `level_index` INT NOT NULL DEFAULT 0,
  `label` VARCHAR(100),
  `elevation` DECIMAL(8,2) NOT NULL DEFAULT 0,
  `height` DECIMAL(6,2),
  `geometry` JSON,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_building_levels_org_model` (`organization_id`, `model_id`),
  KEY `idx_batipro_building_levels_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_building_levels_org_active` (`organization_id`, `is_active`)
);
