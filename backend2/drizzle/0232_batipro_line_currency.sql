-- BatiPro : devise PAR LIGNE de document (devis / BC / facture / situation).
-- Volet 1 : colonne batipro_document_lines.currency_id, nullable, sans FK physique
--           (pattern batipro). NULL = la ligne herite de la devise du document
--           (batipro_documents.currency_id reste la devise principale par defaut).
-- Volet 2 : table batipro_document_totals = totaux ventilas par devise pour un
--           document multi devises. Une ligne par couple (document_id, currency_id).
--           ledger_entry_id nullable : ecriture comptable propre a cette devise.
-- Idempotent (INFORMATION_SCHEMA + PREPARE) : rejouable au boot sans crash.
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_lines' AND COLUMN_NAME = 'currency_id');
--> statement-breakpoint
SET @sql := IF(@col = 0, 'ALTER TABLE `batipro_document_lines` ADD COLUMN `currency_id` bigint DEFAULT NULL AFTER `material_id`', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `batipro_document_totals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `document_id` bigint NOT NULL,
  `currency_id` bigint NOT NULL,
  `total_ht` decimal(14,2) NOT NULL DEFAULT 0,
  `total_vat` decimal(14,2) NOT NULL DEFAULT 0,
  `total_ttc` decimal(14,2) NOT NULL DEFAULT 0,
  `paid_amount` decimal(14,2) NOT NULL DEFAULT 0,
  `ledger_entry_id` bigint DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `batipro_document_totals_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_document_totals' AND INDEX_NAME = 'batipro_document_totals_doc_currency_uq');
--> statement-breakpoint
SET @sql := IF(@idx = 0, 'CREATE UNIQUE INDEX `batipro_document_totals_doc_currency_uq` ON `batipro_document_totals` (`document_id`, `currency_id`)', 'DO 0');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
