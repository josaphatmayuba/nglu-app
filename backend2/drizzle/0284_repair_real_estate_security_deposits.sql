-- Reparation : la table real_estate_security_deposits (cautions locataires Domus)
-- avait ete definie dans 0068_real_estate_security_deposits.sql mais ce fichier na
-- jamais ete enregistre dans meta/_journal.json (un autre fichier de prefixe 0068
-- occupait lentree). Resultat : la table na jamais ete creee par lauto-migration,
-- ni en dev ni en prod. En prod, collectDeposit (POST /leases/:id/deposit) echoue
-- avec ER_NO_SUCH_TABLE sur nglu_db.real_estate_security_deposits.
-- Ce fichier rejoue le schema dorigine de maniere idempotente :
-- CREATE TABLE IF NOT EXISTS pour la table, INFORMATION_SCHEMA + PREPARE pour lindex.
-- Sans effet si la table existe deja (cas dev, creee a la main).
CREATE TABLE IF NOT EXISTS `real_estate_security_deposits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `lease_id` bigint NOT NULL,
  `currency_id` bigint DEFAULT NULL,
  `transaction_id` bigint DEFAULT NULL,
  `return_transaction_id` bigint DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `method` varchar(255) NOT NULL DEFAULT 'cash',
  `payment_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'held',
  `deduction_amount` decimal(15,2) DEFAULT NULL,
  `deduction_reason` varchar(500) DEFAULT NULL,
  `returned_amount` decimal(15,2) DEFAULT NULL,
  `return_method` varchar(255) DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `notes` text,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET @resd_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_security_deposits'
    AND INDEX_NAME = 'resd_lease_idx'
);
--> statement-breakpoint
SET @resd_idx_sql := IF(
  @resd_idx_exists = 0,
  'CREATE INDEX `resd_lease_idx` ON `real_estate_security_deposits` (`lease_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE resd_stmt FROM @resd_idx_sql;
--> statement-breakpoint
EXECUTE resd_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE resd_stmt;
