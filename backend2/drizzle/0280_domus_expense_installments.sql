-- Domus : echeancier de paiement des depenses de propriete.
-- Une ligne = une echeance planifiee (kind = scheduled, sequence_no 1..N) ou un
-- paiement partiel libre (kind = partial, sequence_no 0).
-- expense_id = FK logique vers real_estate_property_expenses.id.
-- property_id = denormalise depuis la depense, pour scoper et indexer sans join.
-- currency_id = FK logique vers currency, jamais de devise en dur (regle projet).
-- status applicatif : pending, paid, partial, cancelled.
-- journal_entry_id = reserve v2 (comptabilisation), non utilise en v1.
-- Toutes les FK sont logiques, sans contrainte physique, comme le reste des
-- tables real_estate_*.
-- Suppression logique via is_active, conforme a la regle soft delete du projet.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `real_estate_expense_installments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `expense_id` bigint NOT NULL,
  `property_id` bigint NOT NULL,
  `sequence_no` int NOT NULL DEFAULT 1,
  `kind` varchar(20) NOT NULL DEFAULT 'scheduled',
  `due_date` date DEFAULT NULL,
  `planned_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `paid_date` date DEFAULT NULL,
  `currency_id` bigint DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `reference` varchar(100) DEFAULT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `journal_entry_id` bigint DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expense_installments_org_expense` (`organization_id`, `expense_id`, `sequence_no`),
  KEY `idx_expense_installments_org_property_due` (`organization_id`, `property_id`, `due_date`),
  KEY `idx_expense_installments_expense_active` (`expense_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
