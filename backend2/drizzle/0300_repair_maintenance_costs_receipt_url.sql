-- Reparation : colonne receipt_url absente de real_estate_maintenance_costs en prod.
--
-- La migration 0026 qui l ajoutait n a jamais ete inscrite au journal et
-- utilisait ADD COLUMN IF NOT EXISTS (refuse par MySQL 8). Le schema Drizzle
-- selectionne/insere receipt_url, donc tout ajout ou lecture de cout de
-- maintenance tombait en 500 (Unknown column receipt_url).
--
-- Forme idempotente : sans effet si la colonne existe deja (dev).
SET @col_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_maintenance_costs' AND COLUMN_NAME = 'receipt_url');
--> statement-breakpoint
SET @sql := IF(@col_chk = 0, 'ALTER TABLE `real_estate_maintenance_costs` ADD COLUMN `receipt_url` varchar(500) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
