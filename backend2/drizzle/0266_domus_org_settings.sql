-- Domus / enquete de prelocation Quebec : reglages par organisation.
-- Une seule ligne par organisation (UNIQUE sur organization_id).
-- country_code pilote le jeu de regles legales applicable (CD par defaut,
-- CA pour le Quebec) et prescreening_enabled active le module.
-- retention_months_rejected = duree de conservation des dossiers refuses.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `domus_org_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL,
  `country_code` varchar(2) NOT NULL DEFAULT 'CD',
  `prescreening_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `prescreening_ruleset` varchar(20) DEFAULT 'qc',
  `retention_months_rejected` int NOT NULL DEFAULT 6,
  `default_consent_text_version` varchar(20) DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_domus_org_settings_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
