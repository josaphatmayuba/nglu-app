-- Domus : refus d'un justificatif de paiement par le gestionnaire. Motif + date
-- gardes sur la ligne pending pour que le locataire voie pourquoi et renvoie.
-- Forme idempotente (INFORMATION_SCHEMA + PREPARE) : MySQL 8 refuse
-- ADD COLUMN IF NOT EXISTS, et la migration doit pouvoir etre rejouee.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'proof_rejected_reason');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `proof_rejected_reason` varchar(500) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'proof_rejected_at');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `proof_rejected_at` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
