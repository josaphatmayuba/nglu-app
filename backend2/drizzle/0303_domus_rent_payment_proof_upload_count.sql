-- Domus : compteur des envois de preuve de paiement via le portail locataire
-- public (QR imprime sur papier). Plafond applicatif a 2 envois par paiement.
-- Forme idempotente (INFORMATION_SCHEMA + PREPARE) : MySQL 8 refuse
-- ADD COLUMN IF NOT EXISTS, et la migration doit pouvoir etre rejouee.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'proof_upload_count');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `proof_upload_count` int NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
