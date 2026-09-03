-- Domus / enquete de prelocation Quebec : references de proprietaires anterieurs
-- declarees par le candidat, plus le suivi de la prise de contact par le gestionnaire.
-- contact_status suit le cycle not_contacted -> contacte -> injoignable, et
-- feedback_outcome resume le retour du proprietaire precedent.
-- Suppression logique via status, conforme a la regle soft delete du projet.
-- currency_id / contacted_by_user_id = FK logiques sans contrainte physique.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `tenant_prescreening_references` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `prescreening_id` bigint NOT NULL,
  `landlord_name` varchar(255) DEFAULT NULL,
  `landlord_phone` varchar(255) DEFAULT NULL,
  `landlord_email` varchar(255) DEFAULT NULL,
  `property_address` varchar(255) DEFAULT NULL,
  `tenancy_start_date` date DEFAULT NULL,
  `tenancy_end_date` date DEFAULT NULL,
  `monthly_rent` decimal(15,2) DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,
  `contact_status` varchar(30) NOT NULL DEFAULT 'not_contacted',
  `contacted_at` timestamp NULL DEFAULT NULL,
  `contacted_by_user_id` bigint DEFAULT NULL,
  `feedback_outcome` varchar(30) DEFAULT NULL,
  `feedback_note` text,
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prescreening_refs_dossier` (`prescreening_id`, `status`),
  KEY `idx_prescreening_refs_org` (`organization_id`, `contact_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
