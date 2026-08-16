-- FarmOS alimentation : mouvements de stock daliment.
-- movement_type : in / out / adjust / loss (valide cote DTO, pas en DB).
-- Une sortie peut cibler un animal, un lot delevage (champ lot), un batiment,
-- une box ou une espece : tous les rattachements sont optionnels.
-- ration_per_animal = quantite distribuee par animal pour le calcul de cout.
-- feed_lot_id / expense_id / recorded_by = FK logiques sans contrainte
-- physique, coherent avec le reste du schema farmos.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_feed_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `medicine_id` bigint NOT NULL,
  `feed_lot_id` bigint DEFAULT NULL,
  `movement_type` varchar(20) NOT NULL,
  `movement_date` date NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `unit_cost` decimal(15,2) DEFAULT NULL,
  `total_cost` decimal(15,2) DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,
  `building_id` bigint DEFAULT NULL,
  `box_id` bigint DEFAULT NULL,
  `animal_id` bigint DEFAULT NULL,
  `lot` varchar(255) DEFAULT NULL,
  `species` varchar(50) DEFAULT NULL,
  `animal_count` int DEFAULT NULL,
  `ration_per_animal` decimal(10,3) DEFAULT NULL,
  `expense_id` bigint DEFAULT NULL,
  `recorded_by` bigint DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_feed_mov_date` (`organization_id`, `movement_date`),
  KEY `idx_farmos_feed_mov_medicine` (`organization_id`, `medicine_id`, `is_active`),
  KEY `idx_farmos_feed_mov_lot` (`organization_id`, `lot`),
  KEY `idx_farmos_feed_mov_building` (`organization_id`, `building_id`),
  KEY `idx_farmos_feed_mov_species` (`organization_id`, `species`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
