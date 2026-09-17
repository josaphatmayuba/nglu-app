-- Domus / SCRUM-311 : remboursement dhypotheque par propriete.
-- Table dediee, volontairement separee de real_estate_property_expenses : un
-- paiement dhypotheque nest pas une charge a 100 pourcent, cest en majorite un
-- remboursement de dette (capital) et seule la part interets, plus eventuellement
-- lescrow, releve de la charge. Les invariants de calcul different donc, do la
-- table propre plutot quune categorie de depense.
-- total_amount = principal_amount + interest_amount + escrow_amount (controle
-- applicatif, pas de contrainte CHECK pour rester tolerant aux arrondis).
-- mortgage_id : colonne posee des maintenant, reservee a une future table de pret
-- et de tableau damortissement. Non exploitee en v1, mais evite un ALTER futur.
-- unit_id nullable = imputation a une unite precise, sinon paiement au niveau du
-- bien entier.
-- currency_id = FK logique vers currency, jamais de devise en dur (regle projet).
-- period_start / period_end = echeance couverte par le paiement.
-- project_id = dimension analytique, journal_entry_id = tracabilite vers
-- lecriture comptable postee.
-- Toutes les FK sont logiques, sans contrainte physique, comme le reste des
-- tables real_estate_*.
-- Suppression logique via is_active, conforme a la regle soft delete du projet.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `real_estate_mortgage_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `mortgage_id` bigint DEFAULT NULL,
  `lender_name` varchar(255) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `principal_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `interest_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `escrow_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'bank',
  `payment_status` varchar(30) NOT NULL DEFAULT 'paid',
  `reference` varchar(100) DEFAULT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `project_id` bigint DEFAULT NULL,
  `journal_entry_id` bigint DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mortgage_payments_org_property_date` (`organization_id`, `property_id`, `payment_date`),
  KEY `idx_mortgage_payments_property_active` (`property_id`, `is_active`),
  KEY `idx_mortgage_payments_org_mortgage` (`organization_id`, `mortgage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
