-- Domus / enquete de prelocation Quebec : table maitresse du dossier candidat.
-- Volontairement separee de tenant_onboardings (qui reste le flux RDC actuel) :
-- le questionnaire de prelocation a un cycle de vie, des consentements et une
-- retention legale propres.
-- token_hash = hash du lien public envoye par SMS/email (UNIQUE) ; token garde
-- la valeur en clair le temps de lenvoi, comme sur tenant_onboardings.
-- decision / decision_reason_code tracent lissue et sa justification, exigence
-- de la CDPDJ pour un refus de location.
-- retention_until / purged_at pilotent la purge automatique des refus.
-- property_id / unit_id / income_currency_id / onboarding_id / *_user_id sont
-- des FK logiques sans contrainte physique, coherent avec le reste du schema.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `tenant_prescreenings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint DEFAULT NULL,
  `unit_id` bigint DEFAULT NULL,
  `reference` varchar(50) DEFAULT NULL,
  `token_hash` varchar(128) NOT NULL,
  `token` varchar(128) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'sent',
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `is_adult` tinyint(1) NOT NULL DEFAULT 0,
  `current_address` varchar(255) DEFAULT NULL,
  `current_city` varchar(255) DEFAULT NULL,
  `current_postal_code` varchar(10) DEFAULT NULL,
  `desired_move_in_date` date DEFAULT NULL,
  `occupant_count` int DEFAULT NULL,
  `has_pets` tinyint(1) DEFAULT NULL,
  `pets_description` varchar(255) DEFAULT NULL,
  `smoker` tinyint(1) DEFAULT NULL,
  `employment_status` varchar(50) DEFAULT NULL,
  `employer_name` varchar(255) DEFAULT NULL,
  `employer_contact` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `employment_start_date` date DEFAULT NULL,
  `monthly_income` decimal(15,2) DEFAULT NULL,
  `other_monthly_income` decimal(15,2) DEFAULT NULL,
  `income_currency_id` bigint DEFAULT NULL,
  `income_proof_type` varchar(50) DEFAULT NULL,
  `rent_to_income_ratio` decimal(5,2) DEFAULT NULL,
  `decision` varchar(20) DEFAULT NULL,
  `decision_reason_code` varchar(50) DEFAULT NULL,
  `decision_note` text,
  `decided_by_user_id` bigint DEFAULT NULL,
  `decided_at` timestamp NULL DEFAULT NULL,
  `retention_until` date DEFAULT NULL,
  `purged_at` timestamp NULL DEFAULT NULL,
  `onboarding_id` bigint DEFAULT NULL,
  `created_by_user_id` bigint DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `sms_sent_at` timestamp NULL DEFAULT NULL,
  `email_sent_at` timestamp NULL DEFAULT NULL,
  `sms_sid` varchar(64) DEFAULT NULL,
  `sms_status` varchar(32) DEFAULT NULL,
  `sms_delivered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_prescreenings_token_hash` (`token_hash`),
  KEY `idx_tenant_prescreenings_org_status` (`organization_id`, `status`),
  KEY `idx_tenant_prescreenings_property` (`organization_id`, `property_id`, `unit_id`),
  KEY `idx_tenant_prescreenings_retention` (`retention_until`, `purged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
