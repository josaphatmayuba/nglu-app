-- Banque de semence pour insémination artificielle (IA) + extension
-- du modèle reproduction-events pour distinguer IA / saillie naturelle.

CREATE TABLE IF NOT EXISTS `farmos_semen_straws` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,

  -- Identification
  `code` varchar(100) NOT NULL,
  `sire_name` varchar(255) NOT NULL,
  `sire_registration` varchar(100) DEFAULT NULL,
  `species` varchar(50) NOT NULL,

  -- Origine
  `breed` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `supplier_id` bigint DEFAULT NULL,
  `collection_center` varchar(255) DEFAULT NULL,
  `collection_date` date DEFAULT NULL,

  -- Qualité / lot
  `batch_number` varchar(100) DEFAULT NULL,
  `motility_pct` int DEFAULT NULL,
  `concentration_million_per_ml` int DEFAULT NULL,
  `straws_per_dose` int DEFAULT 1,

  -- Traits génétiques (JSON libre, ex: {"milk_kg":1200,"longevity":105})
  `genetic_traits` json DEFAULT NULL,
  `notes` text,

  -- Stock
  `straws_total` int NOT NULL,
  `straws_remaining` int NOT NULL,
  `tank_location` varchar(100) DEFAULT NULL,
  `price_per_dose` decimal(12,2) DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,

  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_farmos_straws_org_code` (`organization_id`, `code`),
  KEY `idx_farmos_straws_species` (`organization_id`, `species`, `status`),
  KEY `idx_farmos_straws_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Extension reproduction-events : type de saillie + FK père
ALTER TABLE `farmos_reproduction_events`
  ADD COLUMN `breeding_type`  varchar(20) NOT NULL DEFAULT 'unknown' AFTER `notes`,
  ADD COLUMN `sire_straw_id`  bigint DEFAULT NULL AFTER `breeding_type`,
  ADD COLUMN `sire_animal_id` bigint DEFAULT NULL AFTER `sire_straw_id`;

ALTER TABLE `farmos_reproduction_events`
  ADD KEY `idx_farmos_repro_straw`  (`sire_straw_id`),
  ADD KEY `idx_farmos_repro_sire`   (`sire_animal_id`);
