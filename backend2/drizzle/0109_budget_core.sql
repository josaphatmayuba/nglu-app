-- Idempotent (rejouable au boot). Module Budget ERP/SIFA : enveloppe budgetaire,
-- lignes par compte/dimension, consommation rattachee aux ecritures du grand livre.
-- Base des rapports bailleurs ONG (engagement + alerte depassement).
CREATE TABLE IF NOT EXISTS `budgets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `period_id` bigint unsigned NULL,
  `project_id` bigint NULL,
  `currency_id` bigint NULL,
  `status` varchar(16) NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_budget_org` (`organization_id`),
  KEY `idx_budget_project` (`project_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `budget_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `budget_id` bigint unsigned NOT NULL,
  `account_id` bigint NOT NULL,
  `site_id` bigint NULL,
  `department_id` bigint NULL,
  `project_id` bigint NULL,
  `activity_id` bigint NULL,
  `planned_amount` decimal(18,2) NOT NULL DEFAULT 0,
  `label` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bline_budget` (`budget_id`),
  KEY `idx_bline_account` (`account_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `budget_consumptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `budget_line_id` bigint unsigned NOT NULL,
  `journal_entry_id` bigint unsigned NULL,
  `amount` decimal(18,2) NOT NULL,
  `note` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bcons_line` (`budget_line_id`),
  KEY `idx_bcons_entry` (`journal_entry_id`)
);
