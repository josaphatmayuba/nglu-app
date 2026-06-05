CREATE TABLE IF NOT EXISTS `farmos_price_list` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `sale_source` varchar(30) NOT NULL DEFAULT 'production',
  `species` varchar(50) DEFAULT NULL,
  `product_type` varchar(50) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `currency_id` bigint DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_price_list_org` (`organization_id`),
  KEY `idx_farmos_price_list_lookup` (`organization_id`, `sale_source`, `species`, `product_type`, `unit`, `is_active`)
);
--> statement-breakpoint

INSERT INTO `farmos_price_list` (`organization_id`, `sale_source`, `species`, `product_type`, `unit`, `unit_price`, `notes`)
SELECT 1, 'production', 'chicken', 'eggs', 'oeufs', 0.25, 'Prix par défaut FarmOS'
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_price_list`
  WHERE `organization_id` = 1 AND `sale_source` = 'production' AND `species` = 'chicken' AND `product_type` = 'eggs' AND `unit` = 'oeufs' AND `is_active` = 1
);
--> statement-breakpoint

INSERT INTO `farmos_price_list` (`organization_id`, `sale_source`, `species`, `product_type`, `unit`, `unit_price`, `notes`)
SELECT 1, 'production', 'cow', 'milk', 'L', 1.80, 'Prix par défaut FarmOS'
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_price_list`
  WHERE `organization_id` = 1 AND `sale_source` = 'production' AND `species` = 'cow' AND `product_type` = 'milk' AND `unit` = 'L' AND `is_active` = 1
);
--> statement-breakpoint

INSERT INTO `farmos_price_list` (`organization_id`, `sale_source`, `species`, `product_type`, `unit`, `unit_price`, `notes`)
SELECT 1, 'production', NULL, 'fish', 'kg', 8.00, 'Prix par défaut FarmOS'
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_price_list`
  WHERE `organization_id` = 1 AND `sale_source` = 'production' AND `species` IS NULL AND `product_type` = 'fish' AND `unit` = 'kg' AND `is_active` = 1
);
--> statement-breakpoint

INSERT INTO `farmos_price_list` (`organization_id`, `sale_source`, `species`, `product_type`, `unit`, `unit_price`, `notes`)
SELECT 1, 'animal', NULL, 'animal', 'tete', 0.00, 'Prix à définir par animal ou lot'
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_price_list`
  WHERE `organization_id` = 1 AND `sale_source` = 'animal' AND `species` IS NULL AND `product_type` = 'animal' AND `unit` = 'tete' AND `is_active` = 1
);
