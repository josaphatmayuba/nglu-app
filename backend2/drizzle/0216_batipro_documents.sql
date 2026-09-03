-- BatiPro : socle documentaire partage (devis, bons de commande, situations,
-- factures) + lignes + portail sous-traitant (liens a token opaque).
-- Phase 0 = portail sous-traitant (soumissions inbound). Les colonnes devis/BC/
-- facture existent des maintenant pour les phases suivantes (extensible).
CREATE TABLE IF NOT EXISTS `batipro_documents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'quote',
  `direction` VARCHAR(20) NOT NULL DEFAULT 'outbound',
  `number` VARCHAR(60),
  `status` VARCHAR(40) NOT NULL DEFAULT 'draft',
  `currency_id` BIGINT,
  `total_ht` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `total_vat` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `total_ttc` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `parent_document_id` BIGINT,
  `subcontractor_id` BIGINT,
  `submitted_by_name` VARCHAR(255),
  `submitted_by_company` VARCHAR(255),
  `attached_file_key` VARCHAR(512),
  `attached_file_format` VARCHAR(10),
  `attached_file_size` BIGINT,
  `client_token` VARCHAR(80),
  `client_token_expiry` TIMESTAMP NULL,
  `notes` TEXT,
  `ledger_entry_id` BIGINT,
  `issue_date` DATE,
  `due_date` DATE,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_documents_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_documents_org_type_dir` (`organization_id`, `type`, `direction`),
  KEY `idx_batipro_documents_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_document_lines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `document_id` BIGINT NOT NULL,
  `position` INT NOT NULL DEFAULT 0,
  `designation` VARCHAR(500) NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `vat_rate` DECIMAL(6,2) NOT NULL DEFAULT 0,
  `line_ht` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `line_ttc` DECIMAL(14,2) NOT NULL DEFAULT 0,
  `phase_id` BIGINT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batipro_document_lines_org_document` (`organization_id`, `document_id`),
  KEY `idx_batipro_document_lines_org_active` (`organization_id`, `is_active`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_subcontractor_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `project_id` BIGINT NOT NULL,
  `subcontractor_id` BIGINT,
  `token` VARCHAR(80) NOT NULL,
  `expiry` TIMESTAMP NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batipro_subcontractor_links_token` (`token`),
  KEY `idx_batipro_subcontractor_links_org_project` (`organization_id`, `project_id`),
  KEY `idx_batipro_subcontractor_links_org_active` (`organization_id`, `is_active`)
);
