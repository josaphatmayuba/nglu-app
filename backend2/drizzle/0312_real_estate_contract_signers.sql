-- Domus : signataires du contrat de bail (1..N locataires, un statut de signature par personne).
-- role principal = locataire du bail, cotenant = locataire supplementaire (real_estate_lease_cotenants).
-- customer_id = customers.id. FK logiques sans contrainte physique. Suppression logique via is_active.
-- Ajoute aussi signer_id (nullable) au journal d audit du contrat.
-- Idempotent via CREATE TABLE IF NOT EXISTS et INFORMATION_SCHEMA, aucun seed.
CREATE TABLE IF NOT EXISTS `real_estate_contract_signers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL,
  `contract_id` bigint NOT NULL,
  `customer_id` bigint NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'principal',
  `position` int NOT NULL DEFAULT 1,
  `signer_name` varchar(255) NULL,
  `signer_email` varchar(255) NULL,
  `signer_phone` varchar(50) NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `method` varchar(20) NULL,
  `signer_token` varchar(64) NULL,
  `signer_token_expiry` timestamp NULL,
  `sent_at` timestamp NULL,
  `viewed_at` timestamp NULL,
  `signed_at` timestamp NULL,
  `signature_data` mediumtext NULL,
  `signer_ip` varchar(100) NULL,
  `signer_user_agent` varchar(500) NULL,
  `last_resent_at` timestamp NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_contract_signer_token` (`signer_token`),
  UNIQUE KEY `uq_contract_signer_customer` (`contract_id`, `customer_id`),
  KEY `idx_contract_signer_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_contract_audit_logs' AND COLUMN_NAME = 'signer_id');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_contract_audit_logs` ADD COLUMN `signer_id` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
