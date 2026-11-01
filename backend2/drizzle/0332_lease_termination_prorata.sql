-- Domus : resiliation au prorata. full_period = 1 facture la periode complete (comportement historique),
-- 0 = prorata des jours occupes. DEFAULT 1 : les baux deja resilies et les planifications existantes
-- gardent l ancien comportement ; les nouvelles resiliations ecrivent la valeur explicitement.
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint. Aucun seed.

SET @lease_tfp_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_leases'
    AND COLUMN_NAME = 'termination_full_period'
);
--> statement-breakpoint
SET @lease_tfp_tbl := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_leases'
);
--> statement-breakpoint
SET @lease_tfp_sql := IF(
  @lease_tfp_tbl = 1 AND @lease_tfp_exists = 0,
  'ALTER TABLE `real_estate_leases` ADD COLUMN `termination_full_period` tinyint NOT NULL DEFAULT 1',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE lease_tfp_stmt FROM @lease_tfp_sql;
--> statement-breakpoint
EXECUTE lease_tfp_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE lease_tfp_stmt;
--> statement-breakpoint
SET @sched_fp_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_lease_scheduled_terminations'
    AND COLUMN_NAME = 'full_period'
);
--> statement-breakpoint
SET @sched_fp_tbl := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'real_estate_lease_scheduled_terminations'
);
--> statement-breakpoint
SET @sched_fp_sql := IF(
  @sched_fp_tbl = 1 AND @sched_fp_exists = 0,
  'ALTER TABLE `real_estate_lease_scheduled_terminations` ADD COLUMN `full_period` tinyint NOT NULL DEFAULT 1',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE sched_fp_stmt FROM @sched_fp_sql;
--> statement-breakpoint
EXECUTE sched_fp_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE sched_fp_stmt;
