-- Domus / enquete de prelocation Quebec : catalogue des textes de consentement.
-- organization_id NULL = texte par defaut global reutilisable par toute
-- organisation ; une valeur renseignee = surcharge propre a une organisation.
-- La cle UNIQUE (version, locale, consent_type) garantit quune version donnee
-- ne peut pas etre redefinie pour une meme langue et un meme type.
-- Aucun texte nest insere ici : le contenu legal qc-credit-v1 est charge par un
-- seeder applicatif, conformement a la regle interdisant le seed en migration.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `prescreening_consent_texts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint DEFAULT NULL,
  `version` varchar(20) NOT NULL,
  `locale` varchar(10) NOT NULL DEFAULT 'fr-CA',
  `consent_type` varchar(50) NOT NULL,
  `body` text NOT NULL,
  `effective_from` date DEFAULT NULL,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prescreening_consent_texts_version` (`version`, `locale`, `consent_type`),
  KEY `idx_prescreening_consent_texts_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
