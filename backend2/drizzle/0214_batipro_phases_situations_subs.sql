-- BatiPro : phases de chantier, situations & avenants, sous-traitants.
CREATE TABLE IF NOT EXISTS `batipro_phases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'A_venir',
  `progress` INT NOT NULL DEFAULT 0,
  `start_date` DATE,
  `end_date` DATE,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_phases_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_phases_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_situations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `number` INT NOT NULL,
  `period` VARCHAR(100),
  `progress` INT NOT NULL DEFAULT 0,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `currency_id` BIGINT,
  `status` VARCHAR(40) NOT NULL DEFAULT 'En_validation',
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_situations_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_situations_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_change_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `reference` VARCHAR(100),
  `title` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `currency_id` BIGINT,
  `delay_days` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(40) NOT NULL DEFAULT 'En_attente',
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_change_orders_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_change_orders_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_subcontractors` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT,
  `supplier_id` BIGINT,
  `name` VARCHAR(255) NOT NULL,
  `trade` VARCHAR(255),
  `contract_amount` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `currency_id` BIGINT,
  `status` VARCHAR(40) NOT NULL DEFAULT 'En_cours',
  `rating` DECIMAL(3,1),
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_subcontractors_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_subcontractors_org_active` (`organization_id`, `is_active`)
);
