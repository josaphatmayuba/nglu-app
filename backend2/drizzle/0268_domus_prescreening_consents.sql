-- Domus / enquete de prelocation Quebec : preuve de consentement du candidat.
-- Une ligne par type de consentement accorde ou refuse (enquete de credit,
-- references, conservation des donnees...).
-- consent_text_snapshot fige le texte exact affiche au moment du clic : sans ce
-- snapshot la preuve ne vaut rien si le texte legal evolue ensuite.
-- ip_address / user_agent completent la piste daudit.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `tenant_prescreening_consents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `prescreening_id` bigint NOT NULL,
  `consent_type` varchar(50) NOT NULL,
  `granted` tinyint(1) NOT NULL,
  `consent_text_version` varchar(20) NOT NULL,
  `consent_text_snapshot` text NOT NULL,
  `granted_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `locale` varchar(10) DEFAULT 'fr-CA',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prescreening_consents_dossier` (`prescreening_id`, `consent_type`),
  KEY `idx_prescreening_consents_org` (`organization_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
