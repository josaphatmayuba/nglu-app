-- Observations de suivi rattachees a un episode de sante ouvert.
-- status_history_id = FK logique vers la ligne d ouverture de l episode dans
-- farmos_animal_status_history (pas de contrainte physique, coherent avec le
-- reste du schema farmos).
-- severity_trend : stable / improving / worsening, valide cote DTO pas en DB.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_animal_health_observations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NOT NULL,
  `status_history_id` bigint NOT NULL,
  `observed_at` date NOT NULL,
  `note` text NOT NULL,
  `severity_trend` varchar(20) DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_aho_episode` (`status_history_id`, `observed_at`),
  KEY `idx_farmos_aho_org_active` (`organization_id`, `is_active`),
  KEY `idx_farmos_aho_animal` (`animal_id`, `observed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
