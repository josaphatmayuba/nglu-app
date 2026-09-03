-- Idempotent (rejouable au boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Historique de pesées (prompt design : suivi poids / courbe de croissance).
CREATE TABLE IF NOT EXISTS `farmos_weighings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NOT NULL,
  `weigh_date` date NOT NULL,
  `weight` decimal(10,2) NOT NULL,
  `weight_unit` varchar(10) DEFAULT 'kg',
  `notes` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_weighings_animal` (`animal_id`),
  KEY `idx_weighings_org` (`organization_id`)
);
