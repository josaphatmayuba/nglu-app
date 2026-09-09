-- Registre de reproduction porcine, etape 1 : index de lecture.
-- idx_farmos_repro_cycles_sow : cycles dune truie donnee (vue fiche truie).
-- idx_farmos_repro_cycles_due : file des mises bas attendues et alertes par statut.
-- idx_farmos_animals_repro : vue Truies a surveiller (filtre espece + statut repro).
-- MySQL 8 na pas CREATE INDEX IF NOT EXISTS : on passe par INFORMATION_SCHEMA.STATISTICS
-- puis PREPARE/EXECUTE. Idempotent, 1 statement par breakpoint.

SET @farmos_idx_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_repro_cycles'
);
--> statement-breakpoint
SET @farmos_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_repro_cycles'
    AND INDEX_NAME = 'idx_farmos_repro_cycles_sow'
);
--> statement-breakpoint
SET @farmos_idx_sql := IF(
  @farmos_idx_table_exists = 1 AND @farmos_idx_exists = 0,
  'CREATE INDEX `idx_farmos_repro_cycles_sow` ON `farmos_repro_cycles` (`organization_id`, `sow_id`, `is_active`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_idx_stmt FROM @farmos_idx_sql;
--> statement-breakpoint
EXECUTE farmos_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_idx_stmt;
--> statement-breakpoint
SET @farmos_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_repro_cycles'
    AND INDEX_NAME = 'idx_farmos_repro_cycles_due'
);
--> statement-breakpoint
SET @farmos_idx_sql := IF(
  @farmos_idx_table_exists = 1 AND @farmos_idx_exists = 0,
  'CREATE INDEX `idx_farmos_repro_cycles_due` ON `farmos_repro_cycles` (`organization_id`, `outcome`, `expected_farrowing_date`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_idx_stmt FROM @farmos_idx_sql;
--> statement-breakpoint
EXECUTE farmos_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_idx_stmt;
--> statement-breakpoint
SET @farmos_idx_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
);
--> statement-breakpoint
SET @farmos_idx_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'repro_status'
);
--> statement-breakpoint
SET @farmos_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND INDEX_NAME = 'idx_farmos_animals_repro'
);
--> statement-breakpoint
SET @farmos_idx_sql := IF(
  @farmos_idx_table_exists = 1 AND @farmos_idx_col_exists = 1 AND @farmos_idx_exists = 0,
  'CREATE INDEX `idx_farmos_animals_repro` ON `farmos_animals` (`organization_id`, `species`, `repro_status`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_idx_stmt FROM @farmos_idx_sql;
--> statement-breakpoint
EXECUTE farmos_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_idx_stmt;
