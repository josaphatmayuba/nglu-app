-- Domus : periode de loyer couverte par un paiement (period_start / period_end, NULL = historique)
-- et prorata du loyer en opt-in par bail (rent_proration_enabled, 0 = comportement historique inchange).
-- Forme idempotente. Pas de backfill, pas de seed.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'period_start');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `period_start` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'period_end');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `period_end` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'rent_proration_enabled');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `rent_proration_enabled` tinyint(1) NOT NULL DEFAULT 0', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
