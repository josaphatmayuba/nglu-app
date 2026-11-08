-- BatiPro : mode d honoraires par sous-traitant et par chantier (NULL = comportement actuel : montant fixe contract_amount).
-- fee_mode : NULL, fixed ou percent_materials. fee_percent : pourcentage libre. fee_bases : bases du pourcentage, codes separes par des virgules (NULL = materials ; materials, labor, handling, other, accepted_quote). Aucune donnee modifiee.
SET @col_mode := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_subcontractors' AND COLUMN_NAME = 'fee_mode');
--> statement-breakpoint
SET @sql := IF(@col_mode = 0, 'ALTER TABLE `batipro_subcontractors` ADD COLUMN `fee_mode` varchar(30) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_pct := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_subcontractors' AND COLUMN_NAME = 'fee_percent');
--> statement-breakpoint
SET @sql := IF(@col_pct = 0, 'ALTER TABLE `batipro_subcontractors` ADD COLUMN `fee_percent` decimal(5,2) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_bases := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_subcontractors' AND COLUMN_NAME = 'fee_bases');
--> statement-breakpoint
SET @sql := IF(@col_bases = 0, 'ALTER TABLE `batipro_subcontractors` ADD COLUMN `fee_bases` varchar(120) NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
