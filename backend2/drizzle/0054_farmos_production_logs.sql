-- SCRUM-193 — FarmOS production logs (milk, eggs, growth, wool, fish biomass).

CREATE TABLE IF NOT EXISTS `farmos_production_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint DEFAULT NULL,
  `species` varchar(50) NOT NULL,
  `product_type` varchar(20) NOT NULL,
  `log_date` date NOT NULL,
  `period` varchar(10) DEFAULT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `quality` json DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_prodlog_org_date` (`organization_id`, `log_date`),
  KEY `idx_farmos_prodlog_org_species` (`organization_id`, `species`, `product_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
