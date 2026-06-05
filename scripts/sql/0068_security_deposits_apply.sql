-- Application manuelle de la table caution (migration 0068) — dev + prod.
-- La table n'est pas dans le journal Drizzle, donc l'auto-migration ne la crée pas.
CREATE TABLE IF NOT EXISTS `real_estate_security_deposits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `lease_id` bigint NOT NULL,
  `currency_id` bigint NULL,
  `transaction_id` bigint NULL,
  `return_transaction_id` bigint NULL,
  `amount` decimal(15,2) NOT NULL,
  `method` varchar(255) NOT NULL DEFAULT 'cash',
  `payment_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'held',
  `deduction_amount` decimal(15,2) NULL,
  `deduction_reason` varchar(500) NULL,
  `returned_amount` decimal(15,2) NULL,
  `return_method` varchar(255) NULL,
  `return_date` date NULL,
  `reference` varchar(255) NULL,
  `notes` text NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `resd_lease_idx` (`lease_id`)
);
