-- BatiPro : ajoute la devise et les montants de facturation client aux projets,
-- pour alimenter l echeancier previsionnel (forecast scope=batipro) DANS LES DEUX
-- SENS : sortie = cout restant (budget - spent), entree = a facturer
-- (contract_amount - billed_amount), etale jusqu a due_date.
-- Idempotent (INFORMATION_SCHEMA + PREPARE) car ALTER hors auto-create fiable MySQL 8.

SET @bp_cur_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'currency_id'
);
--> statement-breakpoint
SET @bp_cur_sql := IF(@bp_cur_exists = 0,
  'ALTER TABLE `batipro_projects` ADD COLUMN `currency_id` bigint DEFAULT NULL AFTER `spent`',
  'SELECT 1');
--> statement-breakpoint
PREPARE bp_cur_stmt FROM @bp_cur_sql;
--> statement-breakpoint
EXECUTE bp_cur_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bp_cur_stmt;
--> statement-breakpoint
SET @bp_ca_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'contract_amount'
);
--> statement-breakpoint
SET @bp_ca_sql := IF(@bp_ca_exists = 0,
  'ALTER TABLE `batipro_projects` ADD COLUMN `contract_amount` decimal(14,2) NOT NULL DEFAULT 0 AFTER `currency_id`',
  'SELECT 1');
--> statement-breakpoint
PREPARE bp_ca_stmt FROM @bp_ca_sql;
--> statement-breakpoint
EXECUTE bp_ca_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bp_ca_stmt;
--> statement-breakpoint
SET @bp_ba_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batipro_projects' AND COLUMN_NAME = 'billed_amount'
);
--> statement-breakpoint
SET @bp_ba_sql := IF(@bp_ba_exists = 0,
  'ALTER TABLE `batipro_projects` ADD COLUMN `billed_amount` decimal(14,2) NOT NULL DEFAULT 0 AFTER `contract_amount`',
  'SELECT 1');
--> statement-breakpoint
PREPARE bp_ba_stmt FROM @bp_ba_sql;
--> statement-breakpoint
EXECUTE bp_ba_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bp_ba_stmt;
--> statement-breakpoint
