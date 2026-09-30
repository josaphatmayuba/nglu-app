-- Domus : nom de la personne ayant physiquement perçu l'argent, pour un
-- paiement de loyer en espèces (method = 'cash'). Champ optionnel, saisi
-- uniquement côté UI quand la méthode est cash.
-- Forme idempotente (INFORMATION_SCHEMA + PREPARE) : MySQL 8 refuse
-- ADD COLUMN IF NOT EXISTS, et la migration doit pouvoir etre rejouee.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'received_by');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `received_by` varchar(255) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
