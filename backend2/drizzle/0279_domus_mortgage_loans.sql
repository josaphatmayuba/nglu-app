-- Domus / SCRUM-311 : prets hypothecaires portes par un bien immobilier.
-- Table de reference du pret lui meme, complementaire de
-- real_estate_mortgage_payments qui porte les echeances payees.
-- La colonne mortgage_id de real_estate_mortgage_payments, deja posee en 0278 et
-- laissee inutilisee, pointera vers cette table via le code service (hors scope
-- de cette migration : aucune modification de la table 0278 ici).
-- principal_amount = montant emprunte initial, pas un solde restant du : le
-- solde se calcule applicativement a partir des paiements.
-- currency_id = FK logique vers currency, jamais de devise en dur (regle projet).
-- interest_rate en decimal(7,4) = taux annuel nominal, ex 5.2500 pour 5,25 pourcent.
-- term_months = duree contractuelle, end_date restant nullable pour les prets
-- sans echeance connue ou a taux revisable.
-- status = cycle de vie applicatif du pret (active / paid_off / refinanced),
-- distinct de is_active qui porte uniquement la suppression logique.
-- unit_id nullable = pret rattache a une unite precise, sinon au bien entier.
-- Toutes les FK sont logiques, sans contrainte physique, comme le reste des
-- tables real_estate_*.
-- Suppression logique via is_active, conforme a la regle soft delete du projet.
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `real_estate_mortgage_loans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `property_id` bigint NOT NULL,
  `unit_id` bigint DEFAULT NULL,
  `lender_name` varchar(255) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `principal_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `interest_rate` decimal(7,4) DEFAULT NULL,
  `term_months` int DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mortgage_loans_org_property` (`organization_id`, `property_id`),
  KEY `idx_mortgage_loans_property_active` (`property_id`, `is_active`),
  KEY `idx_mortgage_loans_org_status` (`organization_id`, `status`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
