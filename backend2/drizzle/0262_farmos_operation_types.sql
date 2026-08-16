-- FarmOS operations : catalogue des types doperation zootechnique
-- (castration, ecornage, tonte, taille de bec, parage, pesee ...).
-- species : tableau JSON despeces concernees, NULL = toutes especes
-- (meme convention que farmos_medicines.species).
-- requires_withdrawal : 1 = loperation declenche un delai dattente produit.
-- Aucun seed data ici : le catalogue est initialise par un endpoint bootstrap
-- applicatif (regle projet : pas de donnees de demo en migration).
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_operation_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `code` varchar(50) NOT NULL,
  `label_fr` varchar(255) DEFAULT NULL,
  `label_en` varchar(255) DEFAULT NULL,
  `species` json DEFAULT NULL,
  `default_unit` varchar(30) DEFAULT NULL,
  `requires_withdrawal` tinyint NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_op_types_code` (`organization_id`, `code`),
  KEY `idx_farmos_op_types_active` (`organization_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
