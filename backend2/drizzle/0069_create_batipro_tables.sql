-- BatiPro core construction tables.
CREATE TABLE IF NOT EXISTS `batipro_projects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `code` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `client` VARCHAR(255),
  `manager` VARCHAR(255),
  `status` VARCHAR(40) NOT NULL DEFAULT 'Planifie',
  `progress` INT NOT NULL DEFAULT 0,
  `budget` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `spent` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `start_date` DATE,
  `due_date` DATE,
  `location` VARCHAR(255),
  `risk` VARCHAR(30) NOT NULL DEFAULT 'Faible',
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_projects_org_status` (`organization_id`, `status`),
  KEY `idx_batipro_projects_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT,
  `label` VARCHAR(255) NOT NULL,
  `owner` VARCHAR(255),
  `status` VARCHAR(40) NOT NULL DEFAULT 'Planifie',
  `task_date` DATE,
  `priority` VARCHAR(30) NOT NULL DEFAULT 'Normale',
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_tasks_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_tasks_org_date` (`organization_id`, `task_date`),
  KEY `idx_batipro_tasks_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_materials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(40) NOT NULL DEFAULT 'unite',
  `stock` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `min_stock` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `reserved` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `supplier` VARCHAR(255),
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_materials_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_crews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `name` VARCHAR(255) NOT NULL,
  `people` INT NOT NULL DEFAULT 0,
  `site` VARCHAR(255),
  `status` VARCHAR(40) NOT NULL DEFAULT 'Disponible',
  `lead` VARCHAR(255),
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_crews_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
INSERT INTO `batipro_projects`
  (`organization_id`, `code`, `name`, `client`, `manager`, `status`, `progress`, `budget`, `spent`, `start_date`, `due_date`, `location`, `risk`, `notes`)
SELECT 1, 'BAT-2026-001', 'Residence Kasa-Vubu', 'Groupe Mbuyi', 'Jean Kabongo', 'En cours', 62, 185000, 112400, '2026-03-12', '2026-09-18', 'Kinshasa', 'Moyen', 'Projet demo BatiPro'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_projects` WHERE `organization_id` = 1 AND `code` = 'BAT-2026-001');
--> statement-breakpoint
INSERT INTO `batipro_projects`
  (`organization_id`, `code`, `name`, `client`, `manager`, `status`, `progress`, `budget`, `spent`, `start_date`, `due_date`, `location`, `risk`, `notes`)
SELECT 1, 'BAT-2026-002', 'Depot logistique Limete', 'TransCongo', 'Aline Tshimanga', 'Planifie', 18, 94000, 12600, '2026-05-08', '2026-11-04', 'Limete', 'Faible', 'Projet demo BatiPro'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_projects` WHERE `organization_id` = 1 AND `code` = 'BAT-2026-002');
--> statement-breakpoint
INSERT INTO `batipro_projects`
  (`organization_id`, `code`, `name`, `client`, `manager`, `status`, `progress`, `budget`, `spent`, `start_date`, `due_date`, `location`, `risk`, `notes`)
SELECT 1, 'BAT-2026-003', 'Renovation clinique Ngaliema', 'Fondation Sante Plus', 'Patrick Ilunga', 'Urgent', 41, 72000, 48800, '2026-04-02', '2026-07-22', 'Ngaliema', 'Eleve', 'Projet demo BatiPro'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_projects` WHERE `organization_id` = 1 AND `code` = 'BAT-2026-003');
--> statement-breakpoint
INSERT INTO `batipro_tasks` (`organization_id`, `project_id`, `label`, `owner`, `status`, `task_date`, `priority`)
SELECT 1, p.`id`, 'Coffrage dalle R+1', 'Equipe beton', 'En cours', '2026-06-04', 'Haute'
FROM `batipro_projects` p
WHERE p.`organization_id` = 1 AND p.`code` = 'BAT-2026-001'
  AND NOT EXISTS (SELECT 1 FROM `batipro_tasks` t WHERE t.`organization_id` = 1 AND t.`label` = 'Coffrage dalle R+1');
--> statement-breakpoint
INSERT INTO `batipro_tasks` (`organization_id`, `project_id`, `label`, `owner`, `status`, `task_date`, `priority`)
SELECT 1, p.`id`, 'Reception ciment 32.5', 'Logistique', 'A valider', '2026-06-04', 'Normale'
FROM `batipro_projects` p
WHERE p.`organization_id` = 1 AND p.`code` = 'BAT-2026-001'
  AND NOT EXISTS (SELECT 1 FROM `batipro_tasks` t WHERE t.`organization_id` = 1 AND t.`label` = 'Reception ciment 32.5');
--> statement-breakpoint
INSERT INTO `batipro_tasks` (`organization_id`, `project_id`, `label`, `owner`, `status`, `task_date`, `priority`)
SELECT 1, p.`id`, 'Pose cloisons bloc operatoire', 'Second oeuvre', 'Bloque', '2026-06-05', 'Urgente'
FROM `batipro_projects` p
WHERE p.`organization_id` = 1 AND p.`code` = 'BAT-2026-003'
  AND NOT EXISTS (SELECT 1 FROM `batipro_tasks` t WHERE t.`organization_id` = 1 AND t.`label` = 'Pose cloisons bloc operatoire');
--> statement-breakpoint
INSERT INTO `batipro_materials` (`organization_id`, `name`, `unit`, `stock`, `min_stock`, `reserved`, `supplier`)
SELECT 1, 'Ciment', 'sacs', 840, 500, 220, 'Depot central'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_materials` WHERE `organization_id` = 1 AND `name` = 'Ciment');
--> statement-breakpoint
INSERT INTO `batipro_materials` (`organization_id`, `name`, `unit`, `stock`, `min_stock`, `reserved`, `supplier`)
SELECT 1, 'Fer a beton 12mm', 'barres', 1260, 900, 410, 'Depot central'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_materials` WHERE `organization_id` = 1 AND `name` = 'Fer a beton 12mm');
--> statement-breakpoint
INSERT INTO `batipro_materials` (`organization_id`, `name`, `unit`, `stock`, `min_stock`, `reserved`, `supplier`)
SELECT 1, 'Briques', 'pieces', 18400, 12000, 5300, 'Depot central'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_materials` WHERE `organization_id` = 1 AND `name` = 'Briques');
--> statement-breakpoint
INSERT INTO `batipro_crews` (`organization_id`, `name`, `people`, `site`, `status`, `lead`)
SELECT 1, 'Equipe beton', 14, 'Residence Kasa-Vubu', 'Actif', 'Jean Kabongo'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_crews` WHERE `organization_id` = 1 AND `name` = 'Equipe beton');
--> statement-breakpoint
INSERT INTO `batipro_crews` (`organization_id`, `name`, `people`, `site`, `status`, `lead`)
SELECT 1, 'Second oeuvre', 9, 'Clinique Ngaliema', 'Actif', 'Patrick Ilunga'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_crews` WHERE `organization_id` = 1 AND `name` = 'Second oeuvre');
--> statement-breakpoint
INSERT INTO `batipro_crews` (`organization_id`, `name`, `people`, `site`, `status`, `lead`)
SELECT 1, 'Logistique', 5, 'Multi-sites', 'Actif', 'Aline Tshimanga'
WHERE NOT EXISTS (SELECT 1 FROM `batipro_crews` WHERE `organization_id` = 1 AND `name` = 'Logistique');
