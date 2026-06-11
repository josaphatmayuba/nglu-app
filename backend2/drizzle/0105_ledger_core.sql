-- Idempotent (rejouable au boot).
-- Coeur comptable moderne ERP/SIFA : partie double (journal entries + lignes mono-compte),
-- regles parametrables, periodes, idempotence. Voir livrables ERP-SIFA produits/PLAN_CŒUR_COMPTABLE_MODERNE.md
-- Enrichissement du plan de comptes existant (account) : ajoute par migration separee si besoin.
CREATE TABLE IF NOT EXISTS `accounting_periods` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `name` varchar(64) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_periods_org` (`organization_id`),
  KEY `idx_periods_range` (`organization_id`, `start_date`, `end_date`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `date` datetime NOT NULL,
  `reference` varchar(64) NULL,
  `particulars` varchar(255) NOT NULL,
  `source_module` varchar(64) NULL,
  `related_id` varchar(255) NULL,
  `status` varchar(16) NOT NULL DEFAULT 'posted',
  `reversal_of_id` bigint unsigned NULL,
  `reversed_by_id` bigint unsigned NULL,
  `reason` varchar(255) NULL,
  `currency_id` bigint NULL,
  `exchange_rate` decimal(18,6) NULL,
  `period_id` bigint unsigned NULL,
  `idempotency_key` varchar(128) NULL,
  `total_debit` decimal(18,2) NOT NULL DEFAULT 0,
  `total_credit` decimal(18,2) NOT NULL DEFAULT 0,
  `created_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_journal_idem` (`organization_id`, `idempotency_key`),
  KEY `idx_journal_org` (`organization_id`),
  KEY `idx_journal_related` (`source_module`, `related_id`),
  KEY `idx_journal_period` (`period_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_entry_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_id` bigint unsigned NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `account_id` bigint NOT NULL,
  `side` varchar(6) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `site_id` bigint NULL,
  `department_id` bigint NULL,
  `project_id` bigint NULL,
  `activity_id` bigint NULL,
  `description` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lines_entry` (`entry_id`),
  KEY `idx_lines_account` (`account_id`),
  KEY `idx_lines_org` (`organization_id`),
  KEY `idx_lines_dims` (`project_id`, `site_id`, `department_id`, `activity_id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `transaction_type_rules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `type` varchar(64) NOT NULL,
  `role` varchar(64) NOT NULL,
  `account_id` bigint NOT NULL,
  `side` varchar(6) NOT NULL,
  `formula` varchar(255) NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ttr_type` (`organization_id`, `type`)
);
