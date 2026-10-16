-- Domus : resiliation de bail avec motif. Date effective, motif, horodatage et auteur de la resiliation.
-- Forme idempotente (MySQL 8, pas de ADD COLUMN IF NOT EXISTS). Aucune donnee inseree ni modifiee.
SET @col_termination_date := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'termination_date');
--> statement-breakpoint
SET @sql := IF(@col_termination_date = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `termination_date` date NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_termination_reason := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'termination_reason');
--> statement-breakpoint
SET @sql := IF(@col_termination_reason = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `termination_reason` text NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_terminated_at := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'terminated_at');
--> statement-breakpoint
SET @sql := IF(@col_terminated_at = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `terminated_at` timestamp NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_terminated_by := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_leases' AND COLUMN_NAME = 'terminated_by');
--> statement-breakpoint
SET @sql := IF(@col_terminated_by = 0, 'ALTER TABLE `real_estate_leases` ADD COLUMN `terminated_by` bigint NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
