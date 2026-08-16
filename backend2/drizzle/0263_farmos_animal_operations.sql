-- FarmOS operations : journal des operations zootechniques realisees.
-- operation_code est denormalise depuis farmos_operation_types.code pour
-- garder lhistorique lisible meme si le type est desactive ou renomme.
-- Le rattachement est souple : animal precis, lot delevage (champ lot),
-- batiment, box ou espece, avec animal_count pour les actes de groupe.
-- details = payload JSON libre propre au type doperation.
-- operation_type_id / animal_id / building_id / box_id / performed_by /
-- currency_id / expense_id = FK logiques sans contrainte physique.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_animal_operations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `operation_type_id` bigint DEFAULT NULL,
  `operation_code` varchar(50) NOT NULL,
  `animal_id` bigint DEFAULT NULL,
  `lot` varchar(255) DEFAULT NULL,
  `building_id` bigint DEFAULT NULL,
  `box_id` bigint DEFAULT NULL,
  `species` varchar(50) DEFAULT NULL,
  `animal_count` int NOT NULL DEFAULT 1,
  `operation_date` date NOT NULL,
  `performed_by` bigint DEFAULT NULL,
  `performed_by_name` varchar(255) DEFAULT NULL,
  `result` varchar(50) DEFAULT NULL,
  `quantity` decimal(12,2) DEFAULT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `cost` decimal(15,2) DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,
  `expense_id` bigint DEFAULT NULL,
  `details` json DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_animal_ops_date` (`organization_id`, `operation_date`),
  KEY `idx_farmos_animal_ops_animal` (`organization_id`, `animal_id`),
  KEY `idx_farmos_animal_ops_code` (`organization_id`, `operation_code`),
  KEY `idx_farmos_animal_ops_lot` (`organization_id`, `lot`),
  KEY `idx_farmos_animal_ops_species` (`organization_id`, `species`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
