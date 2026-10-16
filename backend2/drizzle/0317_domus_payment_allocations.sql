-- Domus phase 1 : registre des affectations encaissement -> echeance (1 mois = 1 echeance = ses paiements).
-- payment_id et due_id pointent tous deux vers real_estate_rent_payments (ligne encaissement / ligne echeance).
-- FK logiques sans contrainte physique. Suppression logique via status true/false.
-- source = auto | manual | backfill. Idempotent, aucune donnee inseree ni modifiee.
CREATE TABLE IF NOT EXISTS `real_estate_payment_allocations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `lease_id` bigint NOT NULL,
  `payment_id` bigint NOT NULL,
  `due_id` bigint NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency_id` bigint NULL,
  `source` varchar(20) NOT NULL DEFAULT 'auto',
  `status` varchar(10) NOT NULL DEFAULT 'true',
  `void_reason` varchar(500) NULL,
  `created_by` bigint NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `voided_at` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rpa_org_lease` (`organization_id`, `lease_id`),
  KEY `idx_rpa_payment` (`payment_id`),
  KEY `idx_rpa_due` (`due_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
-- Colonnes cache sur real_estate_rent_payments : montant affecte, statut echeance, nature de ligne.
-- due_status = pending | partially_paid | paid | voided. row_kind = due | payment.
SET @col_amount_paid := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'amount_paid');
--> statement-breakpoint
SET @sql := IF(@col_amount_paid = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `amount_paid` decimal(15,2) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_due_status := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'due_status');
--> statement-breakpoint
SET @sql := IF(@col_due_status = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `due_status` varchar(20) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_row_kind := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'row_kind');
--> statement-breakpoint
SET @sql := IF(@col_row_kind = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `row_kind` varchar(10) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Feature-flag par bail : date de bascule du bail sur le registre des affectations (NULL = historique).
SET @col_allocation_ledger_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'allocation_ledger_at');
--> statement-breakpoint
SET @sql := IF(@col_allocation_ledger_at = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `allocation_ledger_at` datetime NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
