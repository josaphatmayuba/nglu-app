-- 0152_transaction_attachments.sql
-- Justificatifs (recus/factures) lies a une ecriture de la table plate `transaction`.
-- Plusieurs pieces par transaction ; soft-delete via status. Idempotent (IF NOT EXISTS).
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `transaction_attachments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `transaction_id` BIGINT NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `filename` VARCHAR(255) NULL,
  `mimetype` VARCHAR(100) NULL,
  `size_bytes` BIGINT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'true',
  `created_by` BIGINT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_txatt_tx` (`transaction_id`),
  KEY `idx_txatt_org` (`organization_id`)
);
