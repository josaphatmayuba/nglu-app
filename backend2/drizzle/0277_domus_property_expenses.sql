-- Domus / SCRUM-310 : depenses par propriete (assurance, taxe fonciere, charges
-- de copropriete, entretien general hors tickets Maintenance, frais de gestion,
-- securite, nettoyage, autre).
-- category = texte libre plutot que ENUM MySQL, meme style que les autres
-- colonnes "status"/"type" du projet, pour rester extensible sans migration.
-- Valeurs attendues en v1 : insurance, property_tax, hoa, maintenance_general,
-- management_fee, security, cleaning, other.
-- Hors perimetre v1 : mortgage (hypotheque). Elle fera lobjet dun ticket dedie
-- car elle demande la separation capital / interets, non modelisable ici.
-- unit_id nullable = imputation a une unite precise, sinon depense au niveau du
-- bien entier. lease_id nullable = depense refacturable a un locataire.
-- currency_id = FK logique vers currency, jamais de devise en dur (regle projet).
-- supplier_id = FK logique vers le referentiel central fournisseurs (table
-- supplier), vendor_name reste en fallback texte libre, meme couple que
-- real_estate_maintenance_costs.
-- project_id = dimension analytique, journal_entry_id = tracabilite vers
-- lecriture comptable postee.
-- Toutes les FK sont logiques, sans contrainte physique, comme le reste des
-- tables real_estate_*.
-- Suppression logique via is_active, conforme a la regle soft delete du projet.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `real_estate_property_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `lease_id` bigint DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'other',
  `description` varchar(500) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint DEFAULT NULL,
  `expense_date` date NOT NULL,
  `period_start` date DEFAULT NULL,
  `period_end` date DEFAULT NULL,
  `supplier_id` bigint DEFAULT NULL,
  `vendor_name` varchar(255) DEFAULT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `payment_status` varchar(30) NOT NULL DEFAULT 'paid',
  `receipt_url` varchar(500) DEFAULT NULL,
  `project_id` bigint DEFAULT NULL,
  `journal_entry_id` bigint DEFAULT NULL,
  `is_recurring` tinyint NOT NULL DEFAULT 0,
  `recurrence_months` int DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_property_expenses_org_property_date` (`organization_id`, `property_id`, `expense_date`),
  KEY `idx_property_expenses_org_category` (`organization_id`, `category`),
  KEY `idx_property_expenses_property_active` (`property_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
