-- Idempotent. Module Projects ERP/SIFA : axe analytique + suivi bailleur (ONG).
-- Pivot de la comptabilite analytique (journal_entry_lines.project_id) et des rapports bailleurs.
-- Commentaires sans apostrophe (piege splitSqlStatements).
CREATE TABLE IF NOT EXISTS `projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `code` varchar(64) NULL,
  `name` varchar(255) NOT NULL,
  `donor` varchar(255) NULL,
  `description` text NULL,
  `start_date` date NULL,
  `end_date` date NULL,
  `budget_amount` decimal(18,2) NULL,
  `currency_id` bigint NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_org` (`organization_id`),
  KEY `idx_project_donor` (`donor`)
);
