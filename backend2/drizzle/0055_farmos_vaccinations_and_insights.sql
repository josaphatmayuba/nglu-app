-- SCRUM-236 — Tables pour vaccinations et insights IA (au lieu de hardcoder).

CREATE TABLE IF NOT EXISTS `farmos_vaccinations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `species` varchar(50) NOT NULL,
  `vaccine` varchar(255) NOT NULL,
  `target` varchar(255) DEFAULT NULL,
  `animal_count` int DEFAULT NULL,
  `due_date` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'scheduled',
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_vacc_org_date` (`organization_id`, `due_date`),
  KEY `idx_farmos_vacc_org_species` (`organization_id`, `species`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `farmos_ai_insights` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `kind` varchar(50) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `confidence` int DEFAULT NULL,
  `text_fr` text NOT NULL,
  `text_en` text DEFAULT NULL,
  `action_label_fr` varchar(255) DEFAULT NULL,
  `action_label_en` varchar(255) DEFAULT NULL,
  `action_target` varchar(50) DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_ai_org` (`organization_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
