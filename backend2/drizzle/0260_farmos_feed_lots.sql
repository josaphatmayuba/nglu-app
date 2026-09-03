-- FarmOS alimentation : lots dachat daliment rattaches a un item
-- farmos_medicines (kind=feed).
-- quantity_in = quantite recue, quantity_remaining = solde restant apres les
-- sorties (mise a jour applicative, pas de trigger).
-- medicine_id / supplier_id / currency_id / expense_id = FK logiques sans
-- contrainte physique, coherent avec le reste du schema farmos.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_feed_lots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `medicine_id` bigint NOT NULL,
  `lot_code` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `supplier_id` bigint DEFAULT NULL,
  `received_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity_in` decimal(12,2) NOT NULL,
  `quantity_remaining` decimal(12,2) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `unit_cost` decimal(15,2) DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,
  `expense_id` bigint DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_feed_lots_medicine` (`organization_id`, `medicine_id`, `is_active`),
  KEY `idx_farmos_feed_lots_expiry` (`organization_id`, `expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
