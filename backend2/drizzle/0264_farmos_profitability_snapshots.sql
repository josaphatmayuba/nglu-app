-- FarmOS rentabilite : photos calculees de marge sur une periode.
-- scope : animal / lot / species / farm. scope_key = identifiant du perimetre
-- (id animal en texte, nom du lot, code espece, ou cle ferme).
-- cost_breakdown / revenue_breakdown = ventilation JSON par poste
-- (aliment, sante, operations, ventes ...).
-- profit est stocke calcule pour eviter de recalculer a chaque lecture.
-- Table dagregat : pas de colonne updated_at, un snapshot est immuable et
-- remplace par un nouveau calcul (is_active a 0 pour les anciens).
-- Idempotent nativement via CREATE TABLE IF NOT EXISTS, un seul statement.
CREATE TABLE IF NOT EXISTS `farmos_profitability_snapshots` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `scope` varchar(20) NOT NULL,
  `scope_key` varchar(255) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `revenue` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `profit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `currency_id` bigint DEFAULT NULL,
  `cost_breakdown` json DEFAULT NULL,
  `revenue_breakdown` json DEFAULT NULL,
  `animal_count` int DEFAULT NULL,
  `generated_by` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_profit_scope` (`organization_id`, `scope`, `scope_key`),
  KEY `idx_farmos_profit_period` (`organization_id`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
